// The wordmark belongs to the entry screen. Everywhere else: the mark alone.
//
// This is easy to check badly. `MipoLogo`'s DEFAULT variant is "stacked" - the
// full lockup with the word "Mipo" under it - so a bare `<MipoLogo />` renders
// the wordmark while containing no "stacked" anywhere to grep for. An audit
// that looked for `variant="stacked"` reported the rule fully satisfied while
// eleven call sites rendered the word, two of them deep inside the app.
//
// So the check is inverted: outside the entry screens, every MipoLogo must
// carry variant="mark" EXPLICITLY. Saying nothing is the failure mode.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const srcRoot = path.join(repoRoot, "src");

/**
 * The screens someone arrives on, where the brand introduces itself by name.
 * Everything else is somewhere they already are.
 */
const ENTRY_SCREENS = new Set([
  "src/components/AuthLayout.tsx",
  "src/components/SplashScreen.tsx",
  "src/pages/Auth.tsx",
  "src/pages/Signup.tsx",
  "src/pages/ForgotPassword.tsx",
  "src/pages/ResetPassword.tsx",
  "src/pages/Onboarding.tsx",
]);

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

/** Each `<MipoLogo ...>` element, attributes included, however it is wrapped. */
const logoElements = (code) => [...code.matchAll(/<MipoLogo\b[\s\S]*?\/?>/g)].map((m) => m[0]);

test("outside the entry screens, MipoLogo renders the mark alone", () => {
  const offenders = [];
  for (const file of walk(srcRoot)) {
    const rel = path.relative(repoRoot, file);
    if (ENTRY_SCREENS.has(rel)) continue;
    // The component's own definition, not a call site.
    if (rel === "src/components/MipoLogo.tsx") continue;

    for (const el of logoElements(codeOf(file))) {
      if (!/variant=["']mark["']/.test(el)) {
        offenders.push(`${rel} — ${el.replace(/\s+/g, " ").slice(0, 80)}`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    'a MipoLogo outside the entry screens does not say variant="mark".\n' +
      'The default variant is "stacked", which draws the word "Mipo" - so\n' +
      "omitting the prop shows the wordmark rather than hiding it:\n" +
      offenders.join("\n"),
  );
});

test("every entry screen still shows the wordmark", () => {
  // The other half of the rule, and the reason ENTRY_SCREENS is a list rather
  // than a blanket ban: a change that turned every logo into a bare mark would
  // satisfy the test above completely while deleting the brand from its own
  // front door.
  //
  // "At least one entry screen keeps it" is not enough - with seven in the
  // list, six could lose the word and the count would still be one. So each is
  // checked by itself.
  //
  // It asks for the wordmark to be PRESENT, not for the mark to be absent.
  // Onboarding carries both, correctly: the mark in its header chrome and the
  // wordmark on the welcome step. A rule of "no mark on an entry screen" would
  // have called that a violation.
  const missing = [...ENTRY_SCREENS].filter((rel) => {
    const els = logoElements(codeOf(path.join(repoRoot, rel)));
    return !els.some((el) => !/variant=["']mark["']/.test(el));
  });

  assert.deepEqual(
    missing,
    [],
    "an entry screen no longer shows the MIPO wordmark - it renders no logo, or\n" +
      "only the mark, and the word does not appear on the way in:\n" +
      missing.join("\n"),
  );
});
