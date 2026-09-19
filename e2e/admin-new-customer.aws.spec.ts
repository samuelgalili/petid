import { expect, test, type Page } from "@playwright/test";

/**
 * Opening a customer by hand, from the screen.
 *
 * The server tests prove what the endpoint does with a body. This proves what
 * the browser SENDS, and the one thing that cannot be checked any other way:
 * that the Idempotency-Key belongs to the submission rather than to the call.
 *
 * That distinction has no visible symptom. A key minted per click looks
 * identical on screen and quietly removes the whole protection - a
 * double-click, or a retry after a timeout whose write actually landed, opens
 * a second customer. The only place it shows is in the headers of two
 * requests, which is what these tests read.
 */

const admin = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "ops@mipo.pet",
  display_name: "Owner",
  role: "admin",
  permissions: ["admin.full"],
  must_change_password: false,
};

type Sent = { key: string | undefined; body: Record<string, unknown> };

async function mockAdminCustomers(page: Page, respond: (sent: Sent, index: number) => unknown) {
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
  await page.route("**/api/admin/customers*", (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({ customers: [] }),
  }));

  await page.route("**/api/admin/os/customers", async (route) => {
    const request = route.request();
    const entry: Sent = {
      key: request.headers()["idempotency-key"],
      body: JSON.parse(request.postData() || "{}"),
    };
    sent.push(entry);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(respond(entry, sent.length - 1)),
    });
  });

  return sent;
}

const created = (name: string) => ({
  created: true,
  customer: {
    id: "44444444-4444-4444-8444-444444444444",
    email: "dana@example.com",
    full_name: name,
    phone: "050-123-4567",
    user_id: null,
    last_order_at: null,
    created_at: "2026-09-18T10:00:00.000Z",
    updated_at: "2026-09-18T10:00:00.000Z",
  },
  account_match: null,
});

const openDialog = async (page: Page) => {
  await page.goto("/admin/customers");
  await page.getByRole("button", { name: "לקוח חדש" }).click();
  await expect(page.getByLabel("שם מלא")).toBeVisible();
};

test.describe("Opening a customer by hand", () => {
  test.describe.configure({ mode: "serial" });

  test("the same submission, sent twice, carries the same Idempotency-Key", async ({ page }) => {
    const sent = await mockAdminCustomers(page, () => ({
      created: false,
      matched_by: "phone",
      candidates: [],
      message: "מספר הטלפון הזה כבר רשום",
    }));

    await openDialog(page);
    await page.getByLabel("שם מלא").fill("דנה כהן");
    await page.getByLabel("אימייל").fill("dana@example.com");

    // Submitted twice without touching the form: the second is a RETRY of the
    // same intention, and the server must recognise it as one.
    await page.getByRole("button", { name: "פתיחת לקוח" }).click();
    await expect.poll(() => sent.length).toBe(1);
    await page.getByRole("button", { name: "פתיחת לקוח" }).click();
    await expect.poll(() => sent.length).toBe(2);

    expect(sent[0].key, "no Idempotency-Key was sent at all").toBeTruthy();
    expect(sent[1].key).toBe(sent[0].key);
  });

  test("editing the form mints a new key, because it is a different request", async ({ page }) => {
    const sent = await mockAdminCustomers(page, () => ({
      created: false,
      matched_by: "phone",
      candidates: [],
      message: "מספר הטלפון הזה כבר רשום",
    }));

    await openDialog(page);
    await page.getByLabel("שם מלא").fill("דנה כהן");
    await page.getByRole("button", { name: "פתיחת לקוח" }).click();
    await expect.poll(() => sent.length).toBe(1);

    // A typo corrected. Reusing the key here is not a replay - the server
    // answers a known key carrying a different body with 409, so the
    // correction would fail and the agent would have no way to fix it.
    await page.getByLabel("אימייל").fill("dana@example.com");
    await page.getByRole("button", { name: "פתיחת לקוח" }).click();
    await expect.poll(() => sent.length).toBe(2);

    expect(sent[1].key).not.toBe(sent[0].key);
  });

  test("a shared phone shows the candidates instead of creating anybody", async ({ page }) => {
    const sent = await mockAdminCustomers(page, (entry) => (
      entry.body.accept_duplicate_phone
        ? created("רותי")
        : {
          created: false,
          matched_by: "phone",
          candidates: [{
            id: "55555555-5555-4555-8555-555555555555",
            email: "avi@example.com",
            full_name: "אבי כהן",
            phone: "050-765-4321",
            user_id: null,
            last_order_at: null,
            created_at: "2026-09-01T10:00:00.000Z",
            updated_at: "2026-09-01T10:00:00.000Z",
          }],
          message: "מספר הטלפון הזה כבר רשום. אותו אדם, או מישהו אחר באותו בית?",
        }
    ));

    await openDialog(page);
    await page.getByLabel("שם מלא").fill("רותי כהן");
    await page.getByLabel("טלפון").fill("050-765-4321");
    await page.getByRole("button", { name: "פתיחת לקוח" }).click();

    // The person already at that number is named on screen. A count is not
    // enough: the agent has to see WHO it is to answer the question.
    await expect(page.getByText("אבי כהן")).toBeVisible();
    await expect(page.getByRole("button", { name: "זה אדם אחר, פתח בכל זאת" })).toBeVisible();

    await page.getByRole("button", { name: "זה אדם אחר, פתח בכל זאת" }).click();
    await expect.poll(() => sent.length).toBe(2);

    expect(sent[1].body.accept_duplicate_phone).toBe(true);
    expect(sent[1].key, "the confirmed second person reused the refused request's key").not.toBe(sent[0].key);
  });
});
