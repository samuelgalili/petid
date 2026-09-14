// Stage 0 · Legacy product creation is closed.
//
// The commercial catalogue is being rebuilt through Product Intake: raw import,
// draft, review, variant, inventory, seller approval, publication. Until that
// exists, the safe number of ways to create a commercial product is zero.
//
// This is deliberately unconditional. G-1 froze the scraped-backed half of
// createProduct behind an environment flag, which was right while a hand-written
// product was still a legitimate thing to make. It no longer is: an audit proved
// that a product created through POST /api/products with no review, no image, no
// variant and no chosen seller was listed publicly and purchased end to end.
// A flag here would be a way to silently reopen that, so there isn't one - the
// way back is to revert the commit, which is visible in the history.
//
// 410 rather than 403: this is not an authorisation problem. The caller may well
// be entitled to create products; the capability itself has been withdrawn, and
// 410 says exactly that - it was here, it is gone, and asking again will not
// change the answer.

export class LegacyProductCreationDisabledError extends Error {
  constructor() {
    super("Legacy product creation is no longer supported. Use Product Intake.");
    this.name = "LegacyProductCreationDisabledError";
    this.statusCode = 410;
    this.code = "LEGACY_PRODUCT_CREATION_DISABLED";
  }
}

/**
 * Refuses every attempt to create a commercial product through the legacy path.
 *
 * Placed at the write boundary rather than only on the route, so a future
 * internal caller cannot reach the insert by going around the HTTP layer.
 */
export const assertLegacyProductCreationDisabled = () => {
  throw new LegacyProductCreationDisabledError();
};
