import { expect, test, type Page } from "@playwright/test";

/**
 * The shell, after it grew a second level of navigation.
 *
 * The top bar switches domain and the sidebar shows that domain's screens.
 * The chrome is English and sits on the left while the page stays RTL - the
 * owner's decision, from the design - and the consequences of that decision
 * are most of what is checked here, because they are the parts that are easy
 * to get subtly wrong and impossible to notice from the code.
 */

const base = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "ops@mipo.pet", display_name: "שמואל גלילי", must_change_password: false,
};

/** Enumerated, because that is what the server sends for an admin. */
const owner = {
  ...base, role: "admin",
  permissions: [
    "admin.full", "products.read", "products.create", "products.update",
    "products.delete", "product_assets.upload", "product_tools.use",
    "intake.read", "intake.write", "publication.read", "publication.publish",
    "audit.read",
  ],
};

/** Products only. No full access, so most domains have nothing in them. */
const productManager = {
  ...base, role: "product_manager",
  permissions: ["products.read", "products.create", "products.update", "product_tools.use"],
};

const json = (body: unknown, status = 200) => ({
  status, contentType: "application/json", body: JSON.stringify(body),
});

async function signedIn(page: Page, admin: unknown) {
  await page.route("**/api/auth/me", (route) => route.fulfill(json({ error: "Unauthorized" }, 401)));
  await page.route("**/api/reports", (route) => route.fulfill(json({ reports: [] })));
  await page.route("**/api/admin/me", (route) => route.fulfill(json({ admin })));
  await page.route("**/api/products*", (route) => route.fulfill(json({ products: [] })));
  await page.route("**/api/admin/orders*", (route) => route.fulfill(json({ orders: [] })));
  await page.route("**/api/admin/customers*", (route) => route.fulfill(json({ customers: [] })));
  await page.route("**/api/admin/os/home", (route) => route.fulfill(json({
    numbers: {
      pending_orders: 0, revenue_today: 0, revenue_yesterday: 0,
      unpublished_products: 0, new_customers_this_week: 0,
    },
    actions: [],
  })));
}

const domains = (page: Page) => page.getByRole("navigation", { name: "Domains" });

test.describe("two levels of navigation", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.toLowerCase().includes("mobile"), "Desktop chrome");
    await page.setViewportSize({ width: 1440, height: 900 });
    await signedIn(page, owner);
  });

  test("the top bar switches domain and the sidebar follows", async ({ page }) => {
    // THE WHOLE POINT OF TWO LEVELS. If the sidebar does not change, the top
    // bar is a row of links and the second level does not exist.
    await page.goto("/admin");
    await expect(page.getByRole("navigation", { name: "Command Center" })).toBeVisible();

    await domains(page).getByRole("link", { name: "Commerce" }).click();
    const sidebar = page.getByRole("navigation", { name: "Commerce" });
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Products" })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: "Coupons" })).toBeVisible();
    // And the other domain's screens are gone rather than accumulating.
    await expect(sidebar.getByRole("link", { name: "Settings" })).toHaveCount(0);
  });

  test("arriving by URL selects the domain the screen belongs to", async ({ page }) => {
    // Navigation state read from the path, not from what was clicked. A
    // bookmark, a ⌘K jump and a redirect all arrive this way.
    await page.goto("/admin/audit-log");
    await expect(page.getByRole("navigation", { name: "Platform" })).toBeVisible();
    await expect(
      domains(page).getByRole("link", { name: "Platform" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("a domain with nothing in it for this admin is not offered", async ({ page }) => {
    // Hiding a link is not authorisation - the routes check again. But handing
    // somebody a domain whose every screen then bounces them is a worse screen
    // than not showing it.
    await signedIn(page, productManager);
    await page.goto("/admin/products");

    await expect(domains(page).getByRole("link", { name: "Commerce" })).toBeVisible();
    for (const hidden of ["Finance", "People", "Platform", "Command Center"]) {
      await expect(domains(page).getByRole("link", { name: hidden })).toHaveCount(0);
    }
  });

  test("⌘K finds a screen by the Hebrew name the sidebar does not use", async ({ page }) => {
    /*
     * The sidebar says "Customers" because the owner chose English chrome.
     * The people using this type Hebrew, and "לקוחות" is the word on every
     * other surface in the product. Searching one list by one name would mean
     * ⌘K answers nothing to the only word some of them will think of.
     */
    await page.goto("/admin");
    // Wait for the shell before pressing anything. goto resolves on load and
    // the listener is attached by an effect after hydration, so a keystroke
    // sent immediately lands on a page that is not listening yet - which
    // failed here as "the dialog never opened" rather than as a race.
    await expect(domains(page)).toBeVisible();

    // Control, not Meta: the browser here runs on Linux, where Meta is the
    // Super key and the window manager may take it. The handler accepts both
    // because the owner uses both.
    await page.keyboard.press("Control+k");

    const bar = page.getByRole("dialog");
    await expect(bar).toBeVisible();
    await bar.getByLabel("חיפוש").fill("לקוחות");

    /*
     * THE DESTINATION, NOT THE SEARCH HINT.
     *
     * The bar also offers "חיפוש לקוח: לקוחות", which goes to
     * /admin/customers?q=לקוחות - a perfectly good row, and one that exists
     * whether or not the Hebrew name reaches the destination list. The first
     * version of this test clicked that and passed with `aka` deleted
     * entirely, proving nothing about the thing it is named after.
     *
     * A destination row carries its domain. That is the one to press, and
     * the URL it produces has no query on it.
     */
    const destination = bar.getByText("CRM · Customers");
    await expect(destination).toBeVisible();
    await destination.click();

    await expect(page).toHaveURL(/\/admin\/customers$/);
  });

  test("the search button in the bar opens the same thing the keystroke does", async ({ page }) => {
    await page.goto("/admin");
    await page.getByText("חיפוש בכל המערכת…").click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});

test.describe("the screens that do not exist yet", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.toLowerCase().includes("mobile"), "Desktop chrome");
    await page.setViewportSize({ width: 1440, height: 900 });
    await signedIn(page, owner);
  });

  test("a planned screen says what it will do and what it needs", async ({ page }) => {
    /*
     * Thirteen destinations have no table behind them. The owner asked for
     * them in the sidebar anyway. The two answers that were NOT acceptable
     * are a blank "coming soon", which teaches people to stop pressing
     * things, and a handsome screen over invented data, which the brief
     * forbids and which ends with somebody acting on a made-up number.
     */
    await page.goto("/admin/suppliers");

    await expect(page.getByText("המסך הזה עדיין לא נבנה")).toBeVisible();
    await expect(page.getByText("מי מספק מה, באיזה מחיר, ומה מצב ההתחשבנות.")).toBeVisible();
    await expect(page.getByText("מה צריך לקרות קודם")).toBeVisible();
    await expect(page.getByText("טבלת suppliers")).toBeVisible();
  });

  test("and it is marked as such before you press it", async ({ page }) => {
    // Otherwise every planned screen is a wasted click, thirteen times.
    await page.goto("/admin/suppliers");
    const sidebar = page.getByRole("navigation", { name: "Procurement" });
    await expect(sidebar.getByRole("link", { name: /Suppliers/ })).toContainText("soon");
  });

  test("a screen that exists is not marked as planned", async ({ page }) => {
    // The flag has to mean something, which it stops doing the moment it is
    // on everything.
    await page.goto("/admin/products");
    const sidebar = page.getByRole("navigation", { name: "Commerce" });
    await expect(sidebar.getByRole("link", { name: "Products" })).not.toContainText("soon");
    await expect(sidebar.getByRole("link", { name: /Inventory/ })).toContainText("soon");
  });
});
