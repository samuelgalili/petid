/**
 * How long delivery takes, said in one place.
 *
 * The estimate was written out by hand wherever it was shown, so the product
 * drawer and the assistant's answer could disagree with each other and with
 * what the business actually promises. A delivery time quoted to a customer is
 * a commitment, so it gets one definition and every screen reads it.
 */

export const SHIPPING_ESTIMATE_MIN_DAYS = 3;
export const SHIPPING_ESTIMATE_MAX_DAYS = 5;

/** "3-5 ימי עסקים" */
export const SHIPPING_ESTIMATE_HE =
  `${SHIPPING_ESTIMATE_MIN_DAYS}-${SHIPPING_ESTIMATE_MAX_DAYS} ימי עסקים`;

/** "3-5 business days" */
export const SHIPPING_ESTIMATE_EN =
  `${SHIPPING_ESTIMATE_MIN_DAYS}-${SHIPPING_ESTIMATE_MAX_DAYS} business days`;
