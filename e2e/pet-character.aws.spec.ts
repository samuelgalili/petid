import { expect, test, type Page } from "@playwright/test";

const userId = "88888888-8888-4888-8888-888888888888";
const petId = "99999999-9999-4999-8999-999999999999";
const pet = {
  id: petId,
  name: "לוקה",
  type: "dog",
  pet_type: "dog",
  breed: "Mixed",
  avatar_url: "/placeholder.svg",
  archived: false,
};

const profile = {
  id: userId,
  email: "owner@mipo.pet",
  full_name: "ישראל ישראלי",
  first_name: "ישראל",
  last_name: "ישראלי",
  phone: "0501234567",
  city: "תל אביב",
};

async function mockHome(page: Page) {
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      json: {
        user: { id: userId, email: profile.email, full_name: profile.full_name },
        profile,
      },
    });
  });
  await page.route("**/api/me/profile", async (route) => {
    await route.fulfill({ json: profile });
  });
  await page.route("**/api/me/pets", async (route) => {
    await route.fulfill({ json: { pets: [pet] } });
  });
  await page.route(new RegExp(`/api/me/pets/${petId}$`), async (route) => {
    await route.fulfill({ json: { pet } });
  });
  await page.route(`**/api/me/pets/${petId}/vet-visits`, async (route) => {
    await route.fulfill({ json: { vet_visits: [] } });
  });
  await page.route("**/api/me/documents?*", async (route) => {
    await route.fulfill({ json: { documents: [] } });
  });
  await page.route(`**/api/me/pets/${petId}/health-summary`, async (route) => {
    await route.fulfill({
      json: {
        pet,
        profile,
        vet_visits: [],
        vaccinations: [],
        documents: [],
        active_recovery: null,
      },
    });
  });
}

test.describe("AWS pet character studio", () => {
  test("uploads a photo and starts still-image generation at 320px in dark mode", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.addInitScript(() => localStorage.setItem("petid-theme", "dark"));
    await mockHome(page);

    let submittedBody: { consent?: boolean; photos?: Array<{ data_url?: string }> } | null = null;
    let currentCharacter: Record<string, unknown> | null = null;
    await page.route(`**/api/me/pets/${petId}/character`, async (route) => {
      if (route.request().method() === "POST") {
        submittedBody = route.request().postDataJSON();
        currentCharacter = {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          pet_id: petId,
          status: "generating_candidates",
          style_key: "mipo-soft-character-v1",
          selected_candidate_key: null,
          candidates: [],
          expressions: {},
          error_code: null,
          generation_version: 1,
          created_at: "2026-08-02T10:00:00.000Z",
          updated_at: "2026-08-02T10:00:00.000Z",
        };
        await route.fulfill({
          status: 202,
          json: {
            available: true,
            character: currentCharacter,
          },
        });
        return;
      }
      await route.fulfill({ json: { available: true, character: currentCharacter } });
    });

    await page.goto("/");
    await expect(page.getByRole("heading", { name: /איך לוקה מרגיש/ })).toBeVisible();
    await page.getByRole("button", { name: /מצב הרוח והדמות של לוקה/ }).click();
    await page.getByRole("button", { name: "להפוך את לוקה לדמות דיגיטלית" }).click();
    await expect(page.getByRole("heading", { name: "סטודיו הדמות של לוקה" })).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/dark/);

    const generateButton = page.getByRole("button", { name: "יצירת שלושה עיצובים" });
    await expect(generateButton).toBeDisabled();
    await page.locator('input[type="file"]').setInputFiles({
      name: "luka.png",
      mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
    });
    await expect(page.getByAltText("תמונת מקור 1")).toBeVisible();
    await page.getByRole("checkbox").check();
    await expect(generateButton).toBeEnabled();
    await generateButton.click();

    await expect(page.getByRole("heading", { name: "מעצבים את לוקה" })).toBeVisible();
    expect(submittedBody).toMatchObject({ consent: true });
    expect(submittedBody?.photos).toHaveLength(1);
    expect(submittedBody?.photos?.[0].data_url).toMatch(/^data:image\/jpeg;base64,/);

    const dialogBox = await page.getByRole("dialog").boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(320.5);
  });

  test("shows the cached expression pack without requesting generated video", async ({ page }) => {
    await mockHome(page);
    await page.route(`**/api/me/pets/${petId}/character`, async (route) => {
      await route.fulfill({
        json: {
          available: true,
          character: {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            pet_id: petId,
            status: "ready",
            style_key: "mipo-soft-character-v1",
            selected_candidate_key: "candidate-1",
            candidates: [1, 2, 3].map((index) => ({ key: `candidate-${index}`, url: "/placeholder.svg" })),
            expressions: {
              neutral: "/placeholder.svg",
              happy: "/placeholder.svg",
              curious: "/placeholder.svg",
              sleepy: "/placeholder.svg",
              proud: "/placeholder.svg",
              celebrate: "/placeholder.svg",
              attentive: "/placeholder.svg",
            },
            error_code: null,
            generation_version: 1,
            created_at: "2026-08-02T10:00:00.000Z",
            updated_at: "2026-08-02T10:05:00.000Z",
          },
        },
      });
    });

    const videoRequests: string[] = [];
    page.on("request", (request) => {
      if (/video|\.mp4|\.webm/i.test(request.url())) videoRequests.push(request.url());
    });

    await page.goto("/");
    await page.getByRole("button", { name: /מצב הרוח והדמות של לוקה/ }).click();
    await page.getByRole("button", { name: "פתיחת סטודיו הדמות של לוקה" }).click();
    await expect(page.getByRole("heading", { name: "הדמות של לוקה מוכנה" })).toBeVisible();
    await expect(page.getByAltText("לוקה שמח")).toBeVisible();
    await expect(page.getByAltText("לוקה סקרן")).toBeVisible();
    expect(videoRequests).toEqual([]);
  });
});
