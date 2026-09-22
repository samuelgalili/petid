// The intake API had nineteen endpoints and no caller.
//
// Approving a draft, approving an image, publishing - all of it existed on the
// server and none of it existed on a screen, so every catalogue decision was
// made by dispatching a GitHub workflow by hand. That is not a process; it is
// maintenance that cannot be delegated, cannot be done from a phone, and whose
// audit trail is a list of workflow runs.
//
// Two things keep a screen like this honest, and both have already gone wrong
// once in this codebase:
//
//   1. The permission strings must MATCH the server's. They are plain strings
//      compared by equality, so a typo is not a compile error - it is a screen
//      that renders, calls, and 403s. INTAKE_READ and PUBLICATION_PUBLISH
//      existed in server/src/adminPermissions.js and were absent from the
//      client's copy entirely, which is what an unbuilt screen looks like from
//      this side.
//
//   2. The gate's reason codes must be translated. The API names exactly which
//      of the seven conditions failed; an operator reading "no_priced_offer"
//      has been handed the raw code and told to guess.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => readFileSync(path.join(repoRoot, rel), "utf8");

const serverPerms = read("server/src/adminPermissions.js");
const clientPerms = read("src/lib/adminPermissions.ts");
// The publishing screen is a SECTION of the products screen now - the admin
// had four product screens and a product's life was spread across them - so
// the file moved. The claims below did not: the gate's words still have to be
// translated, and a person still has to be able to get there.
const screen = read("src/components/admin/products/PublishingPanel.tsx");
const routes = read("src/routes/index.tsx");
const nav = read("src/components/admin/AdminLayout.tsx");
const productsScreen = read("src/pages/admin/AdminProducts.tsx");

/** name -> "value", from either file. */
const constants = (source) =>
  new Map([...source.matchAll(/([A-Z_]+):\s*"([^"]+)"/g)].map((m) => [m[1], m[2]]));

test("the intake permissions mean the same thing on both sides", () => {
  const server = constants(serverPerms);
  const client = constants(clientPerms);

  for (const name of ["INTAKE_READ", "PUBLICATION_PUBLISH"]) {
    assert.ok(server.has(name), `the server no longer defines ${name}`);
    assert.ok(
      client.has(name),
      `src/lib/adminPermissions.ts does not define ${name}. The screen that\n` +
        "needs it will render and then 403, because these are strings compared\n" +
        "by equality and nothing type-checks them across the boundary.",
    );
    assert.equal(
      client.get(name),
      server.get(name),
      `${name} differs: client "${client.get(name)}" vs server "${server.get(name)}".`,
    );
  }
});

test("the publishing screen is reachable", () => {
  // It is no longer a destination of its own, so "is it in the menu" is the
  // wrong question. The three that matter now:
  //
  //   - the old URL still lands somewhere, because it is in people's history;
  //   - the products screen actually renders the panel;
  //   - the products screen is in the menu, which is how anybody arrives.
  assert.match(
    routes, /admin\/publishing/,
    "nothing answers /admin/publishing any more, so every saved link to it 404s",
  );
  assert.match(
    productsScreen, /<PublishingPanel\s*\/>/,
    "the products screen does not render the publication queue, so folding the\n"
    + "screen in removed it rather than moving it",
  );
  assert.match(
    nav, /href: "\/admin\/products"/,
    "the products screen is in no menu, so nobody finds the queue inside it",
  );
});

test("every refusal the gate can give has words", () => {
  // The reason codes the server can emit, read from the gate itself rather
  // than from a list kept in step by hand.
  const gate = read("server/src/productIntakeRoutes.js");
  const emitted = [...gate.matchAll(/unmet\.push\("([a-z_]+)"\)/g)].map((m) => m[1]);
  assert.ok(emitted.length >= 7, `expected the gate's reason codes; found ${emitted.length}`);

  const untranslated = emitted.filter((code) => !screen.includes(`${code}:`));
  assert.deepEqual(
    untranslated,
    [],
    "the publishing screen shows a raw reason code. The gate names exactly which\n" +
      "condition failed, which is the whole value of it - handing that string to\n" +
      "an operator untranslated wastes it:\n" +
      untranslated.join("\n"),
  );
});
