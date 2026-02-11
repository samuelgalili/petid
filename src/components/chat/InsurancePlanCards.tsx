import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Check, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface InsurancePlan {
  id: string;
  name: string;
  price: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
}

interface InsurancePlanCardsProps {
  petName: string;
  petType: string;
  breed: string | null;
  ageYears: number | null;
  petId?: string | null;
  healthAnswer1?: string;
  healthAnswer2?: string;
}

const LIBRA_PLANS: InsurancePlan[] = [
  {
    id: "basic",
    name: "בסיסי",
    price: "59",
    features: ["כיסוי תאונות", "ניתוחים דחופים", "קו ייעוץ 24/7"],
    badge: "פופולרי",
  },
  {
    id: "plus",
    name: "פלוס",
    price: "99",
    features: ["כל הבסיסי +", "ביקורים שנתיים", "חיסונים", "בדיקות דם"],
    highlight: true,
    badge: "מומלץ",
  },
  {
    id: "premium",
    name: "פרימיום",
    price: "149",
    features: ["כל הפלוס +", "מחלות כרוניות", "טיפולי שיניים", "פיזיותרפיה"],
  },
];

// Libra brand colors
const LIBRA_BLUE = "210 90% 45%";
const LIBRA_DARK = "210 90% 30%";

export const InsurancePlanCards = ({
  petName,
  petType,
  breed,
  ageYears,
  petId,
  healthAnswer1,
  healthAnswer2,
}: InsurancePlanCardsProps) => {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const PHONE_REGEX = /^0[2-9]\d{7,8}$/;

  const handleSubmitLead = async () => {
    if (!user || !selectedPlan) return;

    const cleaned = phone.replace(/[-\s]/g, "");
    if (!PHONE_REGEX.test(cleaned)) {
      setPhoneError("מספר טלפון לא תקין (לדוגמה: 0501234567)");
      return;
    }
    setPhoneError(null);
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("insurance_leads").insert({
        user_id: user.id,
        pet_id: petId || null,
        pet_name: petName,
        pet_type: petType,
        breed: breed,
        age_years: ageYears,
        phone: cleaned,
        health_answer_1: healthAnswer1 || null,
        health_answer_2: healthAnswer2 || null,
        selected_plan: selectedPlan,
      });

      if (error) throw error;
      setIsSuccess(true);
    } catch (err) {
      console.error("Insurance lead error:", err);
      toast({ title: "שגיאה", description: "לא הצלחנו לשלוח את הפנייה", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center text-center py-5 gap-3"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.1 }}
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `hsl(${LIBRA_BLUE} / 0.15)` }}
        >
          <Check className="w-8 h-8" style={{ color: `hsl(${LIBRA_BLUE})` }} />
        </motion.div>
        <div>
          <p className="text-base font-bold text-foreground">הפנייה נשלחה בהצלחה! 🎉</p>
          <p className="text-sm text-muted-foreground mt-1">
            נציג מ-Libra יחזור אליך תוך 24 שעות
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 mt-2 w-full min-w-0"
    >
      {/* Libra branding header */}
      <div className="flex items-center gap-2 px-1">
        <Shield className="w-4 h-4" style={{ color: `hsl(${LIBRA_BLUE})` }} />
        <span className="text-xs font-bold" style={{ color: `hsl(${LIBRA_BLUE})` }}>
          Libra Insurance
        </span>
        <span className="text-[10px] text-muted-foreground">• תוכניות ל{petName}</span>
      </div>

      {/* Plan cards - vertical */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
        {LIBRA_PLANS.map((plan, idx) => {
          const isSelected = selectedPlan === plan.id;
          return (
            <motion.button
              key={plan.id}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative flex-shrink-0 w-[75%] snap-center text-right rounded-2xl border-2 p-4 transition-all ${
                isSelected
                  ? "shadow-md"
                  : plan.highlight
                  ? "border-border/60 bg-card"
                  : "border-border/40 bg-card/80"
              }`}
              style={
                isSelected
                  ? {
                      borderColor: `hsl(${LIBRA_BLUE})`,
                      backgroundColor: `hsl(${LIBRA_BLUE} / 0.05)`,
                    }
                  : undefined
              }
            >
              {/* Badge */}
              {plan.badge && (
                <span
                  className="absolute -top-2.5 left-3 text-[10px] font-bold text-white px-2.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: plan.highlight
                      ? `hsl(${LIBRA_BLUE})`
                      : `hsl(${LIBRA_DARK})`,
                  }}
                >
                  {plan.badge}
                </span>
              )}

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Shield
                    className="w-5 h-5"
                    style={{ color: isSelected ? `hsl(${LIBRA_BLUE})` : undefined }}
                  />
                  <span className="font-bold text-foreground">{plan.name}</span>
                </div>
                <div className="text-left">
                  <span className="text-lg font-bold" style={{ color: `hsl(${LIBRA_BLUE})` }}>
                    ₪{plan.price}
                  </span>
                  <span className="text-[10px] text-muted-foreground">/חודש</span>
                </div>
              </div>

              <ul className="space-y-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="w-3 h-3 flex-shrink-0" style={{ color: `hsl(${LIBRA_BLUE})` }} />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.button>
          );
        })}
      </div>

      {/* Phone capture - shows after plan selection */}
      <AnimatePresence>
        {selectedPlan && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2.5 overflow-hidden"
          >
            <p className="text-xs text-muted-foreground px-1">
              השאר מספר טלפון ונציג Libra יחזור אליך עם הצעה אישית:
            </p>
            <div>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setPhoneError(null);
                  }}
                  placeholder="050-1234567"
                  className={`h-11 pr-10 rounded-xl ${phoneError ? "border-destructive" : "border-border/50"}`}
                  type="tel"
                  maxLength={11}
                  dir="ltr"
                />
              </div>
              {phoneError && (
                <p className="text-xs text-destructive mt-1 pr-1">{phoneError}</p>
              )}
            </div>
            <Button
              onClick={handleSubmitLead}
              disabled={isSubmitting || !phone.trim()}
              className="w-full h-11 rounded-xl font-bold gap-2 text-white"
              style={{ backgroundColor: `hsl(${LIBRA_BLUE})` }}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  שלח פנייה
                </>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Shield loading animation component
export const InsuranceLoadingAnimation = () => (
  <motion.div className="flex flex-col items-center gap-3 py-6">
    <motion.div
      animate={{
        scale: [1, 1.15, 1],
        rotate: [0, 5, -5, 0],
      }}
      transition={{ duration: 1.5, repeat: Infinity }}
      className="w-14 h-14 rounded-full flex items-center justify-center"
      style={{ backgroundColor: `hsl(${LIBRA_BLUE} / 0.12)` }}
    >
      <Shield className="w-7 h-7" style={{ color: `hsl(${LIBRA_BLUE})` }} />
    </motion.div>
    <p className="text-sm text-muted-foreground font-medium animate-pulse">
      מחשב הצעה מותאמת אישית...
    </p>
  </motion.div>
);
