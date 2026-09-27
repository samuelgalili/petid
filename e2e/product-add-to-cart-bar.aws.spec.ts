import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The mobile add-to-cart bar is part of the viewport, not part of the page.
 *
 * A filter or a transform on the page-transition wrapper makes that wrapper
 * the containing block for position:fixed, so the bar rendered at the end of
 * a long product page (~2,240px) instead of the bottom of the screen.
 */

const productId = "0022bbc6-4931-4a79-b0eb-21c3af245cd0";

const longDescription = Array.from({ length: 12 }, () => (
  "תיאור ארוך של שק המזון, כדי שהעמוד יהיה גבוה מהמסך והפס התחתון לא ייחשב גלוי רק כי התוכן קצר."
)).join(" ");

// Same field shape as GET /api/products/0022bbc6-… : category is the import
// slug, category_id is set, and category_name / category_slug are absent.
// original_price is set so the page badge is exactly -7%.
const product = {
  id: productId,
  name: "קוואטרו כלבים אדולט מיני עוף 7 ק״ג",
  description: longDescription,
  price: 199,
  original_price: 214,
  sale_price: null,
  image_url: "/placeholder.svg",
  images: ["/placeholder.svg"],
  category: "dry-food",
  category_id: "8d136fea-2e86-4bc2-8f44-4b21e1b685e1",
  brand: "קוואטרו",
  pet_type: "dog",
  in_stock: true,
  weight: 7,
  weight_unit: "ק״ג",
  ingredients: "עוף, תירס, שעורה",
  benefits: ["חלבון מן החי", "ללא חיטה"],
  special_diet: [],
  medical_tags: [],
  breed_tags: [],
  flavors: [],
  life_stage: null,
  dog_size: null,
  product_attributes: {
    product_type: "מזון",
    family_code: "dogs",
    family_description: "מזון כלבים",
    animal: "כלב",
  },
};

const shelfProduct = {
  ...product,
  id: "shelf-sale",
  name: "מזון במבצע",
  is_featured: true,
  description: "שק במבצע",
};

const boxesOverlap = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) => !(
  a.x + a.width <= b.x + 0.5
  || b.x + b.width <= a.x + 0.5
  || a.y + a.height <= b.y + 0.5
  || b.y + b.height <= a.y + 0.5
);

async function mockShop(page: Page) {
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
  await page.route("**/api/products", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ products: [shelfProduct, { ...shelfProduct, id: "shelf-sale-2", name: "חטיף במבצע", is_featured: false }] }),
  }));
  await page.route(`**/api/products/${productId}`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ product }),
  }));
}

async function assertPriceClearOfHeart(row: Locator) {
  const price = row.getByTestId("shop-original-price");
  const heart = row.getByTestId("shop-favorite");
  await expect(price).toBeVisible();
  await expect(heart).toBeVisible();
  const priceBox = await price.boundingBox();
  const heartBox = await heart.boundingBox();
  expect(priceBox).not.toBeNull();
  expect(heartBox).not.toBeNull();
  expect(boxesOverlap(priceBox!, heartBox!)).toBe(false);
}

test.describe("mobile product bar and shop prices", () => {
  test("the add-to-cart bar is at the bottom of the viewport on load", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Mobile Chrome", "Mobile Chrome");
    await mockShop(page);
    await page.goto(`/product/${productId}`);

    const bar = page.getByTestId("product-add-to-cart-bar");
    await expect(bar.getByRole("button", { name: "הוסף לעגלה" })).toBeVisible();
    await expect(page.locator(".page-transition-settled")).toBeAttached();

    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThanOrEqual(430);
    const box = await bar.boundingBox();
    expect(box).not.toBeNull();
    const metrics = await page.evaluate(() => ({
      scrollY: window.scrollY,
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
      parent: document.querySelector("[data-testid='product-add-to-cart-bar']")?.parentElement?.tagName,
      transition: (() => {
        const el = document.querySelector(".page-transition-settled");
        if (!el) return null;
        const style = getComputedStyle(el);
        return { filter: style.filter, transform: style.transform };
      })(),
    }));

    expect(metrics.scrollY).toBe(0);
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.innerHeight + 400);
    expect(metrics.parent).toBe("BODY");
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(metrics.innerHeight + 1);
    expect(box!.y + box!.height).toBeGreaterThan(metrics.innerHeight - 8);
    expect(metrics.transition?.filter).toBe("none");
    expect(metrics.transition?.transform).toBe("none");
    await expect(page.getByText("dry-food")).toHaveCount(0);
    await expect(page.getByText("מזון יבש", { exact: true }).first()).toBeVisible();

    const discount = page.getByTestId("discount-percent");
    await expect(discount).toHaveText("-7%");
    await expect(discount).toHaveAttribute("dir", "ltr");

    const policyButton = page.getByRole("button", { name: "זכויות צרכן ומדיניות ביטול מלאה" });
    await policyButton.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await policyButton.click();
    const policyKeys = ["consumer-protection", "privacy-policy", "terms", "accessibility", "club-terms"];
    for (const key of policyKeys) {
      await page.evaluate((policyKey) => {
        window.dispatchEvent(new CustomEvent("open-legal-drawer", { detail: { key: policyKey } }));
      }, key);
      const viewport = page.locator("[data-radix-scroll-area-viewport]");
      const body = page.getByTestId("legal-policy-body");
      await expect(body).toBeVisible();
      await expect(viewport).toHaveCount(1);
      const direction = await viewport.evaluate((el) => getComputedStyle(el).direction);
      const align = await body.evaluate((el) => getComputedStyle(el).textAlign);
      expect(direction).toBe("rtl");
      expect(align).toBe("right");
      await expect(body).toHaveAttribute("dir", "rtl");
      if (key === "consumer-protection") {
        await expect(body).toContainText("1. זכות ביטול עסקה:");
      }
    }
  });

  test("support text scrolls clear of the add button at 390px", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Mobile Chrome", "Mobile Chrome");
    await page.setViewportSize({ width: 390, height: 844 });
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

    await page.goto("/support");
    const fab = page.getByRole("button", { name: "הוספת חיה" });
    const last = page.getByRole("button", { name: "הצהרת נגישות" });
    await expect(fab).toBeVisible();
    await page.getByTestId("support-scroll").evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(last).toBeVisible();

    const fabBox = await fab.boundingBox();
    const lastBox = await last.boundingBox();
    const viewport = page.viewportSize();
    expect(fabBox).not.toBeNull();
    expect(lastBox).not.toBeNull();
    expect(lastBox!.y).toBeGreaterThanOrEqual(0);
    expect(lastBox!.y + lastBox!.height).toBeLessThanOrEqual((viewport?.height ?? 844) + 1);
    expect(boxesOverlap(fabBox!, lastBox!)).toBe(false);
    expect(lastBox!.y + lastBox!.height).toBeLessThanOrEqual(fabBox!.y + 2);
  });

  test("the struck price is not under the favorite heart", async ({ page }) => {
    await mockShop(page);
    await page.goto("/shop");
    await page.evaluate(() => document.fonts.ready);
    const rows = page.getByTestId("shop-card-price-row").filter({ has: page.getByTestId("shop-original-price") });
    await expect(rows.first()).toBeVisible();
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index += 1) {
      await assertPriceClearOfHeart(rows.nth(index));
    }
  });
});
