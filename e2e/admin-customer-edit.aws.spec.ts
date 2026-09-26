import { expect, test, type Page } from "@playwright/test";

/**
 * Correcting a customer's details from their card.
 *
 * The server tests prove what happens to which row. This proves the half that
 * only exists on screen: that the email of somebody who SIGNS IN with it is
 * not offered as an editable box which then fails on submit, and that it is
 * said why.
 */

const admin = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "ops@mipo.pet", display_name: "Owner", role: "admin",
  permissions: ["admin.full"], must_change_password: false,
};

const base = {
  identity_id: "id-1", shop_customer_id: "sc-1",
  email: "dana@example.com", full_name: "דנה כהן", phone: "0501234567",
  is_active: true, created_at: "2026-01-01T00:00:00.000Z",
  last_login_at: null, first_order_at: null, last_order_at: null, last_activity_at: null,
  orders_count: 0, paid_orders_count: 0, total_spent: 0, pets_count: 0,
};

const guest = { ...base, identity_kind: "guest", user_id: null };
const account = { ...base, identity_kind: "account", user_id: "99999999-9999-4999-8999-999999999999" };

async function openCard(page: Page, customer: typeof guest) {
  const sent: Array<Record<string, unknown>> = [];

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
    status: 200, contentType: "application/json", body: JSON.stringify({ products: [] }),
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

  // The EDIT lives under the Admin OS prefix - /api/admin/os/customers - which
  // the pattern above does not match. Mocking only the listing meant the PATCH
  // left the page entirely and the test failed with no request recorded.
  await page.route("**/api/admin/os/customers", async (route) => {
    sent.push(JSON.parse(route.request().postData() || "{}"));
    await route.fulfill({
      status: 200, contentType: "application/json", body: JSON.stringify({ customer }),
    });
  });

  await page.goto("/admin/customers");
  await page.getByText("דנה כהן").first().click();
  // The card is a page now, and the button says what it edits.
  await page.getByRole("button", { name: "עריכת פרטים" }).click();
  await expect(page.getByLabel("שם מלא")).toBeVisible();

  return sent;
}

test.describe("Editing a customer", () => {
  test.describe.configure({ mode: "serial" });

  test("a guest's details are all editable, and only what changed is sent", async ({ page }) => {
    const sent = await openCard(page, guest);

    await page.getByLabel("אימייל").fill("fixed@example.com");
    await page.getByRole("button", { name: "שמירה" }).click();

    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0]).toMatchObject({
      identity_id: "id-1",
      full_name: "דנה כהן",
      email: "fixed@example.com",
    });
  });

  test("an account's login address is not offered as an editable box", async ({ page }) => {
    // The server refuses it. A screen that lets somebody type into it and then
    // fails on submit is a screen that taught them the system is unreliable,
    // when what it actually did was protect an account.
    await openCard(page, account);

    await expect(page.getByLabel("אימייל")).toBeDisabled();
    await expect(page.getByText(/זו הכתובת שהלקוח מתחבר איתה/)).toBeVisible();

    // And the things that ARE theirs to correct still are.
    await expect(page.getByLabel("שם מלא")).toBeEnabled();
    await expect(page.getByLabel("טלפון")).toBeEnabled();
  });

  test("an account's unchanged email is not sent as an edit", async ({ page }) => {
    // A present `email` key means "change it", and the server refuses that for
    // an account - so sending the value back unchanged would turn saving a
    // phone number into a rejection.
    const sent = await openCard(page, account);

    await page.getByLabel("טלפון").fill("0507654321");
    await page.getByRole("button", { name: "שמירה" }).click();

    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0].phone).toBe("0507654321");
    expect(sent[0]).not.toHaveProperty("email");
  });

  test("a name of one letter cannot be saved", async ({ page }) => {
    const sent = await openCard(page, guest);

    await page.getByLabel("שם מלא").fill("א");
    await expect(page.getByRole("button", { name: "שמירה" })).toBeDisabled();
    await expect(page.getByText("שם חייב שתי אותיות לפחות")).toBeVisible();
    expect(sent).toHaveLength(0);
  });
});
