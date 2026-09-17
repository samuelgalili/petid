// The aurora goes around the pet. Nothing else.
//
// That was the rule, and the audit that checked it looked for
// `bg-gradient-to-*` and `gradient-primary`. It never looked for
// `.mipo-gradient-ring`, which is the class that actually draws the ring - so
// five of them went uncounted: a camera button in the community composer, the
// empty-feed video glyph, the app's loading spinner, the AI-consent screen's
// icon, and the chat's typing indicator, which wore an aurora'd Sparkles and a
// "Mipo AI" label for as long as the assistant was answering.
//
// A rule enforced by grepping for one spelling of a thing is enforced for that
// spelling only.
//
// The check: a ring must wrap something that shows a person or an animal - an
// <img>, an <Avatar>, a MipoLogo mark. A ring whose contents are a lucide
// glyph is a ring around an icon.

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

/** What legitimately sits inside the ring. */
const SHOWS_A_FACE = /<img\b|<motion\.img\b|<Avatar\b|<MipoLogo\b|avatar/i;

/** The lucide glyphs a given file imports, which is what "an icon" means here. */
const iconNames = (code) => {
  const names = new Set();
  for (const [, block] of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*"lucide-react"/g)) {
    for (const part of block.split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop().trim();
      if (/^[A-Z]/.test(name)) names.add(name);
    }
  }
  return names;
};

test("the brand aurora only ever rings an avatar", () => {
  const offenders = [];
  for (const file of walk(srcRoot)) {
    const code = codeOf(file);
    const icons = iconNames(code);
    if (icons.size === 0) continue;

    for (const match of code.matchAll(/mipo-gradient-ring/g)) {
      // A SHORT window, deliberately.
      //
      // The first version asked the opposite question - does a face appear
      // after the ring - and needed an ever-wider window to find it. PetOrbit's
      // ring is correct and its <motion.img> sits past a block of sparkle spans
      // and animation config; no defensible window reached it, and widening
      // until it did would have stopped catching anything.
      //
      // The failure being guarded against is narrow and close: a ring drawn
      // directly around a glyph. So the window is small, and a ring whose
      // contents are further away than this is left alone - it is wrapping a
      // structure, not an icon.
      const window = code.slice(match.index, match.index + 300);
      if (SHOWS_A_FACE.test(window)) continue;

      const glyph = [...icons].find((name) => new RegExp(`<${name}\\b`).test(window));
      if (glyph) {
        const line = code.slice(0, match.index).split("\n").length;
        offenders.push(`${path.relative(repoRoot, file)}:${line} — rings <${glyph}>`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    "the brand aurora rings something that is not an avatar. It belongs around\n" +
      "the pet and nowhere else - a ringed icon spends the one piece of colour\n" +
      "the system allows on a glyph:\n" +
      offenders.join("\n"),
  );
});
