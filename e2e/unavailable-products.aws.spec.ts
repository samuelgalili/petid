import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * A hidden product, a product with no image, and a product priced at 0 stay
 * out of the shop, out of search, and off a direct link. The API mock returns
 * them on purpose: the page must still refuse, because that is the leak QA hit.
 */

const HIDDEN_ID = "98e4cc1c-37c1-4008-ac21-bfc1e1310e2a";
const CAGE_ID = "0d41a1b7-0000-4000-8000-000000000001";

const product = (
  id: string,
  name: string,
  price: number | string,
  extra: Record<string, unknown> = {},
) => ({
  id,
  name,
  description: "מוצר לדוגמה",
  price,
  original_price: null,
  sale_price: null,
  image_url: "/placeholder.svg",
  images: ["/placeholder.svg"],
  category: "אביזרים",
  category_name: "אביזרים",
  pet_type: "dog",
  in_stock: true,
  is_featured: false,
  brand: "MIPO",
  shop_hidden: false,
  created_at: "2026-01-01T00:00:00.000Z",
  ...extra,
});

const sellable = product("11111111-1111-4111-8111-111111111111", "מזון יבש לכלב", 89);
const hidden = product(HIDDEN_ID, "ארמון מוסתר", 199, {
  shop_hidden: true,
  image_url: "/uploads/palace.webp",
  images: ["/uploads/palace.webp"],
});
const cage = product(CAGE_ID, "כלוב ארמון", "0.00", {
  image_url: "/uploads/cage.webp",
  images: ["/uploads/cage.webp"],
});

async function mockGuestCatalogue(page: Page) {
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
  const fulfillProducts = (route: Route) => {
    const url = new URL(route.request().url());
    const body = url.pathname.includes(HIDDEN_ID)
      ? { product: hidden }
      : url.pathname.includes(CAGE_ID)
        ? { product: cage }
        : { products: [sellable, hidden, cage] };
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  };
  // `*` does not cross a slash, so the list (`/api/products?view=storefront`)
  // and the product page (`/api/products/:id`) are two patterns. Both answers
  // come from this handler.
  await page.route("**/api/products*", fulfillProducts);
  await page.route("**/api/products/**", fulfillProducts);
}

test.describe("unavailable products stay out of the shop", () => {
  test("a guest search for ארמון does not return a hidden product or a zero price", async ({ page }) => {
    await mockGuestCatalogue(page);
    await page.goto("/shop");

    await expect(page.getByRole("heading", { name: "מזון יבש לכלב" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "ארמון מוסתר" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "כלוב ארמון" })).toHaveCount(0);
    await expect(page.getByText("₪0.00")).toHaveCount(0);
    await expect(page.getByText("₪0", { exact: true })).toHaveCount(0);

    await page.getByLabel("חיפוש בחנות").fill("ארמון");
    await expect(page.getByRole("heading", { name: "ארמון מוסתר" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "כלוב ארמון" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "מזון יבש לכלב" })).toHaveCount(0);
  });

  test("a direct link shows the unavailable state and no price", async ({ page }) => {
    await mockGuestCatalogue(page);

    for (const id of [HIDDEN_ID, CAGE_ID]) {
      await page.goto(`/product/${id}`);
      await expect(page.getByTestId("product-unavailable")).toBeVisible();
      await expect(page.getByRole("heading", { name: "המוצר לא זמין כרגע" })).toBeVisible();
      await expect(page.getByRole("button", { name: "הוסף לעגלה" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "לקנייה" })).toHaveCount(0);
      await expect(page.getByText("₪0.00")).toHaveCount(0);
      await expect(page.getByText("₪199.00")).toHaveCount(0);
      await expect(page.getByText("₪199", { exact: true })).toHaveCount(0);
    }
  });

  test("sitemap.xml does not list the hidden id or the zero-price cage", async ({ page }) => {
    const sitemap = await page.request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const body = await sitemap.text();
    expect(body).not.toContain(HIDDEN_ID);
    expect(body).not.toContain(CAGE_ID);
    expect(body).not.toContain("0d41a1b7");
  });
});
