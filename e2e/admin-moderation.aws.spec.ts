import { expect, test, type Page } from "@playwright/test";

/**
 * The moderation queue.
 *
 * Reports are listed with a minor first. Hide, restore, dismiss and block are
 * buttons on that screen, and each one shows up in the action log. The API is
 * mocked: the server tests own the SQL.
 */

const admin = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "ops@mipo.pet",
  display_name: "Owner",
  role: "admin",
  permissions: ["admin.full"],
  must_change_password: false,
};

const minorReport = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  content_type: "post",
  content_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  reason: "person",
  description: "ילדה בתמונה",
  status: "open",
  created_at: "2026-09-30T08:00:00.000Z",
  author_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  author_name: "נועה",
  reporter_name: "דנה",
  content_status: "published",
  excerpt: "רגע עם ילדה",
  involves_minor: true,
  urgent_person: true,
  author_blocked: false,
};

const otherReport = {
  id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  content_type: "comment",
  content_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  reason: "spam",
  description: null,
  status: "open",
  created_at: "2026-09-29T08:00:00.000Z",
  author_id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  author_name: "יוסי",
  reporter_name: "דנה",
  content_status: "published",
  excerpt: "קנו עכשיו",
  involves_minor: false,
  urgent_person: false,
  author_blocked: false,
};

const json = (body: unknown, status = 200) => ({
  status,
  contentType: "application/json",
  body: JSON.stringify(body),
});

async function install(page: Page) {
  const state = {
    reports: [minorReport, otherReport],
    hidden: [] as Array<Record<string, unknown>>,
    blocked: [] as Array<Record<string, unknown>>,
    entries: [] as Array<Record<string, unknown>>,
  };

  const log = (action: string) => {
    state.entries.unshift({
      id: `log-${state.entries.length + 1}`,
      action_type: action,
      entity_type: "social_post",
      entity_id: minorReport.content_id,
      old_values: null,
      new_values: null,
      metadata: null,
      actor_type: "admin",
      actor_email: admin.email,
      actor_role: "admin",
      created_at: "2026-09-30T09:00:00.000Z",
    });
  };

  await page.route("**/api/auth/me", (route) => route.fulfill(json({ error: "Unauthorized" }, 401)));
  await page.route("**/api/admin/me", (route) => route.fulfill(json({ admin })));
  await page.route("**/api/admin/os/moderation/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();

    if (method === "GET" && path.endsWith("/reports")) {
      await route.fulfill(json({ reports: state.reports }));
      return;
    }
    if (method === "GET" && path.endsWith("/hidden")) {
      await route.fulfill(json({ hidden: state.hidden }));
      return;
    }
    if (method === "GET" && path.endsWith("/blocked")) {
      await route.fulfill(json({ blocked: state.blocked }));
      return;
    }
    if (method === "GET" && path.endsWith("/log")) {
      await route.fulfill(json({ entries: state.entries }));
      return;
    }
    if (method === "POST" && path.endsWith("/hide")) {
      const report = state.reports.find((item) => item.id === minorReport.id)!;
      state.reports = state.reports.filter((item) => item.id !== report.id);
      state.hidden.unshift({
        content_type: report.content_type,
        content_id: report.content_id,
        excerpt: report.excerpt,
        author_id: report.author_id,
        author_name: report.author_name,
        hidden_at: "2026-09-30T09:00:00.000Z",
        author_blocked: false,
      });
      log("moderation.hide");
      await route.fulfill(json({ hidden: true, already: false, content_type: "post", content_id: report.content_id }));
      return;
    }
    if (method === "POST" && path.endsWith("/restore")) {
      state.hidden = [];
      log("moderation.restore");
      await route.fulfill(json({ restored: true }));
      return;
    }
    if (method === "POST" && path.endsWith("/dismiss")) {
      const body = route.request().postDataJSON() as { report_id: string };
      state.reports = state.reports.filter((item) => item.id !== body.report_id);
      log("moderation.dismiss");
      await route.fulfill(json({ dismissed: true }));
      return;
    }
    if (method === "POST" && path.endsWith("/block")) {
      state.reports = state.reports.filter((item) => item.id !== minorReport.id);
      state.blocked.unshift({
        user_id: minorReport.author_id,
        author_name: minorReport.author_name,
        blocked_at: "2026-09-30T09:00:00.000Z",
        blocked_reason: "חסימה ממסך המודרציה",
      });
      log("moderation.block");
      await route.fulfill(json({ blocked: true, user_id: minorReport.author_id }));
      return;
    }
    if (method === "POST" && path.endsWith("/unblock")) {
      state.blocked = [];
      log("moderation.unblock");
      await route.fulfill(json({ unblocked: true }));
      return;
    }
    await route.fulfill(json({ error: "not mocked" }, 404));
  });
}

test("a minor report is listed first and can be hidden, then restored", async ({ page }) => {
  await install(page);
  await page.goto("/admin/moderation");

  await expect(page.getByRole("heading", { name: "מודרציה" }).first()).toBeVisible();
  const cards = page.getByTestId("moderation-report");
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toContainText("קטין");
  await expect(cards.first()).toContainText("רגע עם ילדה");
  await expect(cards.nth(1)).toContainText("קנו עכשיו");

  const hide = cards.first().getByRole("button", { name: "הסתרה" });
  await expect(hide).toHaveCSS("background-color", "rgb(108, 99, 255)");
  await hide.click();
  await cards.first().getByRole("button", { name: "אישור הסתרה" }).click();

  await expect(page.getByText("רגע עם ילדה").first()).toBeVisible();
  await expect(cards).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "יומן פעולות" })).toBeVisible();
  await expect(page.getByText("הסתרה").first()).toBeVisible();

  await page.getByRole("button", { name: "החזרה" }).click();
  await expect(page.getByText("אין תוכן מוסתר.")).toBeVisible();
  await expect(page.getByText("החזרה").first()).toBeVisible();
});

test("a report can be dismissed and a user can be blocked and unblocked", async ({ page }) => {
  await install(page);
  await page.goto("/admin/moderation");

  const cards = page.getByTestId("moderation-report");
  await cards.nth(1).getByRole("button", { name: "דחייה" }).click();
  await expect(cards).toHaveCount(1);
  await expect(page.getByText("דחיית דיווח")).toBeVisible();

  await cards.first().getByRole("button", { name: "חסימה" }).click();
  await cards.first().getByRole("button", { name: "אישור חסימה" }).click();
  await expect(page.getByText("נועה").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "שחרור חסימה" })).toBeVisible();
  await page.getByRole("button", { name: "שחרור חסימה" }).click();
  await expect(page.getByText("אין משתמשים חסומים.")).toBeVisible();
  await expect(page.getByText("שחרור חסימה").first()).toBeVisible();
});

test("moderation is one item in the platform menu", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "The sidebar is the desktop chrome");
  await install(page);
  await page.goto("/admin/moderation");
  await expect(page.getByRole("link", { name: "Moderation" })).toBeVisible();
});
