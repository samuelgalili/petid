import { expect, test } from "@playwright/test";

/**
 * The photo step of registration offered the camera and nothing else.
 *
 * The button said "פתיחת מצלמה או גלריה" and the input carried
 * capture="environment". With that attribute a browser does not offer a
 * choice: iOS and Android open the camera straight away. So somebody
 * registering either photographed their pet on the spot or skipped the step -
 * and most people already have the photo.
 *
 * WHY THE ATTRIBUTE AND NOT THE PICKER. A file picker is chrome; Playwright
 * cannot open the OS sheet and see whether "Photo Library" is on it. What
 * decides that sheet's contents IS this attribute, and its absence is the
 * whole fix, so the attribute is the honest thing to assert. The second test
 * below checks the half that is really on the page: that the input accepts a
 * file at all, from wherever it came.
 */

const photoInput = "input[type=file][accept^='image/']";

test.describe("the photo step of registration", () => {
  test.beforeEach(async ({ page }) => {
    // SIGNED IN, because /onboarding is behind the session and an
    // unauthenticated visit lands on the login form instead - where there is
    // no file input at all, so the test reported the bug fixed.
    await page.route("**/api/auth/me", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "11111111-1111-4111-8111-111111111111",
          email: "dana@example.com",
          full_name: "דנה כהן",
          email_verified_at: null,
        },
        profile: null,
        is_admin: false,
      }),
    }));
    await page.route("**/api/pets*", (route) => route.fulfill({
      status: 200, contentType: "application/json", body: JSON.stringify({ pets: [] }),
    }));
    await page.route("**/api/reports", (route) => route.fulfill({
      status: 200, contentType: "application/json", body: JSON.stringify({ reports: [] }),
    }));
    await page.goto("/onboarding");

    // The photo step is a PHASE, not a route: the input is not in the DOM
    // until "מתחילים" is pressed. A test that only navigated found no input
    // and reported the bug fixed.
    await page.getByRole("button", { name: /מתחילים/ }).click();
  });

  test("the picker is not pinned to the camera", async ({ page }) => {
    // The one attribute this bug was. `capture` on an input removes the
    // gallery from the sheet the OS shows.
    const inputs = page.locator(photoInput);
    await expect(inputs.first()).toBeAttached({ timeout: 15_000 });

    const captures = await inputs.evaluateAll(
      (nodes) => nodes.map((node) => (node as HTMLInputElement).getAttribute("capture")),
    );
    expect(captures.every((value) => value === null)).toBe(true);
  });

  test("and the button's promise matches what it opens", async ({ page }) => {
    // The label said camera OR gallery the whole time. It was the only thing
    // on the screen telling the truth about what was supposed to happen.
    await expect(page.getByText("פתיחת מצלמה או גלריה")).toBeVisible({ timeout: 15_000 });
  });

  test("a photo can still be chosen, and the step can still be skipped", async ({ page }) => {
    // Removing an attribute must not have removed the step's two exits.
    const input = page.locator(photoInput).first();
    await expect(input).toBeAttached({ timeout: 15_000 });
    await expect(input).toHaveAttribute("accept", /image/);
    await expect(page.getByText("המשך בלי תמונה")).toBeVisible();
  });
});
