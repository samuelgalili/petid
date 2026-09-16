// Text left behind on a surface that stopped being dark.
//
// This has happened four times while flattening filled surfaces to outlined
// ones, and every time it was invisible rather than ugly:
//
//   - the documents dialog header, white heading on a band that became white;
//   - the add-pet gift panel, white body text on a light card;
//   - the admin page header's icon, text-primary-foreground on a tile that
//     lost its primary fill;
//   - the whole of AdminBackup, built as dark slate cards - text-white,
//     text-slate-400, border-slate-700 - dropped onto white.
//
// Nothing catches it. The classes are real, the TSX is valid, the build
// passes, and the page renders: it just renders white on white.
//
// The check is narrow on purpose. It does not ban light text - that is correct
// over a photo scrim, on a filled amber badge, in a dark overlay. It bans the
// specific combination that is always wrong: light text declared on the SAME
// element as a known-light background.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const srcRoot = path.join(repoRoot, "src");

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

/**
 * Backgrounds that are light in BOTH themes, so light text on them never reads.
 *
 * OPAQUE ones only. The lookahead rejects an opacity suffix, because
 * `bg-white/20` is a translucent scrim laid over a photograph - white text on
 * it is correct, and four such call sites failed a first version of this that
 * matched `bg-white` with a plain \b (a slash is a word boundary).
 *
 * Longest alternative first, so bg-mipo-soft-deep matches itself rather than
 * being read as bg-mipo-soft with a stray suffix.
 */
const LIGHT_BG = /\bbg-(?:white|mipo-surface|mipo-soft-deep|mipo-soft)(?![\w/-])/;
/** Text that needs a dark backing. */
const LIGHT_TEXT = /\btext-(?:white|primary-foreground)\b/;

test("light text is never declared on a light surface", () => {
  const offenders = [];
  for (const file of walk(srcRoot)) {
    // One class attribute at a time: two separate elements, one light and one
    // dark, are not a conflict, and matching across them invents failures.
    for (const [, attr] of codeOf(file).matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
      const value = attr ?? "";
      if (LIGHT_BG.test(value) && LIGHT_TEXT.test(value)) {
        offenders.push(`${path.relative(repoRoot, file)} — ${value.trim().slice(0, 90)}`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    "a light text colour sits on a light background, in both themes - the text\n" +
      "is invisible. This is what is left behind when a filled surface is\n" +
      "flattened and the text on it is not moved with it:\n" +
      offenders.join("\n"),
  );
});
