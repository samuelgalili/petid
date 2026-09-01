import { expect, test, type Page } from "@playwright/test";

// The shop's filter bar used to be a hardcoded array, which drifted from the
// catalogue in both directions: a category with products and no button, and a
// button with no products behind it. These tests pin the bar to the API.

const categories = [
  {
    id: "aaaaaaaa-1111-4111-8111-111111111111",
    parent_id: null,
    slug: "food",
    name_he: "מזון",
    name_en: "Food",
    description: null,
    icon: null,
    position: 10,
    is_active: true,
    product_count: 1,
    aliases: ["מזון"],
  },
  {
    id: "aaaaaaaa-2222-4222-8222-222222222222",
    parent_id: null,
    slug: "health",
    name_he: "בריאות",
    name_en: "Health",
    description: null,
    icon: null,
    position: 20,
    is_active: true,
    product_count: 1,
    aliases: ["בריאות"],
  },
  {
    id: "aaaaaaaa-3333-4333-8333-333333333333",
    parent_id: "aaaaaaaa-2222-4222-8222-222222222222",
    slug: "supplements",
    name_he: "תוספי תזונה",
    name_en: "Supplements",
    description: null,
    icon: null,
    position: 10,
    is_active: true,
    product_count: 1,
    aliases: [],
  },
];

const product = (id: string, name: string, categoryId: string | null, categoryName: string | null) => ({
  id,
  name,
  description: "",
  price: 100,
  original_price: null,
  sale_price: null,
  image_url: "/placeholder.svg",
  images: [],
  category: categoryName,
  category_id: categoryId,
  category_slug: null,
  category_name: categoryName,
  pet_type: "all",
  in_stock: true,
  is_featured: false,
  source: "manual" as const,
});

const products = [
  product("bbbbbbbb-1111-4111-8111-111111111111", "שק מזון", categories[0].id, "מזון"),
  product("bbbbbbbb-2222-4222-8222-222222222222", "משחת שיניים", categories[1].id, "בריאות"),
  product("bbbbbbbb-3333-4333-8333-333333333333", "אומגה 3", categories[2].id, "תוספי תזונה"),
  product("bbbbbbbb-4444-4444-8444-444444444444", "מוצר ללא קטגוריה", null, null),
];

async function mockShop(page: Page, options: { categoriesFail?: boolean } = {}) {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Unauthorized" }) }),
  );
  await page.route("**/api/products", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ products }) }),
  );
  await page.route("**/api/categories", (route) =>
    options.categoriesFail
      ? route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "boom" }) })
      : route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ categories }) }),
  );
}

const categoryBar = (page: Page) => page.locator("div.flex.gap-2.overflow-x-auto").first();

test("the filter bar is built from the category tree", async ({ page }) => {
  await mockShop(page);
  await page.goto("/shop");

  const bar = categoryBar(page);
  await expect(bar.getByRole("button", { name: "הכל" })).toBeVisible();
  await expect(bar.getByRole("button", { name: "מזון" })).toBeVisible();
  await expect(bar.getByRole("button", { name: "בריאות" })).toBeVisible();
  // Children are reachable through their parent, not as their own tab.
  await expect(bar.getByRole("button", { name: "תוספי תזונה" })).toHaveCount(0);
});

test("a parent category also shows the products of its children", async ({ page }) => {
  await mockShop(page);
  await page.goto("/shop");

  await categoryBar(page).getByRole("button", { name: "בריאות" }).click();

  await expect(page.getByText("משחת שיניים").first()).toBeVisible();
  await expect(page.getByText("אומגה 3").first()).toBeVisible();
  await expect(page.getByText("שק מזון")).toHaveCount(0);
});

test("the bar falls back to the built-in list when categories cannot be loaded", async ({ page }) => {
  await mockShop(page, { categoriesFail: true });
  await page.goto("/shop");

  const bar = categoryBar(page);
  await expect(bar.getByRole("button", { name: "הכל" })).toBeVisible();
  await expect(bar.getByRole("button", { name: "מזון" })).toBeVisible();
});
