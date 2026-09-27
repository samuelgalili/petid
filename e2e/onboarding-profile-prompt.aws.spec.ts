import { expect, test } from "@playwright/test";
import {
  isInProgressFlow,
  profilePromptAllowed,
  profilePromptSnoozed,
  PROFILE_PROMPT_SNOOZE_MS,
  snoozeProfilePrompt,
} from "../src/lib/flowSurfaces";

test.describe("profile prompt rules", () => {
  test("onboarding and checkout never qualify, home after completion does", () => {
    expect(isInProgressFlow("/onboarding")).toBe(true);
    expect(isInProgressFlow("/checkout")).toBe(true);
    expect(isInProgressFlow("/payment-success")).toBe(true);
    expect(profilePromptAllowed("/onboarding", null)).toBe(false);
    expect(profilePromptAllowed("/checkout", "true")).toBe(false);
    expect(profilePromptAllowed("/", "false")).toBe(false);
    expect(profilePromptAllowed("/", "true")).toBe(true);
    expect(profilePromptAllowed("/feed", null)).toBe(true);
  });

  test("skip lasts the session and seven days", () => {
    const memory = () => {
      const data = new Map<string, string>();
      return {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => { data.set(key, value); },
      };
    };
    const userId = "prompt-user";
    const session = memory();
    const local = memory();
    const now = 1_700_000_000_000;
    snoozeProfilePrompt(userId, now, session, local);
    expect(profilePromptSnoozed(userId, now + 1000, session, local)).toBe(true);
    expect(profilePromptSnoozed(userId, now + PROFILE_PROMPT_SNOOZE_MS - 1, memory(), local)).toBe(true);
    expect(profilePromptSnoozed(userId, now + PROFILE_PROMPT_SNOOZE_MS + 1, memory(), local)).toBe(false);
  });
});

test.describe("onboarding is not covered by the profile popup", () => {
  test("the photo step stays usable after the prompt would have opened", async ({ page }) => {
    await page.route("**/api/**", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ json: {} });
        return;
      }
      await route.fulfill({ status: 404, json: { error: "unmocked" } });
    });
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        json: {
          user: {
            id: "11111111-1111-4111-8111-111111111111",
            email: "dana@example.com",
            full_name: "דנה כהן",
            email_verified: false,
            email_verified_at: null,
          },
          profile: {
            id: "11111111-1111-4111-8111-111111111111",
            full_name: "דנה כהן",
            first_name: null,
            last_name: null,
            phone: null,
            city: null,
          },
          is_admin: false,
        },
      });
    });
    await page.route("**/api/me/pets", async (route) => {
      await route.fulfill({ json: { pets: [] } });
    });

    await page.goto("/onboarding");
    await page.getByRole("button", { name: /מתחילים/ }).click();
    const skipPhoto = page.getByRole("button", { name: "המשך בלי תמונה" });
    await expect(skipPhoto).toBeVisible();

    // The prompt used to open five seconds after signup and cover this button.
    await page.waitForTimeout(6_000);

    await expect(page.getByTestId("complete-profile-prompt")).toHaveCount(0);
    await expect(page.getByText("השלמת פרופיל")).toHaveCount(0);
    await expect(page.getByText("הוסף למסך הבית")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "הוספת חיה" })).toHaveCount(0);
    await skipPhoto.click();
    await expect(page.getByText("נעים מאוד")).toBeVisible();
    await expect(page.getByTestId("complete-profile-prompt")).toHaveCount(0);
  });
});
