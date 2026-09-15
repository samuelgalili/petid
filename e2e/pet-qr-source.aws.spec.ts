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

async function openInfoTab(page: Page) {
  await page.goto(`/pet-profile/${petId}`);
  await expect(page.getByRole("heading", { name: "לוקה" })).toBeVisible();
  await page.getByRole("button", { name: "מידע" }).click();
  await page.getByTestId("pet-qr-surface").scrollIntoViewIfNeeded();
}

test.describe("Q4 Gate2 QR source vs Master", () => {
  test("Q4-1/2/3: source is on the QR surface; code encodes /pet/{id}; Hero is Master", async ({ page }) => {
    await mockSignedInProfile(page, petRow({ avatar_url: MASTER, source_image_url: SOURCE }));
    await openInfoTab(page);

    const hero = page.locator("[data-pet-hero-renderer] img");
    await expect(hero).toHaveAttribute("src", MASTER);

    const surface = page.getByTestId("pet-qr-surface");
    await expect(surface).toBeVisible();
    await expect(surface).toHaveAttribute("data-qr-center-kind", "source");
    await expect(surface).toHaveAttribute("data-qr-center-src", SOURCE);
    await expect(surface).toHaveAttribute("data-qr-value", new RegExp(`/pet/${petId}$`));
    await expect(surface.locator("svg")).toBeVisible();
    await expect(page.getByTestId("pet-qr-surface-image")).toHaveAttribute("src", SOURCE);
    await expect(page.getByTestId("pet-qr-surface-image")).not.toHaveAttribute("src", MASTER);

    await page.getByTestId("pet-qr-open").click();
    const dialog = page.getByTestId("pet-qr-dialog");
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId("pet-qr-dialog-surface")).toHaveAttribute("data-qr-value", new RegExp(`/pet/${petId}$`));
    await expect(page.getByTestId("pet-qr-dialog-surface-image")).toHaveAttribute("src", SOURCE);
    await expect(dialog).not.toContainText(/שדרוג|paywall|upgrade|Premium/i);
  });

  test("Master only → QR surface uses the type icon, never avatar_url", async ({ page }) => {
    await mockSignedInProfile(page, petRow({ avatar_url: MASTER, source_image_url: null }));
    await openInfoTab(page);
    const surface = page.getByTestId("pet-qr-surface");
    await expect(surface).toHaveAttribute("data-qr-center-kind", "type-icon");
    await expect(surface).not.toHaveAttribute("data-qr-center-src", MASTER);
    await expect(page.getByTestId("pet-qr-surface-image")).not.toHaveAttribute("src", MASTER);
    const src = await page.getByTestId("pet-qr-surface-image").getAttribute("src");
    expect(src).toBeTruthy();
    expect(src).toMatch(/dog-official|cat-official|\.svg|\.png|data:image\/svg\+xml/i);
    await expect(surface).toHaveAttribute("data-qr-value", new RegExp(`/pet/${petId}$`));
  });

  test("neither source nor Master → QR surface uses the type icon", async ({ page }) => {
    await mockSignedInProfile(page, petRow({ avatar_url: null, source_image_url: null }));
    await openInfoTab(page);
    await expect(page.getByTestId("pet-qr-surface")).toHaveAttribute("data-qr-center-kind", "type-icon");
    const src = await page.getByTestId("pet-qr-surface-image").getAttribute("src");
    expect(src).toBeTruthy();
    expect(src).toMatch(/dog-official|cat-official|\.svg|\.png|data:image\/svg\+xml/i);
  });

  test("data:image source is on the QR surface", async ({ page }) => {
    await mockSignedInProfile(page, petRow({ avatar_url: MASTER, source_image_url: DATA_SOURCE }));
    await openInfoTab(page);
    await expect(page.getByTestId("pet-qr-surface")).toHaveAttribute("data-qr-center-kind", "source");
    await expect(page.getByTestId("pet-qr-surface-image")).toHaveAttribute("src", DATA_SOURCE);
    await expect(page.locator("[data-pet-hero-renderer] img")).toHaveAttribute("src", MASTER);
  });
});
