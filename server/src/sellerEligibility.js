// "May this business sell?" - asked in exactly one place.
//
// Before commercial_status existed, four different parts of the system had to
// answer this and each answered it slightly differently against is_verified
// alone: provisioning, the publication gate, checkout, and the D-18
// prerequisites. Four spellings of one rule is how the rule quietly becomes
// four rules, and how one of them ends up more permissive than the others.
//
// So the rule is defined once, as both a predicate over a row and a SQL
// fragment, and everything else calls in here.
//
//     is_verified IS TRUE AND commercial_status = 'approved'
//
// Both halves are required and they say different things. is_verified says a
// human confirmed the business exists. commercial_status says it is authorised
// to sell. A business can be real and not allowed to sell; it cannot be allowed
// to sell without being real.
//
// business_type is NOT part of this and never will be. 'shop' is a category
// somebody picked from a dropdown - a verified vet and a verified shop are
// structurally identical rows - and treating it as a commercial status is the
// exact mistake this column was added to end.

export const COMMERCIAL_STATUSES = Object.freeze({
  /** Never approved. The default for every row that predates this column. */
  NONE: "none",
  /** May prepare data - drafts, variants, images - but may not publish or sell. */
  PENDING: "pending",
  APPROVED: "approved",
  /** Approval withdrawn. Distinct from NONE so the two stay distinguishable. */
  SUSPENDED: "suspended",
});

const ALL_STATUSES = Object.freeze(Object.values(COMMERCIAL_STATUSES));

export const isKnownCommercialStatus = (status) => ALL_STATUSES.includes(String(status ?? ""));

/**
 * The one predicate. `business` is a row carrying is_verified and
 * commercial_status.
 *
 * is_verified is nullable and therefore three-valued, so it is compared to
 * `true` rather than tested for truthiness: `!business.is_verified` would read
 * NULL as unverified correctly, but `business.is_verified ? …` in some other
 * file would not, and this is the file that stops that happening.
 *
 * An unknown or missing status is not eligible. Fail-closed.
 */
export const isSellerEligible = (business) => {
  if (!business) return false;
  if (business.is_verified !== true) return false;
  return business.commercial_status === COMMERCIAL_STATUSES.APPROVED;
};

/**
 * Whether a business may prepare catalogue data without being able to sell it.
 *
 * `pending` exists for exactly this: a business being onboarded can build its
 * drafts, variants and images while remaining unable to publish. Approved
 * businesses can obviously prepare data too.
 */
export const mayPrepareCatalogueData = (business) => {
  if (!business) return false;
  if (business.is_verified !== true) return false;
  return business.commercial_status === COMMERCIAL_STATUSES.PENDING
    || business.commercial_status === COMMERCIAL_STATUSES.APPROVED;
};

/**
 * Why a business is not eligible, as a stable code for a gate or an error.
 * Returns null when it is eligible.
 */
export const sellerIneligibilityReason = (business) => {
  if (!business) return "business_not_found";
  if (business.is_verified !== true) return "seller_not_verified";
  if (!isKnownCommercialStatus(business.commercial_status)) return "commercial_status_unknown";
  if (business.commercial_status !== COMMERCIAL_STATUSES.APPROVED) {
    return `seller_${business.commercial_status}`;
  }
  return null;
};

/**
 * The same rule as SQL, for queries that have to filter rather than inspect.
 *
 * Exported as a fragment rather than copied into call sites, so a change here
 * reaches the queries too. `alias` is the table alias in the caller's query.
 */
export const sellerEligibleSql = (alias = "b") =>
  `${alias}.is_verified is true and ${alias}.commercial_status = 'approved'`;

/**
 * Throws with a message naming the actual reason. Used by provisioning, where
 * the caller is an operator who needs to know which half failed.
 */
export const assertSellerEligible = (business, businessId) => {
  const reason = sellerIneligibilityReason(business);
  if (!reason) return business;

  const messages = {
    business_not_found: `No business_profile with id ${businessId}. This never creates one.`,
    seller_not_verified:
      `business_profile ${businessId} is not verified (is_verified is not TRUE).`,
    seller_none:
      `business_profile ${businessId} has commercial_status 'none': it has never been approved to sell.`,
    seller_pending:
      `business_profile ${businessId} has commercial_status 'pending': it may prepare data but not sell.`,
    seller_suspended:
      `business_profile ${businessId} has commercial_status 'suspended': its approval was withdrawn.`,
    commercial_status_unknown:
      `business_profile ${businessId} has an unrecognised commercial_status.`,
  };

  throw new Error(messages[reason] ?? `business_profile ${businessId} may not sell (${reason}).`);
};
