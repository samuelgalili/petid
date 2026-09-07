import { expect, test, type Page } from "@playwright/test";

const productManager = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "izak7781@gmail.com",
  display_name: "Product manager",
  role: "product_manager",
  permissions: [
    "products.read",
    "products.create",
    "products.update",
    "product_assets.upload",
    "product_tools.use",
  ],
  must_change_password: false,
};

const product = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Test product",
  description: "Product manager fixture",
  price: 49,
  original_price: null,
  image_url: "/placeholder.svg",
  category: "toys",
  in_stock: true,
  is_featured: false,
  business_id: "33333333-3333-4333-8333-333333333333",
  created_at: "2026-08-09T00:00:00.000Z",
  source: "manual",
};

async function mockAdmin(page: Page, overrides: Record<string, unknown> = {}) {
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Unauthorized" }) });
  });
  await page.route("**/api/reports", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ reports: [] }) });
  });
  await page.route("**/api/admin/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ admin: { ...productManager, ...overrides } }),
    });
  });
  await page.route("**/api/products", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ products: [product] }),
    });
  });
}

test.describe("Admin role permissions", () => {
  test.describe.configure({ mode: "serial" });

  test("product managers see product tools but no unrelated admin destinations or delete action", async ({ page }) => {
    await mockAdmin(page);
    await page.goto("/admin/products");

    await expect(page.getByText("סה״כ מוצרים")).toBeVisible();
    await expect(page.locator('a[href="/admin/products"]')).not.toHaveCount(0);
    await expect(page.locator('a[href="/admin/quick-import"]')).not.toHaveCount(0);
    await expect(page.locator('a[href="/admin/smart-editor"]')).not.toHaveCount(0);

    for (const href of [
      "/admin/analytics",
      "/admin/notifications",
      "/admin/orders",
      "/admin/customers",
      "/admin/coupons",
      "/admin/settings",
      "/admin/categories",
    ]) {
      await expect(page.locator(`a[href="${href}"]`)).toHaveCount(0);
    }

    await page.getByRole("button").filter({ has: page.locator("svg.lucide-ellipsis") }).click();
    await expect(page.getByRole("menuitem", { name: "מחיקה" })).toHaveCount(0);
  });

  test("product managers cannot open full-admin routes directly", async ({ page }) => {
    await mockAdmin(page);
    await page.goto("/admin/orders");

    await expect(page).toHaveURL(/\/admin\/products$/);
    await expect(page.getByText("סה״כ מוצרים")).toBeVisible();
  });

  test("provisioned admins must replace their temporary password before using the panel", async ({ page }) => {
    await mockAdmin(page, { must_change_password: true });
    await page.goto("/admin/products");

    await expect(page).toHaveURL(/\/admin\/change-password$/);
    await expect(page.getByRole("heading", { name: "בחירת סיסמת ניהול" })).toBeVisible();
  });

  test("malformed AI enrichment values do not crash the product editor", async ({ page }) => {
    await mockAdmin(page);
    await page.route("**/api/product-intel/enrich-product-ai", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            name: { title: "AI product" },
            sizes: "Large",
            colors: { label: "Blue" },
            flavors: [{ name: "Chicken" }],
            benefits: [{ title: "Joint support", description: "With glucosamine" }],
            feedingGuide: { range: "Adult", amount: "2 cups" },
            brandWebsite: { url: "https://example.com" },
            suggestedPrice: "49.90",
          },
        }),
      });
    });

    await page.goto("/admin/products?new=true");
    const dialog = page.getByRole("dialog");
    await dialog.getByPlaceholder("ימולא אוטומטית מחיפוש מק״ט").fill("Test enrichment");
    await dialog.getByRole("button", { name: "העשר עם AI" }).click();

    await expect(dialog.getByText("Large").first()).toBeVisible();
    await expect(dialog.getByText("Blue").first()).toBeVisible();
    await expect(dialog.getByText("Joint support: With glucosamine").first()).toBeVisible();
    await expect(page.getByText("שגיאה בטעינת העמוד")).toHaveCount(0);
  });
});
