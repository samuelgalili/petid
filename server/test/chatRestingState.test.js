// The chat's resting screen, and the two things it can quietly take away.
//
// The chat used to open with an assistant bubble saying hello. It now opens on
// a resting screen - the pet under an aurora ring, the question "מה תרצו לשאול
// על רקסי?", and a row of openers - and renders NO messages until somebody has
// spoken. That is the point of it, and it is also the danger: everything the
// seeded greeting used to carry disappears with the bubble.
//
// Two of those things matter enough to pin:
//
//   1. The greeting's `suggestions` are not always suggestions. With more than
//      one pet they ARE the pet picker, and they are the only way to choose
//      one. A resting screen that dropped them would let a two-pet account open
//      the chat and be unable to say which pet it means.
//
//   2. The provider pushes proactive bubbles a second and a half after mount -
//      unread medical alerts, restock warnings. A resting screen that outlived
//      them would hide a vet reminder from anyone who had not yet typed.
//
// And one thing the screen itself could take away: the aurora it puts around
// the avatar is the brand gradient, and it was first written as five hexes
// typed inline. Those hexes live in exactly two files today; a third copy is
// a brand change waiting to miss one.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const srcRoot = path.join(repoRoot, "src");
const chatPage = path.join(srcRoot, "pages", "Chat.tsx");

const walk = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx|css)$/.test(full)) out.push(full);
  }
  return out;
};

/** Source with comments stripped, so prose about a rule is never the rule. */
const codeOf = (file) =>
  readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\*)/.test(line))
    .join("\n");

/**
 * The JSX the resting screen renders.
 *
 * Anchored on the opening `{isResting ? (` and closed by brace depth rather
 * than by a literal `) : null}` - the closing form is a detail of how the
 * branch happens to be written today, and a test that depends on it goes green
 * the moment somebody reformats it.
 */
const restingBlock = (code) => {
  const start = code.indexOf("{isResting ? (");
  assert.notEqual(start, -1, "Chat.tsx no longer opens a resting branch with `{isResting ? (`");
  let depth = 0;
  for (let i = start; i < code.length; i += 1) {
    if (code[i] === "{") depth += 1;
    else if (code[i] === "}") {
      depth -= 1;
      if (depth === 0) return code.slice(start, i + 1);
    }
  }
  assert.fail("the resting branch in Chat.tsx is never closed");
};

test("choosing a pet survives the resting screen", () => {
  const block = restingBlock(codeOf(chatPage));
  assert.match(
    block,
    /\bhandlePetSelect\b/,
    "the resting screen renders no path to handlePetSelect, so an account with\n" +
      "more than one pet can open the chat and never say which pet it means -\n" +
      "the greeting that used to carry the picker is not rendered while resting.",
  );
});

test("a proactive bubble ends the rest", () => {
  const line = codeOf(chatPage)
    .split("\n")
    .find((l) => /\bconst isResting\b/.test(l));
  assert.ok(line, "Chat.tsx no longer defines isResting");
  assert.match(
    line,
    /messages\.length\s*<=\s*1/,
    "isResting is not bounded by the message count, so the resting screen\n" +
      "outlives the proactive medical and restock bubbles the provider pushes\n" +
      "1.5s after mount - and nobody who has not yet typed would ever see them.\n" +
      `Found: ${line.trim()}`,
  );
});

test("the brand gradient stops are written in two files and no more", () => {
  // The five stops of --gradient-primary. Matched as whole hex literals so a
  // longer id that happens to contain one does not register.
  const stops = /#(?:FDBA74|FB7185|A78BFA|60A5FA|22D3EE)\b/i;
  const allowed = new Set([
    path.join(srcRoot, "index.css"),
    path.join(srcRoot, "lib", "mipoTheme.ts"),
  ]);

  const offenders = [];
  for (const file of walk(srcRoot)) {
    if (allowed.has(file)) continue;
    const hit = codeOf(file).match(stops);
    if (hit) offenders.push(`${path.relative(repoRoot, file)} — ${hit[0]}`);
  }

  assert.deepEqual(
    offenders,
    [],
    "a brand gradient stop is typed outside src/index.css and src/lib/mipoTheme.ts.\n" +
      "Read var(--gradient-primary) (CSS) or MIPO_GRADIENT_STOPS (JS) instead, or the\n" +
      "next brand change leaves a stale aurora behind:\n" +
      offenders.join("\n"),
  );
});
