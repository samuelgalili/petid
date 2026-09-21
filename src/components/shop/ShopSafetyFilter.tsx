/**
 * ShopSafetyFilter — Checks products against pet's health profile.
 * Returns safety status and optional warning for display.
 */

import { useMemo } from "react";
import { HelpCircle, ShieldAlert, ShieldX } from "lucide-react";
import type { ActivePet } from "@/hooks/useActivePet";

export type ProductSafety = "safe" | "caution" | "unsafe" | "unknown";

interface SafetyCheckResult {
  level: ProductSafety;
  reason: string | null;
}

const SAFETY_RULES: { condition: string[]; unsafeKeywords: string[]; reason: string }[] = [
  {
    condition: ["סוכרת", "diabetic"],
    unsafeKeywords: ["סוכר", "sugar", "מתוק", "sweet", "דבש", "honey", "high carb"],
    reason: "תיאור המוצר מזכיר סוכר; יש לבדוק התאמה עם וטרינר",
  },
  {
    condition: ["כליות", "renal"],
    unsafeKeywords: ["חלבון גבוה", "high protein", "בשר נא"],
    reason: "תיאור המוצר מזכיר חלבון גבוה; יש לבדוק התאמה עם וטרינר",
  },
  {
    condition: ["אלרגיה", "allergy"],
    unsafeKeywords: ["חיטה", "wheat", "גלוטן", "gluten", "סויה", "soy"],
    reason: "תיאור המוצר מזכיר רכיב שעשוי להיות רלוונטי לאלרגיה",
  },
  {
    condition: ["עיכול", "gastro"],
    unsafeKeywords: ["שומני", "fatty", "עתיר שומן"],
    reason: "תיאור המוצר מזכיר תכולת שומן גבוהה; מומלץ לבדוק התאמה",
  },
  {
    condition: ["משקל", "obesity"],
    unsafeKeywords: ["קלורי גבוה", "high calorie", "high energy", "עתיר אנרגיה"],
    reason: "תיאור המוצר מזכיר תכולה קלורית גבוהה; מומלץ לבדוק התאמה",
  },
];

export function checkProductSafety(productText: string, pet: ActivePet | null): SafetyCheckResult {
  if (!pet?.medical_conditions || pet.medical_conditions.length === 0) {
    return { level: "unknown", reason: "לא ניתן לאמת התאמה רפואית מפרטי הקטלוג" };
  }

  const lower = productText.toLowerCase();
  const conditions = pet.medical_conditions.map(c => c.toLowerCase());

  for (const rule of SAFETY_RULES) {
    const hasCondition = conditions.some(c => rule.condition.some(kw => c.includes(kw)));
    if (!hasCondition) continue;
    const isUnsafe = rule.unsafeKeywords.some(kw => lower.includes(kw));
    if (isUnsafe) return { level: "caution", reason: rule.reason };
  }

  // Age-based cautions
  if (pet.ageWeeks !== null && pet.ageWeeks < 16) {
    if (lower.includes("adult") || lower.includes("בוגרים") || lower.includes("senior")) {
      return { level: "caution", reason: `מוצר לבוגרים — ${pet.name} עדיין גור` };
    }
  }

  return { level: "unknown", reason: "לא נמצא מידע מספיק לאימות התאמה רפואית" };
}

export function useShopSafety(productName: string, description: string, pet: ActivePet | null): SafetyCheckResult {
  return useMemo(
    () => checkProductSafety(`${productName} ${description}`, pet),
    [productName, description, pet]
  );
}

interface SafetyBadgeProps {
  level: ProductSafety;
  reason: string | null;
  petName?: string;
  compact?: boolean;
}

export const SafetyBadge = ({ level, reason, petName, compact = false }: SafetyBadgeProps) => {
  if (level === "safe") return null;

  if (compact) {
    /**
     * The only mark allowed on a product photo, and the only reason it is
     * allowed: the design canvas says colour lives in exactly two places, a
     * ring around the pet and a STATUS, as information. A safety warning is
     * that status.
     *
     * It used to be a solid disc - destructive at 90%, or amber-500 at 90% -
     * with a white glyph and a shadow beneath it. That is a block, it is
     * white-on-colour, and it is a shadow: three of the things the canvas
     * rejects by name, spent on the one mark that had a right to be there.
     *
     * It is now the canvas's own status shape - a 15% tint, a hairline, and
     * the glyph in the status colour instead of white - and slightly larger,
     * so the warning did not get quieter for going on-system. mipo-peach is
     * hsl(30 96% 72%), which is #FDBA74: the canvas's own caution colour,
     * not a second orange invented here.
     */
    const treatment = level === "unsafe"
      ? "bg-destructive/15 border-destructive/30 text-destructive"
      : level === "unknown"
        ? "bg-mipo-soft/90 border-mipo-line text-mipo-muted"
        : "bg-mipo-peach/15 border-mipo-peach/40 text-mipo-peach";

    const Glyph = level === "unsafe" ? ShieldX : level === "unknown" ? HelpCircle : ShieldAlert;

    return (
      <div className="absolute top-1.5 left-1.5 z-10">
        <div className={`flex h-6 w-6 items-center justify-center rounded-full border backdrop-blur-sm ${treatment}`}>
          <Glyph className="h-3.5 w-3.5" strokeWidth={1.9} />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold ${
        level === "unsafe"
          ? "bg-destructive/10 text-destructive border border-destructive/20"
          : level === "unknown"
            ? "bg-muted text-muted-foreground border border-border"
            // mipo-peach, not amber-500: the same token the compact mark uses,
            // and it inverts with the theme, which amber-700 ink never did.
            : "bg-mipo-peach/15 text-mipo-peach border border-mipo-peach/30"
      }`}
    >
      {level === "unsafe" ? (
        <ShieldX className="w-3 h-3" strokeWidth={2} />
      ) : level === "unknown" ? (
        <HelpCircle className="w-3 h-3" strokeWidth={2} />
      ) : (
        <ShieldAlert className="w-3 h-3" strokeWidth={2} />
      )}
      <span>{reason}</span>
    </div>
  );
};
