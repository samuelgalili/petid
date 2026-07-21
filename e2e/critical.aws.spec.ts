import { expect, test, type Page } from "@playwright/test";

const catalog = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "מזון בדיקה MIPO",
    description: "מזון מלא לכלבים",
    price: 100,
    original_price: null,
    sale_price: 79,
    image_url: "/placeholder.svg",
    images: ["/placeholder.svg"],
    category: "מזון",
    pet_type: "dog",
    in_stock: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "צעצוע בדיקה MIPO",
    description: "צעצוע עמיד לחתולים",
    price: 39,
    original_price: null,
    sale_price: null,
    image_url: "/placeholder.svg",
    images: ["/placeholder.svg"],
    category: "צעצועים",
    pet_type: "cat",
    in_stock: true,
  },
];

const cartItem = {
  id: `${catalog[0].id}-default`,
  productId: catalog[0].id,
  name: catalog[0].name,
  price: catalog[0].sale_price,
  image: catalog[0].image_url,
  quantity: 1,
};

async function mockCatalog(page: Page) {
  await page.route("**/api/products", async (route) => {
    await route.fulfill({ json: { products: catalog } });
  });
}

const loginFailureCases = [
  {
    name: "invalid credentials",
    status: 401,
    backendError: "Invalid email or password",
    expectedMessage: "האימייל או הסיסמה שגויים.",
    showsPasswordReset: true,
  },
  {
    name: "rate limiting",
    status: 429,
    backendError: "Too many requests",
    expectedMessage: "בוצעו יותר מדי ניסיונות התחברות. נסו שוב בעוד כמה דקות.",
    showsPasswordReset: false,
  },
  {
    name: "server failure",
    status: 500,
    backendError: "Internal server error",
    expectedMessage: "שירות ההתחברות אינו זמין כרגע. נסו שוב בעוד כמה דקות.",
    showsPasswordReset: false,
  },
] as const;

test.describe("AWS application smoke tests", () => {
  test("renders current email authentication and signup", async ({ page }) => {
    await page.goto("/auth");

    await expect(page.getByRole("heading", { name: "ברוכים הבאים ל-MIPO" })).toBeVisible();
    const email = page.getByPlaceholder("אימייל");
    const password = page.getByPlaceholder("סיסמה");
    const login = page.getByRole("button", { name: "התחברות", exact: true });

    await expect(email).toBeVisible();
    await expect(password).toBeVisible();
    await expect(login).toBeDisabled();

    await email.fill("smoke@example.com");
    await password.fill("valid-password");
    await expect(login).toBeEnabled();

    await page.getByRole("link", { name: "הרשמה", exact: true }).click();
    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole("heading", { name: "הצטרפו ל-MIPO" })).toBeVisible();
    await expect(page.getByLabel("תאריך לידה")).toBeVisible();
  });

  for (const failure of loginFailureCases) {
    test(`shows a safe Hebrew message for ${failure.name}`, async ({ page }) => {
      await page.route("**/api/auth/me", async (route) => {
        await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
      });
      await page.route("**/api/auth/login", async (route) => {
        await route.fulfill({
          status: failure.status,
          json: { error: failure.backendError },
        });
      });

      await page.goto("/auth");
      await page.getByPlaceholder("אימייל").fill("user@example.com");
      await page.getByPlaceholder("סיסמה").fill("valid-password");
      await page.getByRole("button", { name: "התחברות", exact: true }).click();

      const formAlert = page.locator("form").getByRole("alert");
      await expect(formAlert).toContainText(failure.expectedMessage);
      await expect(formAlert).not.toContainText(failure.backendError);

      const passwordReset = formAlert.getByRole("link", { name: "שכחת סיסמה? לאיפוס הסיסמה" });
      if (failure.showsPasswordReset) {
        await expect(passwordReset).toBeVisible();
        await passwordReset.click();
        await expect(page).toHaveURL(/\/forgot-password$/);
      } else {
        await expect(passwordReset).toHaveCount(0);
      }
    });
  }

  test("shows a Hebrew connection message when login cannot reach the API", async ({ page }) => {
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({ status: 401, json: { error: "Unauthorized" } });
    });
    await page.route("**/api/auth/login", async (route) => {
      await route.abort("failed");
    });

    await page.goto("/auth");
    await page.getByPlaceholder("אימייל").fill("user@example.com");
    await page.getByPlaceholder("סיסמה").fill("valid-password");
    await page.getByRole("button", { name: "התחברות", exact: true }).click();

    const formAlert = page.locator("form").getByRole("alert");
    await expect(formAlert).toContainText("לא ניתן להתחבר לשירות. בדקו את החיבור לאינטרנט ונסו שוב.");
    await expect(formAlert).not.toContainText("Failed to fetch");
  });

  test("redirects protected customer and admin routes", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/auth$/);
    await expect(page.getByRole("heading", { name: "ברוכים הבאים ל-MIPO" })).toBeVisible();

    await page.goto("/admin/products");
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole("heading", { name: "כניסת מנהל" })).toBeVisible();
  });

  test("keeps password reset usable when its background video fails", async ({ page }) => {
    await page.route("**/videos/background-pup-story.mp4", async (route) => {
      await route.abort("failed");
    });
    await page.route("**/api/auth/password-reset/request", async (route) => {
      await route.fulfill({
        json: {
          ok: true,
          email_delivery: "not_configured",
          debug_otp: "123456",
        },
      });
    });

    await page.goto("/forgot-password");
    await expect(page.getByRole("heading", { name: "איפוס סיסמה" })).toBeVisible();

    const email = page.getByLabel("כתובת אימייל");
    await expect(email).toBeVisible();
    await email.fill("reset@example.com");
    await page.getByRole("button", { name: "שליחת קוד אימות" }).click();
    await expect(page.getByRole("heading", { name: "הזנת קוד אימות" })).toBeVisible();
    await expect(page.getByText("reset@example.com", { exact: true })).toBeVisible();
  });

  test("renders and searches the mocked AWS catalog", async ({ page }) => {
    await mockCatalog(page);
    const catalogResponse = page.waitForResponse((response) => (
      response.url().endsWith("/api/products") && response.status() === 200
    ));

    await page.goto("/shop");
    await catalogResponse;

    await expect(page.getByRole("heading", { name: "חנות", exact: true })).toBeVisible();
    const foodProduct = page.getByRole("heading", { name: catalog[0].name });
    const toyProduct = page.getByRole("heading", { name: catalog[1].name });
    await expect(foodProduct).toBeVisible();
    await expect(toyProduct).toBeVisible();
    await expect(page.getByText("₪79", { exact: true }).first()).toBeVisible();

    await foodProduct.click();
    const productDialog = page.getByRole("dialog");
    await expect(productDialog.getByText("₪79", { exact: true })).toBeVisible();
    await expect(productDialog.getByText("₪100", { exact: true })).toBeVisible();
    await productDialog.getByRole("button", { name: "סגירה" }).click();
    await expect(productDialog).toBeHidden();

    await page.getByRole("button", { name: "מזון", exact: true }).click();
    await expect(foodProduct).toBeVisible();
    await expect(toyProduct).toHaveCount(0);

    await page.getByRole("button", { name: "הכל", exact: true }).click();
    await expect(toyProduct).toBeVisible();

    await page.getByPlaceholder("חפש מוצרים...").fill("מזון בדיקה");
    await expect(foodProduct).toBeVisible();
    await expect(toyProduct).toHaveCount(0);
  });

  test("does not claim success for unpaid or failed order verification", async ({ page }) => {
    const orderId = "44444444-4444-4444-8444-444444444444";
    await page.addInitScript(({ id, token }) => {
      localStorage.setItem("mipo_order_access_tokens", JSON.stringify({ [id]: token }));
    }, { id: orderId, token: "unpaid-order-access-token" });

    await page.route(`**/api/orders/${orderId}**`, async (route) => {
      await route.fulfill({
        json: {
          order: {
            id: orderId,
            order_number: "MIPO-E2E-UNPAID",
            status: "pending",
            payment_status: "pending",
            payment_method: "credit-card",
            items: [],
            order_items: [],
            shipping_address: { email: "buyer@example.com" },
            customer_name: "Test Buyer",
            customer_email: "buyer@example.com",
            customer_phone: "0501234567",
            subtotal: 79,
            shipping: 25,
            tax: 0,
            discount_amount: 0,
            cash_on_delivery_fee: 0,
            total: 104,
            order_date: "2026-07-10T08:00:00.000Z",
          },
        },
      });
    });

    await page.goto(`/payment-success?order_id=${orderId}`);
    await expect(page.getByText("לא ניתן לאמת את התשלום", { exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /התשלום בוצע בהצלחה/ })).toHaveCount(0);

    const failedOrderId = "55555555-5555-4555-8555-555555555555";
    const failedOrderPage = await page.context().newPage();
    await failedOrderPage.addInitScript(({ id, token }) => {
      localStorage.setItem("mipo_order_access_tokens", JSON.stringify({ [id]: token }));
    }, { id: failedOrderId, token: "failed-order-access-token" });
    await failedOrderPage.route(`**/api/orders/${failedOrderId}**`, async (route) => {
      await route.fulfill({ status: 500, json: { error: "order lookup failed" } });
    });

    await failedOrderPage.goto(`/payment-success?order_id=${failedOrderId}`);
    await expect(failedOrderPage.getByText("לא ניתן לאמת את התשלום", { exact: true })).toBeVisible();
    await expect(failedOrderPage.getByRole("heading", { name: /התשלום בוצע בהצלחה/ })).toHaveCount(0);
    await failedOrderPage.close();
  });

  test("completes a guest cash-on-delivery order", async ({ page }) => {
    await page.addInitScript((item) => {
      localStorage.setItem("petid-cart", JSON.stringify([item]));
    }, cartItem);

    let submittedOrder: Record<string, unknown> | undefined;
    await page.route("**/api/orders", async (route) => {
      submittedOrder = route.request().postDataJSON() as Record<string, unknown>;
      const shippingAddress = submittedOrder.shipping_address as Record<string, string>;

      await route.fulfill({
        json: {
          order: {
            id: "33333333-3333-4333-8333-333333333333",
            order_number: "MIPO-E2E-1001",
            items: [cartItem],
            shipping_address: shippingAddress,
            payment_method: "cash-on-delivery",
            subtotal: 79,
            shipping: 25,
            tax: 0,
            discount_amount: 0,
            cash_on_delivery_fee: 5,
            total: 109,
            order_date: "2026-07-10T08:00:00.000Z",
          },
          access_token: "guest-order-access-token",
        },
      });
    });

    await page.goto("/cart");
    await expect(page.getByText(cartItem.name, { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "סיכום הזמנה" })).toBeVisible();

    await page.getByRole("button", { name: "המשך לתשלום" }).click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByRole("heading", { name: "כתובת למשלוח" })).toBeVisible();

    await page.getByLabel(/שם מלא/).fill("ישראל ישראלי");
    await page.getByLabel(/אימייל/).fill("israel@example.com");
    await page.getByLabel(/מספר טלפון/).fill("0501234567");
    await page.getByLabel(/כתובת רחוב/).fill("רחוב הרצל 123");
    await page.getByLabel(/עיר/).fill("תל אביב");
    await page.getByLabel(/מיקוד/).fill("12345");
    await page.getByRole("button", { name: "המשך", exact: true }).click();

    await expect(page.getByRole("heading", { name: "אמצעי תשלום" })).toBeVisible();
    const cashOnDelivery = page.getByRole("radio", { name: "מזומן במשלוח" });
    await cashOnDelivery.click();
    await expect(cashOnDelivery).toBeChecked();
    await page.getByRole("button", { name: "המשך", exact: true }).click();

    await expect(page.getByRole("heading", { name: "סיכום הזמנה" })).toBeVisible();
    await page.getByRole("button", { name: /בצע הזמנה/ }).click();

    await expect(page).toHaveURL(/\/order-confirmation$/);
    await expect(page.getByText("MIPO-E2E-1001", { exact: true })).toBeVisible();
    const rememberedTokens = await page.evaluate(() => (
      JSON.parse(localStorage.getItem("mipo_order_access_tokens") || "{}") as Record<string, string>
    ));
    expect(rememberedTokens["MIPO-E2E-1001"]).toBe("guest-order-access-token");
    expect(submittedOrder).toMatchObject({
      payment_method: "cash-on-delivery",
      expected_total: 109,
      items: [{ product_id: catalog[0].id, name: cartItem.name, quantity: 1 }],
    });
  });

  test("renders the AWS social feed and persists a reaction", async ({ page }) => {
    const userId = "88888888-8888-4888-8888-888888888888";
    const petId = "99999999-9999-4999-8999-999999999999";
    const postId = "77777777-7777-4777-8777-777777777777";

    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        json: {
          user: { id: userId, email: "community@mipo.pet", full_name: "קהילת Mipo" },
          profile: {
            id: userId,
            email: "community@mipo.pet",
            full_name: "קהילת Mipo",
            first_name: "קהילת",
            last_name: "Mipo",
            phone: "0501234567",
            city: "תל אביב",
          },
        },
      });
    });
    await page.route("**/api/me/pets**", async (route) => {
      await route.fulfill({
        json: {
          pets: [{ id: petId, name: "לוקה", type: "dog", pet_type: "dog", avatar_url: "/placeholder.svg", archived: false }],
        },
      });
    });
    await page.route("**/api/feed?*", async (route) => {
      await route.fulfill({
        json: {
          posts: [{
            id: postId,
            caption: "הטיול הראשון של לוקה בפארק",
            location: "פארק הירקון",
            media_url: "/placeholder.svg",
            media_type: "image",
            visibility: "public",
            allow_comments: true,
            poll_question: null,
            poll_options: [],
            poll_results: [],
            viewer_poll_option: null,
            reaction_count: 4,
            comment_count: 0,
            viewer_has_liked: false,
            viewer_has_saved: false,
            is_owner: true,
            published_at: "2026-07-19T08:00:00.000Z",
            creator: { id: userId, display_name: "קהילת Mipo", avatar_url: null },
            pet: { id: petId, name: "לוקה", avatar_url: "/placeholder.svg", type: "dog", breed: null },
          }],
        },
      });
    });
    await page.route(`**/api/feed/posts/${postId}/reaction`, async (route) => {
      await route.fulfill({ json: { liked: true, count: 5 } });
    });

    await page.goto("/feed");
    await expect(page.getByText("הטיול הראשון של לוקה בפארק")).toBeVisible();
    await expect(page.getByText("פארק הירקון")).toBeVisible();
    await page.getByRole("button", { name: "אהבתי" }).click();
    await expect(page.getByText("5 אהבו")).toBeVisible();
    await expect(page.getByRole("button", { name: "אהבתי" })).toHaveAttribute("aria-pressed", "true");
  });
});
