import { expect, test, type Page } from "@playwright/test";

/**
 * Search used to stop at 12 cards and report that cap as the count.
 * A query with more matches has to show every one of them, and the line above
 * the grid has to be that real total — including after the query changes.
 */

const MATCH_COUNT = 15;

const matchNames = Array.from({ length: MATCH_COUNT }, (_, index) => (
  index === MATCH_COUNT - 1
    ? "קוואטרו סלמון מיוחד"
    : `קוואטרו שק ${String(index + 1).padStart(2, "0")}`
));

const DECOY_NAME = "מברשת טיפוח לפרווה";

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
  is_featured: false,
  brand: name.startsWith("קוואטרו") ? "QUATTRO" : "MIPO",
  shop_hidden: false,
  created_at: "2026-01-01T00:00:00.000Z",
});

const products = [
  ...matchNames.map((name, index) => product(`match-${index + 1}`, name, 40 + index)),
  product("decoy", DECOY_NAME, 45),
];

async function openShop(page: Page) {
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

  await page.goto("/shop");
  await expect(page.getByLabel("חיפוש בחנות")).toBeVisible();
  await expect(page.getByRole("heading", { name: DECOY_NAME, exact: true })).toBeVisible();
}

test.describe("shop search shows every match", () => {
  test("more than 12 matches are all reachable and the count is the real total", async ({ page }) => {
    await openShop(page);
    const field = page.getByLabel("חיפוש בחנות");
    const summary = page.getByTestId("shop-search-summary");

    await field.fill("קוואטרו");

    await expect(summary).toHaveText(`${MATCH_COUNT} מוצרים`);
    await expect(summary).not.toHaveText("12 מוצרים");

    const results = page.getByTestId("shop-search-results");
    await expect(results.getByRole("heading")).toHaveCount(MATCH_COUNT);
    await expect(page.getByRole("heading", { name: DECOY_NAME, exact: true })).toHaveCount(0);

    for (const name of matchNames) {
      const heading = results.getByRole("heading", { name, exact: true });
      await heading.scrollIntoViewIfNeeded();
      await expect(heading).toBeVisible();
      await expect(heading).toBeInViewport();
    }

    // A narrower query must replace the total. Leaving 15 on screen would be
    // the previous answer, not this one.
    await field.fill("סלמון");
    await expect(summary).toHaveText("1 מוצרים");
    await expect(results.getByRole("heading")).toHaveCount(1);
    await expect(results.getByRole("heading", { name: "קוואטרו סלמון מיוחד", exact: true })).toBeVisible();
    await expect(results.getByRole("heading", { name: matchNames[0], exact: true })).toHaveCount(0);
  });

  test("a query with no match says so and shows no cards", async ({ page }) => {
    await openShop(page);
    await page.getByLabel("חיפוש בחנות").fill("אוכף לסוס");

    const summary = page.getByTestId("shop-search-summary");
    await expect(summary).toHaveText("אין לנו אוכף לסוס — אפשר לנסות אחרת");
    await expect(page.getByTestId("shop-search-results")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: matchNames[0], exact: true })).toHaveCount(0);
    await expect(page.getByText("₪40", { exact: true })).toHaveCount(0);
  });
});
