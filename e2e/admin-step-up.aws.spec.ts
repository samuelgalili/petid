import { expect, test, type Page } from "@playwright/test";

/**
 * A sensitive admin action whose second factor is no longer recent.
 *
 * The server decides when to ask. This proves the screen: the Hebrew prompt
 * appears, a code is sent to the verify route, and the same action is tried
 * once more. Cancelling does not send the action again. A 403 that is not a
 * step-up does not open the prompt.
 */

const admin = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "ops@mipo.pet",
  display_name: "Owner",
  role: "admin",
  permissions: ["admin.full"],
  must_change_password: false,
  mfa_enabled: true,
  mfa_enrolled: true,
  mfa_verified: true,
};

const customer = {
  identity_id: "id-1",
  identity_kind: "guest",
  user_id: null,
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

async function openEditor(page: Page) {
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

  await page.goto("/admin/customers");
  await page.getByText("דנה כהן").first().click();
  await page.getByRole("button", { name: "עריכת פרטים" }).click();
  await expect(page.getByLabel("שם מלא")).toBeVisible();
  await page.getByLabel("טלפון").fill("0507654321");
}

test("a stale code opens a prompt, and a valid code retries the same edit", async ({ page }) => {
  const patches: string[] = [];
  const codes: string[] = [];
  let patchesSeen = 0;

  await openEditor(page);

  await page.route("**/api/admin/2fa/verify", async (route) => {
    codes.push(JSON.parse(route.request().postData() || "{}").code);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, used_recovery_code: false, recovery_codes_remaining: null }),
    });
  });

  await page.route("**/api/admin/os/customers", async (route) => {
    patchesSeen += 1;
    patches.push(route.request().postData() || "");
    if (patchesSeen === 1) {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Re-enter your authentication code to continue",
          mfa_step_up_required: true,
          max_age_seconds: 900,
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ customer }),
    });
  });

  await page.getByRole("button", { name: "שמירה" }).click();

  const prompt = page.getByRole("dialog", { name: "אימות מחדש" });
  await expect(prompt).toBeVisible();
  await prompt.getByLabel("קוד אימות").fill("123456");
  await prompt.getByRole("button", { name: "אישור" }).click();

  await expect(page.getByText("הפרטים עודכנו")).toBeVisible();
  expect(codes).toEqual(["123456"]);
  expect(patches).toHaveLength(2);
  expect(JSON.parse(patches[0]).phone).toBe("0507654321");
  expect(patches[0]).toBe(patches[1]);
});

test("cancelling the prompt does not send the edit again", async ({ page }) => {
  let patches = 0;
  await openEditor(page);

  await page.route("**/api/admin/os/customers", async (route) => {
    patches += 1;
    await route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Re-enter your authentication code to continue",
        mfa_step_up_required: true,
      }),
    });
  });

  await page.getByRole("button", { name: "שמירה" }).click();
  const prompt = page.getByRole("dialog", { name: "אימות מחדש" });
  await expect(prompt).toBeVisible();
  await prompt.getByRole("button", { name: "ביטול" }).click();

  await expect(prompt).toBeHidden();
  await expect(page.getByText("נדרש קוד אימות עדכני כדי להמשיך")).toBeVisible();
  expect(patches).toBe(1);
});

test("a forbidden response that is not a step-up does not open the prompt", async ({ page }) => {
  await openEditor(page);

  await page.route("**/api/admin/os/customers", async (route) => {
    await route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ error: "Forbidden" }),
    });
  });

  await page.getByRole("button", { name: "שמירה" }).click();
  await expect(page.getByText("Forbidden")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "אימות מחדש" })).toHaveCount(0);
});
