import { expect, test } from "@playwright/test";

/**
 * The confirmation mail opens one order on a browser that never checked out.
 * The token arrives on the link, leaves as a header, and does not stay in the address bar.
 */

const ORDER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORDER_NUMBER = "MIPO-E2E-TRACK";
const LINK_TOKEN = "ot1.email-link-token";

const order = {
  id: ORDER_ID,
  order_number: ORDER_NUMBER,
  status: "processing",
  payment_status: "paid",
  payment_method: "credit-card",
  items: [],
  order_items: [],
  shipping_address: {},
  customer_name: "דנה",
  customer_email: "dana@example.com",
  subtotal: 80,
  shipping: 25,
  tax: 0,
  discount_amount: 10,
  cash_on_delivery_fee: 0,
  total: 95,
  order_date: "2026-10-01T08:00:00.000Z",
  tracking_number: null,
};

test("a confirmation link opens the order without a saved guest token", async ({ page }) => {
  let seenHeader = "";
  let requestUrl = "";

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
  await page.route(`**/api/orders/${ORDER_NUMBER}**`, async (route) => {
    seenHeader = route.request().headers()["x-order-access-token"] || "";
    requestUrl = route.request().url();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ order }),
    });
  });

  await page.goto(`/order-tracking/${ORDER_NUMBER}?access_token=${encodeURIComponent(LINK_TOKEN)}`);

  await expect(page.getByText(ORDER_NUMBER, { exact: true })).toBeVisible();
  expect(seenHeader).toBe(LINK_TOKEN);
  expect(requestUrl.includes("access_token")).toBe(false);
  expect(requestUrl.includes(LINK_TOKEN)).toBe(false);
  await expect(page).not.toHaveURL(/access_token=/);
  await expect.poll(async () => page.evaluate(() => (
    localStorage.getItem("mipo_order_access_tokens") || ""
  ))).toContain(LINK_TOKEN);
});

test("opening the mail link keeps a guest token already saved at checkout", async ({ page }) => {
  const guestToken = "guest-opaque-token";
  await page.addInitScript(({ orderId, orderNumber, token }) => {
    localStorage.setItem("mipo_order_access_tokens", JSON.stringify({
      [orderId]: token,
      [orderNumber]: token,
    }));
  }, { orderId: ORDER_ID, orderNumber: ORDER_NUMBER, token: guestToken });

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
  await page.route(`**/api/orders/${ORDER_NUMBER}**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ order }),
    });
  });

  await page.goto(`/order-tracking/${ORDER_NUMBER}?access_token=${encodeURIComponent(LINK_TOKEN)}`);
  await expect(page.getByText(ORDER_NUMBER, { exact: true })).toBeVisible();
  // The page drops its copy of the mail token only after it has decided
  // whether to keep the guest token from checkout.
  await expect.poll(async () => page.evaluate(
    (key) => sessionStorage.getItem(key),
    `mipo_order_link_token:${ORDER_NUMBER}`,
  )).toBeNull();
  const stored = await page.evaluate(() => localStorage.getItem("mipo_order_access_tokens") || "");
  expect(stored).toContain(guestToken);
  expect(stored.includes(LINK_TOKEN)).toBe(false);
});

test("a tracking link without a token cannot display the order", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem("mipo_order_access_tokens");
  });
  await page.route("**/api/**", (route) => route.fulfill({
    status: 404,
    contentType: "application/json",
    body: JSON.stringify({ error: "Order not found" }),
  }));

  await page.goto(`/order-tracking/${ORDER_NUMBER}`);
  await expect(page.getByRole("heading", { name: "לא ניתן להציג את ההזמנה" })).toBeVisible();
});
