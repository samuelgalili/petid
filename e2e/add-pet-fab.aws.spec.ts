import { expect, test, type Page } from "@playwright/test";

/**
 * The floating add-pet control follows a signed-in person on the screens
 * where adding a pet is a sensible next step. Guests never see it, and it
 * stays off the reading pages and any path the app does not know.
 */

const ADD_PET = "הוספת חיה";

const EXCLUDED = [
  { path: "/support", landmark: "תמיכה ועזרה" },
  { path: "/terms", landmark: "תקנון ותנאי שימוש" },
  { path: "/science", landmark: "הסטנדרט המדעי של MIPO" },
  { path: "/breeds", landmark: "אנציקלופדיית גזעים" },
  { path: "/install", landmark: "טיפול בחיות מחמד" },
  { path: "/accessibility", landmark: "הצהרת נגישות" },
  { path: "/this-page-is-missing", landmark: "אופס! הדף ברח!" },
] as const;

const product = (id: string, name: string, price: number) => ({
  id,
  name,
  description: "מזון יבש איכותי",
  price,
  original_price: null,
  sale_price: null,
  image_url: "/placeholder.svg",
  images: ["/placeholder.svg"],
  category: "מזון",
  category_name: "מזון",
  pet_type: "dog",
  in_stock: true,
  is_featured: id === "1",
  brand: "MIPO",
  created_at: "2026-01-01T00:00:00.000Z",
});

const products = [
  product("1", "מזון יבש לכלב 7 קילו", 189),
  product("2", "צעצוע חבל כותנה", 39),
];

const signedInUser = {
  user: {
    id: "11111111-1111-4111-8111-111111111111",
    email: "owner@example.com",
    full_name: "בעלים",
    phone: "0501234567",
    email_verified: true,
    created_at: "2024-01-01T00:00:00.000Z",
  },
  profile: {
    id: "11111111-1111-4111-8111-111111111111",
    full_name: "בעלים",
    phone: "0501234567",
  },
  is_admin: false,
};

function json(body: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

async function mockGuest(page: Page) {
  await page.route("**/api/**", (route) => route.fulfill(json({})));
  await page.route("**/api/auth/me", (route) => route.fulfill(json({ error: "Unauthorized" }, 401)));
  await page.route("**/api/products*", (route) => route.fulfill(json({ products })));
}

async function mockSignedIn(page: Page) {
  await page.route("**/api/**", (route) => route.fulfill(json({})));
  await page.route("**/api/auth/me", (route) => route.fulfill(json(signedInUser)));
  await page.route("**/api/products*", (route) => route.fulfill(json({ products })));
  await page.route("**/api/me/pets*", (route) => route.fulfill(json({ pets: [] })));
  await page.route("**/api/feed*", (route) => route.fulfill(json({ posts: [] })));
}

async function open(page: Page, path: string) {
  const authSeen = page.waitForResponse((response) => {
    try {
      return new URL(response.url()).pathname.endsWith("/api/auth/me");
    } catch {
      return false;
    }
  });
  await page.goto(path);
  await authSeen;
}

const addPetButton = (page: Page) => page.getByRole("button", { name: ADD_PET });
const companionButton = (page: Page) => page.getByRole("button", { name: /הוספת חיה|שיחה עם מיפו/ });

type Box = { x: number; y: number; width: number; height: number };

function boxesOverlap(a: Box, b: Box) {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

/** True when the boxes are at least `gap` pixels apart on one axis. */
function separatedBy(a: Box, b: Box, gap: number) {
  return a.x + a.width + gap <= b.x + 0.5
    || b.x + b.width + gap <= a.x + 0.5
    || a.y + a.height + gap <= b.y + 0.5
    || b.y + b.height + gap <= a.y + 0.5;
}

/**
 * Absence has to be observed after the page has painted. A count of zero on
 * the first frame is also what a loading shell looks like, so this waits
 * until the button has had a chance to mount and still is not there.
 */
async function expectNoAddPet(page: Page) {
  const started = Date.now();
  await expect.poll(async () => {
    if (await addPetButton(page).count()) return "shown";
    return Date.now() - started >= 400 ? "absent" : "waiting";
  }).toBe("absent");
}

async function expectNoCompanion(page: Page) {
  const started = Date.now();
  await expect.poll(async () => {
    if (await companionButton(page).count()) return "shown";
    return Date.now() - started >= 400 ? "absent" : "waiting";
  }).toBe("absent");
}

async function expectNavClearance(page: Page) {
  const fab = companionButton(page);
  await expect(fab).toBeVisible();
  const fabBox = await fab.boundingBox();
  const navBox = await page.getByRole("navigation", { name: "ניווט ראשי" }).boundingBox();
  expect(fabBox).not.toBeNull();
  expect(navBox).not.toBeNull();
  expect(fabBox!.y + fabBox!.height).toBeLessThanOrEqual(navBox!.y - 8 + 0.5);
}

const petWithoutPhoto = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "QA",
  type: "dog",
  pet_type: "dog",
  avatar_url: null,
  gender: null,
};

async function mockPet(page: Page, pet: { id: string; name: string; avatar_url: string | null }) {
  await page.route("**/api/me/pets*", (route) => route.fulfill(json({ pets: [pet] })));
  await page.route("**/api/me/pets/*/health-summary", (route) => route.fulfill(json({
    pet,
    profile: null,
    vet_visits: [],
    vaccinations: [],
    documents: [],
    active_recovery: null,
  })));
  await page.route("**/api/me/pets/*/character", (route) => route.fulfill(json({
    available: false,
    character: null,
  })));
}

async function expectPageWithoutAddPet(page: Page, path: string, landmark: string) {
  await open(page, path);
  await expect(page.getByText(landmark, { exact: false }).first()).toBeVisible();
  await expectNoAddPet(page);
}

test.describe("floating add-pet button", () => {
  test("a guest does not see it on home, shop, feed, or the excluded pages", async ({ page }) => {
    await mockGuest(page);

    await open(page, "/");
    await expect(page).toHaveURL(/\/shop$/);
    await expect(page.getByRole("heading", { name: "חנות", exact: true })).toBeVisible();
    await expectNoAddPet(page);

    await open(page, "/shop");
    await expect(page.getByRole("heading", { name: "חנות", exact: true })).toBeVisible();
    await expect(page.getByText("מזון יבש לכלב 7 קילו")).toBeVisible();
    await expectNoAddPet(page);

    await open(page, "/feed");
    await expect(page.getByRole("heading", { name: "התחבר כדי לראות את הקהילה" })).toBeVisible();
    await expectNoAddPet(page);

    for (const screen of EXCLUDED) {
      await expectPageWithoutAddPet(page, screen.path, screen.landmark);
    }
  });

  test("a signed-in person sees it on home, not on the feed, and not on the excluded pages", async ({ page }) => {
    await mockSignedIn(page);

    await open(page, "/");
    const fab = addPetButton(page);
    const heading = page.getByRole("heading", { name: /איך .* מרגיש/ });
    const addFirstPet = page.getByRole("button", { name: "הוספת חיית המחמד הראשונה" });
    await expect(fab).toBeVisible();
    await expect(heading).toBeVisible();
    await expect(addFirstPet).toBeVisible();

    const fabBox = await fab.boundingBox();
    const headingBox = await heading.boundingBox();
    const addFirstBox = await addFirstPet.boundingBox();
    expect(fabBox).not.toBeNull();
    expect(headingBox).not.toBeNull();
    expect(addFirstBox).not.toBeNull();
    expect(boxesOverlap(fabBox!, headingBox!)).toBe(false);
    expect(boxesOverlap(fabBox!, addFirstBox!)).toBe(false);
    expect(separatedBy(fabBox!, headingBox!, 8)).toBe(true);
    expect(separatedBy(fabBox!, addFirstBox!, 8)).toBe(true);
    expect(fabBox!.y).toBeGreaterThanOrEqual(headingBox!.y + headingBox!.height);
    expect(fabBox!.y).toBeGreaterThanOrEqual(addFirstBox!.y + addFirstBox!.height);
    await expectNavClearance(page);

    await open(page, "/feed");
    await expect(page.getByRole("heading", { name: "הפיד מתחיל ברגע אחד" })).toBeVisible();
    await expectNoAddPet(page);

    for (const screen of EXCLUDED) {
      await expectPageWithoutAddPet(page, screen.path, screen.landmark);
    }
  });

  test("a pet without a photo is not offered the add-pet flow", async ({ page }) => {
    await mockSignedIn(page);
    await mockPet(page, petWithoutPhoto);

    await open(page, "/");
    const fab = page.getByRole("button", { name: "שיחה עם מיפו על QA" });
    const heading = page.getByRole("heading", { name: /איך QA מרגיש/ });
    const caption = page.getByText("הקישו על QA לעדכון מצב הרוח");
    await expect(fab).toBeVisible();
    await expect(addPetButton(page)).toHaveCount(0);
    await expect(heading).toBeVisible();
    await expect(caption).toBeVisible();

    const fabBox = await fab.boundingBox();
    const headingBox = await heading.boundingBox();
    const captionBox = await caption.boundingBox();
    expect(fabBox).not.toBeNull();
    expect(headingBox).not.toBeNull();
    expect(captionBox).not.toBeNull();
    expect(separatedBy(fabBox!, headingBox!, 8)).toBe(true);
    expect(separatedBy(fabBox!, captionBox!, 8)).toBe(true);
    await expectNavClearance(page);

    await fab.click();
    await expect(page).toHaveURL(/\/chat$/);
    await expect(page.getByText(/שלב \d+ מתוך/)).toHaveCount(0);
    await expectNoAddPet(page);

    await open(page, "/feed");
    await expect(page.getByRole("heading", { name: "הפיד מתחיל ברגע אחד" })).toBeVisible();
    await expectNoCompanion(page);
  });

  test("a pet photo does not cover the share action on the feed", async ({ page }) => {
    await mockSignedIn(page);
    const pet = { ...petWithoutPhoto, avatar_url: "/placeholder.svg" };
    await mockPet(page, pet);
    await page.route("**/api/feed*", (route) => route.fulfill(json({
      posts: [{
        id: "33333333-3333-4333-8333-333333333333",
        caption: "בוקר טוב",
        location: null,
        media_url: "/placeholder.svg",
        media_type: "image",
        visibility: "public",
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
        published_at: "2026-01-01T00:00:00.000Z",
        creator: {
          id: signedInUser.user.id,
          display_name: "בעלים",
          avatar_url: null,
        },
        pet: {
          id: pet.id,
          name: pet.name,
          avatar_url: pet.avatar_url,
          type: "dog",
          breed: null,
        },
      }],
    })));

    await open(page, "/feed");
    const share = page.getByRole("button", { name: "שיתוף" });
    await expect(share).toBeVisible();
    await expectNoCompanion(page);
    const shareBox = await share.boundingBox();
    expect(shareBox).not.toBeNull();
    expect(shareBox!.width).toBeGreaterThanOrEqual(44);
    expect(shareBox!.height).toBeGreaterThanOrEqual(44);
    const hit = await share.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const node = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return Boolean(node && (node === el || el.contains(node)));
    });
    expect(hit).toBe(true);
  });

  test("on the profile it stays clear of claims, payment methods, and the nav", async ({ page }) => {
    await mockSignedIn(page);
    await mockPet(page, petWithoutPhoto);
    await page.route("**/api/me/insurance-claims*", (route) => route.fulfill(json({ claims: [] })));
    await page.route("**/api/me/orders*", (route) => route.fulfill(json({ orders: [] })));
    await page.route("**/api/me/documents*", (route) => route.fulfill(json({ documents: [] })));

    await open(page, "/profile");
    const claims = page.getByText("אין תביעות ביטוח עדיין");
    const payments = page.getByRole("button", { name: "אמצעי תשלום" });
    await expect(claims).toBeVisible();
    await expect(payments).toBeVisible();
    await expectNoAddPet(page);

    const assertClear = async () => {
      const fab = companionButton(page);
      if (await fab.count() === 0) return;
      const fabBox = await fab.boundingBox();
      const claimsBox = await claims.boundingBox();
      const paymentsBox = await payments.boundingBox();
      const navBox = await page.getByRole("navigation", { name: "ניווט ראשי" }).boundingBox();
      expect(fabBox).not.toBeNull();
      expect(claimsBox).not.toBeNull();
      expect(paymentsBox).not.toBeNull();
      expect(navBox).not.toBeNull();
      expect(separatedBy(fabBox!, claimsBox!, 8)).toBe(true);
      expect(separatedBy(fabBox!, paymentsBox!, 8)).toBe(true);
      expect(fabBox!.y + fabBox!.height).toBeLessThanOrEqual(navBox!.y - 8 + 0.5);
    };

    await assertClear();
    await payments.evaluate((el) => el.scrollIntoView({ block: "end", inline: "nearest" }));
    await expect.poll(async () => {
      const fab = companionButton(page);
      if (await fab.count() === 0) return "clear";
      const fabBox = await fab.boundingBox();
      const paymentsBox = await payments.boundingBox();
      const claimsBox = await claims.boundingBox();
      if (!fabBox || !paymentsBox || !claimsBox) return "pending";
      return separatedBy(fabBox, paymentsBox, 8) && separatedBy(fabBox, claimsBox, 8) ? "clear" : "covered";
    }).toBe("clear");
  });
});
