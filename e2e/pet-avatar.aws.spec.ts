import { expect, test, type Page } from "@playwright/test";

const userId = "88888888-8888-4888-8888-888888888888";
const petId = "99999999-9999-4999-8999-999999999999";
const pet = {
  id: petId,
  name: "לוקה",
  type: "dog",
  pet_type: "dog",
  breed: "גולדן רטריבר",
  color: "זהוב",
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

const health = {
  pet,
  profile,
  vet_visits: [],
  vaccinations: [],
  documents: [],
  active_recovery: null,
};

async function mockPetDashboard(page: Page) {
  await page.route("**/api.open-meteo.com/**", (route) => route.abort());
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/auth/me")) {
      await route.fulfill({
        json: {
          user: { id: userId, email: profile.email, full_name: profile.full_name },
          profile,
        },
      });
      return;
    }
    if (url.includes("/health-summary")) {
      await route.fulfill({ json: health });
      return;
    }
    if (url.includes("/me/orders")) {
      await route.fulfill({ json: { orders: [] } });
      return;
    }
    if (url.includes("/me/profile")) {
      await route.fulfill({ json: profile });
      return;
    }
    if (/\/me\/pets\/[^/?]+$/.test(url)) {
      await route.fulfill({ json: { pet } });
      return;
    }
    if (url.includes("/me/pets")) {
      await route.fulfill({ json: { pets: [pet] } });
      return;
    }
    await route.fulfill({ json: {} });
  });
}

test.describe("pet dashboard avatar", () => {
  test("renders the pet avatar on the dashboard", async ({ page }, testInfo) => {
    await mockPetDashboard(page);
    await page.goto(`/pet-profile/${petId}`);

    await expect(page.getByRole("heading", { name: "לוקה" })).toBeVisible();
    const avatar = page.locator("[data-pet-avatar='scene'][data-pet-avatar-painted='yes']");
    await expect(avatar).toBeVisible();
    await expect(avatar).toHaveAttribute("aria-label", "הדמות של לוקה");
    const canvas = avatar.locator("canvas");
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(160);
    await expect(page.locator("[data-pet-avatar='photo']")).toHaveCount(0);

    await avatar.focus();
    await page.keyboard.press("Tab");
    await expect(avatar).not.toBeFocused();

    const dir = process.env.PET_AVATAR_SCREENSHOT_DIR;
    if (dir) {
      const slug = testInfo.project.name.toLowerCase().replace(/\s+/g, "-");
      await page.screenshot({ path: `${dir}/pet-dashboard-${slug}.png` });
    }
  });

  test("falls back to the pet photo when WebGL is unavailable", async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
        if (String(type).toLowerCase().includes("webgl")) return null;
        return original.apply(this, [type, ...args] as never);
      };
    });
    await mockPetDashboard(page);
    await page.goto(`/pet-profile/${petId}`);

    await expect(page.getByRole("heading", { name: "לוקה" })).toBeVisible();
    const photo = page.locator("[data-pet-avatar='photo']");
    await expect(photo).toBeVisible();
    await expect(photo).toHaveAttribute("aria-label", "הדמות של לוקה");
    await expect(photo.locator("img")).toHaveAttribute("src", "/placeholder.svg");
    await expect(page.locator("[data-pet-avatar='scene'][data-pet-avatar-painted='yes']")).toHaveCount(0);
  });
});
