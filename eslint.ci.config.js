// Lint rules that CI blocks on.
//
// The main config reports 1,600+ errors, almost all no-explicit-any, so
// failing on the whole thing would make the gate meaningless from day one.
// This config keeps only rules that catch real defects and that the codebase
// already passes, so a new violation is always a regression introduced by the
// change under review.
//
// Two of these were live bugs found during the review: react-hooks/
// rules-of-hooks in SlideToConfirm, and no-dupe-else-if in scan-vet-document,
// which had silently dropped fields from scanned documents.
//
// Add rules here as the codebase reaches zero on them.

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "dev-dist", "node_modules", "playwright-report", "test-results"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node, Deno: "readonly" },
    },
    plugins: { "react-hooks": reactHooks },
    // Everything the base config would report is off unless listed below.
    rules: {
      ...Object.fromEntries(
        Object.keys(js.configs.recommended.rules).map((rule) => [rule, "off"])
      ),
      ...Object.fromEntries(
        tseslint.configs.recommended
          .flatMap((c) => Object.keys(c.rules ?? {}))
          .map((rule) => [rule, "off"])
      ),

      // Hook order must not depend on props or state.
      "react-hooks/rules-of-hooks": "error",

      // Branches and cases that can never run, usually a copy-paste slip.
      "no-dupe-else-if": "error",
      "no-duplicate-case": "error",
      "no-unreachable": "error",

      // Declarations that silently lose a value.
      "no-dupe-keys": "error",
      "no-dupe-args": "error",
      "no-dupe-class-members": "error",
      "no-const-assign": "error",

      // Optional chaining short-circuiting into an operation that assumes a value.
      "no-unsafe-optional-chaining": "error",

      // Comparisons and calls that never do what they read as.
      "no-self-assign": "error",
      "no-self-compare": "error",
      "no-compare-neg-zero": "error",
      "use-isnan": "error",
      "valid-typeof": "error",
    },
  }
);
