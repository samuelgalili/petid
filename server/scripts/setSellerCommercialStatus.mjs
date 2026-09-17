// Set a business's commercial status - the one thing nothing could do.
//
// 0049 added business_profiles.commercial_status with a default of 'none' and
// a CHECK constraint, and isSellerEligible() requires it to be 'approved'
// before anything may be published or sold. The publication gate, provisioning
// and checkout all read it.
//
// Nothing writes it. Every occurrence outside sellerEligibility.js is a read,
// except in db-smoke.mjs - the test harness. So the gate consults a column
// that no application code, no route, no admin screen and no script can set,
// and every Seller is permanently ineligible by construction. That is not a
// MIPO problem to solve with one UPDATE; it is a missing path, and a one-off
// UPDATE would fix today's business and leave the same wall for the next one.
//
// WHY A SCRIPT AND NOT A ROUTE. A route needs a permission, an admin screen to
// call it and a review flow to sit in, and none of those exist yet - the
// intake UI is unbuilt. This is the narrowest thing that closes the gap
// honestly: one business at a time, named explicitly, by an accountable human,
// audited. The route belongs with the admin UI and should replace this.
//
// WHAT IT REFUSES, and why each refusal is the point:
//
//   * no --business-id  - there is no "approve everything" mode. A blanket
//                         backfill is exactly what 0049 deliberately avoided,
//                         so that the unowned fallback profile holding all 375
//                         legacy products would not become a Seller by
//                         existing (F-1).
//   * not verified      - is_verified says a human confirmed the business is
//                         real. Approving an unconfirmed business to sell
//                         inverts the order those two checks exist in.
//   * unknown status    - the four values are the whole vocabulary.
//
//   DATABASE_URL=... node server/scripts/setSellerCommercialStatus.mjs \
//     --business-id=<uuid> --status=approved [--apply --admin-email=...]
//
// Dry run is the default and reports what the change would unblock.

import pg from "pg";
import { scriptPoolOptions } from "./scriptPoolSsl.mjs";

const { Pool } = pg;

const apply = process.argv.includes("--apply");
const arg = (name) => {
  const found = process.argv.find((value) => value.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : null;
};
const businessId = arg("business-id");
const status = arg("status");
const adminEmail = arg("admin-email");

/** The whole vocabulary. Mirrors COMMERCIAL_STATUSES in sellerEligibility.js. */
export const SETTABLE_STATUSES = Object.freeze(["none", "pending", "approved", "suspended"]);

const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Every reason this change may not be made, or an empty list.
 *
 * Pure and exported so the refusals are testable without a database and so the
 * dry run and the apply path cannot disagree about what is refused.
 */
export const statusChangeBlockers = (business, nextStatus) => {
  const blockers = [];
  if (!SETTABLE_STATUSES.includes(String(nextStatus ?? ""))) blockers.push("unknown_status");
  if (!business) {
    blockers.push("business_not_found");
    return blockers;
  }
  // Only approval requires verification. Suspending or revoking an
  // unverified business must stay possible - those make it LESS able to sell,
  // and a rule that blocked them would trap a business in a status somebody
  // needs to remove.
  if (nextStatus === "approved" && business.is_verified !== true) {
    blockers.push("not_verified");
  }
  if (business.commercial_status === nextStatus) blockers.push("already_set");
  return blockers;
};

let pool = null;

const main = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required");
    process.exit(2);
  }
  if (!businessId || !UUID.test(businessId)) {
    console.error(
      "--business-id=<uuid> is required, and names exactly one business.\n" +
      "There is deliberately no mode that changes more than one: a blanket\n" +
      "backfill is what 0049 avoided so the unowned profile holding the legacy\n" +
      "catalogue would not become a Seller by existing.",
    );
    process.exit(2);
  }
  if (!SETTABLE_STATUSES.includes(String(status ?? ""))) {
    console.error(`--status must be one of: ${SETTABLE_STATUSES.join(", ")}`);
    process.exit(2);
  }
  if (apply && !adminEmail) {
    console.error(
      "--apply requires --admin-email=<a real administrator>.\n" +
      "Letting a business sell is a commercial decision and the audit log\n" +
      "should say who made it.",
    );
    process.exit(2);
  }

  pool = new Pool(scriptPoolOptions());

  let actor = null;
  if (apply) {
    const { rows } = await pool.query(
      "select id, email, role, is_active from public.admin_users where lower(email) = lower($1)",
      [adminEmail],
    );
    if (rows.length === 0) {
      console.error(`no admin_user with email ${adminEmail}`);
      process.exit(2);
    }
    actor = rows[0];
    if (actor.is_active !== true) {
      console.error(`${actor.email} is not active`);
      process.exit(2);
    }
    // Deliberately 'admin' only, not product_manager. A product manager may
    // review a draft; deciding that a business may trade is a different kind
    // of decision.
    if (actor.role !== "admin") {
      console.error(
        `${actor.email} has role '${actor.role}'. Only 'admin' may change a commercial status:\n` +
        "reviewing a product and deciding a business may trade are different decisions.",
      );
      process.exit(2);
    }
  }

  const { rows: found } = await pool.query(
    `select id, business_name, business_type, is_verified, commercial_status
       from public.business_profiles where id = $1`,
    [businessId],
  );
  const business = found[0] ?? null;

  const blockers = statusChangeBlockers(business, status);
  if (blockers.length > 0) {
    console.error(`refused: ${blockers.join(", ")}`);
    if (business) {
      console.error(`  business      ${business.business_name}`);
      console.error(`  is_verified   ${business.is_verified}`);
      console.error(`  current       ${business.commercial_status}`);
    }
    await pool.end();
    process.exit(1);
  }

  // What the change actually does, counted rather than described. Approving a
  // business does not publish anything - the gate still wants a variant, a
  // priced offer, availability and an approved image - so the number below is
  // what becomes POSSIBLE, not what goes live.
  const { rows: impact } = await pool.query(
    `select
       (select count(*) from public.catalog_products p
         where p.owning_business_id = $1 and p.archived_at is null)::int as catalog_products,
       (select count(*) from public.catalog_products p
         where p.owning_business_id = $1 and p.publication_state = 'PUBLISHED')::int as published,
       (select count(*) from public.business_products b where b.business_id = $1)::int as legacy_products`,
    [businessId],
  );

  console.log(apply ? "APPLIED" : "DRY RUN - nothing was written (pass --apply --admin-email=... to write)");
  console.log(`  business        ${business.business_name}`);
  console.log(`  is_verified     ${business.is_verified}`);
  console.log(`  ${business.commercial_status}  ->  ${status}`);
  console.log(`  catalog products owned      ${impact[0].catalog_products}`);
  console.log(`  of those, published         ${impact[0].published}`);
  console.log(`  legacy products owned       ${impact[0].legacy_products}`);

  if (!apply) {
    await pool.end();
    process.exit(0);
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    // Re-read under a lock: the status may have changed since it was read, and
    // a commercial decision must not be made against a stale one.
    const { rows: locked } = await client.query(
      "select commercial_status, is_verified from public.business_profiles where id = $1 for update",
      [businessId],
    );
    const current = locked[0];
    const stillBlocked = statusChangeBlockers(
      { ...current, id: businessId }, status,
    );
    if (stillBlocked.length > 0) {
      await client.query("rollback");
      console.error(`refused after locking: ${stillBlocked.join(", ")}`);
      process.exit(1);
    }

    await client.query(
      "update public.business_profiles set commercial_status = $2 where id = $1",
      [businessId, status],
    );
    await client.query(
      `insert into public.admin_audit_log
         (actor_admin_user_id, action_type, entity_type, entity_id, old_values, new_values)
       values ($1, 'business.commercial_status_changed', 'business_profile', $2, $3::jsonb, $4::jsonb)`,
      [
        actor.id, businessId,
        JSON.stringify({ commercial_status: current.commercial_status }),
        JSON.stringify({ commercial_status: status, by: actor.email }),
      ],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    console.error(error.message);
    process.exit(1);
  } finally {
    client.release();
  }

  console.log(`\nDone, by ${actor.email}.`);
  if (status === "approved") {
    console.log(
      "This makes publication POSSIBLE, not done: the gate still requires an\n" +
      "active variant, a priced offer, availability and an approved image for\n" +
      "each product. Nothing was published by this change.",
    );
  }

  await pool.end();
  process.exit(0);
};

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop());
if (invokedDirectly) {
  main().catch(async (error) => {
    console.error(error);
    await pool?.end().catch(() => {});
    process.exit(1);
  });
}
