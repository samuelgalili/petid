// Phase 7 · apply the auto-approval rule to the migrated legacy drafts.
//
// The rule itself lives in server/src/autoApproval.js and is shared with the
// C-29 measurement. This script is only the part that walks drafts through the
// state machine.
//
// WHO APPROVES. Not the script. raw_import_records and the drafts were created
// by the system actor, and mayApproveDraft() refuses an approval by the same
// actor that submitted - a reviewer approving their own submission is a review
// that did not happen. So the system actor submits, and a REAL administrator,
// named with --admin-email, approves. That is not a formality to satisfy a
// constraint: somebody is accountable for 187 products entering the catalogue,
// and the audit log should say who.
//
// Running this as two system actors to get around the guard would satisfy the
// code and defeat the rule, which is why it is not an option this script has.
//
// THE STATE MACHINE IS NOT SKIPPED. IMPORTED → DRAFT → IN_REVIEW → APPROVED,
// every edge a real one. There is no IMPORTED → APPROVED transition and this
// script does not invent one.
//
// WHAT APPROVAL DOES AND DOES NOT ACHIEVE. It creates an UNPUBLISHED
// catalog_product. It does NOT create a variant, a priced offer, inventory or
// an approved image, and the publication gate requires all four. So this
// clears the REVIEW queue; it does not fill the shop. Verified rather than
// assumed - see autoApproval.test.js, "a draft that passes the rule STILL
// cannot be published".
//
//   DATABASE_URL=... node server/scripts/autoApproveLegacyDrafts.mjs \
//     [--apply --admin-email=someone@mipo.pet] [--limit=N] [--ignore-review-flags]
//
// Dry run is the default and reports why each held-back draft was held back.

import pg from "pg";

import { autoApprovalBlockers, mayAutoApprove } from "../src/autoApproval.js";
import { DRAFT_STATES, isDraftTransitionAllowed, mayApproveDraft } from "../src/productIntakeState.js";

const { Pool } = pg;

const apply = process.argv.includes("--apply");
const ignoreReviewFlags = process.argv.includes("--ignore-review-flags");
const arg = (name) => {
  const found = process.argv.find((value) => value.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : null;
};
const limit = arg("limit") ? Math.max(1, Number(arg("limit")) || 0) : null;
const adminEmail = arg("admin-email");

const SOURCE_SYSTEM = "legacy_business_products";
const options = { honourReviewFlags: !ignoreReviewFlags };

let pool = null;

const main = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is required");
    process.exit(2);
  }
  if (apply && !adminEmail) {
    console.error(
      "--apply requires --admin-email=<a real administrator>.\n" +
      "The system actor submitted these drafts and may not approve them: a reviewer\n" +
      "approving their own submission is a review that did not happen. Name the person\n" +
      "who is accountable for these products entering the catalogue.",
    );
    process.exit(2);
  }

  pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DB_SSL === "false" ? false : undefined,
  });

  let approver = null;
  if (apply) {
    const { rows } = await pool.query(
      `select id, email, role, is_active from public.admin_users where lower(email) = lower($1)`,
      [adminEmail],
    );
    if (rows.length === 0) {
      console.error(`no admin_user with email ${adminEmail}`);
      process.exit(2);
    }
    approver = rows[0];
    if (approver.is_active !== true) {
      console.error(`${approver.email} is not active - an inactive account cannot be accountable for a review`);
      process.exit(2);
    }
    if (!["admin", "product_manager"].includes(approver.role)) {
      // DRAFT_REVIEW is held by admin and product_manager only. seller_admin
      // deliberately does not hold it.
      console.error(`${approver.email} has role '${approver.role}', which does not hold DRAFT_REVIEW`);
      process.exit(2);
    }
  }

  // The legacy row is the thing the rule judges: the draft carries the mapped
  // subset, but the review flags and the image live on business_products.
  const { rows: drafts } = await pool.query(
    `select d.id as draft_id, d.state, d.business_id, d.submitted_by,
            p.id as product_id, p.name, p.category_id, p.price, p.image_url,
            p.is_flagged, p.needs_price_review, p.needs_image_review
       from public.product_drafts d
       join public.raw_import_records r on r.id = d.raw_import_record_id
       join public.business_products p on p.id = r.source_record_id::uuid
      where r.source_system = $1
        and d.state = 'IMPORTED'
        and d.archived_at is null
      order by p.name
      ${limit ? `limit ${Number(limit)}` : ""}`,
    [SOURCE_SYSTEM],
  );

  const blockerCounts = new Map();
  const summary = { considered: drafts.length, approved: 0, heldBack: 0, failed: 0 };
  const failures = [];

  for (const draft of drafts) {
    const blockers = autoApprovalBlockers(draft, options);
    if (blockers.length > 0) {
      summary.heldBack += 1;
      for (const blocker of blockers) {
        blockerCounts.set(blocker, (blockerCounts.get(blocker) ?? 0) + 1);
      }
      continue;
    }

    if (!apply) {
      summary.approved += 1;
      continue;
    }

    const client = await pool.connect();
    try {
      await client.query("begin");
      // Re-read under a lock. The rule was evaluated outside the transaction,
      // and a draft somebody else moved in the meantime must not be approved
      // on the strength of a state that is no longer true.
      const { rows: locked } = await client.query(
        `select id, state, submitted_by from public.product_drafts where id = $1 for update`,
        [draft.draft_id],
      );
      if (locked.length === 0 || locked[0].state !== DRAFT_STATES.IMPORTED) {
        await client.query("rollback");
        summary.heldBack += 1;
        continue;
      }

      // IMPORTED → DRAFT
      if (!isDraftTransitionAllowed(DRAFT_STATES.IMPORTED, DRAFT_STATES.DRAFT)) {
        throw new Error("IMPORTED -> DRAFT is not an allowed transition");
      }
      await client.query(
        `update public.product_drafts set state = 'DRAFT', updated_at = now() where id = $1`,
        [draft.draft_id],
      );

      // DRAFT → IN_REVIEW, submitted by whoever created the draft (the system
      // actor). The submitter is recorded because the approval guard needs it.
      if (!isDraftTransitionAllowed(DRAFT_STATES.DRAFT, DRAFT_STATES.IN_REVIEW)) {
        throw new Error("DRAFT -> IN_REVIEW is not an allowed transition");
      }
      const { rows: submitted } = await client.query(
        `update public.product_drafts
            set state = 'IN_REVIEW',
                submitted_by = coalesce(submitted_by, created_by),
                submitted_at = coalesce(submitted_at, now()),
                updated_at = now()
          where id = $1
          returning submitted_by`,
        [draft.draft_id],
      );

      // IN_REVIEW → APPROVED, by the named human.
      if (!mayApproveDraft(approver.id, submitted[0].submitted_by)) {
        // Reached when the approver is also the submitter. Refused rather than
        // worked around.
        throw new Error(
          `${approver.email} submitted this draft and may not approve it`,
        );
      }
      const { rows: product } = await client.query(
        `insert into public.catalog_products
           (owning_business_id, origin_draft_id, name, description, brand,
            category_id, pet_type, attributes, created_by)
         select d.business_id, d.id, d.name, d.description, d.brand,
                d.category_id, d.pet_type, d.attributes, $2
           from public.product_drafts d where d.id = $1
         returning id`,
        [draft.draft_id, approver.id],
      );
      await client.query(
        `update public.product_drafts
            set state = 'APPROVED', approved_catalog_product_id = $2,
                reviewed_by = $3, reviewed_at = clock_timestamp(),
                updated_by = $3, updated_at = now()
          where id = $1`,
        [draft.draft_id, product[0].id, approver.id],
      );

      // The same audit row the route writes, so a bulk approval is not
      // invisible next to the ones done by hand.
      await client.query(
        `insert into public.admin_audit_log
           (actor_admin_user_id, action_type, entity_type, entity_id, old_values, new_values)
         values ($1, 'product_draft.approved', 'product_draft', $2, $3::jsonb, $4::jsonb)`,
        [
          approver.id, draft.draft_id,
          JSON.stringify({ state: "IMPORTED" }),
          JSON.stringify({
            state: "APPROVED",
            catalog_product_id: product[0].id,
            via: "auto_approval_rule",
            honour_review_flags: options.honourReviewFlags,
          }),
        ],
      );

      await client.query("commit");
      summary.approved += 1;
    } catch (error) {
      await client.query("rollback").catch(() => {});
      summary.failed += 1;
      failures.push({ id: draft.draft_id, name: draft.name, error: error.message });
    } finally {
      client.release();
    }
  }

  console.log(apply
    ? `APPLIED - approved by ${approver.email}`
    : "DRY RUN - nothing was written (pass --apply --admin-email=... to write)");
  if (!options.honourReviewFlags) {
    console.log("  !! needs_price_review / needs_image_review are being IGNORED (U-6)");
  }
  console.log(`  drafts considered        ${summary.considered}`);
  console.log(`  ${apply ? "approved" : "would approve"}${apply ? "                 " : "            "}${summary.approved}`);
  console.log(`  held back for a human    ${summary.heldBack}`);
  console.log(`  failed                   ${summary.failed}`);

  if (blockerCounts.size > 0) {
    console.log("\nwhy drafts were held back (a draft can fail several at once):");
    for (const [blocker, count] of [...blockerCounts].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(blocker).padEnd(24)} ${count}`);
    }
  }
  if (failures.length > 0) {
    console.log("\nfailures:");
    for (const failure of failures.slice(0, 20)) {
      console.log(`  ${failure.id}  ${failure.name}: ${failure.error}`);
    }
  }

  console.log(
    "\nApproved products are UNPUBLISHED and cannot be published yet: the gate\n" +
    "requires an active variant, a priced offer, availability and an approved\n" +
    "image, and approval creates none of them. This clears the review queue.",
  );

  await pool.end();
  process.exit(summary.failed > 0 ? 1 : 0);
};

const invokedDirectly = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop());
if (invokedDirectly) {
  main().catch(async (error) => {
    console.error(error);
    await pool?.end().catch(() => {});
    process.exit(1);
  });
}

export { mayAutoApprove };
