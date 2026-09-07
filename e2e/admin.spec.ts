import { expect, test, type Page } from "@playwright/test";

const adminEmail = process.env.ADMIN_E2E_EMAIL;
const adminPassword = process.env.ADMIN_E2E_PASSWORD;

async function loginAsAdmin(page: Page) {
  if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_E2E_EMAIL and ADMIN_E2E_PASSWORD are required for authenticated admin tests");
  }

  await page.goto("/admin/login");
  await page.getByLabel("אימייל").fill(adminEmail);
  await page.getByLabel("סיסמה").fill(adminPassword);
  await page.getByRole("button", { name: "התחברות" }).click();
  await expect(page).toHaveURL(/\/admin\/products/, { timeout: 15_000 });
}

test.describe("Admin panel", () => {
  test("redirects unauthenticated visitors to admin login", async ({ page }) => {
    await page.goto("/admin/products");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByRole("heading", { name: "כניסת מנהל" })).toBeVisible();
  });

  test.describe("authenticated admin routes", () => {
    test.skip(!adminEmail || !adminPassword, "Set ADMIN_E2E_EMAIL and ADMIN_E2E_PASSWORD to run authenticated admin coverage");

    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test("opens current admin pages without legacy redirects", async ({ page }) => {
      const routes = [
        { path: "/admin/products", text: "סה״כ מוצרים" },
        { path: "/admin/orders", text: "ניהול הזמנות" },
        { path: "/admin/customers", text: "סה״כ לקוחות" },
        { path: "/admin/coupons", text: "צור קופון" },
        { path: "/admin/notifications", text: "מרכז התראות" },
        { path: "/admin/quick-import", text: "הדבק קישור או ברקוד" },
        { path: "/admin/smart-editor", text: "פרטי מוצר" },
        { path: "/admin/categories", text: "קטגוריות ומותגים" },
        { path: "/admin/settings", text: "הגדרות כלליות" },
        { path: "/admin/analytics", text: "סה״כ הכנסות" },
      ];

      for (const route of routes) {
        await page.goto(route.path);
        await expect(page).toHaveURL(new RegExp(`${route.path.replace(/\//g, "\\/")}$`));
        await expect(page.getByText(route.text).filter({ visible: true }).first()).toBeVisible();
      }
    });

    test("honors supported admin query actions", async ({ page }) => {
      await page.goto("/admin/products?new=true");
      await expect(page.getByRole("dialog")).toContainText("הוספת מוצר חכמה");
      await expect(page).toHaveURL(/\/admin\/products/);

      await page.goto("/admin/coupons?new=true");
      await expect(page.getByRole("dialog")).toContainText("יצירת קופון");
      await expect(page).toHaveURL(/\/admin\/coupons/);

      await page.goto("/admin/orders?status=pending");
      await expect(page).toHaveURL(/\/admin\/orders\?status=pending/);
      await expect(page.getByText("ממתין").first()).toBeVisible();

      await page.goto("/admin/orders?new=true");
      await expect(page).toHaveURL(/\/admin\/orders$/);
      await expect(page.getByText("יצירת הזמנה ידנית אינה זמינה", { exact: true }).first()).toBeVisible();
    });

    test("mobile menu exposes only active admin destinations", async ({ page }, testInfo) => {
      test.skip(!testInfo.project.name.toLowerCase().includes("mobile"), "Mobile navigation check");

      await page.goto("/admin/products");
      await page.locator("header.lg\\:hidden button").first().click();
      const mobileMenu = page.getByRole("dialog");
      await expect(mobileMenu).toBeVisible();

      for (const href of [
        "/admin/analytics",
        "/admin/notifications",
        "/admin/products",
        "/admin/quick-import",
        "/admin/smart-editor",
        "/admin/orders",
        "/admin/customers",
        "/admin/coupons",
        "/admin/settings",
        "/admin/categories",
      ]) {
        await expect(mobileMenu.locator(`a[href="${href}"]`).filter({ visible: true }).first()).toBeVisible();
      }
    });
  });
});
