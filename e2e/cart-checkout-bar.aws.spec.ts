import { expect, test, type Page } from "@playwright/test";

/**
 * At 390px the checkout button used to sit under the fixed bottom nav
 * (button top around 843, nav top at 775). With three lines it was off the
 * screen entirely. The total and "המשך לתשלום" stay above that bar, in full,
 * before the list is scrolled.
 */

const ids = [
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
];

const names = ["שק מזון לכלב 7 ק״ג", "חטיף עוף מיובש", "קערת נירוסטה"];
const prices = [89, 24, 35];

function line(index: number) {
  const productId = ids[index];
  return {
    id: `line-${productId}`,
    productId,
    name: names[index],
    price: prices[index],
    image: "/placeholder.svg",
    quantity: 1,
  };
}

const boxesOverlap = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) => !(
  a.x + a.width <= b.x + 0.5
  || b.x + b.width <= a.x + 0.5
  || a.y + a.height <= b.y + 0.5
  || b.y + b.height <= a.y + 0.5
);

async function openCart(page: Page, count: number) {
  const lines = Array.from({ length: count }, (_, index) => line(index));
  await page.addInitScript((items) => {
    localStorage.setItem("mipo-onboarding-complete", "true");
    localStorage.setItem("mipo-cart", JSON.stringify(items));
  }, lines);
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
    body: JSON.stringify({
      products: lines.map((item) => ({
        id: item.productId,
        name: item.name,
        price: item.price,
        image_url: "/placeholder.svg",
        in_stock: true,
      })),
      total: lines.length,
      limit: 200,
      offset: 0,
    }),
  }));
  await page.goto("/cart");
  await expect(page.locator(".page-transition-settled")).toBeAttached();
}

async function assertCheckoutClearOfNav(page: Page) {
  const bar = page.getByTestId("cart-checkout-bar");
  const button = bar.getByRole("button", { name: "המשך לתשלום" });
  const total = bar.getByTestId("cart-checkout-total");
  const nav = page.getByRole("navigation", { name: "ניווט ראשי" });

  await expect(button).toBeVisible();
  await expect(total).toContainText("סה״כ");
  await expect(button).toBeInViewport({ ratio: 1 });
  await expect(total).toBeInViewport({ ratio: 1 });

  const scrollTop = await page.getByTestId("cart-scroll").evaluate((el) => el.scrollTop);
  expect(scrollTop).toBe(0);

  const buttonBox = await button.boundingBox();
  const totalBox = await total.boundingBox();
  const navBox = await nav.boundingBox();
  const viewport = page.viewportSize();
  expect(viewport?.width).toBe(390);
  expect(buttonBox).not.toBeNull();
  expect(totalBox).not.toBeNull();
  expect(navBox).not.toBeNull();

  for (const box of [buttonBox!, totalBox!]) {
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual((viewport?.height ?? 0) + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(navBox!.y + 0.5);
    expect(boxesOverlap(box, navBox!)).toBe(false);
  }

  await button.click();
  await expect(page).toHaveURL(/\/checkout$/);
}

test.describe("cart checkout stays above the bottom bar", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("one item: the total and checkout button are fully above the nav", async ({ page }) => {
    await openCart(page, 1);
    await expect(page.getByText(names[0], { exact: true })).toBeVisible();
    await assertCheckoutClearOfNav(page);
  });

  test("three items: the total and checkout button are fully above the nav without scrolling", async ({ page }) => {
    await openCart(page, 3);
    await expect(page.getByText(names[0], { exact: true })).toBeVisible();
    await assertCheckoutClearOfNav(page);
  });
});
