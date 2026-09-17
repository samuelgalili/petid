// The expression pack has to appear on a screen.
//
// PetCharacterStudio generates seven expressions for every pet - neutral,
// happy, curious, sleepy, proud, celebrate, attentive - stores them, and
// caches them. They were rendered on ZERO screens outside the studio that
// makes them. The pet appeared in the app as one circle wearing one of them.
//
// That pack is the only thing in this interface a competitor cannot copy,
// because copying it needs their own customer's animal. An asset that
// expensive, sitting unused, is the kind of thing that stays unused for a year
// because nothing says it is missing.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const srcRoot = path.join(repoRoot, "src");
const studio = path.join(srcRoot, "components/home/PetCharacterStudio.tsx");

const walk = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.tsx$/.test(full)) out.push(full);
  }
  return out;
};

const codeOf = (file) =>
  readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");

test("some screen other than the studio renders the expressions", () => {
  const readers = walk(srcRoot).filter((file) => {
    if (file === studio) return false;
    return /\.expressions\b|\bexpressions\[/.test(codeOf(file));
  });

  assert.ok(
    readers.length > 0,
    "nothing outside PetCharacterStudio reads character.expressions.\n" +
      "Seven faces are generated per pet, cached, and shown only on the screen\n" +
      "that generates them - which means the app pays for them and the owner\n" +
      "never sees them.",
  );
});

test("the mood row asks about the pet by name", () => {
  const row = codeOf(path.join(srcRoot, "components/home/PetMoodRow.tsx"));
  assert.match(
    row,
    /\{petName\}/,
    "PetMoodRow no longer names the pet. 'How are you feeling?' is a wellness\n" +
      "app; 'How is Rexy today?' is the reason someone opens this one.",
  );
  // A partial pack must not render an empty chip.
  assert.match(
    row,
    /Boolean\(character\?\.expressions\?\.\[key\]\)|character\?\.expressions\?\.\[key\]/,
    "PetMoodRow renders chips without checking the expression exists. A pack\n" +
      "can come back partial, and a chip with no picture says nothing.",
  );
});
