import { expect, test, type Page } from "@playwright/test";

const userId = "88888888-8888-4888-8888-888888888888";
const petId = "99999999-9999-4999-8999-999999999999";
const MASTER = "https://cdn.example.com/master-avatar.jpg";
const SOURCE = "https://cdn.example.com/source-photo.jpg";
const DATA_SOURCE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const authJson = {
  user: { id: userId, email: "qr@mipo.pet", full_name: "בודק QR" },
  profile: {
    id: userId,
    email: "qr@mipo.pet",
    full_name: "בודק QR",
    first_name: "בודק",
    last_name: "QR",
    phone: "0501234567",
    city: "תל אביב",
    avatar_url: null,
  },
};

function petRow(overrides: Record<string, unknown> = {}) {
  return {
    id: petId,
    name: "לוקה",
    type: "dog",
    pet_type: "dog",
    breed: "לברדור",
    avatar_url: null,
    source_image_url: null,
    archived: false,
    weight: 20,
    user_id: userId,
    ...overrides,
  };
}

async function mockSignedInProfile(page: Page, pet: Record<string, unknown>) {
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/api/auth/me")) {
      await route.fulfill({ json: authJson });
      return;
    }
    if (url.includes("/api/me/pets") && url.includes("health-summary")) {
      await route.fulfill({
        json: {
          pet,
          profile: authJson.profile,
          vet_visits: [],
          vaccinations: [],
          documents: [],
          active_recovery: null,
        },
      });
      return;
    }
    if (url.includes("/api/me/pets")) {
      await route.fulfill({ json: { pets: [pet] } });
      return;
    }
    if (url.includes("/api/me/orders")) {
      await route.fulfill({ json: { orders: [] } });
      return;
    }
    await route.fulfill({ json: {} });
  });
}

async function openExpandedProfile(page: Page) {
  await page.goto(`/pet-profile/${petId}`);
  await expect(page.getByRole("heading", { name: "לוקה" })).toBeVisible();
  await expect(page.getByRole("button", { name: "מידע" })).toBeVisible();
}

async function openPetQr(page: Page) {
  await openExpandedProfile(page);
  await page.getByRole("button", { name: "מידע" }).click();
  await page.getByTestId("pet-qr-open").scrollIntoViewIfNeeded();
  await page.getByTestId("pet-qr-open").click();
  await expect(page.getByTestId("pet-qr-dialog")).toBeVisible();
}

test.describe("Q4 Gate2 QR source vs Master", () => {
  test("source+Master → QR uses source, Hero uses Master, no paywall", async ({ page }) => {
    await mockSignedInProfile(page, petRow({ avatar_url: MASTER, source_image_url: SOURCE }));
    await openExpandedProfile(page);

    const hero = page.locator("[data-pet-hero-renderer] img");
    await expect(hero).toHaveAttribute("src", MASTER);

    await page.getByRole("button", { name: "מידע" }).click();
    await page.getByTestId("pet-qr-open").scrollIntoViewIfNeeded();
    await page.getByTestId("pet-qr-open").click();
    await expect(page.getByTestId("pet-qr-dialog")).toBeVisible();
    await expect(page.getByTestId("pet-qr-center-image")).toHaveAttribute("src", SOURCE);
    await expect(page.getByTestId("pet-qr-dialog")).not.toContainText(/שדרוג|paywall|upgrade|Premium/i);
  });

  test("Master only → QR uses the type icon, never avatar_url", async ({ page }) => {
    await mockSignedInProfile(page, petRow({ avatar_url: MASTER, source_image_url: null }));
    await openPetQr(page);
    const center = page.getByTestId("pet-qr-center-image");
    await expect(center).toBeVisible();
    await expect(center).not.toHaveAttribute("src", MASTER);
    const src = await center.getAttribute("src");
    expect(src).toBeTruthy();
    // Vite may serve the official icon as a hashed asset or an inlined data:image/svg+xml.
    expect(src).toMatch(/dog-official|cat-official|\.svg|\.png|data:image\/svg\+xml/i);
  });

  test("neither source nor Master → QR uses the type icon", async ({ page }) => {
    await mockSignedInProfile(page, petRow({ avatar_url: null, source_image_url: null }));
    await openPetQr(page);
    const src = await page.getByTestId("pet-qr-center-image").getAttribute("src");
    expect(src).toBeTruthy();
    expect(src).toMatch(/dog-official|cat-official|\.svg|\.png|data:image\/svg\+xml/i);
  });

  test("data:image source is accepted in QR", async ({ page }) => {
    await mockSignedInProfile(page, petRow({ avatar_url: MASTER, source_image_url: DATA_SOURCE }));
    await openPetQr(page);
    await expect(page.getByTestId("pet-qr-center-image")).toHaveAttribute("src", DATA_SOURCE);
  });
});
