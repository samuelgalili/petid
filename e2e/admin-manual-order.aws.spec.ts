import { expect, test, type Page } from "@playwright/test";

import { SHIPPING_FEE } from "../src/lib/shipping";

/**
 * An order taken by an admin, from the screen.
 *
 * The server tests prove what the endpoint does with a body. This proves what
 * the browser SENDS, and three things that cannot be checked any other way:
 *
 *   * that the total the screen shows is the total it sends, computed with the
 *     same delivery fee the server charges. Until this week it was not: both
 *     sides had the fee typed in as a literal and one of them said 25 while
 *     the owner's price was 39. Every order this screen sent would have been
 *     refused by the expected_total guard.
 *   * that an attested payment cannot leave without saying how the money
 *     arrived. The server refuses it, but a screen that lets an admin press
 *     the button and then fails is a screen that teaches them to retry.
 *   * that the order is sent for the CUSTOMER, not for the admin placing it.
 */

const admin = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "ops@mipo.pet",
  display_name: "Owner",
  role: "admin",
  permissions: ["admin.full"],
  must_change_password: false,
};

const customer = {
  identity_id: "id-1",
  identity_kind: "account",
  user_id: "99999999-9999-4999-8999-999999999999",
  shop_customer_id: "sc-1",
  email: "dana@example.com",
  full_name: "דנה כהן",
  phone: "0501234567",
  is_active: true,
  created_at: "2026-01-01T00:00:00.000Z",
  last_login_at: null,
  first_order_at: null,
  last_order_at: null,
  last_activity_at: null,
  orders_count: 0,
  paid_orders_count: 0,
  total_spent: 0,
  pets_count: 0,
};

// ₪79 so a single unit sits UNDER the free-delivery threshold: the interesting
// arithmetic is the one that charges for delivery.
const product = {
  id: "p-1",
  name: "קוואטרו אדולט עוף 7 קילו",
  description: "מזון יבש מלא לכלבים בוגרים",
  price: 79,
  original_price: null,
  sale_price: null,
  image_url: "/placeholder.svg",
  images: null,
  category: "אוכל יבש",
  category_id: "c1",
  category_name: "אוכל יבש",
  pet_type: "dog",
  in_stock: true,
  is_featured: false,
  business_id: null,
  sku: null,
  brand: "QUATTRO",
  created_at: "2026-01-01T00:00:00.000Z",
  source: "manual",
};

type Sent = { key: string | undefined; body: Record<string, unknown> };

async function openCard(page: Page) {
  const sent: Sent[] = [];

  await page.route("**/api/auth/me", (route) => route.fulfill({
    status: 401, contentType: "application/json", body: JSON.stringify({ error: "Unauthorized" }),
  }));
  await page.route("**/api/reports", (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({ reports: [] }),
  }));
  await page.route("**/api/admin/me", (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({ admin }),
  }));
  await page.route("**/api/products*", (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({ products: [product] }),
  }));
  await page.route("**/api/admin/customers/*", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      customer, orders: [], pets: [], notes: [],
      orders_truncated: false, orders_shown: 0, archived_pets_count: 0,
    }),
  }));
  await page.route("**/api/admin/customers*", (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({ customers: [customer] }),
  }));
  await page.route("**/api/coupons/validate", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ coupon: { id: "c-1", code: "MIPO10", discount_type: "percentage", discount_value: 10 } }),
  }));

  await page.route("**/api/admin/os/orders", async (route) => {
    const request = route.request();
    sent.push({
      key: request.headers()["idempotency-key"],
      body: JSON.parse(request.postData() || "{}"),
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        order: {
          id: "o-1", order_number: "MIPO-1",
          payment_status: JSON.parse(request.postData() || "{}").payment_method === "cash-on-delivery"
            ? "awaiting_cod" : "paid",
          total: 118,
        },
      }),
    });
  });

  await page.goto("/admin/customers");
  await page.getByText("דנה כהן").first().click();
  await expect(page.getByRole("button", { name: "הזמנה חדשה" })).toBeVisible();

  return sent;
}

const addOneProduct = async (page: Page) => {
  await page.getByRole("button", { name: "הזמנה חדשה" }).click();
  await page.getByLabel("מוצרים").fill("קוואטרו");
  await page.getByRole("button", { name: /קוואטרו אדולט/ }).click();
};

/**
 * Fill what the server demands before it will write an order.
 *
 * Name, email and phone arrive prefilled from the customer record; street,
 * house number, city and postcode do not, because nothing in the system knows
 * them until somebody has had a parcel sent. The order CANNOT be placed
 * without them - normalizeShippingAddress throws 400 - which is exactly what
 * the first version of this screen got wrong.
 */
const fillAddress = async (page: Page) => {
  await page.getByLabel("רחוב").fill("הרצל");
  await page.getByLabel("מספר בית").fill("12");
  await page.getByLabel("עיר").fill("תל אביב");
  await page.getByLabel("מיקוד").fill("6100000");
  await page.getByRole("checkbox").check();
};

test.describe("An order taken by hand", () => {
  test.describe.configure({ mode: "serial" });

  test("the total it shows is the total it sends", async ({ page }) => {
    const sent = await openCard(page);
    await addOneProduct(page);

    // ₪79 of goods plus delivery, and delivery is charged because the basket
    // is under the threshold. The same number on the screen and in the body.
    await expect(page.getByText(`₪${79 + SHIPPING_FEE}`)).toBeVisible();

    await fillAddress(page);
    await page.getByLabel("איך הכסף הגיע?").fill("ביט ליוסי");
    await page.getByRole("button", { name: "פתיחת הזמנה" }).click();

    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0].body).toMatchObject({
      expected_total: 79 + SHIPPING_FEE,
      payment_method: "admin-attested",
      payment_attestation_note: "ביט ליוסי",
      // FOR THE CUSTOMER, never for the admin placing it. An order carrying
      // the admin's id never appears on the customer's own card.
      customer_user_id: customer.user_id,
    });
    expect(sent[0].body.customer_user_id).not.toBe(admin.id);
  });

  test("an attested payment cannot be sent without saying how the money arrived", async ({ page }) => {
    // The server refuses this too. The screen refusing it FIRST is what stops
    // an admin pressing a button, getting an error, and pressing it again.
    const sent = await openCard(page);
    await addOneProduct(page);

    await fillAddress(page);
    await expect(page.getByRole("button", { name: "פתיחת הזמנה" })).toBeDisabled();
    await page.getByLabel("איך הכסף הגיע?").fill("מזומן בחנות");
    await expect(page.getByRole("button", { name: "פתיחת הזמנה" })).toBeEnabled();
    expect(sent).toHaveLength(0);
  });

  test("an order with no lines cannot be sent at all", async ({ page }) => {
    const sent = await openCard(page);
    await page.getByRole("button", { name: "הזמנה חדשה" }).click();

    // A payment method needing NO note, chosen deliberately. The dialog opens
    // on the attested option with an empty note, so the button is disabled for
    // that reason alone - and an earlier version of this test passed with the
    // empty-order check deleted, because the attestation check was masking it.
    await page.getByRole("radio", { name: /עדיין לא שולם/ }).click();

    await expect(page.getByRole("button", { name: "פתיחת הזמנה" })).toBeDisabled();
    expect(sent).toHaveLength(0);
  });

  test("a coupon is applied to the total and sent by code", async ({ page }) => {
    const sent = await openCard(page);
    await addOneProduct(page);

    await page.getByLabel("קופון").fill("MIPO10");
    await page.getByRole("button", { name: "החל" }).click();
    await expect(page.getByText("הקופון MIPO10 הוחל")).toBeVisible();

    // 10% of ₪79 is ₪7.90, and delivery is still charged because the basket is
    // still under the threshold.
    await expect(page.getByText("−₪7.9")).toBeVisible();

    await fillAddress(page);
    await page.getByLabel("איך הכסף הגיע?").fill("ביט");
    await page.getByRole("button", { name: "פתיחת הזמנה" }).click();

    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0].body).toMatchObject({
      coupon_code: "MIPO10",
      expected_total: Math.round((79 - 7.9 + SHIPPING_FEE) * 100) / 100,
    });
  });

  test("a hand-typed final price travels as a difference, not as the total", async ({ page }) => {
    // THE POINT OF THE WHOLE DESIGN. The server computes the total from the
    // catalogue and refuses an order that disagrees, so what the screen sends
    // is the DIFFERENCE - which keeps "₪118 of goods with ₪18 off" on the
    // order rather than flattening it into "₪100 of goods".
    const sent = await openCard(page);
    await addOneProduct(page);

    const computed = 79 + SHIPPING_FEE;
    await page.getByLabel("מחיר סופי ללקוח").fill("100");
    await expect(page.getByText("הנחה ידנית")).toBeVisible();

    await page.getByLabel(/למה ההנחה/).fill("לקוח ותיק");
    await fillAddress(page);
    await page.getByLabel("איך הכסף הגיע?").fill("ביט");
    await page.getByRole("button", { name: "פתיחת הזמנה" }).click();

    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0].body).toMatchObject({
      admin_adjustment: Math.round((100 - computed) * 100) / 100,
      admin_adjustment_reason: "לקוח ותיק",
      expected_total: 100,
    });
    // Never the total itself. That field does not exist in the payload.
    expect(sent[0].body).not.toHaveProperty("total");
  });

  test("a price change cannot be sent without a reason", async ({ page }) => {
    const sent = await openCard(page);
    await addOneProduct(page);
    await fillAddress(page);
    await page.getByLabel("איך הכסף הגיע?").fill("ביט");
    await expect(page.getByRole("button", { name: "פתיחת הזמנה" })).toBeEnabled();

    await page.getByLabel("מחיר סופי ללקוח").fill("50");
    await expect(page.getByRole("button", { name: "פתיחת הזמנה" })).toBeDisabled();

    await page.getByLabel(/למה ההנחה/).fill("תיאום טלפוני");
    await expect(page.getByRole("button", { name: "פתיחת הזמנה" })).toBeEnabled();
    expect(sent).toHaveLength(0);
  });

  test("an empty price box charges what it comes to", async ({ page }) => {
    // Clearing the box must return the order to the computed price, not adjust
    // it to zero - which is why the typed value is kept as text rather than as
    // a number that an empty string would turn into 0.
    const sent = await openCard(page);
    await addOneProduct(page);
    await page.getByLabel("מחיר סופי ללקוח").fill("100");
    await page.getByLabel("מחיר סופי ללקוח").fill("");

    await expect(page.getByText("הנחה ידנית")).toHaveCount(0);
    await fillAddress(page);
    await page.getByLabel("איך הכסף הגיע?").fill("ביט");
    await page.getByRole("button", { name: "פתיחת הזמנה" }).click();

    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0].body.admin_adjustment).toBeUndefined();
    expect(sent[0].body.expected_total).toBe(79 + SHIPPING_FEE);
  });

  test("placing the order produces a label the warehouse can ship from", async ({ page }) => {
    await openCard(page);
    await addOneProduct(page);
    await fillAddress(page);
    await page.getByLabel("הערה למשלוח").fill("להשאיר אצל השכן בדירה 4");
    await page.getByLabel("איך הכסף הגיע?").fill("ביט");
    await page.getByRole("button", { name: "פתיחת הזמנה" }).click();

    await expect(page.getByText("תווית משלוח · MIPO-1")).toBeVisible();

    // SCOPED TO THE LABEL, not to the page. The customer's name is on the list
    // row and on the card behind it too, so an unscoped assertion passes when
    // the label is empty - and matches three elements, which is how this was
    // caught.
    const label = page.locator("#mipo-shipping-label");
    await expect(label).toBeVisible();

    // Everything a courier reads, and everything a picker packs.
    await expect(label.getByText("דנה כהן")).toBeVisible();
    await expect(label.getByText(/הרצל 12/)).toBeVisible();
    await expect(label.getByText(/תל אביב/)).toBeVisible();
    await expect(label.getByText("0501234567")).toBeVisible();
    await expect(label.getByText("להשאיר אצל השכן בדירה 4")).toBeVisible();
    await expect(label.getByText(/קוואטרו אדולט/)).toBeVisible();

    // THE LINE THAT COSTS MONEY IF IT IS WRONG. This order was paid up front,
    // so nobody must ask the customer for money at their door.
    await expect(label.getByText("שולם — לא לגבות")).toBeVisible();
    await expect(label.getByText("לגבות מהלקוח")).toHaveCount(0);
  });

  test("a cash-on-delivery label says what to collect", async ({ page }) => {
    await openCard(page);
    await addOneProduct(page);
    await fillAddress(page);
    await page.getByRole("radio", { name: /מזומן בעת המסירה/ }).click();
    await page.getByRole("button", { name: "פתיחת הזמנה" }).click();

    const label = page.locator("#mipo-shipping-label");
    await expect(label.getByText("לגבות מהלקוח")).toBeVisible();
    await expect(label.getByText("₪118")).toBeVisible();
    await expect(label.getByText("שולם — לא לגבות")).toHaveCount(0);
  });

  test("the key belongs to the order, not to the click", async ({ page }) => {
    // Same rule as the new-customer dialog, and the same invisible failure: a
    // key minted per click looks identical on screen and removes the whole
    // protection. A phone order sent twice is a warehouse picking twice.
    //
    // BOTH HALVES ARE TESTED IN ONE OPEN DIALOG, because that is where the
    // mechanism lives. An earlier version submitted, let the dialog close, and
    // reopened it - which mints a fresh key through remounting no matter what
    // resetKey does, so it passed with resetKey emptied out.
    //
    // The first submission is refused, which keeps the dialog open.
    // Every submission is REFUSED. A success closes the dialog, and the whole
    // point is to make three submissions from one open dialog - the mechanism
    // lives in the key held across them.
    const sent: Array<{ key: string | undefined }> = [];

    // REGISTERED AFTER openCard, deliberately. Playwright matches routes in
    // reverse registration order, so openCard's own handler for this same
    // pattern would win and answer 200 to everything - which closes the dialog
    // after the first submit and makes the retry untestable.
    await openCard(page);
    await page.route("**/api/admin/os/orders", async (route) => {
      sent.push({ key: route.request().headers()["idempotency-key"] });
      await route.fulfill({
        status: 500, contentType: "application/json", body: JSON.stringify({ error: "nope" }),
      });
    });

    await addOneProduct(page);
    await fillAddress(page);
    await page.getByLabel("איך הכסף הגיע?").fill("ביט");

    await page.getByRole("button", { name: "פתיחת הזמנה" }).click();
    await expect.poll(() => sent.length).toBe(1);

    // A RETRY of the same order: nothing changed, so it is the same request
    // and must carry the same key - otherwise the server cannot tell a retry
    // from a second order.
    await page.getByRole("button", { name: "פתיחת הזמנה" }).click();
    await expect.poll(() => sent.length).toBe(2);
    expect(sent[1].key).toBe(sent[0].key);

    // A DIFFERENT order: one more unit. The server answers a reused key
    // carrying a different body with 409, so this has to be a new key.
    await page.getByRole("button", { name: "עוד" }).click();
    await page.getByRole("button", { name: "פתיחת הזמנה" }).click();
    await expect.poll(() => sent.length).toBe(3);
    expect(sent[0].key).toBeTruthy();
    expect(sent[2].key).not.toBe(sent[0].key);
  });
});
