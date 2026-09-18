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
const screen = read("src/pages/admin/AdminPublishing.tsx");
const routes = read("src/routes/index.tsx");
const nav = read("src/components/admin/AdminLayout.tsx");

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
  assert.match(routes, /admin\/publishing/, "no route points at the publishing screen");
  assert.match(nav, /admin\/publishing/, "the publishing screen is in no menu, so nobody finds it");
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
