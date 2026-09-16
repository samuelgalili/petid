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

/**
 * What shipping costs, and where it stops costing.
 *
 * The threshold was hardcoded in four places - ProductDetailAws, Shop,
 * SmartCartLayers and RecommendedProducts - all agreeing on 199, while the
 * assistant was trained to answer 200. A customer who asked the chat got a
 * different number from the one the cart charged. Two spellings of a price is
 * how one of them ends up wrong; five is how nobody notices.
 *
 * 199 is the decision, and it is also what four of the five already said, so
 * the assistant is the only thing that moves.
 */
export const FREE_SHIPPING_THRESHOLD = 199;

/** What delivery costs below the threshold. */
export const SHIPPING_FEE = 39;

/** "₪39", or "חינם" once the threshold is reached. */
export const shippingFeeLabelHe = (subtotal: number) =>
  subtotal >= FREE_SHIPPING_THRESHOLD ? "חינם" : `₪${SHIPPING_FEE}`;

/** How much more is needed for free delivery. Never negative. */
export const amountToFreeShipping = (subtotal: number) =>
  Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

/**
 * Returns.
 *
 * An opened bag of food is the case a generic returns policy cannot answer, so
 * it is the case this one is written around: up to roughly a fifth used, the
 * bag comes back for credit and the customer pays the return carriage.
 *
 * Expressed as a SHARE rather than a weight, because bags come in 3 kg and
 * 12 kg and a fixed gram figure would mean something different in each.
 */
export const RETURN_MAX_USED_SHARE = 0.2;

/**
 * The share as it is spoken.
 *
 * Both sentences below used to spell "20%" out by hand next to the constant,
 * so moving the share to a quarter would have left the customer reading the
 * old figure - the exact drift this module exists to prevent, reproduced
 * inside it.
 */
const RETURN_MAX_USED_PERCENT = Math.round(RETURN_MAX_USED_SHARE * 100);

/** One line, for a product page. */
export const RETURNS_SUMMARY_HE =
  `עד כ־${RETURN_MAX_USED_PERCENT}% מהשק — זיכוי בהחזרה, המשלוח על הלקוח`;

/** The full sentence, for the policy page and the assistant. */
export const RETURNS_DETAIL_HE =
  `אפשר להחזיר שק שנוצל עד כ־${RETURN_MAX_USED_PERCENT}% ולקבל זיכוי. `
  + "עלות משלוח ההחזרה חלה על הלקוח.";
