import { expect, test, type Page } from "@playwright/test";

/**
 * The shop asks one question.
 *
 * What stood here was a browse-and-filter catalogue: two tabs, a category bar,
 * a cross-pet medical banner, two algorithmic rails, then rows of products.
 * The owner said three times that the shop was not what had been designed, and
 * he was right in a way that restyling a card could never reach — the design
 * is a different screen.
 *
 * These are the behaviours that make it that screen rather than the old one
 * wearing new paint. Every one of them is a thing a person can see: what is on
 * the screen before you type, what happens as you type, and when the assistant
 * is offered.
 */

const USER_ID = "11111111-1111-4111-8111-111111111111";

const user = {
  id: USER_ID,
  email: "owner@example.com",
  full_name: "בעלים",
  phone: "0501234567",
  created_at: "2024-01-01T00:00:00.000Z",
};

const pets = [{
  id: "99999999-9999-4999-8999-999999999999",
  user_id: USER_ID,
  name: "ציפסר",
  type: "cat",
  pet_type: "cat",
  breed: "מעורב",
  // A REAL avatar url, because the companion only draws its aurora when the
  // pet has one — with null it renders a bordered plus and the second-aurora
  // assertion below passes for the wrong reason.
  avatar_url: "/placeholder.svg",
  weight: 4.5,
  birth_date: "2022-05-01",
  gender: "male",
  medical_conditions: [],
  archived: false,
}];

const product = (id: string, name: string, price: number) => ({
  id,
  name,
  description: "מזון יבש איכותי",
  price,
  original_price: price + 30,
  sale_price: null,
  image_url: "/placeholder.svg",
  images: null,
  category: "מזון",
  category_id: "c1",
  category_name: "מזון",
  pet_type: "cat",
  in_stock: true,
  is_featured: false,
  business_id: null,
  sku: null,
  brand: "QUATTRO",
  created_at: "2026-01-01T00:00:00.000Z",
  source: "manual",
});

const products = [
  product("1", "קוואטרו חתולים אדולט עוף 7 קילו", 249),
  product("2", "קוואטרו חתולים סטרלייזד 2 קילו", 119),
  product("3", "מברשת טיפוח לפרווה ארוכה", 45),
];

async function openShop(page: Page) {
  await page.route("**/api/**", (route) => route.fulfill({
    status: 200, contentType: "application/json", body: "{}",
  }));
  await page.route("**/api/auth/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ user, profile: { id: USER_ID, full_name: "בעלים" }, is_admin: false }),
  }));
  await page.route("**/api/me/pets*", (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({ pets }),
  }));
  await page.route("**/api/products*", (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({ products }),
  }));

  await page.goto("/shop");
  await expect(page.getByLabel("חיפוש בחנות")).toBeVisible();
}

test.describe("The shop is one question", () => {
  test.describe.configure({ mode: "serial" });

  test("at rest it shows no products at all", async ({ page }) => {
    await openShop(page);

    // THE LOAD-BEARING ASSERTION. A shelf of products at rest is what turns
    // the question back into the catalogue this screen replaced, and it is the
    // change most likely to be undone by someone who thinks the screen looks
    // empty.
    await expect(page.getByText("₪249")).toHaveCount(0);
    await expect(page.getByText("₪119")).toHaveCount(0);

    await expect(page.getByText("אפשר לשאול כל דבר")).toBeVisible();
    for (const prompt of ["הכלב שלי משיר הרבה", "אוכל יבש לגור", "צעצוע לתוכי"]) {
      await expect(page.getByRole("button", { name: prompt })).toBeVisible();
    }
  });

  test("the field is asked in the pet's name", async ({ page }) => {
    await openShop(page);
    await expect(page.getByPlaceholder("מה המשאלה היום של ציפסר...")).toBeVisible();
  });

  test("results arrive as the characters land, with no submit", async ({ page }) => {
    await openShop(page);

    // No Enter, no button. The first characters are the whole interaction.
    await page.getByLabel("חיפוש בחנות").fill("קוואטרו");

    await expect(page.getByText("2 מוצרים")).toBeVisible();
    await expect(page.getByText("קוואטרו חתולים אדולט עוף 7 קילו")).toBeVisible();
    await expect(page.getByText("מברשת טיפוח לפרווה ארוכה")).toHaveCount(0);

    // And the pet steps aside once there is a query: one element, two
    // positions, not two screens' worth of furniture at once.
    await expect(page.getByText("אפשר לשאול כל דבר")).toHaveCount(0);
  });

  test("no match says so instead of showing the catalogue", async ({ page }) => {
    await openShop(page);
    await page.getByLabel("חיפוש בחנות").fill("אוכף לסוס");
    await expect(page.getByText("אין התאמה — אפשר לשאול אחרת")).toBeVisible();
    await expect(page.getByText("₪249")).toHaveCount(0);
  });

  test("a question offers the assistant; a lookup does not", async ({ page }) => {
    await openShop(page);
    const field = page.getByLabel("חיפוש בחנות");
    const offer = page.getByRole("button", { name: /להמשיך עם מיפו על זה/ });

    // A lookup. Offering the assistant here is what makes it wallpaper.
    await field.fill("קוואטרו");
    await expect(offer).toHaveCount(0);

    // More than three words: a question.
    await field.fill("מה הכי טוב לחתול עם סוכרת");
    await expect(offer).toBeVisible();

    // A question mark is enough on its own.
    await field.fill("סוכרת?");
    await expect(offer).toBeVisible();
  });

  test("the browse-and-filter furniture is gone", async ({ page }) => {
    await openShop(page);

    // These are the controls the rebuild removed. A test naming them is how a
    // reinstatement becomes a decision someone makes on purpose rather than a
    // component quietly reappearing in a merge.
    await expect(page.getByRole("button", { name: "מועדפים", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "הכל", exact: true })).toHaveCount(0);
  });

  test("the pet wears the only aurora on the screen", async ({ page }) => {
    await openShop(page);

    // The canvas's first rule: "ברגע שהזוהר מופיע במקום שני, הוא מפסיק לומר
    // ״זו החיה שלך״". The floating AvatarCompanion parked a second one in the
    // corner of this screen, over the results grid.
    await expect(page.locator(".mipo-avatar-glow")).toHaveCount(1);
  });
});
