import { expect, test, type Locator, type Page, type Route } from "@playwright/test";

/**
 * Purchase primary actions share one fill: #5B52F0.
 * The shop sheet, the product page, the cart and checkout used to disagree
 * (cyan, ink, and a lighter violet). This asks the browser for the computed
 * colour, which is the only place the cascade can still lose.
 */

const productId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const brandFill = "rgb(91, 82, 240)";
const brandInk = "rgb(255, 255, 255)";

const product = {
  id: productId,
  name: "שק מזון לכלב 7 ק״ג",
  description: "מזון יבש לכלב בוגר.",
  price: 89,
  image_url: "/placeholder.svg",
  images: ["/placeholder.svg"],
  in_stock: true,
  is_featured: true,
  category: "dry-food",
  brand: "מיפו",
};

const cartLine = {
  id: `line-${productId}`,
  productId,
  name: product.name,
  price: product.price,
  image: "/placeholder.svg",
  quantity: 1,
};

async function mockCatalogue(page: Page) {
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
    const url = route.request().url();
    if (url.includes(`/products/${productId}`)) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ product }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        products: [product],
        total: 1,
        limit: 200,
        offset: 0,
      }),
    });
  };
  // `*` does not cross a slash, so the id URL needs its own pattern.
  // Both answers are the same product.
  await page.route("**/api/products*", fulfillProducts);
  await page.route("**/api/products/**", fulfillProducts);
}

async function paint(locator: Locator) {
  return locator.evaluate((el) => {
    const style = getComputedStyle(el);
    return { background: style.backgroundColor, color: style.color };
  });
}

async function expectBrandCta(locator: Locator) {
  await expect(locator).toBeVisible();
  const seen = await paint(locator);
  expect(seen.background).toBe(brandFill);
  expect(seen.color).toBe(brandInk);
}

test("primary CTAs on the product, cart and checkout are the brand fill", async ({ page }) => {
  await page.addInitScript((item) => {
    localStorage.setItem("mipo-onboarding-complete", "true");
    localStorage.setItem("mipo-cart", JSON.stringify([item]));
  }, cartLine);
  await mockCatalogue(page);

  await page.goto("/shop");
  await expect(page.locator(".page-transition-settled")).toBeAttached();
  await page.getByRole("button", { name: product.name }).first().click();
  await expectBrandCta(page.getByTestId("shop-add-to-cart"));
  const fullPage = page.getByRole("button", { name: "לדף המוצר המלא" });
  await expect(fullPage).toBeVisible();
  expect((await paint(fullPage)).background).not.toBe(brandFill);

  await page.goto(`/product/${productId}`);
  await expect(page.locator(".page-transition-settled")).toBeAttached();
  await expectBrandCta(page.getByRole("button", { name: "הוסף לעגלה" }));

  await page.goto("/cart");
  await expect(page.locator(".page-transition-settled")).toBeAttached();
  await expectBrandCta(page.getByTestId("cart-checkout-bar").getByRole("button", { name: "המשך לתשלום" }));
  const coupon = page.getByRole("button", { name: "הפעל" });
  await expect(coupon).toBeVisible();
  expect((await paint(coupon)).background).toBe("rgb(255, 255, 255)");

  await page.goto("/checkout");
  await expect(page.locator(".page-transition-settled")).toBeAttached();
  await expectBrandCta(page.getByTestId("checkout-continue"));
});
