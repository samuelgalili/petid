import { expect, test, type Page } from "@playwright/test";

/**
 * The community feed is a full-screen vertical reel, not a card list. These
 * tests pin the three properties that made it that, because each of them was
 * wrong at some point while it was built:
 *
 *   - a Moment fills the visible area, and the visible area is the viewport
 *     minus the bottom navigation, not the viewport;
 *   - the photo is contained whole rather than cropped to 9:16;
 *   - the reel ends deliberately instead of loading forever.
 */

const userId = "88888888-8888-4888-8888-888888888888";
const petId = "99999999-9999-4999-8999-999999999999";

const post = (id: string, caption: string) => ({
  id,
  caption,
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
});

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
      json: { posts: [post("77777777-7777-4777-8777-777777777771", "הטיול הראשון של לוקה"), post("77777777-7777-4777-8777-777777777772", "בוקר בפארק")] },
    });
  });
}

test("a Moment fills the screen above the navigation, and does not hide behind it", async ({ page }) => {
  await mockFeed(page);
  await page.goto("/feed");

  const slide = page.getByTestId("moment-slide").first();
  await expect(slide).toBeVisible();

  const viewport = page.viewportSize();
  const box = await slide.boundingBox();
  expect(viewport).not.toBeNull();
  expect(box).not.toBeNull();

  // The navigation bar is 68px tall and fixed to the bottom. A slide of a full
  // viewport height pushes its caption underneath it, which is what this
  // catches: the slide is the viewport minus the bar, within a pixel or two of
  // rounding and the safe-area inset.
  const expected = viewport!.height - 68;
  expect(Math.abs(box!.height - expected)).toBeLessThanOrEqual(4);

  // The author's name belongs to the Moment and has to stay above the bar.
  const author = slide.getByText("לוקה").first();
  const authorBox = await author.boundingBox();
  expect(authorBox!.y + authorBox!.height).toBeLessThanOrEqual(viewport!.height - 68);
});

test("the photo is shown whole rather than cropped to the frame", async ({ page }) => {
  await mockFeed(page);
  await page.goto("/feed");

  const media = page.getByTestId("moment-media").first();
  await expect(media).toBeVisible();
  // object-contain is the difference between seeing the pet and seeing the
  // middle third of the pet: most of this catalogue's photos are 4:5.
  await expect(media).toHaveCSS("object-fit", "contain");
});

test("the reel stops at the end instead of loading forever", async ({ page }) => {
  await mockFeed(page);
  await page.goto("/feed");

  await expect(page.getByTestId("moment-slide")).toHaveCount(2);

  const reel = page.getByTestId("moment-reel");
  await reel.evaluate((el) => el.scrollTo(0, el.scrollHeight));

  await expect(page.getByText("ראית את כל הרגעים החדשים")).toBeVisible();
  // Still two Moments: reaching the end must not fetch a third page.
  await expect(page.getByTestId("moment-slide")).toHaveCount(2);
});
