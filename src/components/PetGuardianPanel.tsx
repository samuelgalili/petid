/**
 * PetGuardianPanel — User-facing "Digital Guardian" overlay.
 * Shows friendly, personalized insights instead of raw data/logs.
 * Agent names are hidden — uses warm persona language.
 */
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Shield, Heart, Sparkles, TrendingUp, X, ChevronRight, AlertCircle } from "lucide-react";
import { useCentralBrain } from "@/contexts/CentralBrainContext";
import { usePetPreference } from "@/contexts/PetPreferenceContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface PetGuardianPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PetGuardianPanel = ({ isOpen, onClose }: PetGuardianPanelProps) => {
  const { brainSnapshot, discrepancies } = useCentralBrain();
  const { activePet } = usePetPreference();
  const { language } = useLanguage();
  const isHe = language === "he" || language === "ar";

  const petName = activePet?.name || (isHe ? "חיית המחמד שלך" : "your pet");

  // Generate friendly insights from brain data
  const insights = generateInsights(brainSnapshot, petName, isHe);
  const greeting = isHe
    ? `היי, אני מנתח/ת את הנתונים הבריאותיים של ${petName} 🧠`
    : `Hi, I'm analyzing ${petName}'s health data 🧠`;

  const subtitle = isHe
    ? `היום יש לנו ${insights.length} תובנות חדשות${discrepancies.length > 0 ? ` ו-${discrepancies.length} עדכון שדורש תשומת לב` : ""}`
    : `Today we have ${insights.length} new insights${discrepancies.length > 0 ? ` and ${discrepancies.length} update${discrepancies.length > 1 ? "s" : ""} needing attention` : ""}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel — slides up from bottom */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-[10002] max-h-[75vh] overflow-y-auto",
              "bg-background/95 backdrop-blur-xl rounded-t-3xl",
              "border-t border-border/50 shadow-2xl",
              "pb-[calc(env(safe-area-inset-bottom)+16px)]"
            )}
            dir={isHe ? "rtl" : "ltr"}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
            </div>

            {/* Header */}
            <div className="px-5 pt-2 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-primary" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {isHe ? "השומר הדיגיטלי" : "Digital Guardian"}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {isHe ? "מעקב חכם בזמן אמת" : "Smart real-time monitoring"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Greeting bubble */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-primary/8 border border-primary/15 rounded-2xl px-4 py-3"
              >
                <p className="text-sm font-medium text-foreground leading-relaxed">{greeting}</p>
                <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
              </motion.div>
            </div>

            {/* Insight Cards */}
            <div className="px-5 space-y-2.5 pb-4">
              {insights.map((insight, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: isHe ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.08 }}
                  className={cn(
                    "flex items-start gap-3 p-3.5 rounded-2xl border transition-colors",
                    insight.type === "health" && "bg-emerald-500/5 border-emerald-500/15",
                    insight.type === "nutrition" && "bg-amber-500/5 border-amber-500/15",
                    insight.type === "insurance" && "bg-blue-500/5 border-blue-500/15",
                    insight.type === "alert" && "bg-red-500/5 border-red-500/15",
                    insight.type === "tip" && "bg-violet-500/5 border-violet-500/15"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                    insight.type === "health" && "bg-emerald-500/15",
                    insight.type === "nutrition" && "bg-amber-500/15",
                    insight.type === "insurance" && "bg-blue-500/15",
                    insight.type === "alert" && "bg-red-500/15",
                    insight.type === "tip" && "bg-violet-500/15"
                  )}>
                    <insight.icon className={cn(
                      "w-4.5 h-4.5",
                      insight.type === "health" && "text-emerald-600 dark:text-emerald-400",
                      insight.type === "nutrition" && "text-amber-600 dark:text-amber-400",
                      insight.type === "insurance" && "text-blue-600 dark:text-blue-400",
                      insight.type === "alert" && "text-red-600 dark:text-red-400",
                      insight.type === "tip" && "text-violet-600 dark:text-violet-400"
                    )} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground leading-snug">{insight.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{insight.description}</p>
                  </div>
                  <ChevronRight className={cn(
                    "w-4 h-4 text-muted-foreground/40 shrink-0 mt-1",
                    isHe && "rotate-180"
                  )} />
                </motion.div>
              ))}

              {insights.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8"
                >
                  <Shield className="w-10 h-10 text-primary/30 mx-auto mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">
                    {isHe ? "הכל תקין! אין עדכונים חדשים" : "All clear! No new updates"}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Footer trust badge */}
            <div className="px-5 pb-2">
              <div className="flex items-center justify-center gap-1.5 py-2.5 border-t border-border/30">
                <Shield className="w-3.5 h-3.5 text-primary/50" />
                <span className="text-[10px] text-muted-foreground/60">
                  {isHe ? "מוגן ומאובטח על ידי PetID" : "Protected & secured by PetID"}
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ============= Insight Generator =============
type InsightType = "health" | "nutrition" | "insurance" | "alert" | "tip";

interface Insight {
  icon: typeof Heart;
  type: InsightType;
  title: string;
  description: string;
}

function generateInsights(
  snapshot: ReturnType<typeof useCentralBrain>["brainSnapshot"],
  petName: string,
  isHe: boolean
): Insight[] {
  const insights: Insight[] = [];

  // Nutrition insight (PetID Scientific Standard)
  if (snapshot.nrc) {
    insights.push({
      icon: Sparkles,
      type: "nutrition",
      title: isHe ? `צריכת אנרגיה יומית של ${petName}` : `${petName}'s daily energy needs`,
      description: isHe
        ? `לפי התקן המדעי של PetID, ${petName} צריך/ה בערך ${snapshot.nrc.mer} קק"ל ביום. אנחנו עוקבים בשבילך.`
        : `Based on PetID's Scientific Standard, ${petName} needs around ${snapshot.nrc.mer} kcal/day. We're tracking for you.`,
    });
  }

  // Health records insight
  if (snapshot.vetVisits.length > 0) {
    const lastVisit = snapshot.vetVisits[0];
    const visitDate = new Date(lastVisit.visit_date).toLocaleDateString(isHe ? "he-IL" : "en-US");
    insights.push({
      icon: Heart,
      type: "health",
      title: isHe ? "מעקב ביקור וטרינרי" : "Vet visit tracking",
      description: isHe
        ? `הביקור האחרון היה ב-${visitDate}${lastVisit.next_visit_date ? ". הביקור הבא כבר מתוזמן" : ". נזכיר לך כשמגיע הזמן"}.`
        : `Last visit was ${visitDate}${lastVisit.next_visit_date ? ". Next visit already scheduled" : ". We'll remind you when it's time"}.`,
    });
  }

  // Document/OCR insight
  if (snapshot.ocrRecords.length > 0) {
    const vaccineRecords = snapshot.ocrRecords.filter(r => r.vaccination_type);
    if (vaccineRecords.length > 0) {
      insights.push({
        icon: Shield,
        type: "insurance",
        title: isHe ? "חיסונים מעודכנים" : "Vaccinations up to date",
        description: isHe
          ? `זיהינו ${vaccineRecords.length} רשומות חיסון סרוקות. כל המידע שמור בכספת הדיגיטלית.`
          : `Found ${vaccineRecords.length} scanned vaccine records. All data saved in your digital vault.`,
      });
    }
  }

  // Discrepancy alert (friendly language)
  if (snapshot.discrepancies.length > 0) {
    insights.push({
      icon: AlertCircle,
      type: "alert",
      title: isHe ? "שימו לב — נמצא פער בנתונים" : "Heads up — data mismatch found",
      description: isHe
        ? `מצאנו הבדל קטן בין הפרופיל למסמכים הסרוקים. כדאי לבדוק ולאשר.`
        : `We found a small difference between the profile and scanned documents. Worth reviewing.`,
    });
  }

  // General tip if no other insights
  if (insights.length === 0 && snapshot.petProfile) {
    insights.push({
      icon: TrendingUp,
      type: "tip",
      title: isHe ? `${petName} במעקב מלא` : `${petName} is fully monitored`,
      description: isHe
        ? "המערכת סורקת בזמן אמת את התזונה, הבריאות והמסמכים. אין צורך לדאוג."
        : "The system is scanning nutrition, health, and documents in real-time. Nothing to worry about.",
    });
  }

  return insights;
}
