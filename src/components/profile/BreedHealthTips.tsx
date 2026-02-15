/**
 * BreedHealthTips - Breed-specific health tips for the pet profile
 * Shows relevant care advice based on breed, age, and known risks
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Sparkles, Eye, Wind, Scissors, Utensils } from "lucide-react";

interface BreedHealthTipsProps {
  petName: string;
  breed?: string;
  ageMonths?: number;
  ageYears?: number;
  petType: 'dog' | 'cat';
}

interface BreedTip {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  bg: string;
}

// Shih Tzu-specific tips
const SHIH_TZU_TIPS: BreedTip[] = [
  {
    icon: Eye,
    title: 'מניעת כתמי דמעות',
    description: 'נקו מדי יום סביב העיניים עם מגבונים ייעודיים. שיצו נוטים לדמיעה מוגברת.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Wind,
    title: 'בטיחות נשימתית',
    description: 'גזע ברכיצפלי — הימנעו ממאמץ בחום, טיולים קצרים, רתמה ולא קולר.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    icon: Scissors,
    title: 'טיפוח פרווה ארוכה',
    description: 'ברישינג יומי למניעת סבכים. רחצה בשמפו היפואלרגני פעם בשבועיים.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Utensils,
    title: 'גודל אוכל מותאם',
    description: 'קיבל Extra Small / Easy Grip — גודל קטן במיוחד מותאם ללסת של שיצו.',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
];

// Puppy-specific tips (under 6 months)
const PUPPY_TIPS: BreedTip[] = [
  {
    icon: Sparkles,
    title: 'עצות גדילה לגיל הגור',
    description: 'מזון גורים עשיר בחלבון, ביקור וטרינר כל 3-4 שבועות, חיסונים ראשוניים.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
];

const isShihTzu = (breed?: string) => {
  if (!breed) return false;
  const lower = breed.toLowerCase();
  return lower.includes('shih tzu') || lower.includes('שיצו') || lower.includes('שי טסו');
};

export const BreedHealthTips = ({ petName, breed, ageMonths, ageYears, petType }: BreedHealthTipsProps) => {
  const tips = useMemo(() => {
    const result: BreedTip[] = [];

    // Add puppy tips for young pets
    const totalMonths = (ageYears || 0) * 12 + (ageMonths || 0);
    if (totalMonths > 0 && totalMonths <= 6) {
      result.push(...PUPPY_TIPS);
    }

    // Add breed-specific tips
    if (isShihTzu(breed)) {
      result.push(...SHIH_TZU_TIPS);
    }

    return result;
  }, [breed, ageMonths, ageYears]);

  if (tips.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4"
    >
      <div className="p-4 bg-card rounded-2xl border border-border/30">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.5} />
          <span className="font-semibold text-foreground text-sm">
            טיפים ל{petName}
          </span>
          {breed && (
            <span className="text-[10px] text-muted-foreground">({breed})</span>
          )}
        </div>

        <div className="space-y-2">
          {tips.map((tip, i) => {
            const Icon = tip.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-2.5 p-2.5 rounded-xl bg-muted/20"
              >
                <div className={`w-8 h-8 rounded-full ${tip.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${tip.color}`} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{tip.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{tip.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};
