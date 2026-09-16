// The floating companion has to actually show the pet.
//
// It is named AvatarCompanion, its own comment said it shows the pet, it read
// `activePet.name` on every render - and it drew a plus sign. The name went
// unused, `avatar_url` was never read at all, and the glyph was painted in
// three hexes (#E77B6C, #F3A85C, #5BA8D9) belonging to no palette in this app.
// Every screen carried it. Nothing failed.
//
// Neither half of that is catchable by typecheck or lint: an unused local is
// not an error, and a hex is just a string. So it is pinned here.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const companion = path.join(repoRoot, "src/components/mipo/AvatarCompanion.tsx");

/** Source with comments stripped, so prose about the bug is not the fix. */
const code = readFileSync(companion, "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .filter((line) => !/^\s*(\/\/|\*)/.test(line))
  .join("\n");

test("the companion renders the pet's avatar", () => {
  assert.match(
    code,
    /\bavatar_url\b/,
    "AvatarCompanion never reads the pet's avatar_url, so the avatar companion\n" +
      "shows no avatar - which is the state it shipped in.",
  );
  assert.match(
    code,
    /<img\b/,
    "AvatarCompanion renders no <img>, so whatever it reads it does not draw.",
  );
});

test("the companion paints in brand colours only", () => {
  const hexes = code.match(/#[0-9A-Fa-f]{3,8}\b/g) || [];
  assert.deepEqual(
    hexes,
    [],
    "AvatarCompanion hardcodes a colour. It sits on every screen in the app, so\n" +
      "it reads var(--gradient-primary) and the mipo-* tokens - a literal here is\n" +
      "a colour that no brand change can reach:\n" +
      hexes.join(" "),
  );
});
