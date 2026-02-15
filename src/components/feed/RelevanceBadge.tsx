/**
 * RelevanceBadge — "מתאים לוונדי ב-98%" confidence badge on feed posts.
 * Calculates relevance score based on post caption vs pet breed/type/age.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface RelevanceBadgeProps {
  caption: string | null;
  petName: string | null;
  petBreed: string | null;
  petType: string | null;
  petAgeWeeks: number | null;
  medicalConditions?: string[] | null;
}

// Keywords that boost relevance per pet type/breed
const BREED_KEYWORDS: Record<string, string[]> = {
  "שי טסו": ["שיצו", "שי טסו", "shih tzu", "טיפוח", "פרווה", "grooming", "דמעות", "tear stain", "קטן", "small breed"],
  "גולדן רטריבר": ["גולדן", "golden", "retriever", "שחייה", "אילוף", "training", "גדול", "large"],
  "חתול": ["חתול", "cat", "חתולים", "שתן", "urinary", "סירוס", "עיקור"],
  "כלב": ["כלב", "dog", "כלבים", "גור", "puppy"],
};

const AGE_KEYWORDS: Record<string, string[]> = {
  puppy: ["גור", "גורים", "puppy", "חיסון", "vaccine", "אילוף בסיסי", "גמילה"],
  adult: ["בוגר", "adult", "תזונה", "exercise", "פעילות"],
  senior: ["מבוגר", "senior", "זקן", "מפרקים", "joint", "בריאות"],
};

// Health-related keywords that boost relevance when pet has matching conditions
const HEALTH_KEYWORDS: Record<string, string[]> = {
  "סוכרת": ["סוכרת", "diabetic", "diabetes", "אינסולין", "insulin", "סוכר בדם"],
  "כליות": ["כליות", "renal", "kidney", "חלבון מופחת", "low protein"],
  "אלרגיה": ["אלרגיה", "allergy", "היפואלרגני", "hypoallergenic", "רגישות"],
  "עיכול": ["עיכול", "digestive", "gastro", "פרוביוטיקה", "probiotic"],
  "עור": ["עור", "skin", "derma", "אומגה", "omega", "פרווה"],
  "משקל": ["משקל", "weight", "דיאטה", "diet", "קלוריות", "obesity"],
};

function calculateScore(caption: string, breed: string | null, petType: string | null, ageWeeks: number | null, medicalConditions?: string[] | null): number {
  if (!caption) return 0;
  const lowerCaption = caption.toLowerCase();
  let score = 50; // Base score

  // Breed match
  const breedKey = breed || petType || "כלב";
  const breedWords = BREED_KEYWORDS[breedKey] || BREED_KEYWORDS[petType || "כלב"] || [];
  for (const kw of breedWords) {
    if (lowerCaption.includes(kw.toLowerCase())) {
      score += 15;
    }
  }

  // Age match
  let ageCategory = "adult";
  if (ageWeeks !== null) {
    if (ageWeeks < 26) ageCategory = "puppy";
    else if (ageWeeks > 364) ageCategory = "senior";
  }
  const ageWords = AGE_KEYWORDS[ageCategory] || [];
  for (const kw of ageWords) {
    if (lowerCaption.includes(kw.toLowerCase())) {
      score += 10;
    }
  }

  // Pet type match
  if (petType === "cat" && (lowerCaption.includes("חתול") || lowerCaption.includes("cat"))) score += 12;
  if (petType === "dog" && (lowerCaption.includes("כלב") || lowerCaption.includes("dog"))) score += 12;

  // General pet content bonus
  if (lowerCaption.includes("🐾") || lowerCaption.includes("🐕") || lowerCaption.includes("🐱")) score += 5;

  // Negative signals — content about very different breeds
  if (petType === "cat" && (lowerCaption.includes("כלב גדול") || lowerCaption.includes("giant breed"))) score -= 30;
  if (petType === "dog" && lowerCaption.includes("חתול בלבד")) score -= 25;

  // Health condition match bonus
  if (medicalConditions && medicalConditions.length > 0) {
    for (const condition of medicalConditions) {
      const condLower = condition.toLowerCase();
      const keywords = Object.entries(HEALTH_KEYWORDS).find(([key]) => condLower.includes(key));
      if (keywords) {
        for (const kw of keywords[1]) {
          if (lowerCaption.includes(kw.toLowerCase())) {
            score += 18; // Strong boost for health-relevant content
            break;
          }
        }
      }
    }
  }

  return Math.min(Math.max(score, 15), 99);
}

export const RelevanceBadge = ({ caption, petName, petBreed, petType, petAgeWeeks, medicalConditions }: RelevanceBadgeProps) => {
  const score = useMemo(
    () => calculateScore(caption || "", petBreed, petType, petAgeWeeks, medicalConditions),
    [caption, petBreed, petType, petAgeWeeks, medicalConditions]
  );

  // Don't show for very low scores
  if (score < 40 || !petName) return null;

  const isHigh = score >= 75;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.6, type: "spring", stiffness: 300 }}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-lg"
      style={{
        background: isHigh
          ? "linear-gradient(135deg, rgba(34,197,94,0.85), rgba(22,163,74,0.7))"
          : "linear-gradient(135deg, rgba(250,204,21,0.85), rgba(234,179,8,0.7))",
        backdropFilter: "blur(12px)",
      }}
    >
      <Sparkles className="w-3 h-3 text-white" strokeWidth={2} />
      <span className="text-white text-[11px] font-bold" style={{ textShadow: "0 1px 2px rgba(0,0,0,0.3)" }}>
        מתאים ל{petName} ב-{score}%
      </span>
    </motion.div>
  );
};
