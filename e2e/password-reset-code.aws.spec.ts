import { expect, test, type Page } from "@playwright/test";

const reachCodeStep = async (page: Page) => {
  await page.route("**/api/auth/password-reset/request", async (route) => {
    await route.fulfill({
      json: {
        ok: true,
        email_delivery: "not_configured",
      },
    });
  });

  await page.goto("/forgot-password");
  await page.getByLabel("כתובת אימייל").fill("reset@example.com");
  await page.getByRole("button", { name: "שליחת קוד אימות" }).click();
  await expect(page.getByRole("heading", { name: "הזנת קוד אימות" })).toBeVisible();
};

test("a wrong reset code stays on the code screen with a Hebrew error", async ({ page }) => {
  let verifyCalls = 0;
  await page.route("**/api/auth/password-reset/verify", async (route) => {
    verifyCalls += 1;
    expect(route.request().postDataJSON()).toMatchObject({
      email: "reset@example.com",
      otp: "123456",
    });
    await route.fulfill({
      status: 400,
      json: { error: "Invalid or expired reset code" },
    });
  });

  let confirmCalls = 0;
  await page.route("**/api/auth/password-reset/confirm", async (route) => {
    confirmCalls += 1;
    await route.fulfill({ status: 500, json: { error: "confirm should not run" } });
  });

  await reachCodeStep(page);
  await page.getByLabel("קוד אימות").fill("123456");
  await page.getByRole("button", { name: "אמת קוד" }).click();

  await expect(page.getByRole("alert")).toHaveText("הקוד שגוי או שפג תוקפו.");
  await expect(page.getByRole("heading", { name: "הזנת קוד אימות" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "סיסמה חדשה" })).toHaveCount(0);
  expect(verifyCalls).toBe(1);
  expect(confirmCalls).toBe(0);
});

test("a locked reset code stays a Hebrew 429 on the code screen", async ({ page }) => {
  await page.route("**/api/auth/password-reset/verify", async (route) => {
    await route.fulfill({
      status: 429,
      json: { error: "Too many invalid reset attempts" },
    });
  });

  await reachCodeStep(page);
  await page.getByLabel("קוד אימות").fill("123456");
  await page.getByRole("button", { name: "אמת קוד" }).click();

  await expect(page.getByRole("alert")).toHaveText("יותר מדי ניסיונות שגויים לאיפוס. הכתובת נעולה לזמן ארוך.");
  await expect(page.getByRole("heading", { name: "סיסמה חדשה" })).toHaveCount(0);
});

test("a code the server accepts opens the new password screen", async ({ page }) => {
  await page.route("**/api/auth/password-reset/verify", async (route) => {
    await route.fulfill({ json: { ok: true } });
  });

  let confirmCalls = 0;
  await page.route("**/api/auth/password-reset/confirm", async (route) => {
    confirmCalls += 1;
    expect(route.request().postDataJSON()).toMatchObject({
      email: "reset@example.com",
      otp: "123456",
      newPassword: "new-password-1",
    });
    await route.fulfill({ json: { ok: true } });
  });

  await reachCodeStep(page);
  await page.getByLabel("קוד אימות").fill("123456");
  await page.getByRole("button", { name: "אמת קוד" }).click();

  await expect(page.getByRole("heading", { name: "סיסמה חדשה" })).toBeVisible();
  expect(confirmCalls).toBe(0);

  await page.locator("#password").fill("new-password-1");
  await page.locator("#confirmPassword").fill("new-password-1");
  await page.getByRole("button", { name: "עדכן סיסמה" }).click();

  await expect(page.getByRole("heading", { name: "הסיסמה עודכנה!" })).toBeVisible();
  expect(confirmCalls).toBe(1);
});
