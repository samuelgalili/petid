// The side-by-side workspace, and the two ways it breaks silently.
//
// AdminWorkspace puts the detail pane BESIDE the list instead of over it, so
// a record can be read and written about without losing the row it came from.
// Getting there crosses two traps, neither of which typecheck or lint can see.
//
// 1. A detail panel that used SheetTitle.
//
//    The panel was written for a Sheet, so its header used SheetHeader and
//    SheetTitle. SheetTitle is a Radix Dialog.Title, and Radix context hooks
//    THROW when their provider is missing - so the moment the same panel is
//    rendered standalone in the workspace column, the page crashes on first
//    open. It compiles, it lints, and it works in the Sheet it was written
//    for. Only the new context kills it.
//
// 2. Two different breakpoints for one split.
//
//    The obvious build hides the column with `hidden lg:block` and the sheet
//    with `lg:hidden`, then asks the app's useIsMobile() whether to open the
//    sheet. Tailwind's lg is 1024; that hook's breakpoint is 768. Between the
//    two, the column is hidden by CSS while the sheet believes it is on a
//    desktop and never opens - a 900px window selects a customer and is shown
//    nothing at all. Nothing errors; the pane is simply not there.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const srcRoot = path.join(repoRoot, "src");
const workspace = path.join(srcRoot, "components/admin/AdminWorkspace.tsx");

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

test("a file that uses the workspace does not render Sheet-only primitives", () => {
  // SheetContent is fine - the workspace itself renders one for narrow
  // screens. It is Title and Description that carry the Radix context
  // requirement and throw outside a Dialog.
  const offenders = [];
  for (const file of walk(srcRoot)) {
    if (file === workspace) continue;
    const code = codeOf(file);
    if (!/<AdminWorkspace\b/.test(code)) continue;
    for (const [hit] of code.matchAll(/<\/?Sheet(?:Title|Description)\b/g)) {
      offenders.push(`${path.relative(repoRoot, file)} — ${hit}`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    "a page rendering <AdminWorkspace> also renders SheetTitle/SheetDescription.\n" +
      "Those are Radix Dialog primitives: outside a Dialog they THROW, and the\n" +
      "workspace renders its detail pane standalone on a wide screen. Use plain\n" +
      "markup in a panel that has to work in both places:\n" +
      offenders.join("\n"),
  );
});

test("the workspace splits on exactly one breakpoint", () => {
  const code = codeOf(workspace);

  const responsiveClasses = [...code.matchAll(/\b(?:sm|md|lg|xl|2xl):(?:hidden|block|flex)\b/g)].map(
    (m) => m[0],
  );
  assert.deepEqual(
    responsiveClasses,
    [],
    "AdminWorkspace decides which pane to show with a Tailwind breakpoint class.\n" +
      "The same split is also decided in JS, and the two numbers drift: a window\n" +
      "between them gets neither pane. Decide it once, in JS:\n" +
      responsiveClasses.join(" "),
  );

  assert.doesNotMatch(
    code,
    /\buseIsMobile\b/,
    "AdminWorkspace uses useIsMobile(), which breaks at 768 - a different\n" +
      "number from the column layout's own. It must own its breakpoint.",
  );

  const breakpoints = [...code.matchAll(/WORKSPACE_BREAKPOINT\s*=\s*(\d+)/g)];
  assert.equal(
    breakpoints.length,
    1,
    "AdminWorkspace should define its breakpoint exactly once; found " +
      breakpoints.length,
  );
});
