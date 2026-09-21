/**
 * What delivery costs, on the server that charges for it.
 *
 * ─── WHY THIS FILE EXISTS ───────────────────────────────────────────────────
 *
 * The owner said it twice, the second time in as many words:
 *
 *   "והייתי מאוד ברור משלוח עולה 39 שח מי שלא מגיע למינימום הזמנה של 199 שח"
 *
 * src/lib/shipping.ts was written from that sentence and says 39. The shop
 * reads it, and the free-delivery badge on a product card is drawn from it.
 *
 * AND THE CHECKOUT CHARGED 25. Both sides of it - Checkout.tsx computed the
 * total the customer approved, index.js computed the total the customer was
 * charged, and each of them had the number typed into it as a literal. They
 * agreed with each other and disagreed with the owner, which is why nothing
 * ever failed: the order went through, correctly reconciled, for fourteen
 * shekels too little, on every order under the threshold.
 *
 * A constant in one file that the code charging money does not read is not a
 * decision the system holds. It is a comment. So the number now lives in
 * exactly two places - this file and src/lib/shipping.ts - and
 * server/test/shipping.test.js reads the numbers out of BOTH and compares
 * them.
 *
 * The pin is on the VALUES rather than on the source text, which is different
 * from how catalogSearch and cartGrouping pin their mirrors. Those two are the
 * same algorithm written twice, so anything but identical text is drift. This
 * is not: src/lib/shipping.ts also carries the delivery estimate and the
 * returns policy, which the server has no business holding. Only the two
 * numbers have to agree, so only the two numbers are compared.
 */

/**
 * The order value at which delivery stops being charged.
 *
 * The owner's words again: ₪199 is the MINIMUM ORDER FOR FREE DELIVERY, not a
 * minimum order value. An order of ₪40 is a perfectly good order; it simply
 * pays for its delivery.
 */
export const FREE_SHIPPING_THRESHOLD = 199;

/** What delivery costs below that threshold. */
export const SHIPPING_FEE = 39;

/**
 * The delivery charge for a basket.
 *
 * Takes the subtotal AFTER any discount, because that is the number the
 * customer is actually spending - a coupon that brings an order under the
 * threshold brings back the delivery charge with it.
 */
export const shippingFor = (subtotal) => (
  Number(subtotal) >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE
);
