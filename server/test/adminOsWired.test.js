// Phase 1 is reachable, and the two halves agree on the strings.
//
// intakeScreenWired.test.js exists because nineteen intake endpoints were
// built and the client called none of them. That is the failure mode this
// codebase actually has: a feature that compiles, passes lint, passes
// typecheck, and is not reachable from any screen.
//
// Each rule below covers a specific way Phase 1 could be shipped broken while
// every other gate stayed green.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ADMIN_PERMISSIONS } from "../src/adminPermissions.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFileSync(path.join(repoRoot, relative), "utf8");

// ─── the permission strings must match VALUE for VALUE ───────────────────────

test("the client's permission mirror matches the server's values exactly", () => {
  // They are compared by equality at runtime, so a typo is a screen that
  // renders, calls the API and gets a 403 - with no compile-time signal at all,
  // because both sides are valid strings.
  const client = read("src/lib/adminPermissions.ts");
  const declared = [...client.matchAll(/^\s+([A-Z_]+): "([^"]+)",/gm)].map(([, name, value]) => [name, value]);

  assert.ok(declared.length > 0, "the client permission mirror could not be parsed");

  for (const [name, value] of declared) {
    assert.ok(
      Object.hasOwn(ADMIN_PERMISSIONS, name),
      `the client declares ${name}, which the server does not define`,
    );
    assert.equal(
      value,
      ADMIN_PERMISSIONS[name],
      `${name} is "${value}" on the client and "${ADMIN_PERMISSIONS[name]}" on the server`,
    );
  }
});

test("AUDIT_READ is mirrored on the client", () => {
  // Named, because the screen that needs it was added in the same commit and
  // the mirror is a hand-kept file.
  assert.match(read("src/lib/adminPermissions.ts"), /AUDIT_READ: "audit\.read"/);
});

// ─── the screen exists, is routed, and is in a menu ──────────────────────────

test("the audit log screen is routed AND in the sidebar", () => {
  const routes = read("src/routes/index.tsx");
  // The navigation is a table in its own file now - seven surfaces needed the
  // same list, so it stopped living inside the layout component.
  const layout = read("src/components/admin/adminNavigation.ts");

  assert.match(routes, /path: "\/admin\/audit-log"/, "the screen is not routed");
  assert.match(
    routes,
    /path: "\/admin\/audit-log"[\s\S]{0,240}?ADMIN_PERMISSIONS\.AUDIT_READ/,
    "the route does not gate on AUDIT_READ",
  );
  assert.match(
    layout,
    /href: "\/admin\/audit-log"/,
    "a routed screen with no menu entry is a screen only someone who knows the\n" +
      "URL can reach. ~60 admin paths in this repository are redirects precisely\n" +
      "because nothing ever linked to them.",
  );
});

test("the audit screen is not left as a legacy redirect", () => {
  const routes = read("src/routes/index.tsx");
  const legacyBlock = routes.slice(routes.indexOf("const legacyAdminPaths"), routes.indexOf("];", routes.indexOf("const legacyAdminPaths")));
  assert.doesNotMatch(legacyBlock, /audit-log/, "the new screen was added to the redirect list");
});

// ─── the client calls the endpoint the server serves ─────────────────────────

test("the client calls the audit endpoint the router actually declares", () => {
  const api = read("src/lib/mipoApi.ts");
  assert.match(api, /\/admin\/os\/audit-log/, "the client does not call the Admin OS audit endpoint");

  // The prefix is declared in one place on the server. If it changes, this
  // string has to change with it, and nothing else would notice.
  const routerSource = read("server/src/adminOs/routes.js");
  assert.match(routerSource, /ADMIN_OS_PREFIX = "\/api\/admin\/os\/"/);
});

// ─── the command bar answers a keystroke and is mounted ──────────────────────

test("the command bar is bound to Cmd/Ctrl+K and mounted in the shell", () => {
  const bar = read("src/components/admin/AdminCommandBar.tsx");
  const layout = read("src/components/admin/AdminLayout.tsx");

  assert.match(bar, /metaKey \|\| event\.ctrlKey/, "only one of Cmd and Ctrl is handled");
  assert.match(bar, /key\.toLowerCase\(\) === "k"/);
  assert.match(
    layout,
    /<AdminCommandBar\b/,
    "the command bar is not rendered. AdminGlobalSearch.tsx has sat in this\n" +
      "folder unmounted for months, importing a hook that does not exist.",
  );
});

test("the command bar's destinations are derived from the sidebar, not copied", () => {
  const navigation = read("src/components/admin/adminNavigation.ts");
  assert.match(
    navigation,
    /commandDestinations = ADMIN_SCREENS\.map/,
    "the destination list is hand-maintained. A second copy of the navigation\n" +
      "falls behind the first, and the way you find out is somebody saying the\n" +
      "command bar does not know about the new screen.",
  );
  // And the sidebar reads the same table, so "derived" means derived from the
  // thing the sidebar renders rather than from a second list beside it.
  assert.match(
    read("src/components/admin/AdminLayout.tsx"),
    /from "\.\/adminNavigation"/,
    "the layout no longer reads the navigation table, so the two can drift",
  );
});

test("the command bar filters destinations by permission", () => {
  const bar = read("src/components/admin/AdminCommandBar.tsx");
  assert.match(
    bar,
    /adminHasPermission\(admin, destination\.permission\)/,
    "the bar offers every page to every role",
  );
});

test("the command bar does not execute anything yet", () => {
  // The brief asks for natural-language commands that write. The approval
  // queue they need is Phase 5, and a bar that can write before there is
  // anywhere to review what it wrote is the shortest path to an unreviewable
  // action in this whole plan. This asserts the restraint on purpose, so
  // removing it is a deliberate act rather than a convenient afternoon.
  const bar = read("src/components/admin/AdminCommandBar.tsx");
  assert.doesNotMatch(
    bar,
    /method:\s*["'](POST|PATCH|PUT|DELETE)["']/,
    "the command bar performs a write. Route it through the approval queue.",
  );
});

// ─── the dead code is not resurrected by accident ────────────────────────────

test("the new bar does not depend on the unmounted one", () => {
  const bar = read("src/components/admin/AdminCommandBar.tsx");
  // Matched on IMPORTS, not on prose: the comment at the top of that file
  // explains why the old component was not reused, and a name-anywhere match
  // would flag the explanation.
  assert.doesNotMatch(
    bar,
    /^import[^\n]*(useAdminSearch|AdminGlobalSearch)/m,
    "AdminGlobalSearch imports @/hooks/admin/useAdminSearch, which does not exist\n" +
      "in this repository. Importing it would move a broken import into a file\n" +
      "that is actually rendered.",
  );
});
