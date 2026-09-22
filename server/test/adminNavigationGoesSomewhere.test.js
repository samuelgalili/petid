// Every way into the admin leads somewhere that exists.
//
// Four product screens were folded into one and two routes became redirects.
// The failure mode of a change like that is not a crash: it is a menu item, a
// keyboard shortcut or a notification link still pointing at a path nothing
// answers, which lands the admin on a blank screen or - worse here, because
// the router has a catch-all - somewhere plausible and wrong.
//
// Those pointers live in six different files and none of them is type-checked
// against the route table, because they are strings. So this reads the route
// table and every list of destinations, and checks them against each other.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(path.join(repoRoot, rel), "utf8");

const routes = read("src/routes/index.tsx");
const layout = read("src/components/admin/AdminLayout.tsx");

/** Every `path: "/admin/..."` the router declares, redirect or screen alike. */
const declaredPaths = new Set(
  [...routes.matchAll(/path:\s*"(\/admin[^"]*)"/g)].map((match) => match[1]),
);

/** Plus the ones built from the legacy list, which are paths in an array. */
for (const match of routes.matchAll(/^\s*"(\/admin\/[a-z-]+)",$/gm)) {
  declaredPaths.add(match[1]);
}

/** A destination minus its query string, which the router does not match on. */
const pathOf = (href) => href.split("?")[0];

const destinationsIn = (source) =>
  [...source.matchAll(/["'`](\/admin\/[a-zA-Z0-9\-_?=&/]*)["'`]/g)]
    .map((match) => match[1])
    // Ignore the two that are not destinations: the API prefix and the
    // per-record paths built at runtime.
    .filter((href) => !href.startsWith("/admin/os/") && !href.includes("${"));

test("the route table still answers /admin", () => {
  // If this list ever comes back empty the rest of the file passes vacuously,
  // which is the way a test like this dies quietly.
  assert.ok(declaredPaths.size > 20, `found ${declaredPaths.size} admin routes, expected the whole table`);
  assert.ok(declaredPaths.has("/admin"), "/admin itself is not declared");
});

test("every sidebar and bottom-bar destination has a route", () => {
  // The bottom bar is four taps on a phone and the sidebar is the rest. A dead
  // entry here is a menu item that does nothing, which is how an admin learns
  // not to trust the menu.
  const missing = destinationsIn(layout)
    .map(pathOf)
    .filter((href) => !declaredPaths.has(href));

  assert.deepEqual([...new Set(missing)], [], "the admin menu points at paths no route answers");
});

test("shortcuts, quick actions and notification links have routes too", () => {
  // These are the pointers nobody looks at when moving a screen, because they
  // are not in the file being moved.
  const sources = [
    "src/hooks/admin/useKeyboardShortcuts.ts",
    "src/hooks/admin/useQuickActions.ts",
    "src/components/admin/AdminQuickActions.tsx",
    "src/lib/adminNotificationLinks.ts",
    "src/components/admin/AdminCommandBar.tsx",
    "src/pages/admin/AdminHome.tsx",
  ];

  const missing = [];
  for (const file of sources) {
    for (const href of destinationsIn(read(file))) {
      if (!declaredPaths.has(pathOf(href))) missing.push(`${file}: ${href}`);
    }
  }

  assert.deepEqual(missing, [], "something in the admin points at a path no route answers");
});

test("the three folded-in screens still answer their old URLs", () => {
  // Saved links, bookmarks, and this repository's own audit entries name them.
  for (const old of ["/admin/publishing", "/admin/smart-editor", "/admin/quick-import"]) {
    assert.ok(declaredPaths.has(old), `${old} is gone entirely, so every saved link to it 404s`);
  }
});

test("the queue the server builds links into screens that exist", () => {
  // server/src/adminOs/home.js writes hrefs for the admin's first screen. They
  // are built on the server and never compared with the client's router, so a
  // renamed screen leaves rows that go nowhere.
  const server = read("server/src/adminOs/home.js");
  const missing = [...server.matchAll(/href:\s*[`"](\/admin[^`"$]*)/g)]
    .map((match) => pathOf(match[1]))
    .filter((href) => !declaredPaths.has(href));

  assert.deepEqual([...new Set(missing)], [], "a row in the admin's action queue leads nowhere");
});
