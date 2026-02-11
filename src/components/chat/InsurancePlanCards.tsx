import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Check, Phone, Loader2, ChevronLeft } from "lucide-react";
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

const LIBRA_BLUE = "210 90% 45%";
const LIBRA_DARK = "210 90% 30%";

// Individual flip card for a plan
const PlanFlipCard = ({
  plan,
  isSelected,
  onSelect,
}: {
  plan: InsurancePlan;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      style={{
        flexShrink: 0,
        width: '68%',
        minWidth: '190px',
        maxWidth: '240px',
        scrollSnapAlign: 'center',
        perspective: '800px',
        height: '195px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.5s ease',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* FRONT — Price & Name */}
        <div
          onClick={() => setIsFlipped(true)}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            borderRadius: '16px',
            border: isSelected ? `2px solid hsl(${LIBRA_BLUE})` : '2px solid hsl(var(--border) / 0.5)',
            background: isSelected
              ? `linear-gradient(135deg, hsl(${LIBRA_BLUE} / 0.08), hsl(${LIBRA_BLUE} / 0.02))`
              : plan.highlight
              ? `linear-gradient(135deg, hsl(${LIBRA_BLUE} / 0.05), transparent)`
              : 'hsl(var(--card))',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            gap: '8px',
            overflow: 'hidden',
          }}
        >
          {/* Badge */}
          {plan.badge && (
            <span
              style={{
                position: 'absolute',
                top: '-1px',
                left: '12px',
                fontSize: '10px',
                fontWeight: 700,
                color: 'white',
                padding: '3px 10px',
                borderRadius: '0 0 8px 8px',
                backgroundColor: plan.highlight
                  ? `hsl(${LIBRA_BLUE})`
                  : `hsl(${LIBRA_DARK})`,
              }}
            >
              {plan.badge}
            </span>
          )}

          {/* Shield icon */}
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: `hsl(${LIBRA_BLUE} / 0.12)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield style={{ width: '24px', height: '24px', color: `hsl(${LIBRA_BLUE})` }} />
          </div>

          {/* Plan name */}
          <span className="font-bold text-foreground text-base">{plan.name}</span>

          {/* Price */}
          <div className="flex items-baseline gap-0.5">
            <span className="text-2xl font-bold" style={{ color: `hsl(${LIBRA_BLUE})` }}>
              ₪{plan.price}
            </span>
            <span className="text-[11px] text-muted-foreground">/חודש</span>
          </div>

          {/* Tap hint */}
          <span className="text-[10px] text-muted-foreground mt-1">לחץ לפרטים ←</span>
        </div>

        {/* BACK — Features */}
        <div
          onClick={() => {
            setIsFlipped(false);
            onSelect();
          }}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: '16px',
            border: `2px solid hsl(${LIBRA_BLUE})`,
            background: `linear-gradient(145deg, hsl(${LIBRA_BLUE} / 0.06), hsl(${LIBRA_DARK} / 0.03))`,
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '14px',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Shield style={{ width: '16px', height: '16px', color: `hsl(${LIBRA_BLUE})` }} />
              <span className="font-bold text-sm text-foreground">{plan.name}</span>
            </div>
            <span className="text-sm font-bold" style={{ color: `hsl(${LIBRA_BLUE})` }}>
              ₪{plan.price}
            </span>
          </div>

          {/* Features list */}
          <ul className="space-y-1.5 flex-1">
            {plan.features.map((f, i) => (
              <li key={i} className="flex items-center gap-1.5 text-[11px] text-foreground">
                <Check
                  style={{ width: '13px', height: '13px', flexShrink: 0, color: `hsl(${LIBRA_BLUE})` }}
                />
                {f}
              </li>
            ))}
          </ul>

          {/* Select button */}
          <div
            className="flex items-center justify-center gap-1.5 mt-2 py-2 rounded-xl font-bold text-xs text-white"
            style={{ backgroundColor: `hsl(${LIBRA_BLUE})` }}
          >
            <Shield style={{ width: '14px', height: '14px' }} />
            בחר תוכנית
          </div>
        </div>
      </motion.div>
    </div>
  );
};

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

  // Auto-fill phone from user profile
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.phone) setPhone(data.phone);
      });
  }, [user?.id]);

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
        breed,
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
          <p className="text-sm text-muted-foreground mt-1">נציג מ-Libra יחזור אליך תוך 24 שעות</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 mt-2"
      style={{ width: '88vw', maxWidth: '420px' }}
    >
      {/* Libra branding header */}
      <div className="flex items-center gap-2 px-1">
        <Shield className="w-4 h-4" style={{ color: `hsl(${LIBRA_BLUE})` }} />
        <span className="text-xs font-bold" style={{ color: `hsl(${LIBRA_BLUE})` }}>
          Libra Insurance
        </span>
        <span className="text-[10px] text-muted-foreground">• תוכניות ל{petName}</span>
      </div>

      {/* Flip cards - horizontal scroll */}
      <div
        className="flex gap-3 pb-2 pt-1"
        style={{
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          touchAction: 'pan-x',
          paddingLeft: '4px',
          paddingRight: '4px',
        }}
      >
        {LIBRA_PLANS.map((plan) => (
          <PlanFlipCard
            key={plan.id}
            plan={plan}
            isSelected={selectedPlan === plan.id}
            onSelect={() => setSelectedPlan(plan.id)}
          />
        ))}
      </div>

      {/* Scroll hint dots */}
      <div className="flex justify-center gap-1.5">
        {LIBRA_PLANS.map((plan) => (
          <div
            key={plan.id}
            className="w-1.5 h-1.5 rounded-full transition-colors"
            style={{
              backgroundColor: selectedPlan === plan.id
                ? `hsl(${LIBRA_BLUE})`
                : `hsl(${LIBRA_BLUE} / 0.2)`,
            }}
          />
        ))}
      </div>

      {/* Phone capture after selection */}
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
                  onChange={(e) => { setPhone(e.target.value); setPhoneError(null); }}
                  placeholder="050-1234567"
                  className={`h-11 pr-10 rounded-xl ${phoneError ? "border-destructive" : "border-border/50"}`}
                  type="tel"
                  maxLength={11}
                  dir="ltr"
                />
              </div>
              {phoneError && <p className="text-xs text-destructive mt-1 pr-1">{phoneError}</p>}
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
      animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
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
