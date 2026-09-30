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

type Box = { x: number; y: number; width: number; height: number };

function boxesOverlap(a: Box, b: Box) {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
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
    expect(fabBox!.y).toBeGreaterThanOrEqual(headingBox!.y + headingBox!.height);
    expect(fabBox!.y).toBeGreaterThanOrEqual(addFirstBox!.y + addFirstBox!.height);

    await open(page, "/feed");
    await expect(page.getByRole("heading", { name: "הפיד מתחיל ברגע אחד" })).toBeVisible();
    await expectNoAddPet(page);

    for (const screen of EXCLUDED) {
      await expectPageWithoutAddPet(page, screen.path, screen.landmark);
    }
  });

  test("on home it sits clear of the heading and the caption", async ({ page }) => {
    await mockSignedIn(page);
    const pet = {
      id: "22222222-2222-4222-8222-222222222222",
      name: "QA",
      type: "dog",
      pet_type: "dog",
      avatar_url: null,
      gender: null,
    };
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

    await open(page, "/");
    const fab = addPetButton(page);
    const heading = page.getByRole("heading", { name: /איך QA מרגיש/ });
    const caption = page.getByText("הקישו על QA לעדכון מצב הרוח");
    await expect(fab).toBeVisible();
    await expect(heading).toBeVisible();
    await expect(caption).toBeVisible();

    const fabBox = await fab.boundingBox();
    const headingBox = await heading.boundingBox();
    const captionBox = await caption.boundingBox();
    const navBox = await page.getByRole("navigation", { name: "ניווט ראשי" }).boundingBox();
    expect(fabBox).not.toBeNull();
    expect(headingBox).not.toBeNull();
    expect(captionBox).not.toBeNull();
    expect(navBox).not.toBeNull();
    expect(boxesOverlap(fabBox!, headingBox!)).toBe(false);
    expect(boxesOverlap(fabBox!, captionBox!)).toBe(false);
    const sharesColumn = fabBox!.x < captionBox!.x + captionBox!.width
      && fabBox!.x + fabBox!.width > captionBox!.x;
    if (sharesColumn) {
      expect(fabBox!.y).toBeGreaterThanOrEqual(captionBox!.y + captionBox!.height - 0.5);
    }
    expect(fabBox!.y + fabBox!.height).toBeLessThanOrEqual(navBox!.y + 0.5);
  });
});
