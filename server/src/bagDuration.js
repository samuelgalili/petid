/**
 * How long a bag lasts this animal.
 *
 * The design canvas asks the product page for one sentence — "שק של 3 ק״ג
 * מספיק לרקסי לכ־24 ימים — 125 גרם ביום" — and its own note says why: it
 * "הופך גודל שק להחלטה". A shopper cannot compare a 3 kg bag against a 12 kg
 * bag; they can compare three weeks against three months.
 *
 * THE NUMBER IS AN ESTIMATE FROM THE ANIMAL'S WEIGHT, AND NOTHING HERE MAY
 * PRESENT IT AS THE MANUFACTURER'S. feedingGuidance.ts already draws that line
 * for the catalogue's own guide - only `manufacturer_confirmed` may claim the
 * manufacturer - and a figure derived here has even less right to it. The
 * caller gets `basis: "estimate"` and is expected to say so on screen.
 *
 * It lived inside SubscribeAndSave.tsx, which is a subscription upsell. A
 * number about how much a pet eats belongs to the pet, not to the upsell that
 * happened to need it first, and it could not be tested where it was.
 */

/**
 * Bag weight out of the free-text the catalogue stores: "3 ק״ג", "1.5kg",
 * "400 גרם", "12 KG".
 *
 * Returns 0 rather than throwing, because this column is filled by importers
 * and by hand and "לא צוין" is a real value in it.
 */
export const parseBagWeightKg = (text) => {
  const raw = String(text || "").trim();
  if (!raw) return 0;

  const match = raw.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return 0;

  const value = Number.parseFloat(match[1].replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) return 0;

  // KILOS FIRST, and that ordering is the fix for a live defect. The original
  // in SubscribeAndSave tested /\bg\b/i for grams, and "85g" has no word
  // boundary between "5" and "g", so it never matched: an 85 gram pouch was
  // read as 85 KILOS and the page offered to feed a cat for eleven years.
  if (/ק["״׳']?ג|קילו|\bkgs?\b/i.test(raw)) return value;
  if (/גרם|גר['׳]|\d\s*gr?\b|\bgr\b/i.test(raw)) return value / 1000;

  return value;
};

/**
 * Daily intake as a share of body weight.
 *
 * A rule of thumb, and a coarse one: smaller animals eat more per kilo than
 * larger ones, which is the whole of the model. It is here rather than in a
 * component so that the one place it is wrong is a place that can be fixed.
 */
export const estimateDailyIntakeKg = (petWeightKg) => {
  const weight = Number(petWeightKg);
  if (!Number.isFinite(weight) || weight <= 0) return 0;

  if (weight <= 5) return weight * 0.03;
  if (weight <= 15) return weight * 0.025;
  return weight * 0.02;
};

/**
 * The sentence's two numbers, or null when either input is missing.
 *
 * NULL IS THE IMPORTANT RETURN. Without the pet's weight there is no estimate,
 * and a page that fills the gap with an average is telling an owner something
 * about their animal that it does not know. The caller shows the invitation
 * instead - "הוסיפו את המשקל של רקסי" - which is a question the owner can
 * answer, rather than a number they cannot check.
 */
export const estimateBagDuration = ({ bagWeightText, petWeightKg }) => {
  const bagKg = parseBagWeightKg(bagWeightText);
  if (bagKg <= 0) return null;

  const dailyKg = estimateDailyIntakeKg(petWeightKg);
  if (dailyKg <= 0) return null;

  const days = Math.round(bagKg / dailyKg);
  if (days < 1) return null;

  return {
    days,
    dailyGrams: Math.round(dailyKg * 1000),
    bagKg,
    /** Never "manufacturer". The screen is expected to print this distinction. */
    basis: "estimate",
  };
};
