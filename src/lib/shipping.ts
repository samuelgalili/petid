/**
 * How long delivery takes, said in one place.
 *
 * The estimate was written out by hand wherever it was shown, so the product
 * drawer and the assistant's answer could disagree with each other and with
 * what the business actually promises. A delivery time quoted to a customer is
 * a commitment, so it gets one definition and every screen reads it.
 */

/** Both confirmed by the owner: "3-5 ימי עסקים משלוח". */
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
 *
 * CONFIRMED BY THE OWNER, and that is worth recording because the numbers got
 * here by consolidation rather than by anyone deciding them: five call sites
 * were compared and the majority won. A majority is not an authority on what a
 * business charges. The owner has since stated all three in his own words -
 * delivery in 3-5 business days, ₪39 when the order is under the threshold,
 * and the threshold itself at ₪199 - so they are now commitments rather than
 * inherited constants.
 *
 * WHAT ₪199 IS: the point at which delivery stops costing, not a floor on the
 * order. An order below it is accepted and pays SHIPPING_FEE. The owner called
 * it "מינימום הזמנה", and his own sentence settles the reading - he described
 * what someone below the threshold PAYS, which only exists if they are allowed
 * to order at all.
 */
export const FREE_SHIPPING_THRESHOLD = 199;

/** What delivery costs below the threshold. Confirmed by the owner. */
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
/**
 * STILL NOT CONFIRMED, AND IT IS THE ONE THAT IS LEGAL.
 *
 * The share below and the sentences built from it describe the CONDITION for a
 * return. They say nothing about the WINDOW - how many days a customer has -
 * and Israeli consumer law sets one. Nothing in this file may claim a window
 * until the owner and whoever advises him legally state it.
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
