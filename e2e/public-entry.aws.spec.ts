import { expect, test, type Page } from "@playwright/test";

import { safeReturnPath } from "../src/lib/returnPath";

/**
 * The public front door.
 *
 * An anonymous visit to / used to bounce to /auth before any product was
 * visible. The shop is that door now. The feed still asks for a login, and
 * it says so instead of disappearing. Support is open.
 */

const USER_ID = "11111111-1111-4111-8111-111111111111";

const user = {
  id: USER_ID,
  email: "owner@example.com",
  full_name: "בעלים",
  phone: "0501234567",
  created_at: "2024-01-01T00:00:00.000Z",
};

const pet = {
  id: "99999999-9999-4999-8999-999999999999",
  user_id: USER_ID,
  name: "לוקה",
  type: "dog",
  pet_type: "dog",
  breed: "מעורב",
  avatar_url: "/placeholder.svg",
  weight: 12,
  birth_date: "2021-04-01",
  gender: "male",
  medical_conditions: [],
  archived: false,
};

const product = (id: string, name: string, price: number) => ({
  id,
  name,
  description: "מזון יבש איכותי",
  price,
  original_price: null,
  sale_price: null,
  image_url: "/placeholder.svg",
  images: ["/placeholder.svg"],
  category: "מזון",
  category_name: "מזון",
  pet_type: "dog",
  in_stock: true,
  is_featured: id === "1",
  brand: "MIPO",
  created_at: "2026-01-01T00:00:00.000Z",
});

const products = [
  product("1", "מזון יבש לכלב 7 קילו", 189),
  product("2", "צעצוע חבל כותנה", 39),
];

async function mockAnonymous(page: Page) {
  await page.route("**/api/**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: "{}",
  }));
  await page.route("**/api/auth/me", (route) => route.fulfill({
    status: 401,
    contentType: "application/json",
    body: JSON.stringify({ error: "Unauthorized" }),
  }));
  await page.route("**/api/products*", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ products }),
  }));
}

test.describe("public entry", () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test("return path stays on this site", () => {
    expect(safeReturnPath("/feed")).toBe("/feed");
    expect(safeReturnPath("/feed?tab=1")).toBe("/feed?tab=1");
    expect(safeReturnPath("/settings")).toBe("/settings");
    expect(safeReturnPath("https://evil.example/feed")).toBeNull();
    expect(safeReturnPath("//evil.example")).toBeNull();
    expect(safeReturnPath("/\\evil.example")).toBeNull();
    expect(safeReturnPath("/admin")).toBeNull();
    expect(safeReturnPath("/admin/products")).toBeNull();
    expect(safeReturnPath("/auth")).toBeNull();
    expect(safeReturnPath("/signup")).toBeNull();
  });

  test("anonymous / lands on the shop with products", async ({ page }) => {
    await mockAnonymous(page);
    await page.goto("/");

    await expect(page).toHaveURL(/\/shop$/);
    await expect(page).not.toHaveURL(/auth/);
    await expect(page.getByRole("heading", { name: "חנות", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "מומלצים" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "כל המוצרים" })).toBeVisible();
    await expect(page.getByText("מזון יבש לכלב 7 קילו")).toBeVisible();
    await expect(page.getByText("צעצוע חבל כותנה")).toBeVisible();
    await expect(page.getByText("₪189")).toBeVisible();

    const frame = page.getByTestId("shop-product-grid").locator(".aspect-square").first();
    await expect(frame).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(frame.locator("img")).toHaveCSS("object-fit", "contain");

    const overflow = await page.evaluate(() => (
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    ));
    expect(overflow).toBe(false);
  });

  test("anonymous visitors check the session once", async ({ page }) => {
    let authMe = 0;
    await mockAnonymous(page);
    await page.route("**/api/auth/me", (route) => {
      authMe += 1;
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Unauthorized" }),
      });
    });

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "חנות", exact: true })).toBeVisible();
    await page.waitForTimeout(400);
    expect(authMe).toBe(1);
  });

  test("/support loads without an account", async ({ page }) => {
    await mockAnonymous(page);
    await page.goto("/support");

    await expect(page).toHaveURL(/\/support$/);
    await expect(page).not.toHaveURL(/auth/);
    await expect(page.getByRole("heading", { name: "תמיכה ועזרה" })).toBeVisible();
    await expect(page.getByText("support@mipo.pet")).toBeVisible();
    await expect(page.getByText("איך מאפסים סיסמה?")).toBeVisible();
    await expect(page.getByText("התחברו כדי לייצא נתונים או למחוק חשבון")).toBeVisible();

    await page.getByRole("button", { name: /ניהול החשבון/ }).click();
    await expect(page).toHaveURL(/\/auth\?next=%2Fsettings$/);
  });

  test("the feed asks for a login and returns there afterwards", async ({ page }) => {
    let loggedIn = false;
    await mockAnonymous(page);
    await page.route("**/api/auth/me", (route) => route.fulfill({
      status: loggedIn ? 200 : 401,
      contentType: "application/json",
      body: JSON.stringify(loggedIn
        ? { user, profile: { id: USER_ID, full_name: "בעלים" }, is_admin: false }
        : { error: "Unauthorized" }),
    }));
    await page.route("**/api/auth/login", (route) => {
      loggedIn = true;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user, profile: { id: USER_ID, full_name: "בעלים" }, is_admin: false }),
      });
    });
    await page.route("**/api/me/pets*", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ pets: [pet] }),
    }));
    await page.route("**/api/feed**", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ posts: [] }),
    }));

    await page.goto("/feed");
    await expect(page).toHaveURL(/\/feed$/);
    await expect(page.getByRole("heading", { name: "התחבר כדי לראות את הקהילה" })).toBeVisible();
    await expect(page.getByRole("link", { name: "התחברות" })).toBeVisible();

    await page.getByRole("link", { name: "התחברות" }).click();
    await expect(page).toHaveURL(/\/auth\?next=%2Ffeed$/);

    await page.getByPlaceholder("אימייל").fill("owner@example.com");
    await page.getByPlaceholder("סיסמה").fill("valid-password");
    await page.getByRole("button", { name: "התחברות", exact: true }).click();

    await expect(page).toHaveURL(/\/feed$/);
    await expect(page.getByRole("heading", { name: "הפיד מתחיל ברגע אחד" })).toBeVisible();
  });

  test("guest checkout does not ask for a shipping profile", async ({ page }) => {
    const shippingCalls: string[] = [];
    await mockAnonymous(page);
    await page.route("**/api/me/shipping-profile", (route) => {
      shippingCalls.push(route.request().method());
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Unauthorized" }),
      });
    });
    await page.addInitScript(() => {
      localStorage.setItem("mipo-cart", JSON.stringify([{
        id: "line-1",
        productId: "1",
        name: "מזון יבש לכלב 7 קילו",
        price: 189,
        image: "/placeholder.svg",
        quantity: 1,
      }]));
    });

    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: "כתובת למשלוח" })).toBeVisible();
    await page.waitForTimeout(400);
    expect(shippingCalls).toEqual([]);
  });

  test("signed-in checkout still loads the saved address", async ({ page }) => {
    let shipping = 0;
    await page.route("**/api/**", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    }));
    await page.route("**/api/auth/me", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user,
        profile: { id: USER_ID, full_name: "בעלים", email: user.email },
        is_admin: false,
      }),
    }));
    await page.route("**/api/me/shipping-profile", (route) => {
      shipping += 1;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          profile: {
            full_name: "בעלים",
            city: "חיפה",
            street: "הרצל",
            entrance_type: "house",
            leave_at_door: false,
            updated_at: "2026-01-01T00:00:00.000Z",
          },
        }),
      });
    });
    await page.addInitScript(() => {
      localStorage.setItem("mipo-cart", JSON.stringify([{
        id: "line-1",
        productId: "1",
        name: "מזון יבש לכלב 7 קילו",
        price: 189,
        image: "/placeholder.svg",
        quantity: 1,
      }]));
    });

    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: "כתובת למשלוח" })).toBeVisible();
    await expect(page.getByLabel(/^עיר/)).toHaveValue("חיפה");
    expect(shipping).toBeGreaterThan(0);
  });

  test("sitemap and robots are real documents", async ({ page }) => {
    const sitemap = await page.request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const body = await sitemap.text();
    expect(sitemap.headers()["content-type"] || "").toContain("xml");
    expect(body).toContain("/shop");
    expect(body).toContain("/support");
    expect(body).not.toContain("<!doctype html");

    const robots = await page.request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain("Sitemap: https://mipo.pet/sitemap.xml");
  });

  test("a logged-in home is still the pet home", async ({ page }) => {
    await page.route("**/api/**", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    }));
    await page.route("**/api/auth/me", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user,
        profile: { id: USER_ID, full_name: "בעלים", email: user.email },
        is_admin: false,
      }),
    }));
    await page.route("**/api/me/pets*", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ pets: [pet] }),
    }));
    await page.route(`**/api/me/pets/${pet.id}/character`, (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ available: false, character: null }),
    }));
    await page.route(`**/api/me/pets/${pet.id}/health-summary`, (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        pet,
        vaccinations: [],
        vet_visits: [],
        documents: [],
        active_recovery: null,
      }),
    }));

    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await expect(page).not.toHaveURL(/\/shop|\/auth/);
    await expect(page.getByRole("heading", { name: /איך לוקה מרגיש/ })).toBeVisible();
  });
});
