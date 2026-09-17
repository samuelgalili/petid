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

test("the companion's image does not repeat its button's label", () => {
  // The companion sits on every screen, including the home screen, which has
  // the pet's own avatar in the centre. Giving both an alt of the pet's name
  // put two images with the SAME accessible name on the page: a screen reader
  // announces it twice, and getByRole("img", { name }) resolves to two
  // elements. The second is how this was caught - a Playwright smoke test
  // guarding the home Presence failed on a strict mode violation and stopped
  // the deploy.
  //
  // The button is already labelled with the pet's name, so the image inside it
  // is decorative.
  const img = code.match(/<img[\s\S]*?\/>/);
  assert.ok(img, "AvatarCompanion renders no <img>");
  assert.match(
    img[0],
    /alt=""/,
    'the companion\'s <img> carries a non-empty alt. Its button already names\n' +
      "the pet, so this repeats the name to a screen reader and collides with\n" +
      "the home screen's own avatar:\n" + img[0].replace(/\s+/g, " ").slice(0, 120),
  );
});
