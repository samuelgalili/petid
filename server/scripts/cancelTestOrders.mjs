// Cancel seven unpaid test orders. Status becomes cancelled. Rows stay.
//
// Dry-run is the default and writes nothing. apply updates only the orders
// on the allowlist below, and only when they are still unpaid at the moment
// of the write. The denylist is checked before any connection is opened.
// The one order on that denylist must never be cancelled here.
//
//   DATABASE_URL=... node server/scripts/cancelTestOrders.mjs --mode=dry-run
//   DATABASE_URL=... node server/scripts/cancelTestOrders.mjs --mode=apply
//
// What "unpaid" means in this database, read from the schema and from
// PATCH /api/admin/orders/:id (updateOrder in server/src/index.js):
//
//   orders.status is constrained to pending, processing, shipped, delivered,
//   cancelled. The unpaid initial status is pending.
//   orders.payment_status is unconstrained text. The application writes
//   pending (the default), creating, paid, failed, awaiting_cod, refunded,
//   libra_credit, and, outside production, dev_approved.
//   This script treats only pending and failed as unpaid. creating is an
//   open checkout and is left alone. paid, awaiting_cod, refunded,
//   libra_credit and dev_approved are left alone.
//   There is no paid_at column in the migrations. The script looks for one
//   at runtime and, when the column exists, requires it to be null.
//   An approved Cardcom charge is the same test the webhook uses: is_success
//   is true, or operation_response and deal_response are both 0. A
//   create_payment row is the payment page being created, not a charge, and
//   does not count. verified_indicator, rejected_indicator, and rows with no
//   stage still do.
//   payment_attested_at / payment_attested_by (0059) record money an admin
//   says arrived without a gateway. Those orders are not unpaid.
//
// What apply writes, and only that, because it is what updateOrder writes
// when an admin sets status to cancelled:
//
//   public.orders.status = 'cancelled' and updated_at = now().
//   payment_status is not changed.
//   One public.outbox_events row, event_type order.status_changed, origin
//   admin, the same payload shape as updateOrder. That is the audit trail.
//   There is no status-history table. Cancelling does not put stock back,
//   and this script does not either. Order lines are not modified.
//
// The UPDATE's own WHERE repeats the allowlist and the eligibility rules,
// so a payment that lands after the read is not cancelled. Apply is one
// transaction: if any eligible order is not updated, the transaction is
// rolled back and the process exits non-zero.
//
// In a dry-run, the summary's "cancelled" count is how many orders the rules
// would cancel. Nothing is written. Each decision line includes
// cardcom_detail: stage, operation response, deal response, and is_success
// for every event on that order. No payload and no customer data. Customer
// emails are masked in every log line. The connection string is never printed.

import path from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { scriptPoolOptions } from "./scriptPoolSsl.mjs";

const { Pool } = pg;

export const ALLOWLIST = Object.freeze([
  "MIPO-20260927-2A4A48",
  "MIPO-20260927-503E89",
  "MIPO-20260927-8E965A",
  "MIPO-20260927-BE8D07",
  "MIPO-20260927-A5B5C2",
  "MIPO-20260927-3A7423",
  "MIPO-20260927-C8061F",
]);

export const DENYLIST = Object.freeze(["MIPO-20260818-8B5E6A"]);

export const ELIGIBLE_ORDER_STATUS = "pending";
export const CANCELLED_STATUS = "cancelled";

// pending: checkout never collected money. failed: Cardcom declined.
// Anything else has either taken money or still has a checkout in flight.
export const UNPAID_PAYMENT_STATUSES = Object.freeze(["pending", "failed"]);

const orderNumbersIn = (value) => String(value).toUpperCase().match(/MIPO-\d{8}-[0-9A-F]{6}/g) || [];

// create_payment is written by createShopPayment when a Low Profile page is
// created. That row is hard-coded is_success=true and operation_response=0,
// with no deal_response: the page exists, money has not moved. It must not
// count as an approved charge. verified_indicator, rejected_indicator, and
// rows with no stage still match the success test below and still block.
// APPROVED_CARDCOM_SQL is built from this list, and the UPDATE uses that
// same constant.
export const NON_CHARGE_STAGES = Object.freeze(["create_payment"]);

const nonChargeStagesSql = NON_CHARGE_STAGES.map((stage) => `'${stage}'`).join(", ");
export const APPROVED_CARDCOM_SQL = `(
    (e.is_success is true or (e.operation_response = 0 and e.deal_response = 0))
    and coalesce(e.payload_json->>'stage', '') <> all (array[${nonChargeStagesSql}])
  )`;

const REQUIRED_ORDER_COLUMNS = Object.freeze([
  "id",
  "order_number",
  "status",
  "payment_status",
  "total",
  "created_at",
  "updated_at",
  "customer_email",
  "user_id",
  "customer_id",
  "payment_attested_at",
  "payment_attested_by",
]);

const REQUIRED_CARDCOM_COLUMNS = Object.freeze([
  "order_id",
  "is_success",
  "operation_response",
  "deal_response",
]);

export const assertAllowlistExcludesDenylist = (allowlist = ALLOWLIST, denylist = DENYLIST) => {
  const denied = new Set(denylist);
  const overlap = [...allowlist].filter((orderNumber) => denied.has(orderNumber));
  if (overlap.length > 0) {
    const error = new Error(`refusing to run: allowlist contains a denylisted order: ${overlap.join(", ")}`);
    error.code = "DENYLIST";
    throw error;
  }
};

export const assertAllowlisted = (orderNumber) => {
  const key = String(orderNumber || "").trim().toUpperCase();
  if (DENYLIST.includes(key)) {
    const error = new Error(`refusing denylisted order: ${key}`);
    error.code = "DENYLIST";
    throw error;
  }
  if (!ALLOWLIST.includes(key)) {
    const error = new Error(`refusing order that is not on the allowlist: ${key}`);
    error.code = "NOT_ALLOWLISTED";
    throw error;
  }
  return key;
};

assertAllowlistExcludesDenylist();
for (const orderNumber of ALLOWLIST) assertAllowlisted(orderNumber);

export const unexpectedOrderNumbers = (argv) => {
  const found = [];
  for (const arg of argv) {
    const matches = orderNumbersIn(arg);
    for (const orderNumber of matches) {
      if (!ALLOWLIST.includes(orderNumber)) found.push(orderNumber);
    }
  }
  return found;
};

export const assertArgvAllowed = (argv) => {
  assertAllowlistExcludesDenylist();
  const stray = unexpectedOrderNumbers(argv);
  const denied = stray.filter((orderNumber) => DENYLIST.includes(orderNumber));
  if (denied.length > 0) {
    const error = new Error(`refusing denylisted order: ${denied.join(", ")}`);
    error.code = "DENYLIST";
    throw error;
  }
  if (stray.length > 0) {
    const error = new Error(`refusing order that is not on the allowlist: ${stray.join(", ")}`);
    error.code = "NOT_ALLOWLISTED";
    throw error;
  }
  for (const orderNumber of ALLOWLIST) assertAllowlisted(orderNumber);
};

export const parseMode = (argv) => {
  const found = argv.find((value) => String(value).startsWith("--mode="));
  if (!found) return "dry-run";
  const mode = String(found).slice("--mode=".length);
  if (!["dry-run", "apply"].includes(mode)) {
    const error = new Error("mode must be dry-run or apply");
    error.code = "BAD_MODE";
    throw error;
  }
  return mode;
};

export const maskEmail = (email) => {
  const value = String(email ?? "").trim();
  if (!value) return "(none)";
  const at = value.indexOf("@");
  if (at <= 0 || at === value.length - 1 || /\s/.test(value)) return "***";
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  if (!domain.includes(".")) return "***";
  return `${local.slice(0, 1)}***@${domain}`;
};

export const redactSecrets = (message) => String(message ?? "")
  .replace(/postgres(?:ql)?:\/\/\S+/gi, "postgres://***")
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (match) => maskEmail(match));

export const cardcomEventLooksApproved = (event) => {
  if (!event || typeof event !== "object") return false;
  if (NON_CHARGE_STAGES.includes(event.payload_json?.stage)) return false;
  if (event.is_success === true) return true;
  return event.operation_response === 0 && event.deal_response === 0;
};

/**
 * CANCEL, SKIP:<reason>, or NOT-FOUND.
 * Pure: the read path and the UPDATE's WHERE encode the same rules.
 */
export const decideCancellation = (row) => {
  if (!row || row.found === false) return "NOT-FOUND";
  if (row.status !== ELIGIBLE_ORDER_STATUS) return `SKIP:status=${row.status}`;
  if (!UNPAID_PAYMENT_STATUSES.includes(row.payment_status)) {
    return `SKIP:payment_status=${row.payment_status}`;
  }
  if (row.paid_at != null) return "SKIP:paid_at";
  if (row.payment_attested_at != null || row.payment_attested_by != null) {
    return "SKIP:payment-attested";
  }
  if (row.cardcom_approved === true) return "SKIP:approved-cardcom";
  return "CANCEL";
};

export const tallyDecisions = (decisions) => {
  let cancelled = 0;
  let skipped = 0;
  let notFound = 0;
  for (const decision of decisions) {
    if (decision === "CANCEL") cancelled += 1;
    else if (decision === "NOT-FOUND") notFound += 1;
    else if (String(decision).startsWith("SKIP:")) skipped += 1;
    else {
      const error = new Error(`unknown decision: ${decision}`);
      error.code = "BAD_DECISION";
      throw error;
    }
  }
  return { cancelled, skipped, notFound };
};

export const formatSummary = ({ cancelled, skipped, notFound }) => (
  `cancelled ${cancelled}, skipped ${skipped}, not found ${notFound}`
);

export const formatTimestamp = (value) => {
  if (value == null || value === "") return "absent";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "absent";
    return value.toISOString();
  }
  return String(value);
};

export const formatDecisionLine = (report) => {
  const email = report.email ?? "";
  const masked = maskEmail(email);
  const approved = report.cardcom_approved == null
    ? "absent"
    : report.cardcom_approved ? "yes" : "no";
  const line = [
    report.orderNumber,
    `status=${report.status ?? "absent"}`,
    `payment_status=${report.payment_status ?? "absent"}`,
    `total=${report.total == null || report.total === "" ? "absent" : String(report.total)}`,
    `created_at=${formatTimestamp(report.created_at)}`,
    `email=${masked}`,
    `paid_at=${report.paid_at_label ?? "absent"}`,
    `cardcom_events=${report.cardcom_event_count ?? "absent"}`,
    `cardcom_approved=${approved}`,
    `cardcom_detail=[${report.cardcom_detail ?? ""}]`,
    `decision=${report.decision}`,
  ].join(" ");
  const raw = String(email).trim();
  if (raw && raw !== masked && line.includes(raw)) {
    throw new Error("refusing to log a customer email");
  }
  return line;
};

export const formatStateLine = (report) => formatDecisionLine(report).replace(/ decision=\S+$/, "");

const paidAtLabelFor = (row, hasPaidAt) => {
  if (!row) return "absent";
  if (!hasPaidAt) return "column-absent";
  if (row.paid_at == null) return "null";
  return formatTimestamp(row.paid_at);
};

export const reportsFor = (rows, { hasPaidAt }) => {
  const byNumber = new Map(rows.map((row) => [row.order_number, row]));
  return ALLOWLIST.map((orderNumber) => {
    const row = byNumber.get(orderNumber) || null;
    if (!row) {
      return {
        orderNumber,
        status: null,
        payment_status: null,
        total: null,
        created_at: null,
        email: "",
        paid_at_label: "absent",
        cardcom_event_count: null,
        cardcom_approved: null,
        cardcom_detail: "",
        decision: decideCancellation({ found: false }),
      };
    }
    const view = {
      found: true,
      status: row.status,
      payment_status: row.payment_status,
      paid_at: hasPaidAt ? row.paid_at : null,
      payment_attested_at: row.payment_attested_at,
      payment_attested_by: row.payment_attested_by,
      cardcom_approved: row.cardcom_approved === true,
    };
    return {
      orderNumber,
      status: row.status,
      payment_status: row.payment_status,
      total: row.total,
      created_at: row.created_at,
      email: row.customer_email,
      paid_at_label: paidAtLabelFor(row, hasPaidAt),
      cardcom_event_count: row.cardcom_event_count,
      cardcom_approved: row.cardcom_approved === true,
      cardcom_detail: row.cardcom_detail ?? "",
      decision: decideCancellation(view),
    };
  });
};

export const cancelUpdateSql = ({ hasPaidAt }) => `
  update public.orders
     set status = 'cancelled',
         updated_at = now()
   where order_number = any($1::text[])
     and status = 'pending'
     and payment_status = any($2::text[])
     and payment_attested_at is null
     and payment_attested_by is null
     and not exists (
       select 1
         from public.cardcom_events e
        where e.order_id = orders.id
          and ${APPROVED_CARDCOM_SQL}
     )
     ${hasPaidAt ? "and paid_at is null" : ""}
   returning id, order_number, status, payment_status, total,
             user_id, customer_id, customer_email
`;

const orderSelectSql = ({ hasPaidAt, lock }) => `
  select o.id,
         o.order_number,
         o.status,
         o.payment_status,
         o.total,
         o.created_at,
         o.customer_email,
         o.user_id,
         o.customer_id,
         o.payment_attested_at,
         o.payment_attested_by,
         ${hasPaidAt ? "o.paid_at" : "null::timestamptz as paid_at"}
    from public.orders o
   where o.order_number = any($1::text[])
   ${lock ? "for update" : ""}
`;

const cardcomByOrderSql = `
  select e.order_id,
         count(*)::int as cardcom_event_count,
         coalesce(bool_or(${APPROVED_CARDCOM_SQL}), false) as cardcom_approved,
         string_agg(
           coalesce(e.payload_json->>'stage', 'no-stage')
             || ':op=' || coalesce(e.operation_response::text, '-')
             || ',deal=' || coalesce(e.deal_response::text, '-')
             || ',ok=' || coalesce(e.is_success::text, '-'),
           ' ; ' order by e.received_at
         ) as cardcom_detail
    from public.cardcom_events e
   where e.order_id = any($1::uuid[])
   group by e.order_id
`;

const loadOrders = async (db, { hasPaidAt, lock }) => {
  const orders = await db.query(orderSelectSql({ hasPaidAt, lock }), [ALLOWLIST]);
  const ids = orders.rows.map((row) => row.id);
  const events = ids.length === 0
    ? { rows: [] }
    : await db.query(cardcomByOrderSql, [ids]);
  const eventById = new Map(events.rows.map((row) => [row.order_id, row]));
  return orders.rows.map((row) => {
    const event = eventById.get(row.id);
    return {
      ...row,
      cardcom_event_count: event ? Number(event.cardcom_event_count) : 0,
      cardcom_approved: event ? event.cardcom_approved === true : false,
      cardcom_detail: event ? String(event.cardcom_detail ?? "") : "",
    };
  });
};

const probeSchema = async (pool) => {
  const tables = await pool.query(
    `select to_regclass('public.orders') as orders,
            to_regclass('public.cardcom_events') as cardcom_events,
            to_regclass('public.outbox_events') as outbox_events`,
  );
  const present = tables.rows[0] || {};
  if (!present.orders || !present.cardcom_events || !present.outbox_events) {
    const error = new Error("orders, cardcom_events, or outbox_events is missing");
    error.code = "SCHEMA";
    throw error;
  }

  const orderColumns = await pool.query(
    `select column_name
       from information_schema.columns
      where table_schema = 'public'
        and table_name = 'orders'
        and column_name = any($1::text[])`,
    [[...REQUIRED_ORDER_COLUMNS, "paid_at"]],
  );
  const names = new Set(orderColumns.rows.map((row) => row.column_name));
  const missing = REQUIRED_ORDER_COLUMNS.filter((name) => !names.has(name));
  if (missing.length > 0) {
    const error = new Error(`orders is missing columns: ${missing.join(", ")}`);
    error.code = "SCHEMA";
    throw error;
  }

  const cardcomColumns = await pool.query(
    `select column_name
       from information_schema.columns
      where table_schema = 'public'
        and table_name = 'cardcom_events'
        and column_name = any($1::text[])`,
    [[...REQUIRED_CARDCOM_COLUMNS]],
  );
  const cardcomNames = new Set(cardcomColumns.rows.map((row) => row.column_name));
  const missingCardcom = REQUIRED_CARDCOM_COLUMNS.filter((name) => !cardcomNames.has(name));
  if (missingCardcom.length > 0) {
    const error = new Error(`cardcom_events is missing columns: ${missingCardcom.join(", ")}`);
    error.code = "SCHEMA";
    throw error;
  }

  return { hasPaidAt: names.has("paid_at") };
};

const insertCancellationEvent = async (client, row) => {
  assertAllowlisted(row.order_number);
  const payload = {
    order_number: row.order_number,
    user_id: row.user_id,
    customer_id: row.customer_id,
    customer_email: row.customer_email,
    total: Number(row.total),
    status: { from: ELIGIBLE_ORDER_STATUS, to: CANCELLED_STATUS },
    payment_status: { from: row.payment_status, to: row.payment_status },
  };
  await client.query(
    `insert into public.outbox_events (
       event_type, entity_type, entity_id, payload, origin, pet_id, payload_version
     )
     values ('order.status_changed', 'order', $1, $2::jsonb, 'admin', null, 1)`,
    [row.id, JSON.stringify(payload)],
  );
};

const logReports = (log, reports) => {
  for (const report of reports) log(formatDecisionLine(report));
};

export const runCancelTestOrders = async ({ pool, mode, argv = [], log = console.log }) => {
  if (!["dry-run", "apply"].includes(mode)) {
    const error = new Error("mode must be dry-run or apply");
    error.code = "BAD_MODE";
    throw error;
  }
  assertArgvAllowed(argv);

  const { hasPaidAt } = await probeSchema(pool);
  log(`schema: orders.paid_at is ${hasPaidAt ? "present" : "not a column"}`);

  const rows = await loadOrders(pool, { hasPaidAt, lock: false });
  const reports = reportsFor(rows, { hasPaidAt });
  logReports(log, reports);
  const tally = tallyDecisions(reports.map((report) => report.decision));

  if (mode === "dry-run") {
    log(formatSummary(tally));
    log("dry-run: nothing was written");
    return { wrote: false, reports, tally };
  }

  const client = await pool.connect();
  let updatedNumbers = [];
  let lockedReports = reports;
  try {
    await client.query("begin");
    const lockedRows = await loadOrders(client, { hasPaidAt, lock: true });
    lockedReports = reportsFor(lockedRows, { hasPaidAt });
    for (const report of lockedReports) {
      const earlier = reports.find((item) => item.orderNumber === report.orderNumber);
      if (earlier && earlier.decision !== report.decision) {
        log(`recheck ${formatDecisionLine(report)}`);
      }
    }
    const eligible = lockedReports
      .filter((report) => report.decision === "CANCEL")
      .map((report) => report.orderNumber);
    for (const orderNumber of eligible) assertAllowlisted(orderNumber);

    if (eligible.length === 0) {
      await client.query("rollback");
      const none = tallyDecisions(lockedReports.map((report) => report.decision));
      log(formatSummary(none));
      log("apply: no eligible order. Nothing was written.");
      return { wrote: false, reports: lockedReports, tally: none };
    }

    const updated = await client.query(
      cancelUpdateSql({ hasPaidAt }),
      [ALLOWLIST, [...UNPAID_PAYMENT_STATUSES]],
    );
    updatedNumbers = updated.rows.map((row) => assertAllowlisted(row.order_number));
    const missing = eligible.filter((orderNumber) => !updatedNumbers.includes(orderNumber));
    const extra = updatedNumbers.filter((orderNumber) => !eligible.includes(orderNumber));
    if (missing.length > 0 || extra.length > 0 || updatedNumbers.length !== eligible.length) {
      await client.query("rollback");
      const which = (missing.length > 0 ? missing : extra).join(", ");
      const error = new Error(`eligible order was not cancelled: ${which}. The transaction was rolled back. Nothing was written.`);
      error.code = "ELIGIBLE_NOT_CANCELLED";
      throw error;
    }
    for (const row of updated.rows) {
      await insertCancellationEvent(client, row);
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  const finalRows = await loadOrders(pool, { hasPaidAt, lock: false });
  const finalReports = reportsFor(finalRows, { hasPaidAt });
  for (const report of finalReports) log(`final ${formatStateLine(report)}`);
  for (const orderNumber of updatedNumbers) {
    const row = finalRows.find((item) => item.order_number === orderNumber);
    if (!row || row.status !== CANCELLED_STATUS) {
      const error = new Error(`eligible order was not cancelled: ${orderNumber}`);
      error.code = "ELIGIBLE_NOT_CANCELLED";
      throw error;
    }
  }

  const applied = tallyDecisions(lockedReports.map((report) => report.decision));
  log(formatSummary(applied));
  log(`apply: updated ${updatedNumbers.length}`);
  return { wrote: true, reports: lockedReports, tally: applied, updated: updatedNumbers.length };
};

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  const main = async () => {
    let mode;
    try {
      mode = parseMode(process.argv.slice(2));
      assertArgvAllowed(process.argv.slice(2));
    } catch (error) {
      console.error(redactSecrets(error.message));
      console.error("Nothing was written.");
      process.exit(2);
    }
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL is required");
      process.exit(2);
    }
    const pool = new Pool(scriptPoolOptions());
    try {
      await runCancelTestOrders({ pool, mode, argv: process.argv.slice(2) });
    } catch (error) {
      console.error(redactSecrets(error.message));
      const usage = error.code === "BAD_MODE" || error.code === "DENYLIST" || error.code === "NOT_ALLOWLISTED";
      process.exit(usage ? 2 : 1);
    } finally {
      await pool.end();
    }
  };
  main();
}
