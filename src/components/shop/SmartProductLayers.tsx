/**
 * SmartProductLayers — All 6 personalized AI layers for the Product Detail page.
 * 1. Health Impact Gauge
 * 2. Personalized "Why" section
 * 3. Smart Feeding/Usage Guide
 * 4. Veterinary Approval Badge
 * 5. Floating "Ask the Brain" chat button
 * 6. Subscribe & Save hook
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gauge, Sparkles, ShieldCheck, Brain, RefreshCw, Check,
  Calculator, TrendingUp, Stethoscope, MessageCircle, X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { useActivePet, type ActivePet } from "@/hooks/useActivePet";

// ── Helpers ──

function estimateDailyGrams(weight: number | null, petType: string): number {
  if (!weight) return 0;
  if (petType === "cat") {
    // Cats: ~3-4% for kittens, ~2-3% for adults
    if (weight <= 3) return Math.round(weight * 35);
    if (weight <= 6) return Math.round(weight * 28);
    return Math.round(weight * 22);
  }
  // Dogs
  if (weight <= 5) return Math.round(weight * 30);
  if (weight <= 15) return Math.round(weight * 25);
  return Math.round(weight * 20);
}

function formatRunOutDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
}

function getSpeciesNameHe(petType: string): string {
  return petType === "cat" ? "חתול" : "כלב";
}

function parseBagKg(name: string): number {
  // Try to extract weight from product name e.g. "12 ק״ג", "2.5kg", "7.5 קילו"
  const match = name.match(/(\d+\.?\d*)\s*(?:ק[״"]?ג|kg|קילו)/i);
  if (match) return parseFloat(match[1]);
  // Try grams
  const gMatch = name.match(/(\d+)\s*(?:גרם|gr|g)\b/i);
  if (gMatch) return parseInt(gMatch[1]) / 1000;
  return 0;
}

function getLifeStageHe(ageWeeks: number | null): string {
  if (!ageWeeks) return "";
  if (ageWeeks < 26) return "גור";
  if (ageWeeks < 52) return "צעיר";
  if (ageWeeks < 364) return "בוגר";
  return "מבוגר";
}

// ── Types ──

interface SmartProductLayersProps {
  productName: string;
  productDescription: string;
  productCategory: string | null;
  productIngredients: string | null;
  productPrice: number;
}

// ── 1. Health Impact Gauge ──

const HealthImpactGauge = ({ pet, productName, productCategory, productDescription }: {
  pet: ActivePet;
  productName: string;
  productCategory: string | null;
  productDescription: string;
}) => {
  const impact = useMemo(() => {
    const text = `${productName} ${productDescription} ${productCategory || ""}`.toLowerCase();
    let boost = 0;
    let area = "בריאות כללית";

    // Coat / skin
    if (text.includes("omega") || text.includes("אומגה") || text.includes("salmon") || text.includes("סלמון") || text.includes("coat") || text.includes("פרווה")) {
      boost = 30;
      area = "מצב פרווה";
    }
    // Joint / mobility
    else if (text.includes("joint") || text.includes("מפרקים") || text.includes("glucosamine") || text.includes("mobility")) {
      boost = 25;
      area = "תמיכה במפרקים";
    }
    // Digestive
    else if (text.includes("probiotic") || text.includes("פרוביוטי") || text.includes("digestive") || text.includes("עיכול")) {
      boost = 20;
      area = "בריאות מערכת עיכול";
    }
    // Dental
    else if (text.includes("dental") || text.includes("שיניים") || text.includes("teeth")) {
      boost = 15;
      area = "בריאות שיניים";
    }
    // General nutrition
    else if (text.includes("vitamin") || text.includes("ויטמין") || text.includes("supplement") || text.includes("תוסף")) {
      boost = 15;
      area = "תזונה כללית";
    }
    // Premium food
    else if (text.includes("premium") || text.includes("פרימיום") || text.includes("holistic") || text.includes("organic")) {
      boost = 10;
      area = "תזונה איכותית";
    }

    if (boost === 0) return null;

    const currentScore = 60;
    const projectedScore = Math.min(95, currentScore + boost);
    const targetGap = 95 - projectedScore;
    return { area, currentScore, projectedScore, boost, targetGap };
  }, [productName, productDescription, productCategory]);

  if (!impact) return null;

  const circumference = 2 * Math.PI * 38;
  const currentOffset = circumference - (impact.currentScore / 100) * circumference;
  const projectedOffset = circumference - (impact.projectedScore / 100) * circumference;

  return (
    <Card className="p-4 border-border/30">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
        <Gauge className="w-4 h-4 text-primary" strokeWidth={1.5} />
        מדד השפעה בריאותי
      </h3>
      <div className="flex items-center gap-4">
        {/* SVG Gauge */}
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r="38" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
            <circle cx="44" cy="44" r="38" fill="none" stroke="hsl(var(--muted-foreground) / 0.3)" strokeWidth="6"
              strokeDasharray={circumference} strokeDashoffset={currentOffset} strokeLinecap="round" />
            <motion.circle cx="44" cy="44" r="38" fill="none" stroke="hsl(var(--primary))" strokeWidth="6"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: currentOffset }}
              animate={{ strokeDashoffset: projectedOffset }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
              strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-lg font-black text-primary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {impact.projectedScore}%
            </motion.span>
          </div>
        </div>

        {/* Text */}
        <div className="flex-1">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-bold text-foreground">{impact.area}</span> של {pet.name} ({getSpeciesNameHe(pet.pet_type)}{pet.breed ? ` ${pet.breed}` : ""}) צפוי לעלות מ-
            <span className="font-bold text-muted-foreground">{impact.currentScore}%</span> ל-
            <span className="font-bold text-primary">{impact.projectedScore}%</span> תוך 4 שבועות
          </p>
          <div className="flex items-center gap-1 mt-1.5">
            <TrendingUp className="w-3 h-3 text-primary" strokeWidth={2} />
            <span className="text-[10px] font-semibold text-primary">+{impact.boost}% לציון הבריאות (יעד: 95%)</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

// ── 2. Personalized Why ──

const PersonalizedWhy = ({ pet, productName, productDescription }: {
  pet: ActivePet;
  productName: string;
  productDescription: string;
}) => {
  const reason = useMemo(() => {
    const text = `${productName} ${productDescription}`.toLowerCase();
    const stage = getLifeStageHe(pet.ageWeeks);
    const breed = pet.breed || "חיית המחמד שלך";
    const parts: string[] = [];

    // Age-based
    if (pet.ageWeeks !== null && pet.ageWeeks < 26) {
      parts.push(`מכיוון ש${pet.name} ${stage}${pet.breed ? ` ${breed}` : ""} ${pet.ageWeeks ? `בגיל ${Math.round(pet.ageWeeks / 4)} חודשים` : ""}`);
    } else if (pet.ageWeeks !== null && pet.ageWeeks > 364) {
      parts.push(`${pet.name} ${stage}, ולכן צריך תמיכה מותאמת לגילו`);
    } else {
      parts.push(`${pet.name}${pet.breed ? ` (${breed})` : ""}`);
    }

    // Product-specific reasoning
    if (text.includes("omega") || text.includes("אומגה") || text.includes("salmon")) {
      parts.push("הפרווה זקוקה לתוסף אומגה 3 כדי לצמוח בריאה ולמנוע קשרים");
    } else if (text.includes("puppy") || text.includes("גורים") || text.includes("growth")) {
      parts.push("נמצא בשלב גדילה קריטי ודורש תזונה עשירה בחלבון וסידן");
    } else if (text.includes("joint") || text.includes("מפרקים")) {
      parts.push("זקוק לתמיכה במפרקים לשמירה על ניידות ובריאות לאורך זמן");
    } else if (text.includes("dental") || text.includes("שיניים")) {
      parts.push("צריך תמיכה בבריאות השיניים והחניכיים");
    } else if (text.includes("sensitive") || text.includes("רגיש")) {
      parts.push("יכול להפיק תועלת ממזון בניסוח רגיש ועדין");
    } else {
      parts.push("ייהנה ממוצר איכותי זה כחלק משגרת הטיפול");
    }

    // Medical conditions
    if (pet.medical_conditions && pet.medical_conditions.length > 0) {
      parts.push(`בהתחשב במצב הבריאותי (${pet.medical_conditions.join(", ")})`);
    }

    return parts.join(", ") + ".";
  }, [pet, productName, productDescription]);

  return (
    <Card className="p-4 border-border/30">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.5} />
        למה זה מתאים ל{pet.name}?
      </h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{reason}</p>
    </Card>
  );
};

// ── 3. Smart Feeding Guide ──

const SmartFeedingGuide = ({ pet, productName, productPrice }: {
  pet: ActivePet;
  productName: string;
  productPrice: number;
}) => {
  const calc = useMemo(() => {
    if (!pet.weight) return null;
    const bagKg = parseBagKg(productName);
    if (bagKg <= 0) return null;
    const dailyG = estimateDailyGrams(pet.weight, pet.pet_type);
    if (dailyG <= 0) return null;
    const days = Math.round((bagKg * 1000) / dailyG);
    const costPerDay = (productPrice / days).toFixed(1);
    const runOutDate = formatRunOutDate(days);
    return { dailyG, days, costPerDay, bagKg, runOutDate };
  }, [pet, productName, productPrice]);
  if (!calc) return null;

  return (
    <Card className="p-4 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
        <Calculator className="w-4 h-4 text-primary" strokeWidth={1.5} />
        מדריך חכם ל{pet.name} ({getSpeciesNameHe(pet.pet_type)}{pet.breed ? `, ${pet.breed}` : ""}, {pet.weight} ק״ג)
      </h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-2.5 rounded-xl bg-card border border-border/30">
          <p className="text-lg font-black text-primary">{calc.dailyG}g</p>
          <p className="text-[10px] text-muted-foreground">מנה יומית</p>
        </div>
        <div className="text-center p-2.5 rounded-xl bg-card border border-border/30">
          <p className="text-lg font-black text-primary">{calc.days}</p>
          <p className="text-[10px] text-muted-foreground">ימים</p>
        </div>
        <div className="text-center p-2.5 rounded-xl bg-card border border-border/30">
          <p className="text-lg font-black text-primary">₪{calc.costPerDay}</p>
          <p className="text-[10px] text-muted-foreground">ליום</p>
        </div>
      </div>
      <div className="mt-2.5 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 text-center">
        <p className="text-[11px] text-muted-foreground">
          📦 שק {calc.bagKg} ק״ג יספיק ל{pet.name} עד <span className="font-bold text-foreground">{calc.runOutDate}</span>
        </p>
      </div>
    </Card>
  );
};

// ── 4. Veterinary Approval Badge ──

const VetApprovalBadge = ({ pet, productName, productDescription }: {
  pet: ActivePet;
  productName: string;
  productDescription: string;
}) => {
  const matchedCondition = useMemo(() => {
    if (!pet.medical_conditions || pet.medical_conditions.length === 0) return null;
    const text = `${productName} ${productDescription}`.toLowerCase();
    
    const conditionKeywordMap: Record<string, string[]> = {
      "עיכול": ["gastro", "digestive", "עיכול", "sensitive stomach"],
      "כליות": ["renal", "kidney", "כליות"],
      "שתן": ["urinary", "שתן", "struvite"],
      "עור": ["skin", "derma", "עור", "hypoallergenic"],
      "משקל": ["diet", "weight", "light", "דיאטה"],
      "מפרקים": ["joint", "mobility", "מפרקים", "glucosamine"],
      "סוכרת": ["diabetic", "סוכרת", "low carb"],
    };

    for (const condition of pet.medical_conditions) {
      const condLower = condition.toLowerCase();
      for (const [key, keywords] of Object.entries(conditionKeywordMap)) {
        if (condLower.includes(key) && keywords.some(kw => text.includes(kw))) {
          return condition;
        }
      }
    }
    return null;
  }, [pet, productName, productDescription]);

  if (!matchedCondition) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2.5 px-4 py-3 rounded-xl border-2"
      style={{
        borderColor: "hsl(var(--primary) / 0.3)",
        background: "linear-gradient(135deg, hsl(var(--primary) / 0.05), hsl(var(--primary) / 0.1))",
      }}
    >
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <ShieldCheck className="w-4 h-4 text-primary" strokeWidth={2} />
      </div>
      <div>
        <p className="text-xs font-bold text-primary">מאושר רפואית</p>
        <p className="text-[10px] text-muted-foreground">
          מתאים לטיפול ב{matchedCondition} של {pet.name}
        </p>
      </div>
    </motion.div>
  );
};

// ── 5. Ask the Brain FAB ──

const AskBrainFAB = ({ pet, productName }: {
  pet: ActivePet;
  productName: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed left-4 z-30 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center"
        style={{ bottom: "150px" }}
        whileTap={{ scale: 0.9 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
      >
        <Brain className="w-5 h-5" strokeWidth={1.5} />
      </motion.button>

      {/* Mini chat overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed left-4 right-4 z-50 max-w-sm"
            style={{ bottom: "150px" }}
          >
            <Card className="p-4 shadow-2xl border-primary/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  <span className="text-sm font-bold text-foreground">שאל את המוח</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-muted">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 mb-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <MessageCircle className="w-3 h-3 inline ml-1 text-primary" />
                  יש לך שאלה לגבי <span className="font-bold text-foreground">{productName}</span> עבור {pet.name}?
                </p>
              </div>
              <div className="space-y-1.5">
                {[
                  `האם ${productName} בטוח ל${pet.name}?`,
                  `מה הכמות המומלצת ל${pet.breed || pet.pet_type}?`,
                  `יש אלטרנטיבה טובה יותר?`,
                ].map((q, i) => (
                  <button
                    key={i}
                    className="w-full text-right px-3 py-2 rounded-lg text-[11px] font-medium text-foreground bg-card border border-border/30 hover:bg-primary/5 hover:border-primary/20 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ── 6. Subscribe & Save Hook ──

const SubscribeHook = ({ pet, productName, productPrice }: {
  pet: ActivePet;
  productName: string;
  productPrice: number;
}) => {
  const [subscribed, setSubscribed] = useState(false);

  const calc = useMemo(() => {
    if (!pet.weight) return null;
    const bagKg = parseBagKg(productName);
    if (bagKg <= 0) return null;
    const dailyG = estimateDailyGrams(pet.weight, pet.pet_type);
    if (dailyG <= 0) return null;
    const days = Math.round((bagKg * 1000) / dailyG);
    const discounted = (productPrice * 0.9).toFixed(0);
    const nextDelivery = formatRunOutDate(days);
    return { days, discounted, nextDelivery };
  }, [pet, productName, productPrice]);

  if (!calc) return null;

  return (
    <Card className="p-4 border-border/30">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
        <RefreshCw className="w-4 h-4 text-primary" strokeWidth={1.5} />
        הירשם וחסוך 10%
      </h3>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs text-muted-foreground">
            משלוח אוטומטי כל <span className="font-bold text-foreground">{calc.days} ימים</span>
          </p>
          <p className="text-xs text-muted-foreground">
            מותאם לצריכה של {pet.name}
          </p>
        </div>
        <div className="text-left">
          <p className="text-xs text-muted-foreground line-through">₪{productPrice}</p>
          <p className="text-lg font-black text-primary">₪{calc.discounted}</p>
        </div>
      </div>
      <div className="mb-3 px-3 py-1.5 rounded-lg bg-accent/50 text-center">
        <p className="text-[10px] text-muted-foreground">
          📅 משלוח ראשון: <span className="font-bold text-foreground">{calc.nextDelivery}</span>
        </p>
      </div>
      <motion.button
        onClick={() => setSubscribed(true)}
        disabled={subscribed}
        whileTap={{ scale: 0.97 }}
        className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
        style={{
          background: subscribed ? "hsl(var(--primary) / 0.1)" : "hsl(var(--primary))",
          color: subscribed ? "hsl(var(--primary))" : "hsl(var(--primary-foreground))",
        }}
      >
        {subscribed ? (
          <><Check className="w-4 h-4" /> נרשמת! נשלח כל {calc.days} ימים</>
        ) : (
          <>נשלח לך שק חדש כל {calc.days} ימים</>
        )}
      </motion.button>
    </Card>
  );
};

// ── Main Component ──

export const SmartProductLayers = ({
  productName,
  productDescription,
  productCategory,
  productIngredients,
  productPrice,
}: SmartProductLayersProps) => {
  const { pet, loading } = useActivePet();

  if (loading || !pet) return null;

  const fullDescription = `${productDescription} ${productIngredients || ""}`;

  return (
    <>
      {/* Inline layers */}
      <div className="mx-4 mt-3 space-y-3">
        <HealthImpactGauge pet={pet} productName={productName} productCategory={productCategory} productDescription={fullDescription} />
        <PersonalizedWhy pet={pet} productName={productName} productDescription={fullDescription} />
        <SmartFeedingGuide pet={pet} productName={productName} productPrice={productPrice} />
        <VetApprovalBadge pet={pet} productName={productName} productDescription={fullDescription} />
        <SubscribeHook pet={pet} productName={productName} productPrice={productPrice} />
      </div>

      {/* Floating Ask Brain */}
      <AskBrainFAB pet={pet} productName={productName} />
    </>
  );
};
