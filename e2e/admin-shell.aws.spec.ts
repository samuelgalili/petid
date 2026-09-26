import { expect, test, type Page } from "@playwright/test";

/**
 * The admin shell on a phone.
 *
 * The owner's complaint was that the admin is uncomfortable to operate and
 * does not look good, and on a phone those were the same complaint: every move
 * cost three taps through a drawer, and a dialog opened from a customer card
 * rendered underneath the card and could not be touched at all.
 *
 * NOTE ON WHERE THIS FILE LIVES. playwright.config.ts matches only
 * `*.aws.spec.ts`, so the older `e2e/admin.spec.ts` does not run. A shell test
 * written there would have been a test nothing executes - which is worse than
 * no test, because the file makes it look covered.
 */

const admin = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "ops@mipo.pet", display_name: "Owner", role: "admin",
  permissions: ["admin.full"], must_change_password: false,
};

const customer = {
  identity_id: "id-1", shop_customer_id: "sc-1", identity_kind: "guest", user_id: null,
  email: "dana@example.com", full_name: "דנה כהן", phone: "0501234567",
  is_active: true, created_at: "2026-01-01T00:00:00.000Z",
  last_login_at: null, first_order_at: null, last_order_at: null, last_activity_at: null,
  orders_count: 0, paid_orders_count: 0, total_spent: 0, pets_count: 0,
};

const json = (body: unknown, status = 200) => ({
  status, contentType: "application/json", body: JSON.stringify(body),
});

async function signedIn(page: Page) {
  await page.route("**/api/auth/me", (route) => route.fulfill(json({ error: "Unauthorized" }, 401)));
  await page.route("**/api/reports", (route) => route.fulfill(json({ reports: [] })));
  await page.route("**/api/admin/me", (route) => route.fulfill(json({ admin })));
  await page.route("**/api/products*", (route) => route.fulfill(json({ products: [] })));
  await page.route("**/api/admin/orders*", (route) => route.fulfill(json({ orders: [] })));
  await page.route("**/api/admin/customers/*", (route) => route.fulfill(json({
    customer, orders: [], pets: [], notes: [],
    orders_truncated: false, orders_shown: 0, archived_pets_count: 0,
  })));
  await page.route("**/api/admin/customers*", (route) => route.fulfill(json({ customers: [customer] })));
  // The edit itself is under the Admin OS prefix, which the pattern above does
  // not match. Without this the save fails and the dialog stays open, which
  // looks exactly like the overlay bug this file is about.
  await page.route("**/api/admin/os/customers", (route) => route.fulfill(json({ customer })));
}

const bar = (page: Page) => page.getByRole("navigation", { name: "ניווט ראשי" });

test.describe("the admin shell on a phone", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.toLowerCase().includes("mobile"), "Phone layout");
    await signedIn(page);
  });

  test("the daily screens are one tap from anywhere", async ({ page }) => {
    // ONE TAP IS THE CLAIM, so the test taps. Navigating by URL would pass
    // against the old drawer-only layout and prove nothing about it.
    await page.goto("/admin/customers");

    await bar(page).getByRole("link", { name: "הזמנות" }).click();
    await expect(page).toHaveURL(/\/admin\/orders$/);

    await bar(page).getByRole("link", { name: "לקוחות" }).click();
    await expect(page).toHaveURL(/\/admin\/customers$/);
  });

  test("the rest of the admin is still reachable, from the bar's last tab", async ({ page }) => {
    // The bar holds four things. The other ten screens have to stay reachable
    // or the bar has removed navigation rather than shortened it.
    await page.goto("/admin/customers");
    await bar(page).getByText("עוד").click();

    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    for (const href of ["/admin/settings", "/admin/categories", "/admin/analytics", "/admin/coupons"]) {
      await expect(drawer.locator(`a[href="${href}"]`).first()).toBeVisible();
    }
  });

  test("the bar does not sit on top of the end of the page", async ({ page }) => {
    // A fixed bar over a scrolling list hides the last row, and on a list of
    // orders the last row is the one that just came in.
    await page.goto("/admin/customers");
    await expect(bar(page)).toBeVisible();

    await page.mouse.wheel(0, 20_000);
    await page.waitForTimeout(400);

    const barTop = (await bar(page).boundingBox())?.y ?? 0;
    expect(barTop).toBeGreaterThan(0);

    // The lowest thing the page actually draws, excluding the spacer that
    // reserves the bar's room. Measuring <main> would measure the spacer and
    // pass whether or not the content clears the bar.
    const contentBottom = await page.evaluate(() => {
      const spacer = document.querySelector("[data-bottom-bar-spacer]");
      const main = document.querySelector("main");
      if (!main) return Number.POSITIVE_INFINITY;
      let lowest = 0;
      main.querySelectorAll("*").forEach((element) => {
        // The spacer, what is inside it, and every wrapper that CONTAINS it -
        // a parent's box swallows the spacer's height, so leaving the wrappers
        // in measures the spacer by another name and the check never fails.
        if (spacer && (spacer.contains(element) || element.contains(spacer))) return;
        const box = element.getBoundingClientRect();
        if (box.width > 0 && box.height > 0) lowest = Math.max(lowest, box.bottom);
      });
      return lowest;
    });
    expect(contentBottom).toBeLessThanOrEqual(barTop + 1);
  });

  test("a dialog opened from a card can be touched", async ({ page }) => {
    /*
     * THE BUG THIS REPLACES A PATCH FOR. A customer card is a Sheet, at
     * z-[10000]/[10001]; every Dialog sat at z-50, so a dialog opened from the
     * card rendered under the sheet's backdrop - present, findable by a test
     * that only asserts visibility, and completely untappable by a person.
     *
     * So this does not assert that the dialog is visible, and it does not
     * fill() either: fill checks that a field is visible, enabled and
     * editable, and NOT that anything can reach it, so it succeeds through a
     * covering overlay. This test was written that way first and passed
     * against the bug. CLICK is the verb that hit-tests - it fails with
     * "intercepts pointer events" - which is the complaint a person had.
     */
    await page.goto("/admin/customers");
    await page.getByText("דנה כהן").first().click();
    // The card is a page now, and the button says what it edits.
  await page.getByRole("button", { name: "עריכת פרטים" }).click();

    const name = page.getByLabel("שם מלא");
    await expect(name).toBeVisible();
    await name.click();
    await name.fill("דנה כהן־לוי");
    await expect(name).toHaveValue("דנה כהן־לוי");

    // And the button at the end of it, which is the thing nobody could press.
    await page.getByRole("button", { name: "שמירה" }).click();
    await expect(name).toBeHidden();
  });
});
