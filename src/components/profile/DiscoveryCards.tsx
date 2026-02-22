/**
 * DiscoveryBubbles — Gamified "Treasure Tasks" that feel like mini-games.
 * Each bubble rewards the user with a celebration animation on completion.
 * Glassmorphism, floating animation, non-stressful.
 */
import { motion, AnimatePresence } from "framer-motion";
import { 
  Cpu, Shield, Utensils, Syringe, Camera, Heart,
  Sparkles, Check
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";
import confetti from "canvas-confetti";

interface DiscoveryCardsProps {
  petId: string;
  petName: string;
  petType: "dog" | "cat";
}

interface DiscoveryItem {
  id: string;
  icon: React.ElementType;
  title: string;
  emoji: string;
  gradient: string;
  iconBg: string;
  action: string;
  checkField?: string;
  reward: string;
}

const ALL_DISCOVERIES: DiscoveryItem[] = [
  {
    id: "microchip",
    icon: Cpu,
    title: "הוסיפו שבב",
    emoji: "🔒",
    gradient: "from-[hsla(180,50%,45%,0.12)] to-[hsla(180,50%,45%,0.03)]",
    iconBg: "bg-[hsla(180,50%,45%,0.15)]",
    action: "/pet-id-card",
    checkField: "health_notes",
    reward: "+10 נקודות",
  },
  {
    id: "insurance",
    icon: Shield,
    title: "ביטוח בריאות",
    emoji: "🛡️",
    gradient: "from-primary/10 to-primary/3",
    iconBg: "bg-primary/15",
    action: "insurance",
    checkField: "has_insurance",
    reward: "+15 נקודות",
  },
  {
    id: "food",
    icon: Utensils,
    title: "סוג מזון",
    emoji: "🥗",
    gradient: "from-[hsla(25,90%,55%,0.12)] to-[hsla(25,90%,55%,0.03)]",
    iconBg: "bg-[hsla(25,90%,55%,0.15)]",
    action: "food",
    checkField: "current_food",
    reward: "+8 נקודות",
  },
  {
    id: "vaccine",
    icon: Syringe,
    title: "חיסונים",
    emoji: "💉",
    gradient: "from-[hsla(142,60%,45%,0.12)] to-[hsla(142,60%,45%,0.03)]",
    iconBg: "bg-[hsla(142,60%,45%,0.15)]",
    action: "/vet-log",
    checkField: "last_vet_visit",
    reward: "+12 נקודות",
  },
  {
    id: "photo",
    icon: Camera,
    title: "תמונה חדשה",
    emoji: "📸",
    gradient: "from-[hsla(330,60%,55%,0.12)] to-[hsla(330,60%,55%,0.03)]",
    iconBg: "bg-[hsla(330,60%,55%,0.15)]",
    action: "photo",
    checkField: "avatar_url",
    reward: "+5 נקודות",
  },
];

export const DiscoveryCards = ({ petId, petName, petType }: DiscoveryCardsProps) => {
  const navigate = useNavigate();
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
    };
    fetchCompletion();
  }, [petId]);

  const handleBubbleClick = (card: DiscoveryItem) => {
    haptic("medium");
    if (card.action.startsWith("/")) {
      navigate(card.action);
    }
    // Non-route actions handled by parent
  };

  // Simulate completion celebration (would be triggered by actual data change)
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

  // Filter to only show incomplete items, max 4
  const visibleCards = ALL_DISCOVERIES
    .filter((d) => d.checkField && !completedFields.has(d.checkField))
    .slice(0, 4);

  const completedCount = ALL_DISCOVERIES.filter(d => d.checkField && completedFields.has(d.checkField)).length;
  const totalCount = ALL_DISCOVERIES.length;

  if (visibleCards.length === 0) return null;

  return (
    <div className="mx-4 mb-4" dir="rtl">
      {/* Header with progress */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Sparkles className="w-4 h-4 text-primary" />
          </motion.div>
          <span className="text-xs font-bold text-foreground">גלו עוד על {petName}</span>
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

      {/* Bubbles grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {visibleCards.map((card, i) => {
          const Icon = card.icon;
          const isJustDone = justCompleted === card.id;
          
          return (
            <motion.button
              key={card.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                y: [0, -3, 0],
              }}
              transition={{ 
                opacity: { delay: i * 0.06 },
                scale: { delay: i * 0.06, type: "spring" },
                y: { delay: i * 0.5, duration: 3, repeat: Infinity, ease: "easeInOut" },
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleBubbleClick(card)}
              className={`relative p-3.5 rounded-2xl border border-border/20 bg-gradient-to-br ${card.gradient} backdrop-blur-xl text-right overflow-hidden group`}
            >
              {/* Floating glow */}
              <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl"
                style={{
                  background: "radial-gradient(circle at 50% 50%, hsla(var(--primary), 0.06) 0%, transparent 70%)",
                }}
              />

              <div className="flex items-center gap-2.5 relative z-10">
                <motion.div 
                  className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center flex-shrink-0`}
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, delay: i * 0.3 }}
                >
                  {isJustDone ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring" }}
                    >
                      <Check className="w-5 h-5 text-primary" strokeWidth={2.5} />
                    </motion.div>
                  ) : (
                    <span className="text-lg">{card.emoji}</span>
                  )}
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {card.title}
                  </p>
                  <p className="text-[10px] text-primary/70 font-medium mt-0.5">
                    {card.reward}
                  </p>
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
      </div>
    </div>
  );
};
