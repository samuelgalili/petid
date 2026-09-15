// "May this legacy draft be approved without a human reading it?"
//
// 375 drafts reviewed one at a time is days of work. This rule lets a draft
// through when the data is complete and nobody ever flagged it, and sends
// everything else to a person. C-22 measured it against production after 0051
// filed the catalogue: 187 of 375 pass, so the manual queue halves.
//
// WHAT THIS RULE IS NOT. It is not a safety boundary. A draft approved in
// error still cannot reach a customer, because approval creates an UNPUBLISHED
// catalog_product and the publication gate independently requires an active
// variant, a priced offer, availability, an approved image, the category's
// required attributes and an eligible Seller. That claim is load-bearing
// enough to be worth having checked rather than repeated: it is verified in
// autoApproval.test.js against the real gate, not asserted here.
//
// So the cost of a false positive is a product that sits unpublished until
// somebody finishes it. The cost of a false negative is a human minute. The
// rule is therefore written to be strict, and every unknown fails closed.
//
// Defined once, as a predicate over a row AND as a SQL fragment, for the same
// reason sellerEligibility.js is: this rule will be asked in a script, in a
// route and in a count, and three spellings of one rule is how one of them
// ends up more permissive than the others.

/**
 * The review flags. Set at some point in the past by somebody, with nothing in
 * the schema recording when or why - see U-6. 134 drafts carry
 * needs_price_review and 98 carry needs_image_review.
 *
 * They are honoured by DEFAULT and the default is the strict one. If U-6 comes
 * back saying the flags are stale, `honourReviewFlags: false` relaxes the rule
 * without rewriting it - which is the whole reason this is a parameter rather
 * than a hard-coded condition. It is deliberately not the default, because
 * "these flags are probably old" is a guess and the flags are the only signal
 * anybody ever recorded that a product needed looking at.
 */
// MEASURED, C-0 run #9. The two flags are not one setting, and the single
// honourReviewFlags switch this file shipped with was wrong:
//
// needs_price_review (134). 73 of those rows are genuinely unpriced and fail
// the price condition anyway; only 61 carry a price. No suggested_price was
// ever recorded (has_a_suggestion = 0), so nothing says WHY they were flagged,
// and every unpriced product is already flagged (unpriced_but_not_flagged = 0)
// so the flag adds no information the price column does not already carry.
//
// needs_image_review (98). 69 are imageless and fail anyway. But C-26 found a
// second, independent record: the importer wrote its own image_review_status,
// and of the 98 flagged rows, 91 carry "Needs manual image research". Two
// records written at different times by different processes agreeing on the
// same 91 products is corroboration, not staleness.
//
// And that verdict is about RIGHTS, not about where the file is. C-26 shows 23
// of those 91 already have a normalized image - adopting an image onto our
// server does not answer whether we may use it. So normalization must never be
// read as clearing this flag.
//
// C-27: no flagged row is untouched for 90 days, let alone 180. Nothing here
// is stale by age either.
//
// Hence the asymmetry below: the price flag may be relaxed, the image flag
// should not be. Both default to honoured; relaxing is a decision somebody
// takes deliberately, per flag.
export const DEFAULT_OPTIONS = Object.freeze({
  honourPriceReviewFlag: true,
  honourImageReviewFlag: true,
});

/**
 * Accepts the old single-switch spelling so nothing that passed
 * `honourReviewFlags` silently starts ignoring it. Setting it applies to both
 * flags; the specific options win over it.
 */
const resolveOptions = (options = {}) => {
  const base = options.honourReviewFlags === undefined
    ? DEFAULT_OPTIONS
    : { honourPriceReviewFlag: options.honourReviewFlags, honourImageReviewFlag: options.honourReviewFlags };
  return {
    honourPriceReviewFlag: options.honourPriceReviewFlag ?? base.honourPriceReviewFlag,
    honourImageReviewFlag: options.honourImageReviewFlag ?? base.honourImageReviewFlag,
  };
};

/** Every reason a draft can be held back, as stable codes. */
export const AUTO_APPROVAL_BLOCKERS = Object.freeze({
  MISSING_NAME: "missing_name",
  MISSING_CATEGORY: "missing_category",
  MISSING_PRICE: "missing_price",
  NON_POSITIVE_PRICE: "non_positive_price",
  MISSING_IMAGE: "missing_image",
  PLACEHOLDER_IMAGE: "placeholder_image",
  FLAGGED: "flagged",
  NEEDS_PRICE_REVIEW: "needs_price_review",
  NEEDS_IMAGE_REVIEW: "needs_image_review",
});

const PLACEHOLDER_IMAGE = "/placeholder.svg";

/**
 * A price is a positive number. Written out rather than `Number(price) > 0`
 * because that expression says yes to `true`, to `[]` and to ` `, and a
 * catalogue is not the place to discover that Number([]) is 0.
 */
const isPositivePrice = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return false;
  const text = String(value).trim();
  if (text === "") return false;
  if (!/^-?\d+(\.\d+)?$/.test(text)) return false;
  return Number(text) > 0;
};

/**
 * Every reason this draft may not be approved automatically, in a stable
 * order. Empty means it may.
 *
 * `row` carries the legacy product's fields: name, category_id, price,
 * image_url, is_flagged, needs_price_review, needs_image_review.
 */
export const autoApprovalBlockers = (row, options = {}) => {
  const { honourPriceReviewFlag, honourImageReviewFlag } = resolveOptions(options);
  const B = AUTO_APPROVAL_BLOCKERS;
  const blockers = [];

  // A missing row is not an approvable row. Fail closed rather than reading
  // every field off undefined and finding nothing wrong with it.
  if (!row || typeof row !== "object") return [B.MISSING_NAME, B.MISSING_CATEGORY, B.MISSING_PRICE, B.MISSING_IMAGE];

  if (!String(row.name ?? "").trim()) blockers.push(B.MISSING_NAME);
  if (!row.category_id) blockers.push(B.MISSING_CATEGORY);

  if (row.price === null || row.price === undefined || String(row.price).trim() === "") {
    blockers.push(B.MISSING_PRICE);
  } else if (!isPositivePrice(row.price)) {
    // Distinguished from missing: a price of 0 is somebody's decision that went
    // wrong, and a price that is absent is a field nobody filled. C-23 counted
    // 73 of the former.
    blockers.push(B.NON_POSITIVE_PRICE);
  }

  const image = String(row.image_url ?? "").trim();
  if (!image) blockers.push(B.MISSING_IMAGE);
  else if (image === PLACEHOLDER_IMAGE) blockers.push(B.PLACEHOLDER_IMAGE);

  // is_flagged is nullable, so it is compared to true rather than tested for
  // truthiness - the same three-valued trap sellerEligibility.js documents.
  if (row.is_flagged === true) blockers.push(B.FLAGGED);

  if (honourPriceReviewFlag && row.needs_price_review === true) blockers.push(B.NEEDS_PRICE_REVIEW);
  if (honourImageReviewFlag && row.needs_image_review === true) blockers.push(B.NEEDS_IMAGE_REVIEW);

  return blockers;
};

export const mayAutoApprove = (row, options = {}) => autoApprovalBlockers(row, options).length === 0;

/**
 * The identical rule as SQL, for counting and for selecting in bulk.
 *
 * `alias` is the business_products alias. The fragment is parenthesised so it
 * can be dropped into a WHERE clause beside other conditions without the
 * caller having to think about precedence - the kind of detail that, left to
 * the caller, is got wrong once in five call sites.
 *
 * The placeholder is inlined as a literal rather than parameterised so this
 * stays a fragment with no parameter-numbering contract. It is a constant in
 * a migration, not user input.
 */
export const autoApprovableSql = (alias = "p", options = {}) => {
  const { honourPriceReviewFlag, honourImageReviewFlag } = resolveOptions(options);
  const conditions = [
    `nullif(btrim(coalesce(${alias}.name, '')), '') is not null`,
    `${alias}.category_id is not null`,
    `${alias}.price is not null`,
    `${alias}.price > 0`,
    `nullif(btrim(coalesce(${alias}.image_url, '')), '') is not null`,
    `${alias}.image_url <> '${PLACEHOLDER_IMAGE}'`,
    `coalesce(${alias}.is_flagged, false) = false`,
  ];
  if (honourPriceReviewFlag) conditions.push(`coalesce(${alias}.needs_price_review, false) = false`);
  if (honourImageReviewFlag) conditions.push(`coalesce(${alias}.needs_image_review, false) = false`);
  return `(${conditions.join("\n     and ")})`;
};
