import { expect, test, type Page } from "@playwright/test";

/**
 * The customer card says what it does not know.
 *
 * Two numbers on this card used to describe a different set from the list they
 * sat above: an order count over every order, printed above a timeline cut at
 * a hundred, and a pet count over live animals, printed above a list that
 * included archived ones. The server tests pin the numbers. These pin the
 * only thing that matters to the person reading the screen - that the screen
 * SAYS so.
 */

const admin = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "ops@mipo.pet",
  display_name: "Owner",
  role: "admin",
  permissions: ["admin.full"],
  must_change_password: false,
};

const IDENTITY_ID = "22222222-2222-4222-8222-222222222222";

const customer = {
  identity_id: IDENTITY_ID,
  identity_kind: "account" as const,
  user_id: IDENTITY_ID,
  shop_customer_id: null,
  email: "dana@example.com",
  full_name: "דנה כהן",
  phone: "0501234567",
  is_active: true,
  created_at: "2024-01-01T00:00:00.000Z",
  last_login_at: null,
  first_order_at: "2024-01-02T00:00:00.000Z",
  last_order_at: "2026-09-01T00:00:00.000Z",
  last_activity_at: "2026-09-01T00:00:00.000Z",
  orders_count: 137,
  paid_orders_count: 137,
  total_spent: 12000,
  // Two live animals. The third below is archived and is NOT counted here.
  pets_count: 2,
};

const pet = (id: string, name: string, archived: boolean) => ({
  id,
  name,
  type: "dog",
  breed: null,
  gender: "female",
  weight: null,
  avatar_url: null,
  birth_date: null,
  medical_conditions: [],
  archived,
  archived_at: archived ? "2026-02-01T00:00:00.000Z" : null,
});

async function mockCard(page: Page, detail: Record<string, unknown>) {
  await page.route("**/api/auth/me", (route) => route.fulfill({
    status: 401, contentType: "application/json", body: JSON.stringify({ error: "Unauthorized" }),
  }));
  await page.route("**/api/reports", (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({ reports: [] }),
  }));
  await page.route("**/api/admin/me", (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({ admin }),
  }));
  // The detail route is registered first: its path is longer, and a single
  // glob for the list would otherwise swallow it.
  await page.route(`**/api/admin/customers/${IDENTITY_ID}`, (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify(detail),
  }));
  await page.route("**/api/admin/customers*", (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({ customers: [customer] }),
  }));

  await page.goto("/admin/customers");
  await page.getByText("דנה כהן").first().click();
}

test.describe("Customer 360 says what it does not know", () => {
  test.describe.configure({ mode: "serial" });

  test("a history cut at a hundred says how many it is showing", async ({ page }) => {
    await mockCard(page, {
      customer,
      orders: [],
      pets: [],
      notes: [],
      orders_truncated: true,
      orders_shown: 100,
      archived_pets_count: 0,
    });

    // The count and the total both have to be on screen: "showing some of
    // them" is not enough to stop somebody concluding an order is missing.
    const notice = page.getByText(/מוצגות 100 ההזמנות האחרונות מתוך 137/);
    await expect(notice).toBeVisible();
  });

  test("a history that fits says nothing", async ({ page }) => {
    await mockCard(page, {
      customer: { ...customer, orders_count: 4 },
      orders: [],
      pets: [],
      notes: [],
      orders_truncated: false,
      orders_shown: 4,
      archived_pets_count: 0,
    });

    // A warning shown when nothing is hidden is a warning people stop reading.
    await expect(page.getByText(/ההזמנות האחרונות מתוך/)).toHaveCount(0);
  });

  test("an archived pet is marked, not listed as if it were still here", async ({ page }) => {
    await mockCard(page, {
      customer,
      orders: [],
      pets: [pet("p1", "לונה", false), pet("p2", "ציפסר", false), pet("p3", "מילו", true)],
      notes: [],
      orders_truncated: false,
      orders_shown: 0,
      archived_pets_count: 1,
    });

    await expect(page.getByText("מילו")).toBeVisible();

    // Scoped to the row, and the first version of this was not.
    //
    // It asserted getByText("בארכיון").first(), which matched the section
    // HEADER's "· 1 בארכיון" - so deleting the badge from the pet row left
    // the test green. That is the same defect the card had: checking a label
    // that happens to be nearby instead of the thing itself. The falsification
    // run is what said so.
    const archivedRow = page.getByText("מילו", { exact: true }).locator("xpath=..");
    await expect(archivedRow.getByText("בארכיון")).toBeVisible();

    // And the mark belongs to that animal rather than to every row.
    const liveRow = page.getByText("לונה", { exact: true }).locator("xpath=..");
    await expect(liveRow.getByText("בארכיון")).toHaveCount(0);

    // And the count above the list describes the list: 2 live, 1 archived,
    // said separately. Asking after a dead pet by name is the worst thing
    // this screen can cause.
    await expect(page.getByText("· 1 בארכיון")).toBeVisible();
  });
});
