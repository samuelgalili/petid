import { expect, test, type Page } from "@playwright/test";
import { validateCheckoutShipping, type CheckoutShippingInput } from "../src/lib/checkoutContact";
import { readCustomerSpecAttributes } from "../src/lib/productSpecs";

const quattroId = "d3affade-756c-4ada-bf9a-7e441b69f576";

const quattroProduct = {
  id: quattroId,
  name: "קוואטרו כלבים אדולט מיני עוף 7 ק\"ג",
  description: "מזון מלא לכלבים בוגרים מגזע קטן",
  price: 199,
  original_price: null,
  sale_price: null,
  image_url: "/placeholder.svg",
  images: ["/placeholder.svg"],
  category: "מזון",
  brand: "קוואטרו",
  pet_type: "dog",
  in_stock: true,
  weight: 7,
  weight_unit: "ק״ג",
  flavors: ["duck", "7 kg"],
  product_attributes: {
    animal: "כלב",
    barcode: "4770107251891",
    source_row: 147,
    import_source: "רשימת-מוצרים.xlsx",
    price_before_vat: 168.64,
    price_including_vat: 390,
    image_review_status: "Needs barcode/pack-size confirmation",
    image_candidate_url: "https://example.invalid/bag.png",
    protein: "28%",
    "חלבון עיקרי וטעם": "עוף",
  },
};

const catalog = [
  {
    id: quattroId,
    name: quattroProduct.name,
    description: quattroProduct.description,
    price: 199,
    original_price: null,
    sale_price: null,
    image_url: "/placeholder.svg",
    images: ["/placeholder.svg"],
    category: "מזון",
    pet_type: "dog",
    brand: "קוואטרו",
    in_stock: true,
    flavors: ["duck"],
  },
];

const filledHouse = (): CheckoutShippingInput => ({
  fullName: "ישראל ישראלי",
  email: "israel@example.com",
  phone: "050-123-4567",
  phoneSecondary: "",
  address: "הרצל",
  building: "12",
  entranceType: "house",
  floor: "",
  apartment: "",
  lobbyCode: "",
  city: "תל אביב",
  zipCode: "12 345",
  notes: "",
  leaveAtDoor: true,
});

test.describe("checkout contact normalization", () => {
  test("formatted phone and zip are accepted", () => {
    const result = validateCheckoutShipping(filledHouse());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.values.phone).toBe("0501234567");
      expect(result.values.zipCode).toBe("12345");
    }
  });

  test("a filled live value wins over empty React state", () => {
    const empty = { ...filledHouse(), phone: "", zipCode: "", fullName: "" };
    const result = validateCheckoutShipping(empty, {
      fullName: "ישראל ישראלי",
      phone: "+972 50-123-4567",
      zipCode: "12 345",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.values.phone).toBe("972501234567");
      expect(result.values.zipCode).toBe("12345");
    }
  });

  test("a building still requires an apartment and a lobby code", () => {
    const result = validateCheckoutShipping({
      ...filledHouse(),
      entranceType: "building",
      apartment: "",
      lobbyCode: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.apartment).toBeTruthy();
      expect(result.errors.lobbyCode).toBeTruthy();
    }
  });
});

test.describe("customer-facing product specs", () => {
  test("drops warehouse columns and keeps nutrition", () => {
    const rows = readCustomerSpecAttributes(quattroProduct.product_attributes);
    const labels = rows.map((row) => row.label);
    expect(labels).toContain("חלבון");
    expect(labels).toContain("חלבון עיקרי וטעם");
    expect(labels.join(" ")).not.toMatch(/barcode|source_row|import_source|price_including_vat|image_review/);
    expect(rows.map((row) => row.value).join(" ")).not.toContain("4770107251891");
    expect(rows.map((row) => row.value).join(" ")).not.toContain("390");
  });
});

async function mockCatalog(page: Page) {
  // The shop asks for ?view=storefront. A pattern with no query misses that
  // request, so the search has nothing to find.
  await page.route(/\/api\/products(?:\?|$)/, async (route) => {
    await route.fulfill({ json: { products: catalog } });
  });
  await page.route(`**/api/products/${quattroId}`, async (route) => {
    await route.fulfill({ json: { product: quattroProduct } });
  });
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
  });
}

test.describe("sales funnel", () => {
  test("entry offers the shop without an account", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("link", { name: "לקניות בחנות" }).click();
    await expect(page).toHaveURL(/\/shop$/);
    await expect(page.getByRole("heading", { name: "חנות", exact: true })).toBeVisible();
  });

  test("search, Quattro page, and a tap add to the cart", async ({ page }) => {
    await mockCatalog(page);
    await page.goto("/shop");
    await page.getByLabel("חיפוש בחנות").fill("קוואטרו");
    await page.getByRole("heading", { name: quattroProduct.name }).click();

    const sheet = page.getByRole("dialog");
    await expect(sheet.getByTestId("shop-add-to-cart")).toBeVisible();
    await sheet.getByTestId("shop-add-to-cart").click();

    await page.getByRole("button", { name: "עגלת קניות" }).click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByLabel("חיפוש בחנות")).toBeHidden();
    await expect(page.getByRole("heading", { name: quattroProduct.name })).toBeVisible();

    await page.getByRole("button", { name: "הוסף כמות" }).click();
    await expect(page.getByRole("heading", { name: "סיכום הזמנה" })).toBeVisible();
    await expect(page.locator("span.font-jakarta", { hasText: /^2$/ })).toBeVisible();
  });

  test("Quattro product page hides warehouse fields and can be added", async ({ page }) => {
    await mockCatalog(page);
    await page.goto(`/product/${quattroId}`);
    await expect(page.getByRole("heading", { name: quattroProduct.name })).toBeVisible();
    await expect(page.getByText("קוואטרו", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("עוף", { exact: true })).toBeVisible();
    await expect(page.getByText("4770107251891")).toHaveCount(0);
    await expect(page.getByText("Needs barcode/pack-size confirmation")).toHaveCount(0);
    await expect(page.getByText("רשימת-מוצרים.xlsx")).toHaveCount(0);
    await expect(page.getByText("390", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "הוסף לעגלה" }).click();
    await page.getByRole("button", { name: "עגלת קניות" }).click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByRole("heading", { name: quattroProduct.name })).toBeVisible();
  });

  test("formatted phone and zip reach the payment step without an order", async ({ page }) => {
    const orderCalls: string[] = [];
    await page.route("**/api/orders", async (route) => {
      orderCalls.push(route.request().method());
      await route.fulfill({ status: 500, json: { error: "funnel test must not place an order" } });
    });
    await page.route("**/api/payments/**", async (route) => {
      orderCalls.push(route.request().url());
      await route.abort("failed");
    });
    await page.addInitScript(() => {
      localStorage.setItem("mipo-cart", JSON.stringify([{
        id: "line-1",
        productId: "d3affade-756c-4ada-bf9a-7e441b69f576",
        name: "קוואטרו כלבים אדולט מיני עוף",
        price: 199,
        image: "/placeholder.svg",
        quantity: 1,
      }]));
    });

    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: "כתובת למשלוח" })).toBeVisible();

    await page.getByLabel(/שם מלא/).fill("ישראל ישראלי");
    await page.getByLabel(/^אימייל/).fill("israel@example.com");
    await page.getByLabel(/מספר טלפון/).fill("050-123-4567");
    await page.getByLabel(/^רחוב/).fill("הרצל");
    await page.getByLabel(/מס׳ בית/).fill("12");
    await page.getByLabel(/^עיר/).fill("תל אביב");
    await page.getByLabel(/מיקוד/).fill("12 345");
    await page.getByRole("checkbox").click();
    await page.getByTestId("checkout-continue").click();

    await expect(page.getByTestId("checkout-payment-heading")).toBeVisible();
    await expect(page.getByText("שגיאת אימות")).toHaveCount(0);
    await expect(page.getByText("כרטיס אשראי")).toBeVisible();
    expect(orderCalls).toEqual([]);
  });
});
