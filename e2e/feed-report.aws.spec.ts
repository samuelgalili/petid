import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * A member can report a moment or a comment from the ⋯ menu. The sheet asks
 * for a reason, takes an optional note, and confirms in Hebrew. A second
 * report of the same content is acknowledged, not treated as a new failure.
 */

const userId = "88888888-8888-4888-8888-888888888888";
const petId = "99999999-9999-4999-8999-999999999999";
const postId = "77777777-7777-4777-8777-777777777771";
const commentId = "77777777-7777-4777-8777-777777777781";

const post = {
  id: postId,
  caption: "הטיול הראשון של לוקה",
  location: null,
  media_url: "/placeholder.svg",
  media_type: "image" as const,
  visibility: "public" as const,
  allow_comments: true,
  poll_question: null,
  poll_options: [],
  poll_results: [],
  viewer_poll_option: null,
  reaction_count: 3,
  comment_count: 1,
  viewer_has_liked: false,
  viewer_has_saved: false,
  is_owner: false,
  published_at: "2026-09-09T06:00:00.000Z",
  creator: { id: userId, display_name: "קהילת Mipo", avatar_url: null },
  pet: { id: petId, name: "לוקה", avatar_url: null, type: "dog", breed: "לברדור" },
};

async function mockFeed(page: Page) {
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      json: {
        user: { id: userId, email: "community@mipo.pet", full_name: "קהילת Mipo" },
        profile: { id: userId, email: "community@mipo.pet", full_name: "קהילת Mipo", first_name: "קהילת" },
      },
    });
  });
  await page.route("**/api/me/pets**", async (route) => {
    await route.fulfill({
      json: { pets: [{ id: petId, name: "לוקה", type: "dog", pet_type: "dog", avatar_url: null, archived: false }] },
    });
  });
  await page.route("**/api/feed?*", async (route) => {
    await route.fulfill({
      json: { posts: [post] },
    });
  });
  await page.route(`**/api/feed/posts/${postId}/comments`, async (route) => {
    await route.fulfill({
      json: {
        comments: [{
          id: commentId,
          post_id: postId,
          user_id: userId,
          parent_id: null,
          body: "איזה יופי",
          created_at: "2026-09-09T06:00:00.000Z",
          is_owner: false,
          creator: { id: userId, display_name: "נועה", avatar_url: null },
        }],
      },
    });
  });
}

async function fulfillReport(route: Route, duplicate: boolean) {
  const body = route.request().postDataJSON();
  await route.fulfill({
    status: duplicate ? 200 : 201,
    json: {
      duplicate,
      report: {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        content_type: body.content_type,
        content_id: body.content_id,
        reporter_id: userId,
      },
    },
  });
  return body;
}

test("a guest does not see the report control", async ({ page }) => {
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
  });
  await page.goto("/feed");
  await expect(page.getByRole("heading", { name: "התחבר כדי לראות את הקהילה" })).toBeVisible();
  await expect(page.getByRole("button", { name: "אפשרויות הרגע" })).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: "דיווח" })).toHaveCount(0);
  await expect(page.getByText("דיווח")).toHaveCount(0);
});

test("a moment can be reported, with a reason, a note, and a Hebrew thank-you", async ({ page }) => {
  await mockFeed(page);
  let reported: Record<string, unknown> | null = null;
  await page.route("**/api/reports", async (route) => {
    reported = await fulfillReport(route, false);
  });
  await page.goto("/feed");

  await page.getByRole("button", { name: "אפשרויות הרגע" }).click();
  await page.getByRole("menuitem", { name: "דיווח" }).click();
  const dialog = page.getByRole("dialog", { name: "דיווח על רגע" });
  await expect(dialog).toBeVisible();

  const submit = dialog.getByRole("button", { name: "שליחת דיווח" });
  await expect(submit).toBeDisabled();
  await expect(submit).toHaveCSS("background-color", "rgb(108, 99, 255)");

  await dialog.getByRole("button", { name: "ספאם או פרסומת" }).click();
  await dialog.getByLabel("הערה (לא חובה)").fill("זה פרסומת");
  await submit.click();

  await expect(dialog.getByTestId("report-ack")).toContainText("תודה על הדיווח");
  await expect(dialog.getByText("קיבלנו את הדיווח ונבדוק אותו.")).toBeVisible();
  expect(reported).toMatchObject({
    content_type: "post",
    content_id: postId,
    reason: "spam",
    description: "זה פרסומת",
  });
  expect(reported).not.toHaveProperty("reporter_id");
});

test("reporting the same moment again still thanks the member", async ({ page }) => {
  await mockFeed(page);
  await page.route("**/api/reports", async (route) => {
    await fulfillReport(route, true);
  });
  await page.goto("/feed");

  await page.getByRole("button", { name: "אפשרויות הרגע" }).click();
  await page.getByRole("menuitem", { name: "דיווח" }).click();
  const dialog = page.getByRole("dialog", { name: "דיווח על רגע" });
  await dialog.getByRole("button", { name: "משהו אחר" }).click();
  await dialog.getByRole("button", { name: "שליחת דיווח" }).click();

  await expect(dialog.getByText("הדיווח כבר התקבל")).toBeVisible();
  await expect(dialog.getByText("כבר קיבלנו דיווח מכם על התוכן הזה. תודה.")).toBeVisible();
});

test("a comment can be reported from the comments sheet", async ({ page }) => {
  await mockFeed(page);
  let reported: Record<string, unknown> | null = null;
  await page.route("**/api/reports", async (route) => {
    reported = await fulfillReport(route, false);
  });
  await page.goto("/feed");

  await page.getByRole("button", { name: "תגובות" }).click();
  await page.getByRole("button", { name: "אפשרויות לתגובה של נועה" }).click();
  await page.getByRole("menuitem", { name: "דיווח" }).click();
  const dialog = page.getByRole("dialog", { name: "דיווח על תגובה" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "הטרדה או פגיעה" }).click();
  await dialog.getByRole("button", { name: "שליחת דיווח" }).click();

  await expect(dialog.getByText("תודה על הדיווח")).toBeVisible();
  expect(reported).toMatchObject({
    content_type: "comment",
    content_id: commentId,
    reason: "harassment",
  });
});

test("the report dialog keeps focus inside and returns it to the opening button", async ({ page }) => {
  await mockFeed(page);
  await page.route("**/api/reports", async (route) => {
    await fulfillReport(route, false);
  });
  await page.goto("/feed");

  const opener = page.getByRole("button", { name: "אפשרויות הרגע" });
  await opener.click();
  await page.getByRole("menuitem", { name: "דיווח" }).click();
  const dialog = page.getByRole("dialog", { name: "דיווח על רגע" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(dialog.getByRole("button", { name: "סגירה" })).toBeFocused();

  const inside = () => dialog.evaluate((node) => node.contains(document.activeElement));
  await page.keyboard.press("Shift+Tab");
  expect(await inside()).toBe(true);
  await expect(dialog.getByLabel("הערה (לא חובה)")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "סגירה" })).toBeFocused();
  for (let step = 0; step < 8; step += 1) {
    await page.keyboard.press("Tab");
    expect(await inside()).toBe(true);
  }

  await dialog.getByRole("button", { name: "סגירה" }).click();
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});
