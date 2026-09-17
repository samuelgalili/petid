// The seller step, and the three ways a "set one flag" job becomes a blanket one.
//
// commercial_status is the column the publication gate reads and nothing could
// write - measured on production as one business, verified, status 'none',
// seller_eligible 0. setSellerCommercialStatus.mjs existed for months and had
// no way to be run: no workflow named it. So 187 publishable products sat
// behind a column no path could set.
//
// It runs as a step of the catalogue workflow now, which already carries the
// confirmation wording, the accountable admin and the script verification. The
// risk it adds is specific: this is the one script whose job is to make a
// business able to SELL, and the failure that matters is doing it to more
// businesses than were named. 0049 avoided a blanket backfill precisely so the
// unowned profile holding the legacy products could not become a Seller by
// existing.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflow = readFileSync(
  path.join(repoRoot, ".github/workflows/production-legacy-catalogue-migrate.yml"),
  "utf8",
);
const script = readFileSync(
  path.join(repoRoot, "server/scripts/setSellerCommercialStatus.mjs"),
  "utf8",
);

test("the seller step is reachable and named", () => {
  assert.match(workflow, /^\s+- seller$/m, "step=seller is not an option");
  assert.match(workflow, /setSellerCommercialStatus\.mjs/, "no step runs the script");
  assert.match(
    workflow,
    /seller\)\s+expected="SELLER-STATUS"/,
    "step=seller has no confirmation word of its own - reusing another step's\n" +
      "word would let a mistyped step run with the wrong confirmation.",
  );
});

test("an apply without one named business is refused before anything is contacted", () => {
  assert.match(
    workflow,
    /STEP"\s*=\s*"seller"\s*\]\s*&&\s*\[\s*"\$MODE"\s*=\s*"apply"/,
    "nothing checks business_id before the apply path runs",
  );
  assert.match(
    workflow,
    /\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}/,
    "business_id is not checked against a uuid shape, so a typo reaches the host",
  );
  // The refusal has to come before SSH, not after a backup.
  const refusalAt = workflow.indexOf("step=seller needs business_id");
  const sshAt = workflow.indexOf("Configure SSH");
  assert.ok(refusalAt !== -1, "the refusal message is gone");
  assert.ok(
    refusalAt < sshAt,
    "the business_id refusal happens after SSH is configured; it must stop\n" +
      "before anything is contacted.",
  );
});

test("the script cannot approve every business at once", () => {
  // The refusal lives in the script and is asserted here so that neither the
  // workflow's copy nor the script's can quietly become the only one.
  assert.match(
    script,
    /statusChangeBlockers/,
    "the script no longer routes its refusals through statusChangeBlockers()",
  );
  assert.match(
    script,
    /business-id.*is required|--business-id=<uuid> is required/,
    "the script no longer requires --business-id, which is the difference\n" +
      "between approving one Seller and approving all of them.",
  );
  assert.match(
    script,
    /not_verified/,
    "approving an unverified business is no longer refused - is_verified says a\n" +
      "human confirmed the business is real, and approving before that inverts\n" +
      "the order the two checks exist in.",
  );
});
