import { expect, test, type Page } from "@playwright/test";

const userId = "88888888-8888-4888-8888-888888888888";
const petId = "99999999-9999-4999-8999-999999999999";
const stalePetId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const masterAvatar =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const profile = {
  id: userId,
  email: "onboarding@mipo.pet",
  full_name: "ישראל ישראלי",
  first_name: "ישראל",
  last_name: "ישראלי",
  phone: "0501234567",
  city: "תל אביב",
};

const createdPet = {
  id: petId,
  name: "לוקה",
  type: "dog",
  pet_type: "dog",
  breed: "גולדן רטריבר",
  avatar_url: masterAvatar,
  archived: false,
};

const hostedMasterUrl = "https://cdn.mipo.pet/onboarding-master.png";

async function mockSignedIn(page: Page, pets: typeof createdPet[] = []) {
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      json: {
        user: { id: userId, email: profile.email, full_name: profile.full_name },
        profile,
      },
    });
  });
  await page.route("**/api/me/profile", async (route) => {
    await route.fulfill({ json: profile });
  });
  await page.route("**/api/me/uploads", async (route) => {
    await route.fulfill({
      json: {
        upload: {
          url: hostedMasterUrl,
          file_name: "onboarding-avatar.png",
          content_type: "image/png",
          size: 70,
        },
      },
    });
  });
  await page.route("**/api/me/pets", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { pets } });
      return;
    }
    await route.fallback();
  });
}

test.describe("AWS onboarding persist (AC-ONB-1)", () => {
  test("signed-in complete writes a pets row and onboarding flags", async ({ page }) => {
    let created: typeof createdPet | null = null;
    let submitted: Record<string, unknown> | null = null;

    await mockSignedIn(page);
    await page.route("**/api/me/pets", async (route) => {
      if (route.request().method() === "POST") {
        submitted = route.request().postDataJSON();
        created = {
          ...createdPet,
          name: String(submitted?.name || createdPet.name),
          type: String(submitted?.type || "dog"),
          breed: (submitted?.breed as string) || null,
          avatar_url: (submitted?.avatar_url as string) || null,
        };
        await route.fulfill({ status: 201, json: { pet: created } });
        return;
      }
      await route.fulfill({ json: { pets: created ? [created] : [] } });
    });

    await page.goto("/onboarding");
    await page.getByRole("button", { name: "מתחילים" }).click();
    await page.getByRole("button", { name: "המשך בלי תמונה" }).click();
    await page.getByRole("button", { name: "המשך" }).click();
    await page.getByPlaceholder("לוקה").fill("לוקה");
    await page.getByPlaceholder("למשל גולדן רטריבר").fill("גולדן רטריבר");
    await page.getByRole("button", { name: "יצירת הפרופיל" }).click();

    await expect(page.getByText("ברוכים הבאים, לוקה")).toBeVisible();
    await expect.poll(() => submitted).not.toBeNull();
    expect(submitted).toMatchObject({
      name: "לוקה",
      type: "dog",
      pet_type: "dog",
      breed: "גולדן רטריבר",
    });
    expect(submitted).not.toHaveProperty("source_image_url");

    const stored = await page.evaluate(() => ({
      complete: localStorage.getItem("mipo-onboarding-complete"),
      legacy: localStorage.getItem("onboardingCompleted"),
      activePetId: localStorage.getItem("activePetId"),
      draft: JSON.parse(localStorage.getItem("mipo-pet-draft") || "null"),
    }));
    expect(stored.complete).toBe("true");
    expect(stored.legacy).toBe("true");
    expect(stored.activePetId).toBe(petId);
    expect(stored.draft).toMatchObject({ name: "לוקה", petType: "dog", petId });
  });

  test("remount reloads the full draft and inserts Master avatar_url", async ({ page }) => {
    let submitted: Record<string, unknown> | null = null;

    await mockSignedIn(page);
    await page.route("**/api/me/pets", async (route) => {
      if (route.request().method() === "POST") {
        submitted = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          json: { pet: { ...createdPet, avatar_url: submitted?.avatar_url || masterAvatar } },
        });
        return;
      }
      await route.fulfill({ json: { pets: [] } });
    });

    await page.addInitScript((draft) => {
      localStorage.setItem("mipo-pet-draft", JSON.stringify(draft));
    }, {
      name: "לוקה",
      breed: "גולדן רטריבר",
      petType: "dog",
      avatarUrl: masterAvatar,
      photoUrl: masterAvatar,
    });

    await page.goto("/onboarding");
    await expect(page.getByText("ברוכים הבאים, לוקה")).toBeVisible();
    await expect.poll(() => submitted).not.toBeNull();
    expect(submitted).toMatchObject({
      name: "לוקה",
      type: "dog",
      breed: "גולדן רטריבר",
      avatar_url: hostedMasterUrl,
    });
    expect(JSON.stringify(submitted)).not.toContain("source_image_url");
  });

  test("stale stored petId is looked up and then inserted", async ({ page }) => {
    let lookedUp = false;
    let posted = false;

    await mockSignedIn(page);
    await page.route(new RegExp(`/api/me/pets/${stalePetId}$`), async (route) => {
      lookedUp = true;
      await route.fulfill({ status: 404, json: { error: "Pet not found" } });
    });
    await page.route("**/api/me/pets", async (route) => {
      if (route.request().method() === "POST") {
        posted = true;
        await route.fulfill({ status: 201, json: { pet: createdPet } });
        return;
      }
      await route.fulfill({ json: { pets: [] } });
    });

    await page.addInitScript((draft) => {
      localStorage.setItem("mipo-pet-draft", JSON.stringify(draft));
    }, {
      name: "לוקה",
      breed: "גולדן רטריבר",
      petType: "dog",
      avatarUrl: masterAvatar,
      petId: stalePetId,
    });

    await page.goto("/onboarding");
    await expect(page.getByText("ברוכים הבאים, לוקה")).toBeVisible();
    await expect.poll(() => lookedUp).toBe(true);
    await expect.poll(() => posted).toBe(true);
  });

  test("existing stored petId refreshes and does not insert a second row", async ({ page }) => {
    let posted = false;

    await mockSignedIn(page, [createdPet]);
    await page.route(new RegExp(`/api/me/pets/${petId}$`), async (route) => {
      await route.fulfill({ json: { pet: createdPet } });
    });
    await page.route("**/api/me/pets", async (route) => {
      if (route.request().method() === "POST") {
        posted = true;
        await route.fulfill({ status: 201, json: { pet: createdPet } });
        return;
      }
      await route.fulfill({ json: { pets: [createdPet] } });
    });

    await page.addInitScript((draft) => {
      localStorage.setItem("mipo-pet-draft", JSON.stringify(draft));
    }, {
      name: "לוקה",
      breed: "גולדן רטריבר",
      petType: "dog",
      avatarUrl: masterAvatar,
      petId,
    });

    await page.goto("/onboarding");
    await expect(page.getByText("ברוכים הבאים, לוקה")).toBeVisible();
    await expect.poll(() => page.evaluate(() => localStorage.getItem("activePetId"))).toBe(petId);
    expect(posted).toBe(false);
  });

  test("failed insert stays on complete with retry", async ({ page }) => {
    let attempts = 0;

    await mockSignedIn(page);
    await page.route("**/api/me/pets", async (route) => {
      if (route.request().method() === "POST") {
        attempts += 1;
        if (attempts === 1) {
          await route.fulfill({ status: 500, json: { error: "insert failed" } });
          return;
        }
        await route.fulfill({ status: 201, json: { pet: createdPet } });
        return;
      }
      await route.fulfill({ json: { pets: [] } });
    });

    await page.addInitScript((draft) => {
      localStorage.setItem("mipo-pet-draft", JSON.stringify(draft));
    }, {
      name: "לוקה",
      breed: "",
      petType: "dog",
      avatarUrl: masterAvatar,
    });

    await page.goto("/onboarding");
    await expect(page.getByRole("button", { name: "נסו שוב" })).toBeVisible();
    await page.getByRole("button", { name: "נסו שוב" }).click();
    await expect(page.getByText("ברוכים הבאים, לוקה")).toBeVisible();
    await expect.poll(() => attempts).toBe(2);
  });
});
