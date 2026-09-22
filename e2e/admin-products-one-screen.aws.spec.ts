import { expect, test, type Page } from "@playwright/test";

/**
 * Four product screens became one, and this is what that must not have cost.
 *
 * The admin had מוצרים, פרסום לחנות, ייבוא מהיר and עורך חכם. Three of them
 * were ways to CREATE a product - /admin/smart-editor took no id, read
 * nothing, and only ever called createAdminProduct, despite being called an
 * editor. They are one screen now: a list, with the actions on it.
 *
 * MERGING SCREENS MERGES THEIR PERMISSION GATES, WHICH IS THE DANGEROUS PART.
 * The publication queue required intake.read and the catalogue requires
 * products.read, and SELLER_ADMIN holds the first WITHOUT the second. A single
 * gate on the merged route would have taken the publication queue away from a
 * whole role as a side effect of a layout change - invisibly, because nothing
 * errors: the screen simply is not there any more. Half of this file is that.
 */

const base = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "ops@mipo.pet", display_name: "Owner", must_change_password: false,
};

/*
 * ENUMERATED, BECAUSE THAT IS WHAT THE SERVER SENDS.
 *
 * server/src/adminPermissions.js gives ADMIN `[...ALL_PERMISSIONS]` with the
 * comment "Everything, enumerated. Not '*'." - so `permissions: ["admin.full"]`
 * is not a full admin, it is an admin who holds exactly one permission called
 * admin.full. A fixture like that passes on screens gated on FULL_ACCESS and
 * silently fails on every screen gated on anything else, which is how this
 * file's first run reported a redirect bug that did not exist.
 */
const fullAdmin = {
  ...base,
  role: "admin",
  permissions: [
    "admin.full", "products.read", "products.create", "products.update",
    "products.delete", "product_assets.upload", "product_tools.use",
    "intake.read", "intake.write", "publication.read", "publication.publish",
    "audit.read",
  ],
};

/** intake.read and NOT products.read - the real SELLER_ADMIN shape. */
const seller = {
  ...base,
  role: "seller_admin",
  permissions: ["intake.read", "publication.read", "publication.publish"],
};

/** products.read and NOT product_tools.use, which no shipped role has - but
 *  the gate is per-permission, not per-role, and this is what it claims. */
const listOnly = { ...base, role: "product_manager", permissions: ["products.read"] };

const product = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "קוואטרו ללא דגנים ברווז",
  description: "מזון יבש", price: 189, original_price: null,
  image_url: "/placeholder.svg", category: "dry-food",
  in_stock: true, is_featured: false,
  business_id: "33333333-3333-4333-8333-333333333333",
  created_at: "2026-08-09T00:00:00.000Z", source: "manual",
};

const json = (body: unknown, status = 200) => ({
  status, contentType: "application/json", body: JSON.stringify(body),
});

async function signedIn(page: Page, admin: unknown) {
  await page.route("**/api/auth/me", (route) => route.fulfill(json({ error: "Unauthorized" }, 401)));
  await page.route("**/api/reports", (route) => route.fulfill(json({ reports: [] })));
  await page.route("**/api/admin/me", (route) => route.fulfill(json({ admin })));
  await page.route("**/api/products*", (route) => route.fulfill(json({ products: [product] })));
  await page.route("**/api/admin/intake/drafts*", (route) => route.fulfill(json({ drafts: [] })));
}

test.describe("one products screen", () => {
  test("the three old screens land on it instead of disappearing", async ({ page }) => {
    // These links are in people's history and in this repository's own audit
    // entries. A 404 would be a worse answer than a redirect.
    await signedIn(page, fullAdmin);

    await page.goto("/admin/publishing");
    await expect(page).toHaveURL(/\/admin\/products\?section=publishing/);

    await page.goto("/admin/smart-editor");
    await expect(page).toHaveURL(/\/admin\/products$/);

    await page.goto("/admin/quick-import");
    await expect(page).toHaveURL(/\/admin\/products\?section=import/);
  });

  test("adding a product has one way in and every old way inside it", async ({ page }) => {
    // Four buttons, one of which navigated to another screen, became one menu.
    // Losing a way in here means losing a way products enter the catalogue.
    await signedIn(page, fullAdmin);
    await page.goto("/admin/products");

    await page.getByRole("button", { name: "מוצר חדש" }).click();
    for (const way of ["למלא ידנית", "בעזרת המכונה", "מקישור לחנות אחרת", "משם או מברקוד"]) {
      await expect(page.getByRole("menuitem", { name: way })).toBeVisible();
    }
  });

  test("the publication queue is a section of the same screen", async ({ page }) => {
    await signedIn(page, fullAdmin);
    await page.goto("/admin/products");

    await page.getByRole("button", { name: "ממתינים לפרסום" }).click();
    await expect(page).toHaveURL(/section=publishing/);
    await expect(page.getByText("מה ממתין, ומה עוצר כל אחד")).toBeVisible();

    await page.getByRole("button", { name: "בחנות" }).click();
    await expect(page.getByText("סה״כ מוצרים")).toBeVisible();
  });

  // ─── the gates, which a merge is very good at losing ──────────────────────

  test("a seller keeps the publication queue it never had the catalogue for", async ({ page }) => {
    /*
     * THE REGRESSION THIS FILE EXISTS FOR. SELLER_ADMIN has intake.read and
     * NOT products.read. Gating the merged screen on products.read alone would
     * have redirected this role away from the only screen it uses, and nothing
     * would have errored - the queue would simply be gone.
     */
    await signedIn(page, seller);
    await page.goto("/admin/products?section=publishing");

    await expect(page).toHaveURL(/\/admin\/products\?section=publishing/);
    await expect(page.getByText("מה ממתין, ומה עוצר כל אחד")).toBeVisible();
    // And not the catalogue, which it still has no permission for.
    await expect(page.getByText("סה״כ מוצרים")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "בחנות" })).toHaveCount(0);
  });

  test("the catalogue does not come with the publication queue attached", async ({ page }) => {
    // The other direction: products.read must not start handing out intake.
    await signedIn(page, listOnly);
    await page.goto("/admin/products");

    await expect(page.getByText("סה״כ מוצרים")).toBeVisible();
    await expect(page.getByRole("button", { name: "ממתינים לפרסום" })).toHaveCount(0);
  });

  test("a folded-in tool keeps the permission its screen required", async ({ page }) => {
    // /admin/smart-editor and /admin/quick-import both required
    // product_tools.use. Becoming a menu item and a section must not turn them
    // into things anybody who can read the list may use.
    await signedIn(page, listOnly);
    await page.goto("/admin/products");

    await page.getByRole("button", { name: "מוצר חדש" }).click();
    await expect(page.getByRole("menuitem", { name: "למלא ידנית" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "בעזרת המכונה" })).toHaveCount(0);
    await expect(page.getByRole("menuitem", { name: "מקישור לחנות אחרת" })).toHaveCount(0);
  });

  test("and the section cannot be reached by typing the URL either", async ({ page }) => {
    // A gate that only hides a menu item is decoration.
    await signedIn(page, listOnly);
    await page.goto("/admin/products?section=import");

    await expect(page.getByText("סה״כ מוצרים")).toBeVisible();
    await expect(page.getByText("הדבק קישור או ברקוד")).toHaveCount(0);
  });
});
