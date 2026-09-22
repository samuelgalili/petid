import { expect, test, type Page } from "@playwright/test";

/**
 * The admin's first screen.
 *
 * The server tests prove the four numbers are the right four numbers. This
 * proves the half that only exists on screen: that /admin is the home screen
 * rather than the product list, that every number goes somewhere, and that a
 * row in the queue carries the thing it is about - because a dashboard you can
 * only read is the same number of screens as the one it replaced.
 */

const admin = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "ops@mipo.pet", display_name: "Owner", role: "admin",
  permissions: ["admin.full"], must_change_password: false,
};

const home = {
  numbers: {
    pending_orders: 3,
    revenue_today: 1240,
    revenue_yesterday: 900,
    unpublished_products: 7,
    new_customers_this_week: 12,
  },
  actions: [
    {
      kind: "order_waiting",
      id: "aaaaaaaa-1111-4111-8111-111111111111",
      title: "הזמנה MP-1024",
      subtitle: "דנה כהן",
      amount: 219,
      at: "2026-09-22T06:00:00.000Z",
      href: "/admin/orders?order=aaaaaaaa-1111-4111-8111-111111111111",
    },
    {
      kind: "product_flagged",
      id: "bbbbbbbb-2222-4222-8222-222222222222",
      title: "קוואטרו ללא דגנים ברווז",
      subtitle: "המחיר סומן לבדיקה",
      amount: 189,
      at: null,
      href: "/admin/products?product=bbbbbbbb-2222-4222-8222-222222222222",
    },
  ],
};

const json = (body: unknown, status = 200) => ({
  status, contentType: "application/json", body: JSON.stringify(body),
});

async function openHome(page: Page, payload: unknown = home) {
  await page.route("**/api/auth/me", (route) => route.fulfill(json({ error: "Unauthorized" }, 401)));
  await page.route("**/api/reports", (route) => route.fulfill(json({ reports: [] })));
  await page.route("**/api/admin/me", (route) => route.fulfill(json({ admin })));
  await page.route("**/api/admin/orders*", (route) => route.fulfill(json({ orders: [] })));
  await page.route("**/api/admin/os/home", (route) => route.fulfill(json(payload)));
  await page.goto("/admin");
}

test.describe("the admin's first screen", () => {
  test("/admin is the home screen, not the product list", async ({ page }) => {
    // The whole complaint in one assertion: this URL used to redirect.
    await openHome(page);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText("דורש טיפול")).toBeVisible();
  });

  test("the four numbers the owner asked for are the four that show", async ({ page }) => {
    await openHome(page);

    await expect(page.getByText("הזמנות ממתינות")).toBeVisible();
    await expect(page.getByText("הכנסות היום")).toBeVisible();
    await expect(page.getByText("לא פורסמו לחנות")).toBeVisible();
    await expect(page.getByText("לקוחות חדשים")).toBeVisible();

    await expect(page.getByText("₪1,240")).toBeVisible();
    // Against yesterday in shekels, not a percentage: ₪40 after a ₪20 day is
    // "+100%", which reads like news and is not.
    await expect(page.getByText("+₪340 מאתמול")).toBeVisible();
  });

  test("a number is a way in, not a figure to look at", async ({ page }) => {
    await openHome(page);
    await page.getByText("הזמנות ממתינות").click();
    await expect(page).toHaveURL(/\/admin\/orders\?status=pending/);
  });

  test("a row in the queue carries the thing it is about", async ({ page }) => {
    // A dashboard that only reports is a dashboard you read and then go
    // somewhere else to act on - the same number of screens as before.
    await openHome(page);

    await expect(page.getByText("הזמנה MP-1024")).toBeVisible();
    await expect(page.getByText("קוואטרו ללא דגנים ברווז")).toBeVisible();

    await page.getByText("הזמנה MP-1024").click();
    await expect(page).toHaveURL(/order=aaaaaaaa-1111-4111-8111-111111111111/);
  });

  test("a morning with nothing to do says so", async ({ page }) => {
    await openHome(page, {
      numbers: {
        pending_orders: 0, revenue_today: 0, revenue_yesterday: 0,
        unpublished_products: 0, new_customers_this_week: 0,
      },
      actions: [],
    });

    await expect(page.getByText("אין מה לעשות כרגע")).toBeVisible();
    // And not "₪NaN" or a blank where a number should be.
    await expect(page.getByText("₪0").first()).toBeVisible();
  });
});
