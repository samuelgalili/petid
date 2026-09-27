import { expect, test, type Page } from "@playwright/test";

/**
 * A new account used to die at "place order": the server answered 403 and the
 * checkout screen sent the person to /verify-email, so Cardcom was never
 * opened. Guests were already allowed through. Both must reach the payment
 * URL now, and the home banner must not say otherwise.
 */

const userId = "11111111-1111-4111-8111-111111111111";
const orderId = "22222222-2222-4222-8222-222222222222";
const cartProductId = "d3affade-756c-4ada-bf9a-7e441b69f576";
const otherProductId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const cardcomUrl = "https://secure.cardcom.solutions/External/LowProfile.aspx?LowProfileCode=test";

type CatalogueMode = "present" | "empty" | "failed" | "hidden";

function catalogueProduct(id: string) {
  return {
    id,
    name: id === cartProductId ? "קוואטרו כלבים אדולט מיני עוף" : "מוצר אחר",
    price: 199,
    image_url: "/placeholder.svg",
    in_stock: true,
  };
}

const unverifiedUser = {
  id: userId,
  email: "new@example.com",
  full_name: "דנה כהן",
  email_verified: false,
  email_verified_at: null,
};

const order = {
  id: orderId,
  order_number: "MP-1001",
  items: [{
    id: "line-1",
    product_id: "d3affade-756c-4ada-bf9a-7e441b69f576",
    product_name: "קוואטרו כלבים אדולט מיני עוף",
    product_image: "/placeholder.svg",
    price: 199,
    quantity: 1,
  }],
  shipping_address: {},
  payment_method: "credit-card",
  payment_status: "pending",
  subtotal: 199,
  shipping: 0,
  tax: 0,
  discount_amount: 0,
  cash_on_delivery_fee: 0,
  total: 199,
  order_date: "2026-09-27T00:00:00.000Z",
};

async function prepareCheckout(page: Page, signedIn: boolean, catalogue: CatalogueMode = "present") {
  const calls: string[] = [];
  await page.route("**/api/**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: {} });
      return;
    }
    await route.fulfill({ status: 404, json: { error: "unmocked" } });
  });
  await page.route("**/api/products*", async (route) => {
    if (catalogue === "empty") {
      await route.fulfill({ json: { products: [] } });
      return;
    }
    if (catalogue === "failed") {
      await route.fulfill({ status: 500, json: { error: "catalogue down" } });
      return;
    }
    const ids = catalogue === "hidden" ? [otherProductId] : [cartProductId];
    await route.fulfill({ json: { products: ids.map(catalogueProduct) } });
  });
  await page.route("**/api/auth/me", async (route) => {
    if (!signedIn) {
      await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
      return;
    }
    await route.fulfill({
      json: {
        user: unverifiedUser,
        profile: {
          id: userId,
          email: unverifiedUser.email,
          full_name: unverifiedUser.full_name,
          first_name: "דנה",
          last_name: "כהן",
          phone: null,
          city: null,
        },
        is_admin: false,
      },
    });
  });
  await page.route("**/api/me/pets", async (route) => {
    await route.fulfill({ json: { pets: [] } });
  });
  await page.route("**/api/me/shipping-profile", async (route) => {
    await route.fulfill({ status: signedIn ? 200 : 401, json: signedIn ? { profile: null } : { error: "Unauthorized" } });
  });
  await page.route("**/api/orders", async (route) => {
    calls.push(`order:${route.request().method()}`);
    await route.fulfill({ status: 201, json: { order, access_token: "guest-token" } });
  });
  await page.route("**/api/payments/shop", async (route) => {
    calls.push("payment");
    await route.fulfill({
      json: {
        success: true,
        order_id: orderId,
        payment_url: cardcomUrl,
      },
    });
  });
  await page.route("https://secure.cardcom.solutions/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><html lang=\"he\"><body><h1>Cardcom</h1></body></html>",
    });
  });
  await page.addInitScript((productId) => {
    localStorage.setItem("mipo-onboarding-complete", "true");
    localStorage.setItem("mipo-cart", JSON.stringify([{
      id: "line-1",
      productId,
      name: "קוואטרו כלבים אדולט מיני עוף",
      price: 199,
      image: "/placeholder.svg",
      quantity: 1,
    }]));
  }, cartProductId);
  return calls;
}

async function reachOrderButton(page: Page) {
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

async function reachCardcom(page: Page) {
  await reachOrderButton(page);
  await page.getByRole("button", { name: /בצע הזמנה/ }).click();
  await expect(page).toHaveURL(/secure\.cardcom\.solutions/);
  await expect(page.getByRole("heading", { name: "Cardcom" })).toBeVisible();
  expect(page.url()).not.toContain("/verify-email");
}

test.describe("unverified checkout reaches Cardcom", () => {
  test("a new customer with an unverified email is sent to payment", async ({ page }) => {
    const calls = await prepareCheckout(page, true);
    await reachCardcom(page);
    expect(calls).toEqual(["order:POST", "payment"]);
  });

  test("a guest is sent to payment as well", async ({ page }) => {
    const calls = await prepareCheckout(page, false);
    await reachCardcom(page);
    expect(calls).toEqual(["order:POST", "payment"]);
  });
});

test("an empty or failed catalogue does not disable checkout, and a hidden line does", async ({ page }) => {
  await prepareCheckout(page, false, "empty");
  await reachOrderButton(page);
  await expect(page.getByRole("button", { name: /בצע הזמנה/ })).toBeEnabled();
  await expect(page.getByText("המוצר אינו זמין כרגע")).toHaveCount(0);

  const failed = await page.context().newPage();
  await prepareCheckout(failed, false, "failed");
  await reachOrderButton(failed);
  await expect(failed.getByRole("button", { name: /בצע הזמנה/ })).toBeEnabled();
  await failed.close();

  const hidden = await page.context().newPage();
  await prepareCheckout(hidden, false, "hidden");
  await reachOrderButton(hidden);
  await expect(hidden.getByRole("button", { name: /בצע הזמנה/ })).toBeDisabled();
  await expect(hidden.getByText("המוצר אינו זמין כרגע").first()).toBeVisible();
  await hidden.close();
});

async function openHome(page: Page, health: Record<string, unknown> | "down") {
  await page.route("**/api/**", async (route) => {
    await route.fulfill({ json: {} });
  });
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      json: { user: unverifiedUser, profile: null, is_admin: false },
    });
  });
  await page.route("**/api/me/pets", async (route) => {
    await route.fulfill({ json: { pets: [] } });
  });
  await page.route("**/api/health", async (route) => {
    if (health === "down") {
      await route.abort();
      return;
    }
    await route.fulfill({ json: health });
  });
  await page.addInitScript((id) => {
    localStorage.setItem("mipo-onboarding-complete", "true");
    localStorage.setItem(`profile_prompt_snooze_until_${id}`, String(Date.now() + 86_400_000));
  }, userId);
  const healthSettled = health === "down"
    ? null
    : page.waitForResponse((response) => response.url().includes("/api/health"));
  await page.goto("/");
  await healthSettled;
  await expect(page.getByRole("heading", { name: /איך החבר שלך מרגיש/ })).toBeVisible();
}

test.describe("home copy matches checkout", () => {
  test("the banner does not say an order requires verification first", async ({ page }) => {
    await openHome(page, { ok: true, email: { configured: true } });
    await expect(page.getByText("אפשר להזמין גם לפני האימות")).toBeVisible();
    await expect(page.getByRole("button", { name: "שליחה חוזרת" })).toBeVisible();
    await expect(page.getByText("להזמנה צריך לאמת קודם")).toHaveCount(0);
  });

  test("the banner stays hidden when mail is not configured", async ({ page }) => {
    await openHome(page, { ok: true, email: { configured: false } });
    await expect(page.getByText("שלחנו מייל")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "שליחה חוזרת" })).toHaveCount(0);
  });

  test("the banner stays hidden when health does not say mail is configured", async ({ page }) => {
    await openHome(page, "down");
    await expect(page.getByText("שלחנו מייל")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "שליחה חוזרת" })).toHaveCount(0);
  });
});
