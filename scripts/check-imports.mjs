#!/usr/bin/env node
// Fails when a file under src/ imports a module that is not on disk.
//
// Why this exists. `npm run typecheck` compiles tsconfig.active.json, whose
// file list is just src/main.tsx and src/sw.ts -- so it follows only what the
// running app actually imports. That is deliberate and it keeps the check fast,
// but it means a file the app has stopped importing is no longer checked at
// all. Whole trees have quietly rotted behind that line: src/pages/
// SoundtrackFeed.tsx and src/components/feed/index.ts between them name seven
// components that do not exist, and nothing anywhere reported it.
//
// Unreachable code cannot break production -- it is never bundled -- but it is
// a trap. The next person to import one of these barrels gets a broken build
// out of nowhere, and the file they wanted looks like it is right there.
//
// So this is a ratchet, not a cleanup. The breakage that already exists is
// listed in scripts/known-missing-modules.json and tolerated. Anything NEW
// fails. And when a listed entry is repaired or removed, the baseline has to
// shrink with it, so the list can never quietly become fiction.

import { readdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = join(repoRoot, "src");
const baselinePath = join(repoRoot, "scripts", "known-missing-modules.json");

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mts", ".cts"];
// The order a bundler tries when the specifier has no extension of its own.
const RESOLUTION_SUFFIXES = [
  "", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css", ".d.ts",
  "/index.ts", "/index.tsx", "/index.js", "/index.jsx",
];

const collectSourceFiles = async (directory) => {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...await collectSourceFiles(full));
    } else if (SOURCE_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) {
      found.push(full);
    }
  }
  return found;
};

// `import x from "y"`, `export { x } from "y"`, `import("y")`, `import "y"`.
const SPECIFIER_PATTERN = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']/g;

const specifiersIn = (source) => {
  // Line and block comments are stripped first so a commented-out import
  // cannot fail the build.
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");

  const specifiers = new Set();
  for (const match of code.matchAll(SPECIFIER_PATTERN)) specifiers.add(match[1]);
  return specifiers;
};

const resolveSpecifier = (specifier, fromFile) => {
  let base;
  if (specifier.startsWith("@/")) base = join(srcRoot, specifier.slice(2));
  else if (specifier.startsWith(".")) base = resolve(dirname(fromFile), specifier);
  else return true; // A package. npm and the lockfile own that question.

  return RESOLUTION_SUFFIXES.some((suffix) => existsSync(base + suffix));
};

const readBaseline = async () => {
  try {
    const parsed = JSON.parse(await readFile(baselinePath, "utf8"));
    return new Set(parsed.tolerated ?? []);
  } catch (error) {
    if (error.code === "ENOENT") return new Set();
    throw error;
  }
};

const main = async () => {
  if (!existsSync(srcRoot) || !(await stat(srcRoot)).isDirectory()) {
    console.error("check-imports: no src/ directory to check");
    process.exit(1);
  }

  const baseline = await readBaseline();
  const unresolved = new Set();

  for (const file of await collectSourceFiles(srcRoot)) {
    const source = await readFile(file, "utf8");
    for (const specifier of specifiersIn(source)) {
      if (resolveSpecifier(specifier, file)) continue;
      unresolved.add(`${relative(repoRoot, file)}::${specifier}`);
    }
  }

  const added = [...unresolved].filter((entry) => !baseline.has(entry)).sort();
  const repaired = [...baseline].filter((entry) => !unresolved.has(entry)).sort();

  if (added.length > 0) {
    console.error(`\ncheck-imports: ${added.length} import(s) point at a module that does not exist.\n`);
    for (const entry of added) {
      const [file, specifier] = entry.split("::");
      console.error(`  ${file}\n    imports ${specifier}`);
    }
    console.error("\nCreate the module, fix the path, or remove the import.");
  }

  if (repaired.length > 0) {
    console.error(`\ncheck-imports: ${repaired.length} entr(ies) in scripts/known-missing-modules.json are fixed and must be removed from it:\n`);
    for (const entry of repaired) console.error(`  ${entry}`);
    console.error("\nThe baseline only shrinks. Delete those lines.");
  }

  if (added.length > 0 || repaired.length > 0) process.exit(1);

  console.log(`check-imports: every import under src/ resolves (${baseline.size} known gap(s) still tolerated)`);
};

await main();
