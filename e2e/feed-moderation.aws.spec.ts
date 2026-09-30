import { expect, test, type Page } from "@playwright/test";

/**
 * A hidden post leaves an open feed within a minute.
 *
 * The API is not cached. The screen still holds whatever it drew, so it asks
 * again every minute and drops a post the server no longer returns.
 */

const userId = "88888888-8888-4888-8888-888888888888";
const petId = "99999999-9999-4999-8999-999999999999";
const postId = "77777777-7777-4777-8777-777777777771";

const post = {
  id: postId,
  caption: "הטיול שנעלם",
  location: null,
  media_url: "/placeholder.svg",
  media_type: "image" as const,
  visibility: "public" as const,
  allow_comments: true,
  poll_question: null,
  poll_options: [],
  poll_results: [],
  viewer_poll_option: null,
  reaction_count: 0,
  comment_count: 0,
  viewer_has_liked: false,
  viewer_has_saved: false,
  is_owner: false,
  published_at: "2026-09-09T06:00:00.000Z",
  creator: { id: userId, display_name: "קהילת Mipo", avatar_url: null },
  pet: { id: petId, name: "לוקה", avatar_url: null, type: "dog", breed: "לברדור" },
};

async function mockMember(page: Page) {
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
}

test("a post the server stops returning leaves the open feed within a minute", async ({ page }) => {
  await mockMember(page);
  let hidden = false;
  await page.route("**/api/feed?*", async (route) => {
    await route.fulfill({ json: { posts: hidden ? [] : [post] } });
  });

  await page.clock.install();
  await page.goto("/feed");
  await expect(page.getByText("הטיול שנעלם")).toBeVisible();
  hidden = true;

  await page.clock.fastForward(60_000);
  await expect(page.getByText("הטיול שנעלם")).toHaveCount(0);
});
