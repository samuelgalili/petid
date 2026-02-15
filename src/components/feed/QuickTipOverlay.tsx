/**
 * QuickTipOverlay — Contextual pet-specific tips that appear as captions on feed posts.
 * Analyzes post caption against pet's age, breed, and health to generate relevant warnings/tips.
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Lightbulb, ChevronUp } from "lucide-react";
import type { ActivePet } from "@/hooks/useActivePet";

interface QuickTipOverlayProps {
  caption: string | null;
  activePet: ActivePet | null;
  isActive: boolean;
}

interface Tip {
  text: string;
  type: "warning" | "info";
  icon: "alert" | "bulb";
}

// Age-stage keywords that trigger tips
const PUPPY_EXERCISE_KEYWORDS = ["ריצה", "running", "אימון כבד", "heavy exercise", "סיבולת", "endurance", "מרתון", "agility"];
const SENIOR_KEYWORDS = ["קפיצה", "jumping", "מדרגות", "stairs", "ריצה מהירה", "sprint"];
const HEAT_KEYWORDS = ["חום", "heat", "שמש", "sun", "קיץ", "summer", "חוף", "beach"];
const FOOD_KEYWORDS = ["שוקולד", "chocolate", "בצל", "onion", "שום", "garlic", "ענבים", "grapes", "אבוקדו", "avocado", "xylitol"];
const GROOMING_KEYWORDS = ["טיפוח", "grooming", "מברשת", "brush", "רחצה", "bath", "שמפו", "shampoo"];

function generateTips(caption: string, pet: ActivePet): Tip[] {
  const tips: Tip[] = [];
  const lower = caption.toLowerCase();
  const isPuppy = pet.ageWeeks !== null && pet.ageWeeks < 26;
  const isSenior = pet.ageWeeks !== null && pet.ageWeeks > 364;
  const hasMedical = pet.medical_conditions && pet.medical_conditions.length > 0;

  // Puppy exercise warning
  if (isPuppy) {
    for (const kw of PUPPY_EXERCISE_KEYWORDS) {
      if (lower.includes(kw)) {
        tips.push({
          text: `⚠️ ${pet.name} עדיין גור — תרגיל זה צריך להיות קצר יותר ומותאם לגיל`,
          type: "warning",
          icon: "alert",
        });
        break;
      }
    }
  }

  // Senior joint warning
  if (isSenior) {
    for (const kw of SENIOR_KEYWORDS) {
      if (lower.includes(kw)) {
        tips.push({
          text: `${pet.name} בגיל מבוגר — יש להימנע מפעילות שמכבידה על המפרקים`,
          type: "warning",
          icon: "alert",
        });
        break;
      }
    }
  }

  // Toxic food warning
  for (const kw of FOOD_KEYWORDS) {
    if (lower.includes(kw)) {
      tips.push({
        text: `🚫 מזון זה עלול להיות רעיל ל${pet.pet_type === "cat" ? "חתולים" : "כלבים"} — לא מומלץ ל${pet.name}`,
        type: "warning",
        icon: "alert",
      });
      break;
    }
  }

  // Medical-specific tips
  if (hasMedical) {
    const conditions = pet.medical_conditions!.map(c => c.toLowerCase());

    if (conditions.some(c => c.includes("סוכרת") || c.includes("diabetic"))) {
      if (lower.includes("חטיף") || lower.includes("treat") || lower.includes("ממתק") || lower.includes("סוכר")) {
        tips.push({
          text: `ל${pet.name} יש רגישות לסוכר — יש להתייעץ עם הווטרינר לפני מתן חטיפים`,
          type: "warning",
          icon: "alert",
        });
      }
    }

    if (conditions.some(c => c.includes("עור") || c.includes("derma") || c.includes("אלרגי"))) {
      for (const kw of GROOMING_KEYWORDS) {
        if (lower.includes(kw)) {
          tips.push({
            text: `💡 ל${pet.name} עור רגיש — כדאי להשתמש במוצרים היפואלרגניים`,
            type: "info",
            icon: "bulb",
          });
          break;
        }
      }
    }

    if (conditions.some(c => c.includes("כליות") || c.includes("renal"))) {
      if (lower.includes("מזון") || lower.includes("אוכל") || lower.includes("food") || lower.includes("דיאטה")) {
        tips.push({
          text: `ל${pet.name} בעיות כליות — נדרש מזון ייעודי עם חלבון מופחת`,
          type: "warning",
          icon: "alert",
        });
      }
    }

    if (conditions.some(c => c.includes("עיכול") || c.includes("gastro"))) {
      if (lower.includes("אוכל") || lower.includes("food") || lower.includes("מזון חדש")) {
        tips.push({
          text: `💡 ל${pet.name} קיבה רגישה — מעבר למזון חדש צריך להיות הדרגתי (7-10 ימים)`,
          type: "info",
          icon: "bulb",
        });
      }
    }
  }

  // Heat warning for flat-nosed breeds
  const flatNoseBreeds = ["שי טסו", "shih tzu", "בולדוג", "bulldog", "פקינז", "pug", "פרסי"];
  const isFlat = pet.breed && flatNoseBreeds.some(b => pet.breed!.toLowerCase().includes(b));
  if (isFlat) {
    for (const kw of HEAT_KEYWORDS) {
      if (lower.includes(kw)) {
        tips.push({
          text: `⚠️ ${pet.name} מגזע שטוח-אף — יש להיזהר במיוחד מחום. לקצר טיולים ולהרבות במים`,
          type: "warning",
          icon: "alert",
        });
        break;
      }
    }
  }

  // Puppy info tip
  if (isPuppy && (lower.includes("אילוף") || lower.includes("training") || lower.includes("חברות") || lower.includes("socialize"))) {
    tips.push({
      text: `💡 ${pet.name} בחלון הזהב של סוציאליזציה — תקופה מצוינת לחשיפה לגירויים חדשים`,
      type: "info",
      icon: "bulb",
    });
  }

  return tips.slice(0, 2); // Max 2 tips per post
}

export const QuickTipOverlay = ({ caption, activePet, isActive }: QuickTipOverlayProps) => {
  const [expanded, setExpanded] = useState(false);

  const tips = useMemo(() => {
    if (!caption || !activePet) return [];
    return generateTips(caption, activePet);
  }, [caption, activePet]);

  if (tips.length === 0 || !isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ delay: 1.2, type: "spring", stiffness: 200 }}
        className="absolute bottom-[110px] left-3 right-16 z-40"
        dir="rtl"
      >
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="w-full"
        >
          {/* Collapsed: show first tip as single line */}
          {!expanded && (
            <motion.div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{
                background: tips[0].type === "warning"
                  ? "linear-gradient(135deg, rgba(239,68,68,0.75), rgba(220,38,38,0.55))"
                  : "linear-gradient(135deg, rgba(59,130,246,0.75), rgba(37,99,235,0.55))",
                backdropFilter: "blur(16px)",
              }}
            >
              {tips[0].icon === "alert" ? (
                <AlertTriangle className="w-3.5 h-3.5 text-white flex-shrink-0" strokeWidth={2} />
              ) : (
                <Lightbulb className="w-3.5 h-3.5 text-white flex-shrink-0" strokeWidth={2} />
              )}
              <span className="text-white text-[11px] font-semibold line-clamp-1 text-right flex-1"
                style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                {tips[0].text}
              </span>
              {tips.length > 1 && (
                <ChevronUp className="w-3 h-3 text-white/70 flex-shrink-0" />
              )}
            </motion.div>
          )}

          {/* Expanded: show all tips */}
          {expanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              className="space-y-1.5"
            >
              {tips.map((tip, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-2 px-3 py-2 rounded-xl"
                  style={{
                    background: tip.type === "warning"
                      ? "linear-gradient(135deg, rgba(239,68,68,0.75), rgba(220,38,38,0.55))"
                      : "linear-gradient(135deg, rgba(59,130,246,0.75), rgba(37,99,235,0.55))",
                    backdropFilter: "blur(16px)",
                  }}
                >
                  {tip.icon === "alert" ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-white flex-shrink-0 mt-0.5" strokeWidth={2} />
                  ) : (
                    <Lightbulb className="w-3.5 h-3.5 text-white flex-shrink-0 mt-0.5" strokeWidth={2} />
                  )}
                  <span className="text-white text-[11px] font-semibold text-right"
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
                    {tip.text}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
