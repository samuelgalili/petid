// Seller isolation: the decisions, in one place.
//
// Two different questions, and they get different answers on purpose:
//
//   PUBLIC endpoints   how much of a row may this caller see?
//                      -> "full" or "public". Never a 404: a product every
//                         anonymous visitor can see does not stop existing
//                         because the viewer is logged in as another Seller.
//
//   ADMIN endpoints    may this caller touch this row at all?
//                      -> yes, or 404. Not 403: a 403 confirms the row exists,
//                         which tells one Seller that another Seller has an
//                         object with that id. The absence of the object and
//                         the absence of permission must be indistinguishable.
//
// Both answers come from the session identity. Neither ever reads a business_id
// out of a request body: a body says what to write, never who is asking.

import { canActOnBusiness, isPlatformScopedRole, isSellerScopedRole } from "./adminPermissions.js";

/**
 * The Seller a request is confined to, or null for a platform role.
 *
 * Returns null for a platform identity - meaning "not confined" - and the
 * Seller id for a Seller-scoped one. A Seller-scoped identity with no
 * business_id returns the symbol NO_ACCESS rather than null, because null here
 * means unrestricted and that is the one thing such a session must not be.
 */
export const NO_ACCESS = Symbol("no-access");

export const sessionSellerScope = (admin) => {
  if (!admin) return NO_ACCESS;
  // Explicitly platform. An unknown role gets NO_ACCESS, not null: null means
  // "no filter" to every caller of this function, so a negation here would let
  // an unrecognised role list every Seller's rows.
  if (isPlatformScopedRole(admin.role)) return null;
  if (!isSellerScopedRole(admin.role)) return NO_ACCESS;
  return admin.business_id ? String(admin.business_id) : NO_ACCESS;
};

/**
 * How much of a catalogue row a caller on a PUBLIC endpoint may see.
 *
 * "full"   the internal row, including cost_price, commission_rate, supplier_id
 * "public" the allowlisted shape, identical to what an anonymous caller gets
 *
 * This replaces a boolean. The boolean was the bug: `asAdmin ? fullRow :
 * publicRow` revealed every internal field to ANY valid admin session, with no
 * role or scope test at all. It was not exploitable while every admin was
 * platform-wide - which is precisely why nobody noticed - and M1b is what makes
 * it reachable.
 */
export const adminProductView = (admin, product) => {
  if (!admin) return "public";
  // Explicitly platform, not merely "not Seller-scoped". An unknown role is
  // neither, and reading "not seller" as "platform" would hand the full row to
  // any role somebody adds without updating this file - fail-open, from a
  // negation. A test asserts it.
  if (isPlatformScopedRole(admin.role)) return "full";
  return canActOnBusiness(admin.role, admin.business_id, product?.business_id) ? "full" : "public";
};

/**
 * Whether an admin identity may act on a row owned by `ownerBusinessId`.
 *
 * Used by admin routes after the row has been read inside the transaction. A
 * false answer becomes a 404, never a 403.
 */
export const mayActOnRow = (admin, ownerBusinessId) => {
  if (!admin) return false;
  return canActOnBusiness(admin.role, admin.business_id ?? null, ownerBusinessId ?? null);
};

/**
 * The business_id a write must use, given the session and whatever the caller
 * sent.
 *
 * For a Seller-scoped session the answer is always the session's own Seller,
 * and a body that names a different one is REJECTED rather than overridden -
 * silently substituting would hide an attempt to write into another Seller's
 * catalogue, and that attempt is worth seeing in an audit log.
 *
 * For a platform session the body must name the Seller explicitly, because
 * there is no sensible default. There is deliberately no fallback to
 * DEFAULT_BUSINESS_ID: that fallback is why legacy ownership is
 * unreconstructible.
 */
export const resolveWriteBusinessId = (admin, bodyBusinessId) => {
  const requested = bodyBusinessId === undefined || bodyBusinessId === null
    ? null
    : String(bodyBusinessId).trim() || null;

  const scope = sessionSellerScope(admin);
  if (scope === NO_ACCESS) {
    return { ok: false, status: 403, error: "This identity has no Seller scope" };
  }

  // Seller-scoped: the session decides, full stop.
  if (scope !== null) {
    if (requested && requested !== scope) {
      return {
        ok: false,
        status: 404,
        error: "Not found",
        attemptedCrossSeller: true,
      };
    }
    return { ok: true, businessId: scope };
  }

  // Platform-scoped: must be told, never guessed.
  if (!requested) {
    return {
      ok: false,
      status: 400,
      error: "business_id is required: a platform admin must name the Seller this belongs to",
    };
  }
  return { ok: true, businessId: requested };
};
