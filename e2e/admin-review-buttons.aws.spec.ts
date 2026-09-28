import { expect, test, type Page } from "@playwright/test";

/**
 * The approval the admin could not give.
 *
 * The owner's report was one sentence: "האדמין ליד המוצר אין שום כפתור
 * לאישור". It was exact. The intake API has nineteen endpoints and the client
 * called four of them - list, readiness, approve an image, publish - so submit,
 * approve and reject had no client function, and the queue loaded only
 * `listIntakeDrafts("APPROVED")`, which meant a draft in IMPORTED, DRAFT,
 * IN_REVIEW or REJECTED had no row on any screen in the admin at all. There was
 * no button because there was no product.
 *
 * Two things are checked here, and the second is the one that would otherwise
 * be discovered in production:
 *
 *   - the buttons exist, and each state offers the action it allows;
 *   - APPROVING IS REFUSED FOR THE SUBMITTER, and the screen says so BEFORE
 *     the press rather than after. MIPO has one admin. If the owner submits a
 *     draft and then approves it, the server answers 403
 *     SELF_APPROVAL_FORBIDDEN - and a button that always fails for the only
 *     person who can press it is worse than no button, because it reads as a
 *     bug in the product rather than as the rule it is.
 */

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ADMIN_ID = "99999999-9999-4999-8999-999999999999";

const owner = {
  id: OWNER_ID,
  email: "ops@mipo.pet", display_name: "Owner", must_change_password: false,
  role: "admin",
  permissions: [
    "admin.full", "products.read", "products.create", "products.update",
    "products.delete", "product_assets.upload", "product_tools.use",
    "intake.read", "intake.write", "publication.read", "publication.publish",
    "draft.submit", "draft.review", "audit.read",
  ],
};

const draft = (overrides: Record<string, unknown> = {}) => ({
  id: "aaaaaaaa-1111-4111-8111-111111111111",
  business_id: "33333333-3333-4333-8333-333333333333",
  state: "IN_REVIEW",
  name: "קוואטרו ללא דגנים ברווז",
  brand: "Quattro",
  category_id: "44444444-4444-4444-8444-444444444444",
  proposed_price: 189,
  raw_import_record_id: null,
  updated_at: new Date().toISOString(),
  approved_catalog_product_id: null,
  submitted_by: OTHER_ADMIN_ID,
  review_note: null,
  ...overrides,
});

const json = (body: unknown, status = 200) => ({
  status, contentType: "application/json", body: JSON.stringify(body),
});

async function openQueue(page: Page, drafts: unknown[], onAction?: (url: string) => void) {
  await page.route("**/api/auth/me", (route) => route.fulfill(json({ error: "Unauthorized" }, 401)));
  await page.route("**/api/reports", (route) => route.fulfill(json({ reports: [] })));
  await page.route("**/api/admin/me", (route) => route.fulfill(json({ admin: owner })));
  await page.route("**/api/products*", (route) => route.fulfill(json({ products: [] })));
  await page.route("**/api/admin/categories*", (route) => route.fulfill(json({ categories: [] })));

  await page.route("**/api/admin/intake/**", (route) => {
    const url = route.request().url();
    if (route.request().method() === "POST") {
      onAction?.(url);
      return route.fulfill(json({ draft: draft({ state: "APPROVED" }), product: { id: "p1", name: "x" } }, 201));
    }
    if (url.includes("publication-readiness")) {
      return route.fulfill(json({
        product_id: "p1", publication_state: "UNPUBLISHED", ready: true, unmet: [],
      }));
    }

    /*
     * THE MOCK HONOURS ?state=, BECAUSE THE SERVER DOES.
     *
     * It did not, and that made every test here pass over the bug they exist
     * for: restoring `listIntakeDrafts("APPROVED")` - the original defect,
     * where four of the six states had no row in the admin - left all eight
     * green, because the fixture returned the whole list whatever was asked
     * for. A mock that ignores a filter is a mock that agrees with the test
     * instead of with the endpoint.
     */
    const state = new URL(url).searchParams.get("state");
    const body = state
      ? drafts.filter((row) => (row as { state?: string }).state === state)
      : drafts;
    return route.fulfill(json({ drafts: body }));
  });

  await page.goto("/admin/products?section=publishing");
}

test.describe("the review a draft needs", () => {
  test("a draft in review has an approve button on its own row", async ({ page }) => {
    // On the ROW, not behind a selection. The report was that there is no
    // button next to the product, and a button that appears only after you
    // click the product is a different thing.
    await openQueue(page, [draft()]);

    await expect(page.getByText("קוואטרו ללא דגנים ברווז")).toBeVisible();
    await expect(page.getByRole("button", { name: "אישור" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "דחייה" })).toBeEnabled();
  });

  test("approving calls the endpoint that creates the catalogue product", async ({ page }) => {
    // approve is the only place a catalog_product is ever created, so a button
    // that posts somewhere else leaves the chain broken one step further on.
    const calls: string[] = [];
    await openQueue(page, [draft()], (url) => calls.push(url));

    await page.getByRole("button", { name: "אישור" }).click();
    await expect.poll(() => calls.filter((url) => url.endsWith("/approve"))).toHaveLength(1);
  });

  test("the submitter cannot approve their own draft, and the button says so", async ({ page }) => {
    /*
     * THE RULE THAT MAKES THIS SCREEN USABLE OR USELESS. MIPO has one admin.
     * Without showing the reason, the owner presses אישור, gets a 403, and
     * reasonably concludes the feature is broken.
     */
    await openQueue(page, [draft({ submitted_by: OWNER_ID })]);

    const approve = page.getByRole("button", { name: "אישור" });
    await expect(approve).toBeDisabled();
    // Visible text, not only a title: there is no hover on a phone, and a
    // greyed button with no readable reason is indistinguishable from a bug.
    await expect(page.getByText("שלחת אותה")).toBeVisible();
    await expect(approve).toHaveAttribute("title", /לא יכול לאשר אותה בעצמו/);
  });

  test("a draft with no recorded submitter cannot be approved by anybody", async ({ page }) => {
    // The server fails closed for a null submitter rather than assuming it was
    // somebody else. A draft submitted by an API key lands here, and without
    // this the screen would offer an approval that can never succeed.
    await openQueue(page, [draft({ submitted_by: null })]);

    const approve = page.getByRole("button", { name: "אישור" });
    await expect(approve).toBeDisabled();
    await expect(page.getByText("אין שולח רשום")).toBeVisible();
    await expect(approve).toHaveAttribute("title", /לא רשום מי שלח/);
  });

  test("a draft that has not been sent for review offers sending it", async ({ page }) => {
    await openQueue(page, [draft({ state: "DRAFT", submitted_by: null })]);

    await expect(page.getByRole("button", { name: "שליחה לבדיקה" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "אישור" })).toHaveCount(0);
  });

  test("rejecting requires a reason, because the server does", async ({ page }) => {
    // Sending an empty note would be a round trip that always fails. The
    // button is disabled until there is something to save.
    await openQueue(page, [draft()]);

    await page.getByRole("button", { name: "דחייה" }).click();
    const confirm = page.getByRole("button", { name: "דחייה", exact: true }).last();
    await expect(confirm).toBeDisabled();

    await page.getByLabel("סיבת הדחייה").fill("חסרה תמונה");
    await expect(confirm).toBeEnabled();
  });

  test("a draft can be discarded, and the confirm says what that means", async ({ page }) => {
    /*
     * product_drafts has carried archived_at since 0043 and listDrafts has
     * always filtered on it, but no route ever set it - so nothing in the admin
     * could discard a mistaken import. That was the second half of the owner's
     * report: no delete button either.
     */
    const calls: string[] = [];
    await openQueue(page, [draft({ state: "DRAFT", submitted_by: null })], (url) => calls.push(url));

    await page.getByRole("button", { name: "מחיקה" }).click();

    // The row is archived, not deleted, and the dialog says so rather than
    // letting "נמחק" stand for something else.
    await expect(page.getByText(/הרישום נשמר לצורכי ביקורת/)).toBeVisible();

    await page.getByRole("button", { name: "מחיקה", exact: true }).last().click();
    await expect.poll(() => calls.filter((url) => url.endsWith("/archive"))).toHaveLength(1);
  });

  test("a draft in review or approved offers no delete, because the database refuses it", async ({ page }) => {
    /*
     * IN_REVIEW is somebody's open task. APPROVED has a catalog_product bound
     * to it by a trigger that freezes origin_draft_id and a foreign key
     * declared ON DELETE RESTRICT, so the database refuses from both
     * directions. A button here would be a button that always answers 409.
     */
    await openQueue(page, [
      draft({ id: "r1", name: "בבדיקה", state: "IN_REVIEW" }),
      draft({ id: "r2", name: "מאושר", state: "APPROVED", approved_catalog_product_id: "p1" }),
    ]);

    await expect(page.getByText("בבדיקה", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "מחיקה" })).toHaveCount(0);
  });

  test("the queue shows every state, not only the last one", async ({ page }) => {
    /*
     * The panel used to load listIntakeDrafts("APPROVED") and nothing else, so
     * four of the six states had no row anywhere in the admin. That is the
     * whole reason the approve button could not exist.
     */
    await openQueue(page, [
      draft({ id: "d1", name: "בבדיקה", state: "IN_REVIEW" }),
      draft({ id: "d2", name: "טיוטה", state: "DRAFT" }),
      draft({ id: "d3", name: "נדחה", state: "REJECTED", review_note: "חסר מחיר" }),
      draft({ id: "d4", name: "יובא", state: "IMPORTED" }),
    ]);

    for (const name of ["בבדיקה", "טיוטה", "נדחה", "יובא"]) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    }
  });

  test("the count above the list is of drafts awaiting review", async ({ page }) => {
    // The tile used to count APPROVED drafts, which is the step after this one.
    await openQueue(page, [
      draft({ id: "d1", state: "IN_REVIEW" }),
      draft({ id: "d2", state: "IN_REVIEW" }),
      draft({ id: "d3", state: "DRAFT" }),
    ]);

    const tile = page.locator("div", { hasText: /^ממתינים לבדיקה/ }).first();
    await expect(tile).toContainText("2");
  });
});
