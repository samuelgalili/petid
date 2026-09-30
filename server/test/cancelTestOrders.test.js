// The one-off cancel of seven unpaid test orders.
//
// Pure rules only: who may be touched, who must never be touched, when an
// order is unpaid, and how an email is masked. The quality workflow runs
// `npm test --prefix server`, and node --test picks this file up with the rest.

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ALLOWLIST,
  DENYLIST,
  UNPAID_PAYMENT_STATUSES,
  assertAllowlistExcludesDenylist,
  assertAllowlisted,
  assertArgvAllowed,
  cancelUpdateSql,
  cardcomEventLooksApproved,
  decideCancellation,
  formatDecisionLine,
  formatSummary,
  maskEmail,
  parseMode,
  redactSecrets,
  reportsFor,
  tallyDecisions,
  unexpectedOrderNumbers,
} from "../scripts/cancelTestOrders.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => readFileSync(path.join(repoRoot, relative), "utf8");

const PROTECTED = "MIPO-20260818-8B5E6A";
const DENYLIST_LINE = 'export const DENYLIST = Object.freeze(["MIPO-20260818-8B5E6A"]);';

const eligibleRow = (overrides = {}) => ({
  found: true,
  status: "pending",
  payment_status: "pending",
  paid_at: null,
  payment_attested_at: null,
  payment_attested_by: null,
  cardcom_approved: false,
  ...overrides,
});

test("the allowlist is the seven test orders and nothing else", () => {
  assert.deepEqual(ALLOWLIST, [
    "MIPO-20260927-2A4A48",
    "MIPO-20260927-503E89",
    "MIPO-20260927-8E965A",
    "MIPO-20260927-BE8D07",
    "MIPO-20260927-A5B5C2",
    "MIPO-20260927-3A7423",
    "MIPO-20260927-C8061F",
  ]);
  assert.equal(new Set(ALLOWLIST).size, 7);
  assert.equal(ALLOWLIST.includes(PROTECTED), false);
});

test("the protected order is denylisted and blocks the run if it is also allowlisted", () => {
  assert.deepEqual([...DENYLIST], [PROTECTED]);
  assert.equal(DENYLIST.includes(PROTECTED), true);
  assert.doesNotThrow(() => assertAllowlistExcludesDenylist());
  assert.throws(
    () => assertAllowlistExcludesDenylist([...ALLOWLIST, PROTECTED], DENYLIST),
    /denylisted order/,
  );
  assert.throws(() => assertAllowlisted(PROTECTED), (error) => {
    assert.equal(error.code, "DENYLIST");
    assert.match(error.message, /denylisted/);
    return true;
  });
  assert.throws(
    () => assertArgvAllowed([`--order=${PROTECTED}`]),
    /denylisted order/,
  );
});

test("an order number that is not on the allowlist is refused before any write", () => {
  const stranger = "MIPO-20260101-AAAAAA";
  assert.throws(() => assertAllowlisted(stranger), (error) => {
    assert.equal(error.code, "NOT_ALLOWLISTED");
    return true;
  });
  assert.deepEqual(unexpectedOrderNumbers([`--order=${stranger}`]), [stranger]);
  assert.deepEqual(unexpectedOrderNumbers(["--mode=apply", ALLOWLIST[0]]), []);
  assert.throws(() => assertArgvAllowed([stranger]), /not on the allowlist/);
  assert.doesNotThrow(() => assertArgvAllowed(["--mode=dry-run"]));
  assert.equal(assertAllowlisted(ALLOWLIST[0].toLowerCase()), ALLOWLIST[0]);
});

test("mode defaults to dry-run and only dry-run or apply are accepted", () => {
  assert.equal(parseMode([]), "dry-run");
  assert.equal(parseMode(["--mode=dry-run"]), "dry-run");
  assert.equal(parseMode(["--mode=apply"]), "apply");
  assert.throws(() => parseMode(["--mode=hide"]), (error) => {
    assert.equal(error.code, "BAD_MODE");
    return true;
  });
});

test("emails are masked and a decision line never contains the full address", () => {
  assert.equal(maskEmail("tester@example.com"), "t***@example.com");
  assert.equal(maskEmail("A@shop.test"), "A***@shop.test");
  assert.equal(maskEmail(""), "(none)");
  assert.equal(maskEmail(null), "(none)");
  assert.equal(maskEmail("not-an-email"), "***");
  assert.equal(maskEmail("a@b"), "***");
  assert.equal(maskEmail("two words@example.com"), "***");

  const line = formatDecisionLine({
    orderNumber: ALLOWLIST[0],
    status: "pending",
    payment_status: "pending",
    total: "12.50",
    created_at: new Date("2026-09-27T12:00:00.000Z"),
    email: "tester@example.com",
    paid_at_label: "null",
    cardcom_event_count: 0,
    cardcom_approved: false,
    decision: "CANCEL",
  });
  assert.equal(line.includes("tester@example.com"), false);
  assert.match(line, /email=t\*\*\*@example.com/);
  assert.match(line, /total=12\.50/);
  assert.match(line, /created_at=2026-09-27T12:00:00.000Z/);
  assert.match(line, /cardcom_events=0/);
  assert.match(line, /cardcom_approved=no/);
  assert.match(line, /decision=CANCEL/);
  assert.equal(redactSecrets("postgres://mipo_app:secret@db.internal/mipo").includes("secret"), false);
  assert.match(redactSecrets("postgres://mipo_app:secret@db.internal/mipo"), /postgres:\/\/\*\*\*/);
  assert.equal(redactSecrets("customer tester@example.com").includes("tester@example.com"), false);
});

test("an approved Cardcom event is operation 0 and deal 0, or is_success", () => {
  assert.equal(cardcomEventLooksApproved(null), false);
  assert.equal(cardcomEventLooksApproved({}), false);
  assert.equal(cardcomEventLooksApproved({ is_success: true, operation_response: null, deal_response: null }), true);
  assert.equal(cardcomEventLooksApproved({ is_success: false, operation_response: 0, deal_response: 0 }), true);
  assert.equal(cardcomEventLooksApproved({ is_success: null, operation_response: 0, deal_response: 0 }), true);
  assert.equal(cardcomEventLooksApproved({ is_success: false, operation_response: 0, deal_response: null }), false);
  assert.equal(cardcomEventLooksApproved({ is_success: false, operation_response: 2006, deal_response: 0 }), false);
  assert.equal(cardcomEventLooksApproved({ is_success: "true", operation_response: "0", deal_response: "0" }), false);
});

test("only a pending unpaid order with no approval and no paid timestamp is cancelled", () => {
  assert.equal(decideCancellation({ found: false }), "NOT-FOUND");
  assert.equal(decideCancellation(null), "NOT-FOUND");
  assert.equal(decideCancellation(eligibleRow()), "CANCEL");
  assert.equal(decideCancellation(eligibleRow({ payment_status: "failed" })), "CANCEL");
  assert.deepEqual([...UNPAID_PAYMENT_STATUSES], ["pending", "failed"]);

  assert.equal(decideCancellation(eligibleRow({ status: "processing" })), "SKIP:status=processing");
  assert.equal(decideCancellation(eligibleRow({ status: "cancelled" })), "SKIP:status=cancelled");
  assert.equal(decideCancellation(eligibleRow({ status: "shipped", payment_status: "paid" })), "SKIP:status=shipped");
  assert.equal(decideCancellation(eligibleRow({ payment_status: "paid" })), "SKIP:payment_status=paid");
  assert.equal(decideCancellation(eligibleRow({ payment_status: "creating" })), "SKIP:payment_status=creating");
  assert.equal(decideCancellation(eligibleRow({ payment_status: "awaiting_cod" })), "SKIP:payment_status=awaiting_cod");
  assert.equal(decideCancellation(eligibleRow({ payment_status: "refunded" })), "SKIP:payment_status=refunded");
  assert.equal(decideCancellation(eligibleRow({ payment_status: "libra_credit" })), "SKIP:payment_status=libra_credit");
  assert.equal(decideCancellation(eligibleRow({ payment_status: "dev_approved" })), "SKIP:payment_status=dev_approved");
  assert.equal(
    decideCancellation(eligibleRow({ paid_at: "2026-09-27T00:00:00.000Z" })),
    "SKIP:paid_at",
  );
  assert.equal(
    decideCancellation(eligibleRow({ payment_attested_at: "2026-09-27T00:00:00.000Z" })),
    "SKIP:payment-attested",
  );
  assert.equal(
    decideCancellation(eligibleRow({ payment_attested_by: "admin-id" })),
    "SKIP:payment-attested",
  );
  assert.equal(
    decideCancellation(eligibleRow({ payment_status: "failed", cardcom_approved: true })),
    "SKIP:approved-cardcom",
  );
});

test("the summary counts the three decisions and they add up to the allowlist", () => {
  const missing = reportsFor([], { hasPaidAt: false });
  assert.equal(missing.length, ALLOWLIST.length);
  assert.equal(
    formatSummary(tallyDecisions(missing.map((report) => report.decision))),
    "cancelled 0, skipped 0, not found 7",
  );

  const [first] = ALLOWLIST;
  const reports = reportsFor([
    {
      order_number: first,
      status: "pending",
      payment_status: "pending",
      total: "10.00",
      created_at: "2026-09-27T08:00:00.000Z",
      customer_email: "qa@example.com",
      payment_attested_at: null,
      payment_attested_by: null,
      paid_at: null,
      cardcom_event_count: 1,
      cardcom_approved: false,
    },
  ], { hasPaidAt: true });
  assert.equal(reports[0].decision, "CANCEL");
  assert.equal(reports[0].paid_at_label, "null");
  assert.equal(reports[0].cardcom_event_count, 1);
  const line = formatDecisionLine(reports[0]);
  assert.equal(line.includes("qa@example.com"), false);
  assert.match(line, /email=q\*\*\*@example.com/);
  assert.match(line, /cardcom_events=1/);
  assert.match(line, /cardcom_approved=no/);
  assert.ok(reports.slice(1).every((report) => report.decision === "NOT-FOUND"));
  assert.equal(
    formatSummary(tallyDecisions(reports.map((report) => report.decision))),
    "cancelled 1, skipped 0, not found 6",
  );

  const paidAt = reportsFor([
    {
      order_number: first,
      status: "pending",
      payment_status: "pending",
      total: "10.00",
      created_at: "2026-09-27T08:00:00.000Z",
      customer_email: "qa@example.com",
      payment_attested_at: null,
      payment_attested_by: null,
      paid_at: "2026-09-27T09:00:00.000Z",
      cardcom_event_count: 0,
      cardcom_approved: false,
    },
  ], { hasPaidAt: true });
  assert.equal(paidAt[0].decision, "SKIP:paid_at");
  assert.equal(paidAt[0].paid_at_label, "2026-09-27T09:00:00.000Z");
});

test("apply re-checks eligibility inside the update and writes only orders plus the outbox", () => {
  const withPaidAt = cancelUpdateSql({ hasPaidAt: true });
  assert.match(withPaidAt, /update public\.orders/);
  assert.match(withPaidAt, /set status = 'cancelled'/);
  assert.match(withPaidAt, /order_number = any\(\$1::text\[\]\)/);
  assert.match(withPaidAt, /status = 'pending'/);
  assert.match(withPaidAt, /payment_status = any\(\$2::text\[\]\)/);
  assert.match(withPaidAt, /payment_attested_at is null/);
  assert.match(withPaidAt, /payment_attested_by is null/);
  assert.match(withPaidAt, /is_success is true/);
  assert.match(withPaidAt, /operation_response = 0 and e\.deal_response = 0/);
  assert.match(withPaidAt, /paid_at is null/);
  assert.equal(/delete\s+from/i.test(withPaidAt), false);

  const withoutPaidAt = cancelUpdateSql({ hasPaidAt: false });
  assert.equal(withoutPaidAt.includes("paid_at"), false);

  const script = read("server/scripts/cancelTestOrders.mjs");
  assert.equal(/delete\s+from/i.test(script), false);
  assert.equal(/\b(drop|truncate)\b/i.test(script), false);
  const protectedLines = script.split("\n").filter((line) => line.includes("8B5E6A"));
  assert.deepEqual(protectedLines, [DENYLIST_LINE]);
  assert.match(script, /\bassertAllowlisted\b\s*\(/);
  assert.match(script, /\bassertAllowlistExcludesDenylist\b\s*\(/);
  assert.deepEqual(
    [...script.matchAll(/\bupdate\s+public\.\w+/g)].map((match) => match[0]),
    ["update public.orders"],
  );
  assert.deepEqual(
    [...script.matchAll(/\binsert\s+into\s+public\.\w+/g)].map((match) => match[0]),
    ["insert into public.outbox_events"],
  );
  assert.match(script, /order\.status_changed/);
  assert.equal(script.includes("order_items"), false);
  assert.equal(script.includes("inventory"), false);
  const dryRun = script.indexOf('if (mode === "dry-run")');
  const begin = script.indexOf('client.query("begin")');
  assert.ok(dryRun > 0 && begin > dryRun, "dry-run returns before a transaction starts");
  assert.match(script, /\[ALLOWLIST, \[\.\.\.UNPAID_PAYMENT_STATUSES\]\]/);
});

test("the production workflow confirms apply before contact and refuses a destructive script", () => {
  const workflow = read(".github/workflows/production-cancel-test-orders.yml");
  assert.match(workflow, /name: Cancel unpaid test orders/);
  assert.match(workflow, /default: 'dry-run'/);
  assert.match(workflow, /CANCEL-TEST-ORDERS/);
  assert.match(workflow, /group: aws-production/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /secrets\.MIPO_AWS_SSH_PRIVATE_KEY/);
  assert.match(workflow, /backup-before-migrate\.sh/);
  assert.match(workflow, /docker compose -f "\$compose_file" run --rm --no-deps -T/);
  assert.match(workflow, /-v "\$\{scripts_dir\}:\/app\/scripts:ro"/);
  assert.match(workflow, /mipo-api node "scripts\/\$\{script_name\}" "--mode=\$\{MODE\}"/);
  assert.match(workflow, /delete\[\[:space:\]\]\+from/);
  assert.match(workflow, /\\b\(drop\|truncate\)\\b/);
  assert.match(workflow, /8B5E6A/);
  assert.match(workflow, /assertAllowlisted/);
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\.DATABASE_URL/);
  assert.doesNotMatch(workflow, /\$\{\{\s*vars\.DATABASE_URL/);

  const confirmAt = workflow.indexOf("Nothing was contacted. Production was not touched.");
  const checkoutAt = workflow.indexOf("actions/checkout@v4");
  const sshAt = workflow.indexOf("Configure SSH");
  const backupAt = workflow.indexOf("backup-before-migrate.sh");
  assert.ok(confirmAt > 0 && confirmAt < checkoutAt, "confirmation is checked before checkout");
  assert.ok(checkoutAt < sshAt, "the script is checked before SSH");
  assert.ok(workflow.indexOf('if [ "$MODE" != "dry-run" ]') < backupAt);
  assert.ok(backupAt < workflow.indexOf("node \"scripts/${script_name}\""));
});

test("server tests run in the existing quality workflow for aws-migration", () => {
  const quality = read(".github/workflows/e2e-tests.yml");
  assert.match(quality, /pull_request:/);
  assert.match(quality, /aws-migration/);
  assert.match(quality, /npm test --prefix server/);
  const serverPackage = JSON.parse(read("server/package.json"));
  assert.equal(serverPackage.scripts.test, "node --test");
});
