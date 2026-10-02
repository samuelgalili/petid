import { readFileSync } from "node:fs";

import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * A post with no pet must not publish the author's full name or a photo of
 * them. "דנה כהן" is shown as "דנה", and the picture is the default Mipo
 * image. A tagged pet keeps its own name and photo.
 */

const userId = "88888888-8888-4888-8888-888888888888";
const petId = "99999999-9999-4999-8999-999999999999";
const postId = "77777777-7777-4777-8777-777777777771";
const commentId = "66666666-6666-4666-8666-666666666661";
const humanAvatar = "https://cdn.example/people/dana-face.jpg";

const defaultAvatarDataUrl = `data:image/png;base64,${readFileSync(
  new URL("../src/assets/default-pet-avatar.png", import.meta.url),
).toString("base64")}`;

const basePost = {
  id: postId,
  caption: "בוקר בפארק",
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
  comment_count: 1,
  viewer_has_liked: false,
  viewer_has_saved: false,
  is_owner: false,
  published_at: "2026-09-30T08:00:00.000Z",
  creator: { id: userId, display_name: "דנה כהן", avatar_url: humanAvatar },
};

async function expectDefaultMipoAvatar(avatar: Locator) {
  const src = await avatar.getAttribute("src");
  expect(src).toBeTruthy();
  expect(src).not.toContain("dana-face");
  if (src!.startsWith("data:")) {
    expect(src).toBe(defaultAvatarDataUrl);
    return;
  }
  expect(src).toContain("default-pet-avatar");
}

async function openFeed(page: Page, post: Record<string, unknown>) {
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      json: {
        user: { id: userId, email: "community@mipo.pet", full_name: "צופה" },
        profile: { id: userId, email: "community@mipo.pet", full_name: "צופה", first_name: "צופה" },
      },
    });
  });
  await page.route("**/api/me/pets**", async (route) => {
    await route.fulfill({ json: { pets: [] } });
  });
  await page.route("**/api/feed?*", async (route) => {
    await route.fulfill({ json: { posts: [post] } });
  });
  await page.goto("/feed");
}

test("an account with no pet tag shows the first name and the default avatar", async ({ page }) => {
  await openFeed(page, { ...basePost, pet: null });

  const name = page.getByTestId("moment-author-name");
  await expect(name).toHaveText("דנה");
  await expect(page.getByText("דנה כהן")).toHaveCount(0);
  await expect(page.getByText("כהן")).toHaveCount(0);
  await expectDefaultMipoAvatar(page.getByTestId("moment-author-avatar"));
  await expect(page.locator('img[src*="dana-face"]')).toHaveCount(0);
});

test("a tagged pet keeps the pet's name and photo", async ({ page }) => {
  await openFeed(page, {
    ...basePost,
    pet: { id: petId, name: "לוקה", avatar_url: "https://cdn.example/pets/luka.png", type: "dog", breed: null },
  });

  await expect(page.getByTestId("moment-author-name")).toHaveText("לוקה");
  await expect(page.getByTestId("moment-author-avatar")).toHaveAttribute("src", "https://cdn.example/pets/luka.png");
  await expect(page.getByText("דנה כהן")).toHaveCount(0);
  await expect(page.locator('img[src*="dana-face"]')).toHaveCount(0);
});

test("a comment shows the first name and the default avatar", async ({ page }) => {
  await page.route(`**/api/feed/posts/${postId}/comments`, async (route) => {
    await route.fulfill({
      json: {
        comments: [{
          id: commentId,
          post_id: postId,
          user_id: userId,
          parent_id: null,
          body: "איזה כיף",
          created_at: "2026-09-30T08:05:00.000Z",
          is_owner: false,
          creator: { id: userId, display_name: "דנה כהן", avatar_url: humanAvatar },
        }],
      },
    });
  });
  await openFeed(page, { ...basePost, pet: null });

  await page.getByRole("button", { name: "תגובות" }).click();
  await expect(page.getByTestId("comment-author-name")).toHaveText("דנה");
  await expect(page.getByText("איזה כיף")).toBeVisible();
  await expect(page.getByText("דנה כהן")).toHaveCount(0);
  await expect(page.getByText("כהן")).toHaveCount(0);
  await expectDefaultMipoAvatar(page.getByTestId("comment-author-avatar"));
  await expect(page.locator('img[src*="dana-face"]')).toHaveCount(0);
});
