// G-6 · Legacy catalogue ownership review.
//
// Ownership on the rows already in the catalogue cannot be reconstructed: the
// create path assigns a fallback business_id without recording that it did so,
// which leaves a fallback row byte-identical to a deliberate one. No query
// recovers that. A person has to decide, one product at a time, and the
// decision has to be recorded somewhere that cannot be quietly rewritten.
//
// WHERE THE STATE LIVES, AND WHY THERE IS NO MIGRATION
//
// The review state is not a column. It is the most recent admin_audit_log row
// for the product under entity_type 'product_ownership_review'. A product with
// no such row is `unresolved` - which is the truthful default, and costs
// nothing to store.
//
// That gives three properties a status column would not:
//
//   1. The decision IS the audit record. There is exactly one INSERT, so a
//      decision without history, or history without a decision, is not a bug
//      that has to be prevented - it is unrepresentable.
//   2. admin_audit_log is append-only everywhere in this repository (no UPDATE
//      and no DELETE touches it), so a verified decision cannot be silently
//      changed. Correcting one means appending a new decision above it, and
//      the earlier one stays visible forever.
//   3. No schema change, so this ships while the migration is still blocked.
//
// WHAT THIS MODULE DELIBERATELY DOES NOT DO
//
// It never reads or writes business_products.business_id, supplier_id,
// source_url, order history, image origin or product content as evidence of
// ownership. It records what a named human decided, and nothing else. A
// verified decision is a statement about who owns the product; it does NOT
// reassign the product, and nothing here mutates the catalogue at all.

export const OWNERSHIP_ENTITY_TYPE = "product_ownership_review";

export const OWNERSHIP_STATES = Object.freeze({
  UNRESOLVED: "unresolved",
  IN_REVIEW: "ownership_review",
  VERIFIED_MIPO_SHOP: "verified_mipo_shop",
  VERIFIED_EXTERNAL_SELLER: "verified_external_seller",
  REJECTED: "rejected",
});

// Every product starts here, asserted rather than stored: "we do not know".
export const DEFAULT_OWNERSHIP_STATE = OWNERSHIP_STATES.UNRESOLVED;

// A verified state is never reachable directly from unresolved. Somebody has to
// open the review first, which is what puts a named reviewer on the record
// before any conclusion exists.
const ALLOWED_TRANSITIONS = Object.freeze({
  [OWNERSHIP_STATES.UNRESOLVED]: Object.freeze([OWNERSHIP_STATES.IN_REVIEW]),
  [OWNERSHIP_STATES.IN_REVIEW]: Object.freeze([
    OWNERSHIP_STATES.VERIFIED_MIPO_SHOP,
    OWNERSHIP_STATES.VERIFIED_EXTERNAL_SELLER,
    OWNERSHIP_STATES.REJECTED,
    OWNERSHIP_STATES.UNRESOLVED,
  ]),
  // A settled decision is corrected by reopening the review, never by being
  // overwritten in place. Reopening appends; the old decision survives.
  [OWNERSHIP_STATES.VERIFIED_MIPO_SHOP]: Object.freeze([OWNERSHIP_STATES.IN_REVIEW]),
  [OWNERSHIP_STATES.VERIFIED_EXTERNAL_SELLER]: Object.freeze([OWNERSHIP_STATES.IN_REVIEW]),
  [OWNERSHIP_STATES.REJECTED]: Object.freeze([OWNERSHIP_STATES.IN_REVIEW]),
});

export const SELLER_REQUIRED_STATES = Object.freeze([
  OWNERSHIP_STATES.VERIFIED_MIPO_SHOP,
  OWNERSHIP_STATES.VERIFIED_EXTERNAL_SELLER,
]);

export const isOwnershipState = (value) => Object.values(OWNERSHIP_STATES).includes(value);

export const allowedTransitionsFrom = (state) => [...(ALLOWED_TRANSITIONS[state] || [])];

export const isValidTransition = (from, to) => allowedTransitionsFrom(from).includes(to);

export class OwnershipReviewError extends Error {
  constructor(message, code, statusCode = 409) {
    super(message);
    this.name = "OwnershipReviewError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const conflict = (message) => new OwnershipReviewError(message, "OWNERSHIP_REVIEW_CONFLICT", 409);
export const badRequest = (message) => new OwnershipReviewError(message, "OWNERSHIP_REVIEW_INVALID", 400);

// ─── deriving the current state from history ─────────────────────────────────

/**
 * The newest decision wins. Rows are expected newest-first; a product with no
 * decision is unresolved.
 */
export const deriveOwnershipState = (rows = []) => {
  const latest = rows[0];
  const state = latest?.new_values?.state;
  return isOwnershipState(state) ? state : DEFAULT_OWNERSHIP_STATE;
};

/**
 * A compact history line per decision. Deliberately omits everything that is
 * not part of the decision itself - no product content, no URLs.
 */
export const toHistoryEntry = (row) => ({
  decided_at: row.created_at,
  actor_email: row.actor_email ?? null,
  actor_role: row.actor_role ?? null,
  from_state: row.old_values?.state ?? null,
  to_state: row.new_values?.state ?? null,
  seller_id: row.new_values?.seller_id ?? null,
  note: row.new_values?.note ?? null,
});

// ─── request validation ──────────────────────────────────────────────────────

const MAX_NOTE_LENGTH = 1000;
const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Turns a request body into a decision, or throws. Pure: no database, no clock,
 * no side effect - so the rules are testable on their own.
 */
export const parseOwnershipDecision = (body) => {
  const requestedState = String(body?.state ?? "").trim();
  if (!isOwnershipState(requestedState)) {
    throw badRequest("A valid ownership review state is required");
  }

  const note = String(body?.note ?? "").trim();
  if (!note) throw badRequest("A decision note is required");
  if (note.length > MAX_NOTE_LENGTH) throw badRequest("The decision note is too long");

  const sellerId = String(body?.seller_id ?? "").trim() || null;
  if (SELLER_REQUIRED_STATES.includes(requestedState)) {
    // Never inferred, never defaulted, never chosen for the reviewer - not even
    // for Mipo Shop, which has no column marking which profile it is.
    if (!sellerId) throw badRequest("An explicit seller_id is required to verify ownership");
    if (!UUID.test(sellerId)) throw badRequest("seller_id must be a valid id");
  } else if (sellerId) {
    throw badRequest("seller_id is only accepted when verifying ownership");
  }

  return { state: requestedState, note, sellerId };
};

// ─── the transaction ─────────────────────────────────────────────────────────

const LOCK_NAMESPACE = "ownership_review:";

/**
 * Records one ownership decision, atomically.
 *
 * Everything below happens inside the caller's transaction, after a
 * transaction-scoped advisory lock on the product, so two reviewers acting at
 * the same moment serialise instead of both deciding from the same stale state.
 *
 * The write is a single INSERT that is simultaneously the decision and its
 * audit record, so "decision persisted without audit" and "audit persisted
 * without decision" are both impossible by construction rather than by care.
 *
 * Nothing here updates business_products. The product is read, never written.
 */
export const recordOwnershipDecision = async (client, {
  productId,
  decision,
  actor,
  correlationId = null,
  sellerLookup,
  productLookup,
  historyLookup,
}) => {
  // Serialise concurrent reviewers of the same product. Transaction-scoped, so
  // it is released by commit or rollback with nothing to clean up.
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`${LOCK_NAMESPACE}${productId}`]);

  const product = await productLookup(client, productId);
  if (!product) throw new OwnershipReviewError("Product not found", "NOT_FOUND", 404);

  const history = await historyLookup(client, productId);
  const currentState = deriveOwnershipState(history);

  if (!isValidTransition(currentState, decision.state)) {
    throw conflict(
      `Ownership review cannot move from ${currentState} to ${decision.state}`,
    );
  }

  let seller = null;
  if (decision.sellerId) {
    seller = await sellerLookup(client, decision.sellerId);
    if (!seller) throw conflict("The named seller does not exist");
    // Eligibility, per the repository's only marker of a real seller.
    if (seller.is_verified !== true) throw conflict("The named seller is not a verified business profile");
  }

  const insert = await client.query(
    `
      insert into public.admin_audit_log (
        action_type, entity_type, entity_id,
        old_values, new_values, metadata,
        actor_admin_user_id, actor_email, actor_role,
        -- clock_timestamp(), not the now() default: now() is the TRANSACTION
        -- timestamp, so two decisions written in one transaction would carry
        -- an identical created_at and "the newest decision" would fall back to
        -- ordering by a random uuid. The current state has to be the one that
        -- was actually decided last.
        created_at
      )
      values ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8, $9, clock_timestamp())
      returning id, created_at
    `,
    [
      `product_ownership.${decision.state}`,
      OWNERSHIP_ENTITY_TYPE,
      productId,
      JSON.stringify({
        state: currentState,
        // The ownership the row carries today, recorded so a later reader can
        // see what the reviewer was looking at. Recording it is not endorsing
        // it: it is evidence of nothing, which is the whole problem.
        business_id_at_decision: product.business_id ?? null,
      }),
      JSON.stringify({
        state: decision.state,
        seller_id: decision.sellerId,
        note: decision.note,
      }),
      JSON.stringify({
        product_source: product.source,
        correlation_id: correlationId,
      }),
      actor.id === "api-key" ? null : actor.id,
      actor.email,
      actor.role,
    ],
  );

  return {
    product_id: productId,
    from_state: currentState,
    state: decision.state,
    seller_id: decision.sellerId,
    decided_at: insert.rows[0].created_at,
    decision_id: insert.rows[0].id,
  };
};
