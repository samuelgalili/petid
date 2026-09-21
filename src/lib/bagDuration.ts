/**
 * How long a bag lasts this animal — the browser's copy.
 *
 * The rules live in server/src/bagDuration.js and this mirrors them. The two
 * are pinned to each other by server/test/bagDuration.test.js, which reads
 * both files and compares the bodies as code, because the number is shown to
 * an owner about their own animal and two answers to that is worse than none.
 *
 * THE NUMBER IS AN ESTIMATE FROM THE ANIMAL'S WEIGHT. It is not the
 * manufacturer's feeding guide, and `basis: "estimate"` is returned so the
 * screen can say so. feedingGuidance.ts draws the same line for the
 * catalogue's own guide: only `manufacturer_confirmed` may claim a
 * manufacturer.
 */

export interface BagDuration {
  days: number;
  dailyGrams: number;
  bagKg: number;
  basis: "estimate";
}

/** Bag weight out of free text: "3 ק״ג", "1.5kg", "400 גרם", "12 KG". */
export const parseBagWeightKg = (text?: string | null): number => {
  const raw = String(text || "").trim();
  if (!raw) return 0;

  const match = raw.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return 0;

  const value = Number.parseFloat(match[1].replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) return 0;

  if (/ק["״׳']?ג|קילו|\bkgs?\b/i.test(raw)) return value;
  if (/גרם|גר['׳]|\d\s*gr?\b|\bgr\b/i.test(raw)) return value / 1000;

  return value;
};

/** Daily intake as a share of body weight. A coarse rule of thumb. */
export const estimateDailyIntakeKg = (petWeightKg?: number | null): number => {
  const weight = Number(petWeightKg);
  if (!Number.isFinite(weight) || weight <= 0) return 0;

  if (weight <= 5) return weight * 0.03;
  if (weight <= 15) return weight * 0.025;
  return weight * 0.02;
};

/**
 * Null when either input is missing, and that is the important return: a page
 * that fills the gap with an average tells an owner something about their
 * animal that it does not know.
 */
export const estimateBagDuration = (
  { bagWeightText, petWeightKg }: { bagWeightText?: string | null; petWeightKg?: number | null },
): BagDuration | null => {
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
    basis: "estimate",
  };
};
