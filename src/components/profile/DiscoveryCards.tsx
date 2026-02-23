/**
 * DiscoveryCards — Gamified "Treasure Tasks" with Glassmorphism 2.0
 * Horizontal scroll-snap carousel with pulse animations for missing tasks
 */
import { motion, AnimatePresence } from "framer-motion";
import { 
  Cpu, Shield, Utensils, Syringe, Camera,
  Sparkles, Check
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";
import confetti from "canvas-confetti";
import { useLanguage } from "@/contexts/LanguageContext";

interface DiscoveryCardsProps {
  petId: string;
  petName: string;
  petType: "dog" | "cat";
}

interface DiscoveryItem {
  id: string;
  icon: React.ElementType;
  titleKey: string;
  emoji: string;
  gradient: string;
  glowColor: string;
  action: string;
  checkField?: string;
  rewardPoints: number;
}

const ALL_DISCOVERIES: DiscoveryItem[] = [
  {
    id: "microchip",
    icon: Cpu,
    titleKey: "discovery.addMicrochip",
    emoji: "🔒",
    gradient: "from-[hsla(180,60%,40%,0.15)] via-[hsla(180,50%,50%,0.08)] to-[hsla(200,40%,30%,0.04)]",
    glowColor: "hsla(180,60%,50%,0.25)",
    action: "documents",
    checkField: "health_notes",
    rewardPoints: 10,
  },
  {
    id: "insurance",
    icon: Shield,
    titleKey: "discovery.healthInsurance",
    emoji: "🛡️",
    gradient: "from-primary/15 via-primary/8 to-primary/3",
    glowColor: "hsla(var(--primary),0.3)",
    action: "insurance",
    checkField: "has_insurance",
    rewardPoints: 15,
  },
  {
    id: "food",
    icon: Utensils,
    titleKey: "discovery.foodType",
    emoji: "🥗",
    gradient: "from-[hsla(25,90%,55%,0.15)] via-[hsla(30,80%,50%,0.08)] to-[hsla(25,70%,45%,0.04)]",
    glowColor: "hsla(25,90%,55%,0.25)",
    action: "food",
    checkField: "current_food",
    rewardPoints: 8,
  },
  {
    id: "vaccine",
    icon: Syringe,
    titleKey: "discovery.vaccines",
    emoji: "💉",
    gradient: "from-[hsla(142,60%,45%,0.15)] via-[hsla(142,50%,40%,0.08)] to-[hsla(142,40%,35%,0.04)]",
    glowColor: "hsla(142,60%,45%,0.25)",
    action: "documents",
    checkField: "last_vet_visit",
    rewardPoints: 12,
  },
  {
    id: "photo",
    icon: Camera,
    titleKey: "discovery.newPhoto",
    emoji: "📸",
    gradient: "from-[hsla(330,60%,55%,0.15)] via-[hsla(330,50%,50%,0.08)] to-[hsla(330,40%,45%,0.04)]",
    glowColor: "hsla(330,60%,55%,0.25)",
    action: "photo",
    checkField: "avatar_url",
    rewardPoints: 5,
  },
];

export const DiscoveryCards = ({ petId, petName, petType }: DiscoveryCardsProps) => {
  const { t, direction } = useLanguage();
  const [completedFields, setCompletedFields] = useState<Set<string>>(new Set());
  const [justCompleted, setJustCompleted] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompletion = async () => {
      const { data } = await supabase
        .from("pets")
        .select("has_insurance, current_food, last_vet_visit, avatar_url, health_notes")
        .eq("id", petId)
        .maybeSingle();
      
      if (data) {
        const completed = new Set<string>();
        if ((data as any).health_notes) completed.add("health_notes");
        if ((data as any).has_insurance) completed.add("has_insurance");
        if ((data as any).current_food) completed.add("current_food");
        if ((data as any).last_vet_visit) completed.add("last_vet_visit");
        if ((data as any).avatar_url) completed.add("avatar_url");
        setCompletedFields(completed);
      }

      // Also check care plan for food
      const { data: carePlanData } = await (supabase as any)
        .from("pet_care_plans")
        .select("category, is_scientist_approved")
        .eq("pet_id", petId)
        .limit(10);
      
      if (carePlanData?.some((i: any) => i.category === "food" || i.is_scientist_approved)) {
        setCompletedFields((prev) => new Set([...prev, "current_food"]));
      }
    };
    fetchCompletion();

    // Listen for care plan updates
    const handleCarePlanUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.petId === petId && detail?.isApproved) {
        setCompletedFields((prev) => new Set([...prev, "current_food"]));
        triggerCelebration("food");
      }
    };
    window.addEventListener("care-plan-updated", handleCarePlanUpdate);
    return () => window.removeEventListener("care-plan-updated", handleCarePlanUpdate);
  }, [petId]);

  const handleBubbleClick = (card: DiscoveryItem) => {
    haptic("medium");
    window.dispatchEvent(new CustomEvent("open-pet-sheet", { detail: { sheet: card.action } }));
  };

  const triggerCelebration = (id: string) => {
    setJustCompleted(id);
    haptic("success");
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ["hsl(var(--primary))", "hsl(45,93%,58%)", "hsl(142,71%,45%)"],
      ticks: 80,
    });
    setTimeout(() => setJustCompleted(null), 2000);
  };

  const visibleCards = ALL_DISCOVERIES
    .filter((d) => d.checkField && !completedFields.has(d.checkField))
    .slice(0, 5);

  const completedCount = ALL_DISCOVERIES.filter(d => d.checkField && completedFields.has(d.checkField)).length;
  const totalCount = ALL_DISCOVERIES.length;

  if (visibleCards.length === 0) return null;

  return (
    <div className="mb-4" dir={direction}>
      {/* Header with progress */}
      <div className="flex items-center justify-between mb-3 px-4">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Sparkles className="w-4 h-4 text-primary" />
          </motion.div>
          <span className="text-xs font-bold text-foreground">
            {t("discovery.discoverMore").replace("{petName}", petName)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {ALL_DISCOVERIES.map((d, i) => (
              <motion.div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  d.checkField && completedFields.has(d.checkField)
                    ? "bg-primary"
                    : "bg-muted"
                }`}
                animate={d.checkField && completedFields.has(d.checkField) ? { scale: [1, 1.3, 1] } : {}}
                transition={{ delay: i * 0.1 }}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">{completedCount}/{totalCount}</span>
        </div>
      </div>

      {/* Horizontal scroll-snap carousel */}
      <div 
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2"
        style={{ 
          paddingLeft: '16px', 
          paddingRight: '16px',
          scrollPaddingLeft: '16px',
          scrollPaddingRight: '16px',
        }}
      >
        {visibleCards.map((card, i) => {
          const Icon = card.icon;
          const isJustDone = justCompleted === card.id;
          
          return (
            <motion.button
              key={card.id}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                delay: i * 0.08,
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
              whileTap={{ scale: 0.93 }}
              onClick={() => handleBubbleClick(card)}
              className="relative flex-shrink-0 snap-start w-[160px] p-3.5 rounded-2xl border border-border/30 overflow-hidden group"
              style={{ 
                textAlign: direction === "rtl" ? "right" : "left",
                background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
              }}
            >
              {/* Glassmorphism backdrop */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} backdrop-blur-xl`} />
              
              {/* Glass border highlight */}
              <div className="absolute inset-0 rounded-2xl border border-white/10 dark:border-white/5 pointer-events-none" />

              {/* Subtle pulse animation for incomplete tasks */}
              <motion.div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  boxShadow: `inset 0 0 20px ${card.glowColor}, 0 0 15px ${card.glowColor}`,
                }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
              />

              {/* Content */}
              <div className="relative z-10 flex flex-col gap-3">
                {/* Icon */}
                <motion.div 
                  className="w-11 h-11 rounded-xl bg-background/40 dark:bg-background/20 backdrop-blur-md flex items-center justify-center border border-white/15 shadow-sm"
                  animate={{ rotate: [0, 4, -4, 0] }}
                  transition={{ duration: 4, repeat: Infinity, delay: i * 0.3 }}
                >
                  {isJustDone ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                      <Check className="w-5 h-5 text-primary" strokeWidth={2.5} />
                    </motion.div>
                  ) : (
                    <span className="text-xl drop-shadow-sm">{card.emoji}</span>
                  )}
                </motion.div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground leading-tight">
                    {t(card.titleKey)}
                  </p>
                  {/* Gold glow reward points */}
                  <motion.p 
                    className="text-[11px] font-bold mt-1"
                    style={{
                      background: "linear-gradient(135deg, hsl(45,93%,58%), hsl(38,90%,50%), hsl(45,93%,65%))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      filter: "drop-shadow(0 0 4px hsla(45,93%,58%,0.4))",
                    }}
                    animate={{ 
                      filter: [
                        "drop-shadow(0 0 4px hsla(45,93%,58%,0.3))",
                        "drop-shadow(0 0 8px hsla(45,93%,58%,0.6))",
                        "drop-shadow(0 0 4px hsla(45,93%,58%,0.3))",
                      ],
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    +{card.rewardPoints} {t("discovery.points")}
                  </motion.p>
                </div>
              </div>

              {/* Completion burst */}
              <AnimatePresence>
                {isJustDone && (
                  <motion.div
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ scale: 3, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 rounded-2xl bg-primary/20 pointer-events-none"
                  />
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
        
        {/* Peek spacer — encourages swiping */}
        <div className="flex-shrink-0 w-4" aria-hidden />
      </div>
    </div>
  );
};
