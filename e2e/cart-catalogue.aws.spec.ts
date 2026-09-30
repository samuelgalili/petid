import { expect, test, type Page } from "@playwright/test";

/**
 * A cart line past the first 200 catalogue rows must still be buyable, and a
 * 409 PRODUCT_UNAVAILABLE drops that line so checkout can continue.
 */

const lateId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const goneId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const keepId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const orderId = "22222222-2222-4222-8222-222222222222";
const cardcomUrl = "https://secure.cardcom.solutions/External/LowProfile.aspx?LowProfileCode=catalogue";

function row(id: string, name: string, price = 40) {
  return {
    id,
    name,
    price,
    image_url: "/placeholder.svg",
    in_stock: true,
  };
}

async function seedCart(page: Page, lines: Array<{ productId: string; name: string; price?: number }>) {
  await page.addInitScript((items) => {
    localStorage.setItem("mipo-onboarding-complete", "true");
    localStorage.setItem("mipo-cart", JSON.stringify(items));
  }, lines.map((line) => ({
    id: `line-${line.productId}`,
    productId: line.productId,
    name: line.name,
    price: line.price ?? 40,
    image: "/placeholder.svg",
    quantity: 1,
  })));
}

async function mockGuest(page: Page) {
  await page.route("**/api/**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: {} });
      return;
    }
    await route.fulfill({ status: 404, json: { error: "unmocked" } });
  });
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
  });
  await page.route("**/api/me/shipping-profile", async (route) => {
    await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
  });
}

async function fillShipping(page: Page) {
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "כתובת למשלוח" })).toBeVisible();
  await page.getByLabel(/שם מלא/).fill("דנה כהן");
  await page.getByLabel(/^אימייל/).fill("new@example.com");
  await page.getByLabel(/מספר טלפון/).fill("050-123-4567");
  await page.getByLabel(/^רחוב/).fill("הרצל");
  await page.getByLabel(/מס׳ בית/).fill("12");
  await page.getByLabel(/^עיר/).fill("תל אביב");
  await page.getByLabel(/מיקוד/).fill("12345");
  await page.getByRole("checkbox").click();
  await page.getByTestId("checkout-continue").click();
  await expect(page.getByTestId("checkout-payment-heading")).toBeVisible();
  await page.getByTestId("checkout-continue").click();
  await expect(page.getByRole("button", { name: /בצע הזמנה/ })).toBeVisible();
}

test("a cart line past the first 200 products stays available", async ({ page }) => {
  await mockGuest(page);
  await seedCart(page, [{ productId: lateId, name: "מוצר בסוף הקטלוג", price: 40 }]);
  const requestedOffsets: string[] = [];
  await page.route("**/api/products*", async (route) => {
    const url = new URL(route.request().url());
    const offset = url.searchParams.get("offset") || "0";
    requestedOffsets.push(offset);
    if (offset === "0") {
      await route.fulfill({
        json: {
          products: Array.from({ length: 200 }, (_, index) => row(`early-${index}`, `מוצר ${index}`)),
          total: 201,
          limit: 200,
          offset: 0,
        },
      });
      return;
    }
    await route.fulfill({
      json: {
        products: [row(lateId, "מוצר בסוף הקטלוג")],
        total: 201,
        limit: 200,
        offset: 200,
      },
    });
  });

  const secondPage = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname.endsWith("/api/products") && url.searchParams.get("offset") === "200";
  });
  await fillShipping(page);
  await secondPage;
  await expect(page.getByRole("heading", { name: "מוצר בסוף הקטלוג" })).toBeVisible();
  await expect(page.getByText("המוצר אינו זמין כרגע")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /בצע הזמנה/ })).toBeEnabled();
  expect(requestedOffsets).toContain("200");
});

test("PRODUCT_UNAVAILABLE removes that line and checkout continues", async ({ page }) => {
  await mockGuest(page);
  await seedCart(page, [
    { productId: goneId, name: "מוצר שנעלם", price: 50 },
    { productId: keepId, name: "מוצר שנשאר", price: 40 },
  ]);
  await page.route("**/api/products*", async (route) => {
    await route.fulfill({
      json: {
        products: [row(goneId, "מוצר שנעלם", 50), row(keepId, "מוצר שנשאר", 40)],
      },
    });
  });
  await page.route("**/api/orders", async (route) => {
    const body = route.request().postDataJSON() as { items?: Array<{ product_id?: string; id?: string }> };
    const ids = (body.items || []).map((item) => item.product_id || item.id);
    if (ids.includes(goneId)) {
      await route.fulfill({
        status: 409,
        json: {
          error: "המוצר אינו זמין לרכישה. אפשר להמשיך עם שאר הפריטים בעגלה.",
          details: { code: "PRODUCT_UNAVAILABLE", product_id: goneId },
        },
      });
      return;
    }
    await route.fulfill({
      status: 201,
      json: {
        order: {
          id: orderId,
          order_number: "MP-1002",
          items: [{
            id: "line-keep",
            product_id: keepId,
            product_name: "מוצר שנשאר",
            product_image: "/placeholder.svg",
            price: 40,
            quantity: 1,
          }],
          shipping_address: {},
          payment_method: "credit-card",
          payment_status: "pending",
          subtotal: 40,
          shipping: 0,
          tax: 0,
          discount_amount: 0,
          cash_on_delivery_fee: 0,
          total: 40,
          order_date: "2026-09-30T00:00:00.000Z",
        },
        access_token: "guest-token",
      },
    });
  });
  await page.route("**/api/payments/shop", async (route) => {
    await route.fulfill({ json: { success: true, order_id: orderId, payment_url: cardcomUrl } });
  });
  await page.route("https://secure.cardcom.solutions/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><html lang=\"he\"><body><h1>Cardcom</h1></body></html>",
    });
  });

  await fillShipping(page);
  await page.getByRole("button", { name: /בצע הזמנה/ }).click();
  await expect(page.getByTestId("removed-unavailable")).toContainText("מוצר שנעלם הוסר מהעגלה כי הוא כבר לא זמין");
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByRole("heading", { name: "מוצר שנעלם" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "מוצר שנשאר" })).toBeVisible();
  await expect(page.getByRole("button", { name: /בצע הזמנה/ })).toBeEnabled();

  await page.getByRole("button", { name: /בצע הזמנה/ }).click();
  await expect(page).toHaveURL(/secure\.cardcom\.solutions/);
});

test("removing the last unavailable line returns to the cart", async ({ page }) => {
  await mockGuest(page);
  await seedCart(page, [{ productId: goneId, name: "מוצר שנעלם", price: 50 }]);
  await page.route("**/api/products*", async (route) => {
    await route.fulfill({ json: { products: [row(goneId, "מוצר שנעלם", 50)] } });
  });
  await page.route("**/api/orders", async (route) => {
    await route.fulfill({
      status: 409,
      json: {
        error: "המוצר אינו זמין לרכישה. אפשר להמשיך עם שאר הפריטים בעגלה.",
        details: { code: "PRODUCT_UNAVAILABLE", product_id: goneId },
      },
    });
  });

  await fillShipping(page);
  await page.getByRole("button", { name: /בצע הזמנה/ }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByTestId("removed-unavailable")).toContainText("מוצר שנעלם הוסר מהעגלה כי הוא כבר לא זמין");
  await expect(page.getByRole("heading", { name: "העגלה שלך ריקה" })).toBeVisible();
});
