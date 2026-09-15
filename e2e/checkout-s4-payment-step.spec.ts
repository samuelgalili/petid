import { test, expect, type Page } from "@playwright/test";

const TEST_USER_ID = "00000000-0000-4000-8000-0000000000a4";
const TEST_EMAIL = "s4-checkout@example.com";

function fakeJwt() {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: TEST_USER_ID,
      email: TEST_EMAIL,
      role: "authenticated",
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    }),
  ).toString("base64url");
  return `${header}.${payload}.test`;
}

async function mockCheckoutBackend(page: Page) {
  const paymentRequests: string[] = [];
  const user = {
    id: TEST_USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: TEST_EMAIL,
    email_confirmed_at: "1990-01-01T00:00:00.000Z",
    phone: "050-123-4567",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: "1990-01-01T00:00:00.000Z",
  };

  await page.route("**/auth/v1/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/user")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(user),
      });
      return;
    }
    if (url.includes("/token") || url.includes("/session")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: fakeJwt(),
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: "s4-refresh",
          user,
        }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await page.route("**/rest/v1/profiles**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "content-range": "0-0/1",
        "content-type": "application/json",
      },
      body: JSON.stringify([
        {
          id: TEST_USER_ID,
          birthdate: "1990-01-01",
          first_name: "ישראל",
          last_name: "ישראלי",
          full_name: "ישראל ישראלי",
          email: TEST_EMAIL,
          phone: "050-123-4567",
          street: "רחוב הרצל",
          house_number: "123",
          apartment_number: "4",
          city: "תל אביב",
          postal_code: "12 345",
          ai_consent_given: true,
        },
      ]),
    });
  });

  await page.route("**/rest/v1/**", async (route) => {
    if (route.request().url().includes("/profiles")) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    });
  });

  // Block any accidental live charge and record whether payment was invoked.
  await page.route("**/functions/v1/create-shop-payment**", async (route) => {
    paymentRequests.push(route.request().url());
    await route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ error: "S4 test must not charge" }),
    });
  });

  return { paymentRequests };
}

test.describe("AC-S4 checkout to payment (no charge)", () => {
  test("filled formatted address + terms reaches payment step", async ({ page }) => {
    const { paymentRequests } = await mockCheckoutBackend(page);

    await page.addInitScript(({ token, userId, email }) => {
      localStorage.setItem("mipo-onboarding-complete", "true");
      localStorage.setItem("onboardingCompleted", "true");
      localStorage.setItem("guestMode", "true");
      localStorage.setItem("guestModeTimestamp", String(Date.now()));
      localStorage.setItem(
        "petid-cart",
        JSON.stringify([
          {
            id: "s4-test-product",
            name: "S4 Test Food",
            price: 49,
            image: "/pwa-192x192.png",
            quantity: 1,
          },
        ]),
      );
      const session = {
        access_token: token,
        refresh_token: "s4-refresh",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: {
          id: userId,
          email,
          aud: "authenticated",
          role: "authenticated",
        },
      };
      const raw = JSON.stringify(session);
      for (const key of [
        "sb-xcauajpfrmalzhhiodcb-auth-token",
        "sb-ltomwywbyixcduhbslsl-auth-token",
      ]) {
        localStorage.setItem(key, raw);
      }
    }, { token: fakeJwt(), userId: TEST_USER_ID, email: TEST_EMAIL });

    await page.goto("/checkout");

    const nameField = page.locator("#fullName");
    await expect(nameField).toBeVisible({ timeout: 15000 });

    // Fill formatted values that look complete but used to fail digits-only zod checks.
    await nameField.fill("ישראל ישראלי");
    await page.locator("#email").fill("israel@example.com");
    await page.locator("#phone").fill("050-123-4567");
    await page.locator("#address").fill("רחוב הרצל 123, דירה 4");
    await page.locator("#city").fill("תל אביב");
    await page.locator("#zipCode").fill("12 345");

    await expect(page.locator("#phone")).toHaveValue("050-123-4567");
    await expect(page.locator("#address")).toHaveValue("רחוב הרצל 123, דירה 4");
    await expect(page.locator("#zipCode")).toHaveValue("12 345");

    // Overlay must not cover the form (AC-S4-2).
    await expect(page.locator('[data-testid="checkout-shipping-form"]')).toBeVisible();
    const overlayBlock = page.locator(".bg-muted\\/50").filter({ has: page.locator("#fullName") });
    await expect(overlayBlock).toHaveCount(0);

    // AC-S4-3: terms required.
    await page.getByTestId("checkout-continue").click();
    await expect(page.locator("#checkout-terms-error")).toBeVisible();
    await expect(page.getByTestId("checkout-payment-heading")).toHaveCount(0);
    await page.screenshot({
      path: "test-results/s4_shipping_terms_required.png",
      fullPage: true,
    });

    const autoCharge = page
      .waitForRequest((req) => req.url().includes("create-shop-payment"), { timeout: 1500 })
      .then(() => true)
      .catch(() => false);

    await page.getByRole("checkbox", { name: /אני מסכים/ }).click();
    await page.getByTestId("checkout-continue").click();

    await expect(page.getByTestId("checkout-payment-heading")).toBeVisible();
    await expect(page.getByText("כרטיס אשראי")).toBeVisible();
    await expect(page.getByText("שגיאת אימות")).toHaveCount(0);

    // AC-S4-4: reaching payment is enough. The place-order button may remain
    // visible (correct product behavior) — do not click it, and no charge
    // may fire automatically.
    expect(await autoCharge, "create-shop-payment must not run automatically").toBe(false);
    expect(paymentRequests).toEqual([]);
    await page.screenshot({
      path: "test-results/s4_payment_step_no_charge.png",
      fullPage: true,
    });
  });
});
