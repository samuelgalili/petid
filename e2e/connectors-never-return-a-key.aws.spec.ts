import { expect, test, type Page } from "@playwright/test";

/**
 * The connectors screen can never show a key.
 *
 * D-4 states it and this is where it is held, because the server tests prove
 * the API does not return a secret and prove nothing about what the page does
 * with what it gets:
 *
 *   "never a secret, not even masked from the server side. `••••••••` is
 *    rendered from nothing, not from a truncated real value."
 *
 * The failure this is written against is not malice. It is somebody making the
 * page friendlier — echoing the key back so the owner can confirm they pasted
 * it right, or leaving it in the field after saving so they can fix a typo.
 * Both are reasonable instincts and both put a live credential in the next
 * screenshot.
 */

const admin = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "ops@mipo.pet",
  display_name: "Owner",
  role: "admin",
  permissions: ["admin.full"],
  must_change_password: false,
};

const API_KEY = "key_live_0123456789abcdefghijklmnop";

const connector = (overrides: Record<string, unknown> = {}) => ({
  id: "22222222-2222-4222-8222-222222222222",
  provider: "runway",
  label: null,
  settings: { baseUrl: "https://api.dev.runwayml.com/v1", apiVersion: "2024-11-06" },
  status: "unverified",
  last_error: null,
  last_verified_at: null,
  created_at: "2026-09-21T10:00:00.000Z",
  updated_at: "2026-09-21T10:00:00.000Z",
  stored: false,
  known_provider: true,
  ...overrides,
});

async function openConnectors(page: Page, initial = connector()) {
  const sent: Array<Record<string, unknown>> = [];

  await page.route("**/api/**", (route) => route.fulfill({
    status: 200, contentType: "application/json", body: "{}",
  }));
  await page.route("**/api/auth/me", (route) => route.fulfill({
    status: 401, contentType: "application/json", body: JSON.stringify({ error: "Unauthorized" }),
  }));
  await page.route("**/api/admin/me", (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({ admin }),
  }));
  await page.route("**/api/admin/os/connectors", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200, contentType: "application/json", body: JSON.stringify({ connectors: [initial] }),
      });
      return;
    }
    const body = JSON.parse(route.request().postData() || "{}");
    sent.push({ body, key: route.request().headers()["idempotency-key"] });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      // The server's real answer shape: stored becomes true, and no field
      // anywhere carries the key.
      body: JSON.stringify({ connector: connector({ stored: true }) }),
    });
  });

  await page.goto("/admin/connectors");
  await expect(page.getByLabel("מפתח API")).toBeVisible();
  return sent;
}

test.describe("A connector key is write-only", () => {
  test.describe.configure({ mode: "serial" });

  test("after saving, the key is gone from the page", async ({ page }) => {
    const sent = await openConnectors(page);

    const field = page.getByLabel("מפתח API");
    await field.fill(API_KEY);
    await page.getByRole("button", { name: "שמירה" }).click();

    await expect.poll(() => sent.length).toBe(1);
    expect(sent[0].body).toMatchObject({ provider: "runway", api_key: API_KEY });

    // THE ASSERTION. Not "the field is cleared" - the whole document, because
    // the friendly version of this bug puts the key in a confirmation line, a
    // toast, or a data attribute, none of which are the input.
    await expect.poll(async () => (await page.content()).includes(API_KEY)).toBe(false);
    await expect(field).toHaveValue("");
  });

  test("a stored key is shown as dots that are not a real value", async ({ page }) => {
    await openConnectors(page, connector({ stored: true }));

    const field = page.getByLabel("מפתח API");
    // Empty, with dots as a PLACEHOLDER. A masked real value would be the
    // field's value, and would be posted straight back on the next save.
    await expect(field).toHaveValue("");
    await expect(field).toHaveAttribute("placeholder", /•+/);
  });

  test("the key field never renders as plain text", async ({ page }) => {
    await openConnectors(page);
    // type="password" is not about secrecy from the person typing; it is about
    // the screen behind them and the recording of the session.
    await expect(page.getByLabel("מפתח API")).toHaveAttribute("type", "password");
  });

  test("saving only the settings sends no api_key at all", async ({ page }) => {
    const sent = await openConnectors(page, connector({ stored: true }));

    await page.getByLabel("כתובת בסיס").fill("https://api.dev.runwayml.com/v2");
    await page.getByRole("button", { name: "שמירה" }).click();

    await expect.poll(() => sent.length).toBe(1);
    // OMITTED, not empty. An empty string would read as "clear the key", and
    // correcting a URL would silently disconnect the integration.
    expect(Object.hasOwn(sent[0].body as object, "api_key")).toBe(false);
  });

  test("the provider's refusal is shown, not swallowed into 'failed'", async ({ page }) => {
    await openConnectors(page, connector({
      stored: true,
      status: "error",
      last_error: '401: {"error":"Invalid API key"}',
    }));

    // The owner needs to see WHICH failure. "Something went wrong" sends them
    // to rotate a key that may have been fine.
    await expect(page.getByText(/Invalid API key/)).toBeVisible();
  });
});
