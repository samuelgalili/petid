import { expect, test, type Page } from "@playwright/test";

/**
 * Order 360.
 *
 * The server tests prove what the endpoint returns. This proves the half that
 * only exists on screen, and in particular the two things that would be
 * invisible if they broke:
 *
 *   - THE LINK. An order had no URL, so four Command Center cards and every
 *     order on a customer's card pointed at a parameter nobody read. Nothing
 *     errored; the wrong page just loaded. Every link into this screen is
 *     followed here to a rendered order.
 *   - THE HISTORY'S HONESTY. An empty stream under "מה קרה להזמנה" reads as
 *     "nothing happened to this order" when it means "nothing was recorded" -
 *     which is the state of every order older than the outbox. The warning has
 *     to be on screen, above the stream, before anybody concludes anything.
 */

const admin = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "ops@mipo.pet", display_name: "Owner", role: "admin",
  permissions: ["admin.full"], must_change_password: false,
};

const ORDER_ID = "aaaaaaaa-1111-4111-8111-111111111111";
const OTHER_ID = "bbbbbbbb-2222-4222-8222-222222222222";
const IDENTITY_ID = "dddddddd-1111-4111-8111-111111111111";

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

const baseOrder = {
  id: ORDER_ID,
  order_number: "MP-1024",
  status: "processing",
  payment_status: "awaiting_cod",
  payment_method: "cash-on-delivery",
  subtotal: 180, shipping: 39, tax: 0, discount_amount: 0, cash_on_delivery_fee: 0,
  total: 219,
  customer_name: "דנה כהן",
  customer_email: "dana@example.com",
  pet_name: "בלו",
  shipping_address: {
    fullName: "דנה כהן", address: "דיזנגוף 1", apartment: "4",
    city: "תל אביב", zipCode: "6111111", phone: "0521234567",
  },
  order_type: "regular",
  special_instructions: "להשאיר אצל השכן",
  order_date: hoursAgo(5),
  updated_at: hoursAgo(1),
  items: [] as unknown[],
  order_items: [
    {
      id: "item-1", product_name: "רויאל קנין רנאל", product_image: "",
      quantity: 2, price: 90, sku: "RC-REN-2",
    },
  ],
};

const customer = {
  identity_id: IDENTITY_ID,
  identity_kind: "account",
  email: "dana@example.com", full_name: "דנה כהן", phone: "0521234567",
  orders_count: 4, total_spent: 812, pets_count: 1,
};

const detail = {
  order: baseOrder,
  customer,
  events: [
    {
      id: "e1", type: "order.created", origin: "app", at: hoursAgo(5), payload: {},
    },
    {
      id: "e2", type: "order.status_changed", origin: "admin", at: hoursAgo(1),
      payload: { status: { from: "pending", to: "processing" } },
    },
  ],
  sibling_orders: [
    { id: OTHER_ID, order_number: "MP-0990", status: "delivered", payment_status: "paid", total: 143, placed_at: hoursAgo(700) },
  ],
  history_covers_order: true,
};

const json = (body: unknown, status = 200) => ({
  status, contentType: "application/json", body: JSON.stringify(body),
});

type Overrides = Partial<typeof detail>;

async function openOrder(page: Page, path = `/admin/orders/${ORDER_ID}`, overrides: Overrides = {}) {
  await page.route("**/api/auth/me", (route) => route.fulfill(json({ error: "Unauthorized" }, 401)));
  await page.route("**/api/reports", (route) => route.fulfill(json({ reports: [] })));
  await page.route("**/api/admin/me", (route) => route.fulfill(json({ admin })));
  await page.route("**/api/admin/os/home", (route) => route.fulfill(json({
    numbers: {
      pending_orders: 0, revenue_today: 0, revenue_yesterday: 0,
      unpublished_products: 0, new_customers_this_week: 0,
    },
    board: {
      exception: { total: 0, items: [] }, approval: { total: 0, items: [] },
      in_progress: { total: 0, items: [] }, completed: { total: 0, items: [] },
    },
    activity: [], health: [],
  })));

  // The single order first: `**/api/admin/orders*` matches the detail URL too.
  await page.route("**/api/admin/orders/*", (route) => {
    const id = new URL(route.request().url()).pathname.split("/").pop();
    if (id === OTHER_ID) {
      return route.fulfill(json({
        ...detail,
        order: { ...baseOrder, id: OTHER_ID, order_number: "MP-0990", status: "delivered", payment_status: "paid" },
        sibling_orders: [],
      }));
    }
    return route.fulfill(json({ ...detail, ...overrides }));
  });
  await page.route("**/api/admin/orders*", (route) => route.fulfill(json({
    orders: [baseOrder],
  })));
  await page.route("**/api/admin/customers/*", (route) => route.fulfill(json({
    customer: { ...customer, created_at: hoursAgo(9000), last_login_at: hoursAgo(2) },
    orders: [], pets: [], notes: [],
    orders_truncated: false, orders_shown: 0, archived_pets_count: 0,
  })));

  await page.goto(path);
}

test.describe("Order 360", () => {
  test("the order is a page of its own, with what was bought and what is owed", async ({ page }) => {
    await openOrder(page);

    await expect(page.getByRole("heading", { name: "MP-1024" })).toBeVisible();
    await expect(page.getByText("רויאל קנין רנאל")).toBeVisible();
    await expect(page.getByText("להשאיר אצל השכן")).toBeVisible();
    await expect(page.getByText("דיזנגוף 1, דירה 4, תל אביב, 6111111")).toBeVisible();
  });

  test("money the courier still has to collect is said out loud", async ({ page }) => {
    // A cash-on-delivery parcel handed over without collecting is unpaid stock
    // out of the door. The total alone does not say that; this does.
    await openOrder(page);
    await expect(page.getByText(/טרם נגבו/)).toBeVisible();
  });

  test("an order with no recorded events does not read as an order nothing happened to", async ({ page }) => {
    /*
     * THE ONE THIS SCREEN MUST NOT GET WRONG. Every order placed before the
     * outbox existed has no events. Under a heading reading "מה קרה להזמנה" an
     * empty list is read as an answer, so somebody checking when a refund was
     * approved concludes it never was.
     */
    await openOrder(page, `/admin/orders/${ORDER_ID}`, { events: [], history_covers_order: false });

    await expect(page.getByText(/לא נרשמו אירועים להזמנה הזו/)).toBeVisible();
    await expect(page.getByText(/אין פירוש שלא קרה בה דבר/)).toBeVisible();
  });

  test("a history that begins after the order says its beginning is missing", async ({ page }) => {
    // Worse than an empty stream, because it looks complete.
    await openOrder(page, `/admin/orders/${ORDER_ID}`, {
      events: [detail.events[1]],
      history_covers_order: false,
    });

    await expect(page.getByText(/התיעוד מתחיל אחרי מועד ההזמנה/)).toBeVisible();
  });

  test("the history says who moved the order, which is why the outbox was read at all", async ({ page }) => {
    await openOrder(page);

    await expect(page.getByText("הסטטוס שונה")).toBeVisible();
    // The transition and the actor, both. "shipped" alone does not answer the
    // question anybody actually asks about a status they do not remember
    // changing.
    await expect(page.getByText(/ממתין → באריזה/)).toBeVisible();
    await expect(page.getByText(/מנהל/).first()).toBeVisible();
  });

  test("the customer is reachable from the order", async ({ page }) => {
    // The panel this replaces printed a name as text. The next question after a
    // failed payment is always about the person, and there was no way there.
    await openOrder(page);

    await page.getByRole("button", { name: /לכרטיס/ }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/customers/${IDENTITY_ID}`));
  });

  test("their other orders open, so a repeat customer is one click deep", async ({ page }) => {
    await openOrder(page);

    await page.getByRole("button", { name: /MP-0990/ }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/orders/${OTHER_ID}`));
    await expect(page.getByRole("heading", { name: "MP-0990" })).toBeVisible();
  });

  test("a link still holding ?order= lands on the order, not on the list", async ({ page }) => {
    /*
     * The shape four Command Center cards and every customer-card order used
     * for a year. The sources are fixed, but a bookmark, an open tab, or a card
     * rendered just before a deploy still carries it - and it used to load the
     * unfiltered list.
     */
    await openOrder(page, `/admin/orders?order=${ORDER_ID}`);

    await expect(page).toHaveURL(new RegExp(`/admin/orders/${ORDER_ID}`));
    await expect(page.getByRole("heading", { name: "MP-1024" })).toBeVisible();
  });

  test("the queue hands over its own order, so next follows the filter", async ({ page }) => {
    // The same contract the customer card uses: without it, "next" jumps to
    // whatever a canonical sort says rather than to the next row the admin was
    // looking at.
    await openOrder(page, `/admin/orders/${ORDER_ID}?list=${ORDER_ID},${OTHER_ID}`);

    await expect(page.getByRole("button", { name: "הזמנה קודמת" })).toBeDisabled();
    await page.getByRole("button", { name: "הזמנה הבאה" }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/orders/${OTHER_ID}`));
  });

  test("an order that is not there says so instead of rendering an empty one", async ({ page }) => {
    await page.route("**/api/auth/me", (route) => route.fulfill(json({ error: "Unauthorized" }, 401)));
    await page.route("**/api/reports", (route) => route.fulfill(json({ reports: [] })));
    await page.route("**/api/admin/me", (route) => route.fulfill(json({ admin })));
    await page.route("**/api/admin/orders/*", (route) =>
      route.fulfill(json({ error: "Order not found" }, 404)));

    await page.goto(`/admin/orders/${ORDER_ID}`);

    await expect(page.getByText("ההזמנה לא נמצאה")).toBeVisible();
    // Not a heading with an empty order number above an empty basket, which is
    // what a page that trusts its own fetch renders on a 404.
    await expect(page.getByText("₪0")).toHaveCount(0);
  });
});
