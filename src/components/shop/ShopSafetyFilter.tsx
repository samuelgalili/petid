/**
 * ShopSafetyFilter — Checks products against pet's health profile.
 * Returns safety status and optional warning for display.
 */

import { useMemo } from "react";
import { ShieldAlert, ShieldX } from "lucide-react";
import type { ActivePet } from "@/hooks/useActivePet";

export type ProductSafety = "safe" | "caution" | "unsafe";

interface SafetyCheckResult {
  level: ProductSafety;
  reason: string | null;
}

const SAFETY_RULES: { condition: string[]; unsafeKeywords: string[]; reason: string }[] = [
  {
    condition: ["סוכרת", "diabetic"],
    unsafeKeywords: ["סוכר", "sugar", "מתוק", "sweet", "דבש", "honey", "high carb"],
    reason: "לא מתאים לחיות עם סוכרת",
  },
  {
    condition: ["כליות", "renal"],
    unsafeKeywords: ["חלבון גבוה", "high protein", "בשר נא"],
    reason: "חלבון גבוה — לא מתאים לבעיות כליות",
  },
  {
    condition: ["אלרגיה", "allergy"],
    unsafeKeywords: ["חיטה", "wheat", "גלוטן", "gluten", "סויה", "soy"],
    reason: "עלול להכיל אלרגנים",
  },
  {
    condition: ["עיכול", "gastro"],
    unsafeKeywords: ["שומני", "fatty", "עתיר שומן"],
    reason: "עתיר שומן — עלול להחמיר בעיות עיכול",
  },
  {
    condition: ["משקל", "obesity"],
    unsafeKeywords: ["קלורי גבוה", "high calorie", "high energy", "עתיר אנרגיה"],
    reason: "עתיר קלוריות — לא מתאים לדיאטה",
  },
];

export function checkProductSafety(productText: string, pet: ActivePet | null): SafetyCheckResult {
  if (!pet?.medical_conditions || pet.medical_conditions.length === 0) {
    return { level: "safe", reason: null };
  }

  const lower = productText.toLowerCase();
  const conditions = pet.medical_conditions.map(c => c.toLowerCase());

  for (const rule of SAFETY_RULES) {
    const hasCondition = conditions.some(c => rule.condition.some(kw => c.includes(kw)));
    if (!hasCondition) continue;
    const isUnsafe = rule.unsafeKeywords.some(kw => lower.includes(kw));
    if (isUnsafe) return { level: "unsafe", reason: rule.reason };
  }

  // Age-based cautions
  if (pet.ageWeeks !== null && pet.ageWeeks < 16) {
    if (lower.includes("adult") || lower.includes("בוגרים") || lower.includes("senior")) {
      return { level: "caution", reason: `מוצר לבוגרים — ${pet.name} עדיין גור` };
    }
  }

  return { level: "safe", reason: null };
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
    return (
      <div className="absolute top-1 left-1 z-10">
        {level === "unsafe" ? (
          <div className="w-5 h-5 rounded-full bg-destructive/90 flex items-center justify-center shadow-sm">
            <ShieldX className="w-3 h-3 text-white" strokeWidth={2} />
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full bg-amber-500/90 flex items-center justify-center shadow-sm">
            <ShieldAlert className="w-3 h-3 text-white" strokeWidth={2} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold ${
        level === "unsafe"
          ? "bg-destructive/10 text-destructive border border-destructive/20"
          : "bg-amber-500/10 text-amber-700 border border-amber-500/20"
      }`}
    >
      {level === "unsafe" ? (
        <ShieldX className="w-3 h-3" strokeWidth={2} />
      ) : (
        <ShieldAlert className="w-3 h-3" strokeWidth={2} />
      )}
      <span>{reason}</span>
    </div>
  );
};
