// The customer card is read with a customer on the phone.
//
// It listed each pet as a name, a type and a breed. The detail endpoint was
// already returning the avatar, the birth date, the weight, the gender and the
// medical conditions - the card fetched all of it and rendered three fields.
//
// The questions actually asked on that call are "which animal", "how old" and
// "is anything wrong with it", and the last one is the reason the conditions
// are on the card rather than a click away.
//
// Age goes through formatPetAgeHe. There are four other ways to derive an age
// in this codebase's history and they disagreed with each other - one of them
// reported a pet as zero years old on its own first birthday - so the card
// must not grow a fifth.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const code = readFileSync(path.join(repoRoot, "src/pages/admin/AdminCustomers.tsx"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .filter((line) => !/^\s*(\/\/|\*)/.test(line))
  .join("\n");

test("the card shows what a support call asks about", () => {
  for (const [field, why] of [
    ["medical_conditions", "whether anything is wrong with the animal"],
    ["avatar_url", "which animal this is"],
  ]) {
    assert.match(
      code,
      new RegExp(`\\b${field}\\b`),
      `the customer card no longer reads ${field} - ${why}. The endpoint already\n` +
        "returns it; not rendering it is the whole of what was wrong here.",
    );
  }
});

test("the card derives age through the one derivation", () => {
  assert.match(
    code,
    /\bformatPetAgeHe\b/,
    "the customer card no longer uses formatPetAgeHe.",
  );
  // A hand-rolled age on this screen is a fifth spelling of a number that has
  // already been wrong.
  assert.doesNotMatch(
    code,
    /age_years\s*\*\s*12|Date\.now\(\)\s*-\s*new Date\(.*birth/,
    "the customer card computes an age itself. Age is derived in one place -\n" +
      "src/lib/petAge.ts - because the versions that disagreed reported a pet as\n" +
      "zero years old on its first birthday.",
  );
});
