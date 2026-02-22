/**
 * DiscoveryCards — Soft, non-stressful nudge cards for the pet dashboard.
 * Encourages completing profile data (microchip, insurance, food, etc.)
 * without pressure. Uses glassmorphism and gentle animations.
 */
import { motion } from "framer-motion";
import { 
  Cpu, Shield, Utensils, Syringe, Camera, Heart,
  ChevronLeft, Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DiscoveryCardsProps {
  petId: string;
  petName: string;
  petType: "dog" | "cat";
}

interface DiscoveryItem {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  gradient: string;
  iconColor: string;
  action: string; // route or action key
  checkField?: string;
}

const ALL_DISCOVERIES: DiscoveryItem[] = [
  {
    id: "microchip",
    icon: Cpu,
    title: "בואו נאבטח את {name}",
    subtitle: "הוסיפו מספר שבב ותעודת זיהוי",
    gradient: "from-[hsla(180,50%,45%,0.08)] to-[hsla(180,50%,45%,0.02)]",
    iconColor: "text-[hsl(180,50%,45%)]",
    action: "/pet-id-card",
    checkField: "health_notes", // proxy — no chip_number column
  },
  {
    id: "insurance",
    icon: Shield,
    title: "הגנה על {name}",
    subtitle: "ביטוח בריאות מתחיל מ-49₪/חודש",
    gradient: "from-[hsla(209,79%,52%,0.08)] to-[hsla(209,79%,52%,0.02)]",
    iconColor: "text-primary",
    action: "insurance",
    checkField: "has_insurance",
  },
  {
    id: "food",
    icon: Utensils,
    title: "מה {name} אוכל/ת?",
    subtitle: "נתאים המלצות תזונה אישיות",
    gradient: "from-[hsla(25,90%,55%,0.08)] to-[hsla(25,90%,55%,0.02)]",
    iconColor: "text-[hsl(25,90%,55%)]",
    action: "food",
    checkField: "current_food",
  },
  {
    id: "vaccine",
    icon: Syringe,
    title: "חיסונים של {name}",
    subtitle: "עדכנו את לוח החיסונים",
    gradient: "from-[hsla(142,60%,45%,0.08)] to-[hsla(142,60%,45%,0.02)]",
    iconColor: "text-[hsl(142,60%,45%)]",
    action: "/vet-log",
    checkField: "last_vet_visit",
  },
  {
    id: "photo",
    icon: Camera,
    title: "תמונה חדשה של {name}?",
    subtitle: "עדכנו את תמונת הפרופיל",
    gradient: "from-[hsla(330,60%,55%,0.08)] to-[hsla(330,60%,55%,0.02)]",
    iconColor: "text-[hsl(330,60%,55%)]",
    action: "photo",
    checkField: "avatar_url",
  },
];

export const DiscoveryCards = ({ petId, petName, petType }: DiscoveryCardsProps) => {
  const navigate = useNavigate();
  const [completedFields, setCompletedFields] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

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

  // Filter to only show incomplete items, max 3
  const visibleCards = ALL_DISCOVERIES
    .filter((d) => d.checkField && !completedFields.has(d.checkField) && !dismissed.has(d.id))
    .slice(0, 3);

  if (visibleCards.length === 0) return null;

  return (
    <div className="mx-4 mb-4 space-y-2.5" dir="rtl">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground">המלצות ל{petName}</span>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {visibleCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.button
              key={card.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08, type: "spring", damping: 20, stiffness: 250 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                if (card.action.startsWith("/")) {
                  navigate(card.action);
                }
                // Actions like "insurance", "food", "photo" can be handled by parent
              }}
              className={`flex-shrink-0 w-[200px] p-4 rounded-2xl border border-border/20 bg-gradient-to-br ${card.gradient} backdrop-blur-sm text-right relative overflow-hidden group`}
            >
              {/* Subtle glow */}
              <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${card.iconColor.replace("text-", "").includes("primary") ? "hsla(209,79%,52%,0.06)" : "hsla(0,0%,50%,0.04)"} 0%, transparent 70%)`,
                }}
              />

              <div className="flex items-start gap-3 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-background/80 border border-border/30 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Icon className={`w-5 h-5 ${card.iconColor}`} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight mb-0.5">
                    {card.title.replace("{name}", petName)}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {card.subtitle}
                  </p>
                </div>
              </div>

              {/* Arrow hint */}
              <div className="flex justify-start mt-2.5">
                <div className="flex items-center gap-1 text-[10px] font-medium text-primary/70">
                  <span>התחל</span>
                  <ChevronLeft className="w-3 h-3" />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
