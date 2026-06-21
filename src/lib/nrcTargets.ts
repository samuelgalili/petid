/**
 * NRC 2006 daily targets + baseline-driven personal tuning.
 *
 * Conservative by design (PetID core rules):
 *   • If data is missing → return base NRC values, never invent.
 *   • Tuning only kicks in when confidence ≥ 0.7 AND data_days ≥ 14.
 *   • Adjustment is clamped to ±15% of the base target.
 *   • Never recommends action — only adjusts the displayed goal and
 *     exposes a neutral `reason` so the UI can explain why.
 */

export type TargetSource =
  | "base"          // no tuning applied
  | "tuned-stable"  // weight stable, target nudged toward actual intake
  | "tuned-gain"    // weight rising → target lowered
  | "tuned-loss";   // weight dropping → target raised

export interface DailyTargets {
  kcal: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  water_ml: number | null;
  source: TargetSource;
  /** Signed % difference vs. base NRC (e.g. -8 means target was reduced 8%). */
  adjustmentPct: number;
  /** Short Hebrew explanation, safe to render in UI. `null` when source = "base". */
  reason: string | null;
}

export interface BaselineInput {
  avgKcal: number | null;
  weightTrendKgPerWeek: number | null;
  confidence: number;
  dataDays: number;
}

const EMPTY: DailyTargets = {
  kcal: null, protein_g: null, fat_g: null, carbs_g: null, water_ml: null,
  source: "base", adjustmentPct: 0, reason: null,
};

const macrosFromKcal = (kcal: number) => ({
  protein_g: Math.round((kcal * 0.25) / 4),
  fat_g: Math.round((kcal * 0.2) / 9),
  carbs_g: Math.round((kcal * 0.55) / 4),
});

/** Base NRC 2006 (adult neutered). RER = 70·W^0.75, MER = RER·1.6. */
export const computeBaseTargets = (
  weightKg: number | null | undefined,
): DailyTargets => {
  if (!weightKg || weightKg <= 0) return EMPTY;
  const MER = 70 * Math.pow(weightKg, 0.75) * 1.6;
  return {
    kcal: Math.round(MER),
    ...macrosFromKcal(MER),
    water_ml: Math.round(weightKg * 50),
    source: "base",
    adjustmentPct: 0,
    reason: null,
  };
};

/**
 * Targets adjusted by 14-day behavioural baseline.
 *
 * Decision tree:
 *   1. No weight  → empty.
 *   2. Low confidence (< 0.7) OR < 14 days OR no avgKcal → base NRC.
 *   3. Weight stable (|trend|/weight < 0.5%/wk):
 *        target ← 70% base + 30% avgKcal, clamped to base × [0.85, 1.15].
 *        => personal maintenance level the pet actually holds weight at.
 *   4. Weight gain > 2%/wk: target ← base × 0.90 (cap at -15%).
 *   5. Weight loss > 2%/wk: target ← base × 1.10 (cap at +15%).
 *
 * Macros and water always derive from the *base* weight formula —
 * we only re-balance the calorie envelope, never the nutrient ratios.
 */
export const computeAdjustedTargets = (
  weightKg: number | null | undefined,
  baseline: BaselineInput | null | undefined,
): DailyTargets => {
  const base = computeBaseTargets(weightKg);
  if (base.kcal == null || !weightKg) return base;

  const b = baseline;
  const eligible =
    !!b &&
    b.confidence >= 0.7 &&
    b.dataDays >= 14 &&
    b.avgKcal != null && b.avgKcal > 0;

  if (!eligible) return base;

  const baseKcal = base.kcal;
  const lo = baseKcal * 0.85;
  const hi = baseKcal * 1.15;

  const trend = b!.weightTrendKgPerWeek ?? 0;
  const trendPct = weightKg ? trend / weightKg : 0; // fraction per week

  let next = baseKcal;
  let source: TargetSource = "base";
  let reason: string | null = null;

  if (trendPct > 0.02) {
    next = baseKcal * 0.9;
    source = "tuned-gain";
    reason = "התאמה אישית: עלייה במשקל ב-14 ימים, היעד הוקטן ב-10%";
  } else if (trendPct < -0.02) {
    next = baseKcal * 1.1;
    source = "tuned-loss";
    reason = "התאמה אישית: ירידה במשקל ב-14 ימים, היעד הוגדל ב-10% (מומלץ ייעוץ וטרינרי)";
  } else {
    // Stable weight → blend toward actual maintenance intake
    next = baseKcal * 0.7 + b!.avgKcal! * 0.3;
    source = "tuned-stable";
    reason = "התאמה אישית: משקל יציב ב-14 ימים, היעד כוּונן לצריכה בפועל";
  }

  const clamped = Math.max(lo, Math.min(hi, next));
  const kcal = Math.round(clamped);
  const adjustmentPct = Math.round(((kcal - baseKcal) / baseKcal) * 100);

  // If clamp + rounding wiped out the change, report as base.
  if (adjustmentPct === 0) {
    return { ...base, source: "base", adjustmentPct: 0, reason: null };
  }

  return {
    kcal,
    ...macrosFromKcal(kcal),
    water_ml: base.water_ml,
    source,
    adjustmentPct,
    reason,
  };
};