import { expect, test, type Page } from "@playwright/test";

const userId = "88888888-8888-4888-8888-888888888888";
const petId = "99999999-9999-4999-8999-999999999999";
const pet = {
  id: petId,
  name: "לוקה",
  type: "dog",
  pet_type: "dog",
  breed: "Mixed",
  avatar_url: "/placeholder.svg",
  archived: false,
};

const profile = {
  id: userId,
  email: "owner@mipo.pet",
  full_name: "ישראל ישראלי",
  first_name: "ישראל",
  last_name: "ישראלי",
  phone: "0501234567",
  city: "תל אביב",
};

async function mockHome(page: Page) {
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
  await page.route("**/api/me/pets", async (route) => {
    await route.fulfill({ json: { pets: [pet] } });
  });
  await page.route(new RegExp(`/api/me/pets/${petId}$`), async (route) => {
    await route.fulfill({ json: { pet } });
  });
  await page.route(`**/api/me/pets/${petId}/character`, async (route) => {
    await route.fulfill({ json: { available: false, character: null } });
  });
  await page.route(`**/api/me/pets/${petId}/vet-visits`, async (route) => {
    await route.fulfill({ json: { vet_visits: [] } });
  });
  await page.route("**/api/me/documents?*", async (route) => {
    await route.fulfill({ json: { documents: [] } });
  });
  await page.route(`**/api/me/pets/${petId}/health-summary`, async (route) => {
    await route.fulfill({
      json: {
        pet,
        profile,
        vet_visits: [],
        vaccinations: [],
        documents: [],
        active_recovery: null,
      },
    });
  });
}

test.describe("Home Presence visual", () => {
  test("renders a live Aurora glow and living idle on the centre avatar", async ({ page }) => {
    await mockHome(page);
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /איך לוקה מרגיש/ })).toBeVisible();
    const presence = page.locator("[data-presence-visual='aurora']");
    await expect(presence).toBeVisible();
    await expect(presence.locator(".mipo-gradient-ring")).toHaveCount(0);
    await expect(page.locator("[data-presence-aurora='live']")).toBeVisible();
    await expect(page.locator("[data-presence-idle='live']")).toBeVisible();
    await expect(page.locator(".presence-aurora__ribbon")).toHaveCount(3);
    await expect(page.locator(".presence-aurora__rim")).toBeVisible();
    await expect(page.getByRole("img", { name: "לוקה" })).toBeVisible();

    const idle = page.locator("[data-presence-idle='live']");
    const idleAnim = await idle.evaluate((el) => getComputedStyle(el).animationName);
    expect(idleAnim).toContain("presence-idle");
    const firstTransform = await idle.evaluate((el) => getComputedStyle(el).transform);
    await expect.poll(async () => idle.evaluate((el) => getComputedStyle(el).transform), {
      timeout: 2500,
    }).not.toBe(firstTransform);

    const ribbonAnim = await page.locator(".presence-aurora__ribbon--a").evaluate((el) => (
      getComputedStyle(el).animationName
    ));
    expect(ribbonAnim).toContain("presence-aurora-spin");
  });

  test("freezes Aurora and idle when the user prefers reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockHome(page);
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /איך לוקה מרגיש/ })).toBeVisible();
    await expect(page.locator("[data-presence-aurora='still']")).toBeVisible();
    await expect(page.locator("[data-presence-idle='still']")).toBeVisible();
    await expect(page.locator(".presence-aurora__ribbon")).toHaveCount(0);
    await expect(page.locator(".presence-aurora__rim")).toHaveCount(0);
    await expect(page.locator(".presence-aurora__wash")).toBeVisible();

    const idle = page.locator("[data-presence-idle='still']");
    await expect(idle).toHaveCSS("animation-name", "none");
    const firstTransform = await idle.evaluate((el) => getComputedStyle(el).transform);
    await page.waitForTimeout(400);
    await expect(idle).toHaveCSS("transform", firstTransform);
  });
});
