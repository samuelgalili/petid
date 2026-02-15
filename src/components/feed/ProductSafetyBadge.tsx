/**
 * ProductSafetyBadge — Warns if a product may be unsafe for the active pet's health conditions.
 * Shows a warning badge or hides the price tag when a product conflicts with pet constraints.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { ActivePet } from "@/hooks/useActivePet";

interface ProductSafetyBadgeProps {
  productName: string | null;
  productCaption: string | null;
  activePet: ActivePet | null;
}

export type SafetyLevel = "safe" | "caution" | "unsafe";

interface SafetyResult {
  level: SafetyLevel;
  reason: string | null;
}

// Keywords that indicate unsafe products per condition
const UNSAFE_RULES: { condition: string[]; unsafeKeywords: string[]; reason: string }[] = [
  {
    condition: ["סוכרת", "diabetic", "diabetes"],
    unsafeKeywords: ["סוכר", "sugar", "מתוק", "sweet", "ממתק", "דבש", "honey", "treat מתוק"],
    reason: "מוצר עשיר בסוכר — לא מתאים לחיות עם סוכרת",
  },
  {
    condition: ["כליות", "renal", "kidney"],
    unsafeKeywords: ["חלבון גבוה", "high protein", "בשר נא", "raw meat"],
    reason: "חלבון גבוה — לא מתאים לחיות עם בעיות כליות",
  },
  {
    condition: ["אלרגיה", "allergy", "רגישות", "sensitive"],
    unsafeKeywords: ["חיטה", "wheat", "גלוטן", "gluten", "סויה", "soy", "תירס", "corn"],
    reason: "עלול להכיל אלרגנים — בדקו רכיבים עם הווטרינר",
  },
  {
    condition: ["עיכול", "gastro", "digestive"],
    unsafeKeywords: ["שומני", "fatty", "עתיר שומן", "rich", "חריף", "spicy"],
    reason: "מוצר עתיר שומן — עלול להחמיר בעיות עיכול",
  },
  {
    condition: ["עור", "derma", "skin"],
    unsafeKeywords: ["צבע מלאכותי", "artificial", "ריחנית", "fragrance", "כימי", "chemical"],
    reason: "מכיל חומרים שעלולים לגרות עור רגיש",
  },
  {
    condition: ["משקל", "obesity", "השמנה"],
    unsafeKeywords: ["קלורי", "calorie", "עתיר אנרגיה", "high energy", "שומני", "fatty"],
    reason: "מוצר עתיר קלוריות — לא מתאים לתוכנית ירידה במשקל",
  },
];

function checkProductSafety(
  productName: string | null,
  caption: string | null,
  pet: ActivePet
): SafetyResult {
  if (!pet.medical_conditions || pet.medical_conditions.length === 0) {
    return { level: "safe", reason: null };
  }

  const text = `${productName || ""} ${caption || ""}`.toLowerCase();
  const conditions = pet.medical_conditions.map(c => c.toLowerCase());

  for (const rule of UNSAFE_RULES) {
    const hasCondition = conditions.some(c =>
      rule.condition.some(keyword => c.includes(keyword))
    );
    if (!hasCondition) continue;

    const hasUnsafeKeyword = rule.unsafeKeywords.some(kw => text.includes(kw));
    if (hasUnsafeKeyword) {
      return { level: "unsafe", reason: rule.reason };
    }
  }

  // Check for age-specific cautions
  if (pet.ageWeeks !== null && pet.ageWeeks < 16) {
    if (text.includes("בוגר") || text.includes("adult") || text.includes("senior")) {
      return { level: "caution", reason: `מוצר לבוגרים — ${pet.name} עדיין גור צעיר` };
    }
  }

  if (pet.ageWeeks !== null && pet.ageWeeks > 364) {
    if (text.includes("גורים") || text.includes("puppy") || text.includes("kitten")) {
      return { level: "caution", reason: `מוצר לגורים — ${pet.name} בגיל מבוגר` };
    }
  }

  return { level: "safe", reason: null };
}

export function useProductSafety(
  productName: string | null,
  caption: string | null,
  activePet: ActivePet | null
): SafetyResult {
  return useMemo(() => {
    if (!activePet) return { level: "safe" as SafetyLevel, reason: null };
    return checkProductSafety(productName, caption, activePet);
  }, [productName, caption, activePet]);
}

export const ProductSafetyBadge = ({ productName, productCaption, activePet }: ProductSafetyBadgeProps) => {
  const safety = useProductSafety(productName, productCaption, activePet);

  if (safety.level === "safe" || !safety.reason) return null;

  const isUnsafe = safety.level === "unsafe";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, x: -10 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ delay: 0.8, type: "spring", stiffness: 250 }}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-r-full shadow-lg max-w-[280px]"
      style={{
        background: isUnsafe
          ? "linear-gradient(135deg, rgba(239,68,68,0.85), rgba(185,28,28,0.7))"
          : "linear-gradient(135deg, rgba(245,158,11,0.85), rgba(217,119,6,0.7))",
        backdropFilter: "blur(12px)",
      }}
      dir="rtl"
    >
      {isUnsafe ? (
        <ShieldAlert className="w-3.5 h-3.5 text-white flex-shrink-0" strokeWidth={2} />
      ) : (
        <ShieldCheck className="w-3.5 h-3.5 text-white flex-shrink-0" strokeWidth={2} />
      )}
      <span
        className="text-white text-[10px] font-semibold line-clamp-2"
        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
      >
        {safety.reason}
      </span>
    </motion.div>
  );
};
