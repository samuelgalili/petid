// The 42 products hidden as irrelevant or as a duplicate of a product we keep.
// Nothing here deletes a row or changes stock. The 28 broken-image ids stay
// on their own script.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { BROKEN_IMAGE_PRODUCTS } from "../scripts/hideBrokenImageProducts.mjs";
import {
  EXPECTED_ALLOWLIST_COUNT,
  IRRELEVANT_HIDE_REASON,
  IRRELEVANT_PRODUCTS,
  KEEP_INSTEAD_IDS,
  assertAllowlisted,
  assertRuntimeAllowlist,
  blockingActions,
  formatShopVisibilityReport,
  parseMode,
  planShopVisibility,
  unexpectedIds,
  validateAllowlist,
} from "../scripts/hideIrrelevantProducts.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFileSync(path.join(repoRoot, relative), "utf8");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const visibleRows = () => new Map(
  IRRELEVANT_PRODUCTS.map((entry) => [entry.id, { id: entry.id, in_stock: true, shop_hidden: false }]),
);

test("the allowlist is the 42 CSV ids, each a unique uuid, and it does not overlap the 28", () => {
  validateAllowlist();
  assert.equal(EXPECTED_ALLOWLIST_COUNT, 42);
  assert.equal(IRRELEVANT_PRODUCTS.length, 42);
  const ids = IRRELEVANT_PRODUCTS.map((entry) => entry.id);
  // The fixture is the candidates list. The script's ids have to match it
  // exactly, so a drift in either direction fails here.
  const fixtureIds = JSON.parse(read("server/test/fixtures/hide-irrelevant-product-ids.json"));
  assert.deepEqual(ids, fixtureIds);
  assert.equal(new Set(ids).size, 42);
  assert.ok(ids.every((id) => UUID.test(id)));
  assert.equal(IRRELEVANT_PRODUCTS.filter((entry) => entry.candidate_category === "לא רלוונטי").length, 31);
  assert.equal(IRRELEVANT_PRODUCTS.filter((entry) => entry.candidate_category === "כפילות").length, 9);
  assert.equal(IRRELEVANT_PRODUCTS.filter((entry) => entry.candidate_category === "אחר").length, 2);

  const broken = BROKEN_IMAGE_PRODUCTS.map((entry) => entry.id);
  assert.equal(new Set(broken).size, 28);
  assert.ok(broken.every((id) => UUID.test(id)));
  for (const id of ids) {
    assert.equal(broken.includes(id), false, id);
  }
  assert.equal(ids[0], "9da533d7-2d45-4ba8-9379-fea2b6c4b031");
  assert.equal(ids.at(-1), "8caedd0f-9460-4a4e-8b39-283842d11117");
});

test("no keep_instead_id is on the allowlist, and the script refuses to hide one", () => {
  assert.deepEqual(KEEP_INSTEAD_IDS, [
    "744f4a67-7df5-461d-8b02-8513302dca64",
    "40c529cd-5303-43a2-9a2e-a85ab19658b1",
    "4da218ab-466d-492f-be21-e5a7f3dfe71e",
    "908cd383-d121-4930-8bc6-9a5b5b818a1b",
    "a0a87fdc-e468-44c5-8ac6-badbfd2b6361",
    "a9be43ea-0ead-46bf-a236-d916e77be172",
    "1401800c-6f07-4014-b4ce-99868795cd9e",
    "1dd64743-4ff9-4a2d-b283-0744e702f5eb",
    "1029adc8-183e-4b8c-be6d-eee17b3d397c",
  ]);
  const hidden = new Set(IRRELEVANT_PRODUCTS.map((entry) => entry.id));
  for (const keepId of KEEP_INSTEAD_IDS) {
    assert.equal(UUID.test(keepId), true, keepId);
    assert.equal(hidden.has(keepId), false, keepId);
    assert.throws(() => assertAllowlisted(keepId), /keep_instead_id/);
  }
  const duplicates = IRRELEVANT_PRODUCTS.filter((entry) => entry.candidate_category === "כפילות");
  assert.deepEqual(duplicates.map((entry) => entry.keep_instead_id), [...KEEP_INSTEAD_IDS]);
  assert.ok(IRRELEVANT_PRODUCTS.filter((entry) => entry.candidate_category !== "כפילות").every((entry) => entry.keep_instead_id === null));
});

test("each allowlisted id has a comment with its product name", () => {
  const script = read("server/scripts/hideIrrelevantProducts.mjs");
  const comments = script.split("\n").filter((line) => line.trim().startsWith("//"));
  for (const entry of IRRELEVANT_PRODUCTS) {
    assert.ok(
      comments.some((line) => line.includes(entry.id) && line.includes(entry.name)),
      entry.id,
    );
  }
});

test("an id that is not on the list is refused", () => {
  const stranger = "00000000-0000-4000-8000-000000000099";
  assert.throws(() => assertAllowlisted(stranger), /not on the irrelevant-product list/);
  assert.deepEqual(unexpectedIds([`--product=${stranger}`]), [stranger]);
  assert.deepEqual(unexpectedIds([`--product=${KEEP_INSTEAD_IDS[0]}`]), [KEEP_INSTEAD_IDS[0]]);
  assert.deepEqual(unexpectedIds(["--mode=hide"]), []);
  assert.equal(parseMode([]), "dry-run");
  assert.equal(parseMode(["--mode=unhide"]), "unhide");
  assert.throws(() => parseMode(["--mode=apply"]), /dry-run, hide or unhide/);
  assert.equal(assertAllowlisted(IRRELEVANT_PRODUCTS[0].id).name, IRRELEVANT_PRODUCTS[0].name);
});

test("hide records the previous visibility and a second hide does not overwrite it", () => {
  const id = IRRELEVANT_PRODUCTS[0].id;
  const rows = visibleRows();
  const first = planShopVisibility("hide", rows, new Map()).find((plan) => plan.id === id);
  assert.equal(first.action, "hide");
  assert.equal(first.write, true);
  assert.equal(first.restore_to, false);
  assert.equal(first.in_stock, true);
  assert.equal(first.shop_hidden, false);

  rows.set(id, { id, in_stock: true, shop_hidden: true });
  const after = planShopVisibility(
    "hide",
    rows,
    new Map([[id, { product_id: id, previous_shop_hidden: false, reason: IRRELEVANT_HIDE_REASON }]]),
  ).find((plan) => plan.id === id);
  assert.equal(after.action, "already-hidden");
  assert.equal(after.write, false);
  assert.equal(after.recorded_previous_shop_hidden, false);
});

test("unhide restores the recorded value, including a value that was already hidden", () => {
  const id = IRRELEVANT_PRODUCTS[0].id;
  const rows = visibleRows();
  rows.set(id, { id, in_stock: true, shop_hidden: true });
  const hidden = planShopVisibility(
    "unhide",
    rows,
    new Map([[id, { product_id: id, previous_shop_hidden: false, reason: IRRELEVANT_HIDE_REASON }]]),
  ).find((plan) => plan.id === id);
  assert.equal(hidden.action, "unhide");
  assert.equal(hidden.restore_to, false);
  assert.equal(hidden.write, true);
  assert.equal(hidden.in_stock, true);

  rows.set(id, { id, in_stock: false, shop_hidden: true });
  const wasAlreadyHidden = planShopVisibility(
    "unhide",
    rows,
    new Map([[id, { product_id: id, previous_shop_hidden: true, reason: IRRELEVANT_HIDE_REASON }]]),
  ).find((plan) => plan.id === id);
  assert.equal(wasAlreadyHidden.restore_to, true);
  assert.equal(wasAlreadyHidden.in_stock, false);

  const noRecord = planShopVisibility("unhide", rows, new Map()).find((plan) => plan.id === id);
  assert.equal(noRecord.action, "refuse-no-record");
  assert.equal(noRecord.write, false);
  assert.ok(blockingActions.has(noRecord.action));
});

test("a hold recorded by the other hide workflow is not overwritten or deleted", () => {
  const id = IRRELEVANT_PRODUCTS[0].id;
  const rows = visibleRows();
  rows.set(id, { id, in_stock: true, shop_hidden: true });
  const foreign = new Map([[id, {
    product_id: id,
    previous_shop_hidden: false,
    reason: "broken-external-main-image-2026-09-27",
  }]]);
  for (const mode of ["hide", "unhide"]) {
    const plan = planShopVisibility(mode, rows, foreign).find((entry) => entry.id === id);
    assert.equal(plan.action, "refuse-other-hold");
    assert.equal(plan.write, false);
    assert.ok(blockingActions.has(plan.action));
  }
});

test("dry-run writes nothing, names every id, and a missing id fails the runtime check", () => {
  const plans = planShopVisibility("dry-run", visibleRows(), new Map());
  assert.equal(plans.length, 42);
  assert.ok(plans.every((plan) => plan.write === false));
  assert.ok(plans.every((plan) => plan.action === "report"));
  assert.doesNotThrow(() => assertRuntimeAllowlist(plans));

  const report = formatShopVisibilityReport("dry-run", plans);
  assert.match(report, /^allowlist_count=42\n/);
  assert.match(report, /summary mode=dry-run products=42 found=42 missing=0 writes=0$/);
  const first = IRRELEVANT_PRODUCTS[0];
  assert.ok(report.includes(
    `${first.id}  shop_hidden=false  stock_flag=true  hold_recorded=false  action=report  name=${first.name}`,
  ));
  for (const entry of IRRELEVANT_PRODUCTS) {
    assert.ok(report.includes(entry.id), entry.id);
    assert.ok(report.includes(`name=${entry.name}`), entry.name);
  }

  const missing = planShopVisibility("dry-run", new Map(), new Map());
  assert.ok(missing.every((plan) => plan.action === "missing" && plan.write === false));
  const missingReport = formatShopVisibilityReport("dry-run", missing);
  assert.match(missingReport, /shop_hidden=absent  stock_flag=absent  hold_recorded=false  action=missing/);
  assert.match(missingReport, /summary mode=dry-run products=42 found=0 missing=42 writes=0$/);
  assert.throws(
    () => assertRuntimeAllowlist(missing),
    (error) => {
      assert.equal(error.code, "MISSING_PRODUCT");
      assert.match(error.message, /allowlisted products not in business_products \(42\)/);
      for (const entry of IRRELEVANT_PRODUCTS) assert.ok(error.message.includes(entry.id));
      return true;
    },
  );
  assert.throws(() => assertRuntimeAllowlist(plans.slice(0, 41)), /allowlist_count=41/);
});

test("the production workflow defaults to dry-run and confirms hide and unhide separately", () => {
  const workflow = read(".github/workflows/production-hide-irrelevant-products.yml");
  assert.match(workflow, /name: Hide irrelevant and duplicate products/);
  assert.match(workflow, /default: 'dry-run'/);
  assert.match(workflow, /hide\) expected="HIDE-IRRELEVANT-PRODUCTS"/);
  assert.match(workflow, /unhide\) expected="UNHIDE-IRRELEVANT-PRODUCTS"/);
  const confirmAt = workflow.indexOf("mode=$MODE changes production data");
  const sshAt = workflow.indexOf("Configure SSH");
  assert.ok(confirmAt > 0 && confirmAt < sshAt, "confirmation is checked before anything is contacted");
  assert.match(workflow, /backup-before-migrate\.sh/);
  assert.match(workflow, /0061_product_shop_visibility\.sql/);
  assert.match(workflow, /group: aws-production/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /aws-migration/);
  assert.match(workflow, /No copy onto main is required/);
  assert.doesNotMatch(workflow, /secrets\.DATABASE_URL/);
  assert.doesNotMatch(workflow, /echo[^\n]*DATABASE_URL/);

  const script = read("server/scripts/hideIrrelevantProducts.mjs");
  assert.doesNotMatch(script, /from\s+["']\.\.\/\.\.\//);
  const updates = [...script.matchAll(/update public\.business_products[\s\S]*?returning/g)].map((match) => match[0]);
  assert.equal(updates.length, 2);
  for (const statement of updates) {
    assert.match(statement, /shop_hidden/);
    assert.doesNotMatch(statement, /in_stock/);
    assert.match(statement, /where id = \$1/);
  }
  assert.match(script, /assertAllowlisted\(plan\.id\)/);
  assert.match(script, /assertAllowlisted\(id\)/);
  assert.doesNotMatch(script, /delete from public\.business_products/);
  assert.match(script, /delete from public\.product_shop_visibility_holds/);
  assert.match(script, new RegExp(IRRELEVANT_HIDE_REASON));
});
