import { expect, test, type Page } from "@playwright/test";

/**
 * The admin's first screen.
 *
 * The server tests prove which column a thing belongs in. This proves the half
 * that only exists on screen: that /admin is the home screen rather than the
 * product list, that every number goes somewhere, that a card carries the
 * thing it is about, and - the one a board gets wrong most quietly - that a
 * column's header says how many there REALLY are rather than how many fit.
 */

const admin = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "ops@mipo.pet", display_name: "Owner", role: "admin",
  permissions: ["admin.full"], must_change_password: false,
};

const column = (total: number, items: unknown[]) => ({ total, items });

const home = {
  numbers: {
    pending_orders: 3,
    revenue_today: 1240,
    revenue_yesterday: 900,
    unpublished_products: 7,
    new_customers_this_week: 12,
  },
  board: {
    exception: column(2, [{
      kind: "order_failed", id: "aaaaaaaa-1111-4111-8111-111111111111",
      title: "הזמנה MP-1024", subtitle: "התשלום נכשל", detail: "דנה כהן",
      amount: 219, at: new Date().toISOString(),
      href: "/admin/orders?order=aaaaaaaa-1111-4111-8111-111111111111",
    }]),
    // Nine in total, one listed: the header has to say nine.
    approval: column(9, [{
      kind: "order_pending", id: "bbbbbbbb-2222-4222-8222-222222222222",
      title: "הזמנה MP-1025", subtitle: "ממתינה לאישור", detail: "יוסי לוי",
      amount: 89, at: new Date().toISOString(),
      href: "/admin/orders?order=bbbbbbbb-2222-4222-8222-222222222222",
    }]),
    in_progress: column(0, []),
    completed: column(1, [{
      kind: "product_published", id: "cccccccc-3333-4333-8333-333333333333",
      title: "רויאל קנין מיני אדולט", subtitle: "פורסם לחנות", detail: null,
      amount: null, at: new Date().toISOString(),
      href: "/admin/products?section=publishing",
    }]),
  },
  activity: [{
    id: "e1", action: "customer.updated", entity_type: "customer_identity",
    entity_id: "x", actor: "ops@mipo.pet", actor_role: "admin",
    at: new Date().toISOString(),
  }],
  health: [
    { key: "database", label: "מסד נתונים", state: "ok", detail: "12ms" },
    { key: "ai", label: "שירותי AI", state: "unknown", detail: "אין בקשות בשעה האחרונה" },
  ],
};

const json = (body: unknown, status = 200) => ({
  status, contentType: "application/json", body: JSON.stringify(body),
});

async function openHome(page: Page, payload: unknown = home) {
  await page.route("**/api/auth/me", (route) => route.fulfill(json({ error: "Unauthorized" }, 401)));
  await page.route("**/api/reports", (route) => route.fulfill(json({ reports: [] })));
  await page.route("**/api/admin/me", (route) => route.fulfill(json({ admin })));
  await page.route("**/api/admin/orders*", (route) => route.fulfill(json({ orders: [] })));
  await page.route("**/api/admin/os/home", (route) => route.fulfill(json(payload)));
  await page.goto("/admin");
}

test.describe("the admin's first screen", () => {
  test("/admin is the home screen, not the product list", async ({ page }) => {
    // The whole complaint in one assertion: this URL used to redirect.
    await openHome(page);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText("דברים שדורשים טיפול")).toBeVisible();
  });

  test("the four numbers the owner asked for are the four that show", async ({ page }) => {
    await openHome(page);

    await expect(page.getByText("הזמנות ממתינות")).toBeVisible();
    await expect(page.getByText("הכנסות היום")).toBeVisible();
    await expect(page.getByText("לא פורסמו לחנות")).toBeVisible();
    await expect(page.getByText("לקוחות חדשים")).toBeVisible();

    await expect(page.getByText("₪1,240")).toBeVisible();
    // Against yesterday in shekels, not a percentage: ₪40 after a ₪20 day is
    // "+100%", which reads like news and is not.
    await expect(page.getByText("+₪340 מאתמול")).toBeVisible();
  });

  test("a number is a way in, not a figure to look at", async ({ page }) => {
    await openHome(page);
    await page.getByText("הזמנות ממתינות").click();
    await expect(page).toHaveURL(/\/admin\/orders\?status=pending/);
  });

  test("the board is four columns in the order a thing moves through them", async ({ page }) => {
    // Something went wrong, somebody decides, somebody does it, it is done.
    // The value is the order: the columns are a sentence.
    await openHome(page);
    for (const column of ["חריגות", "לאישור", "בתהליך", "הושלם"]) {
      await expect(page.getByText(column, { exact: true })).toBeVisible();
    }
  });

  test("a card carries the thing it is about, and says why it is there", async ({ page }) => {
    // A dashboard that only reports is a dashboard you read and then go
    // somewhere else to act on - the same number of screens as before.
    await openHome(page);

    await expect(page.getByText("הזמנה MP-1024")).toBeVisible();
    await expect(page.getByText("התשלום נכשל")).toBeVisible();

    await page.getByText("הזמנה MP-1024").click();
    await expect(page).toHaveURL(/order=aaaaaaaa-1111-4111-8111-111111111111/);
  });

  test("a column says how many there are, not how many fit", async ({ page }) => {
    /*
     * THE WAY A BOARD LIES BY GETTING QUIETER. The approval column holds nine
     * and lists one. If the header counted the cards it drew, a morning with
     * forty exceptions would read "1" - and the worse the day, the calmer the
     * screen looks.
     */
    await openHome(page);

    const approval = page.getByRole("region", { name: "לאישור" });
    await expect(approval.getByText("9", { exact: true })).toBeVisible();
    await expect(page.getByText("ועוד 8")).toBeVisible();
  });

  test("an empty column says so instead of disappearing", async ({ page }) => {
    // Three columns where there should be four leaves no way to tell "nothing
    // is stuck" from "the query broke".
    await openHome(page);
    const progress = page.getByRole("region", { name: "בתהליך" });
    await expect(progress.getByText("אין כלום כאן")).toBeVisible();
  });

  test("a check with nothing to measure does not report itself healthy", async ({ page }) => {
    // The one lie an operations screen must not tell: "fine" when it means
    // "nobody asked".
    await openHome(page);
    await expect(page.getByText("אין בקשות בשעה האחרונה")).toBeVisible();
    await expect(page.getByText("אין נתונים")).toBeVisible();
  });

  test("a quiet morning still renders numbers rather than blanks", async ({ page }) => {
    await openHome(page, {
      numbers: {
        pending_orders: 0, revenue_today: 0, revenue_yesterday: 0,
        unpublished_products: 0, new_customers_this_week: 0,
      },
      board: {
        exception: { total: 0, items: [] }, approval: { total: 0, items: [] },
        in_progress: { total: 0, items: [] }, completed: { total: 0, items: [] },
      },
      activity: [],
      health: [],
    });

    // Not "₪NaN", and not a blank where a number should be.
    await expect(page.getByText("₪0").first()).toBeVisible();
    await expect(page.getByText("עוד לא נרשמה פעילות")).toBeVisible();
  });
});
