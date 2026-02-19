/**
 * DailyInsightCard — Personalized greeting + health tip at top of feed
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ChevronLeft, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface PetInsight {
  petName: string;
  ageWeeks: number | null;
  ageText: string;
  healthScore: number;
  missingItems: string[];
  breed: string | null;
  gender: string | null;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "בוקר טוב";
  if (h < 17) return "צהריים טובים";
  if (h < 21) return "ערב טוב";
  return "לילה טוב";
}

function calculateHealthScore(pet: any): { score: number; missing: string[] } {
  let score = 0;
  const missing: string[] = [];
  const checks = [
    { field: "breed", label: "גזע", weight: 10 },
    { field: "birth_date", label: "תאריך לידה", weight: 10 },
    { field: "weight", label: "משקל", weight: 10 },
    { field: "gender", label: "מין", weight: 5 },
    { field: "microchip_number", label: "שבב", weight: 10 },
    { field: "is_neutered", label: "עיקור/סירוס", weight: 5 },
    { field: "current_food", label: "מזון נוכחי", weight: 10 },
    { field: "vet_name", label: "וטרינר מטפל", weight: 10 },
    { field: "has_insurance", label: "ביטוח", weight: 10 },
    { field: "avatar_url", label: "תמונת פרופיל", weight: 5 },
  ];

  for (const c of checks) {
    const val = pet[c.field];
    if (val !== null && val !== undefined && val !== "" && val !== false) {
      score += c.weight;
    } else {
      missing.push(c.label);
    }
  }

  // Vet visits bonus
  if (pet._hasVetVisits) score += 10;
  else missing.push("ביקור וטרינר");

  // Vaccines bonus
  if (pet._hasVaccines) score += 5;
  else missing.push("חיסונים");

  return { score: Math.min(score, 100), missing };
}

export const DailyInsightCard = () => {
  const navigate = useNavigate();
  const [insight, setInsight] = useState<PetInsight | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [profileRes, petRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        (supabase as any)
          .from("pets")
          .select("id, name, breed, birth_date, weight, gender, microchip_number, is_neutered, current_food, vet_name, has_insurance, avatar_url")
          .eq("user_id", user.id)
          .eq("archived", false)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

      setUserName(profileRes.data?.full_name?.split(" ")[0] || null);

      const pets = petRes.data;
      if (!pets?.length) { setLoading(false); return; }
      const pet = pets[0];

      // Check vet visits & vaccines
      const [visitsRes] = await Promise.all([
        supabase.from("pet_vet_visits").select("id, vaccines").eq("pet_id", pet.id).limit(5),
      ]);
      pet._hasVetVisits = (visitsRes.data?.length || 0) > 0;
      pet._hasVaccines = visitsRes.data?.some((v: any) => v.vaccines?.length > 0) || false;

      const { score, missing } = calculateHealthScore(pet);

      let ageWeeks: number | null = null;
      let ageText = "";
      if (pet.birth_date) {
        const birth = new Date(pet.birth_date);
        const diffMs = Date.now() - birth.getTime();
        const totalWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
        ageWeeks = totalWeeks;
        if (totalWeeks < 52) {
          ageText = `${totalWeeks} שבועות`;
        } else {
          const years = Math.floor(totalWeeks / 52);
          ageText = `${years} ${years === 1 ? "שנה" : "שנים"}`;
        }
      }

      setInsight({
        petName: pet.name,
        ageWeeks,
        ageText,
        healthScore: score,
        missingItems: missing.slice(0, 3),
        breed: pet.breed,
        gender: pet.gender,
      });
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading || !insight) return null;

  const gapPercent = 100 - insight.healthScore;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="snap-start flex-shrink-0 w-full px-4 pt-16 pb-4"
      style={{ minHeight: "100dvh" }}
    >
      <div className="h-full flex flex-col items-center justify-center gap-6 text-center" dir="rtl">
        {/* Greeting */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
        >
          <p className="text-lg text-muted-foreground">{getGreeting()}{userName ? ` ${userName}` : ""} 👋</p>
          <h1 className="text-2xl font-bold text-foreground mt-1">
            {insight.petName} היום {insight.ageText ? `${insight.gender === 'female' ? 'בת' : 'בן'} ${insight.ageText}` : "מחכה לך"}!
          </h1>
          {insight.breed && (
            <p className="text-sm text-muted-foreground mt-1">{insight.breed}</p>
          )}
        </motion.div>

        {/* Health Score Ring */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
          className="relative w-36 h-36"
        >
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="50" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" opacity="0.3" />
            <motion.circle
              cx="60" cy="60" r="50"
              stroke={insight.healthScore >= 80 ? "hsl(var(--primary))" : insight.healthScore >= 50 ? "hsl(45, 93%, 47%)" : "hsl(var(--destructive))"}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 50}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 50 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 50 * (1 - insight.healthScore / 100) }}
              transition={{ delay: 0.9, duration: 1.2, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-foreground">{insight.healthScore}%</span>
            <span className="text-[10px] text-muted-foreground">ציון בריאות</span>
          </div>
        </motion.div>

        {/* Tip */}
        {gapPercent > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="bg-card border border-border/30 rounded-2xl p-4 max-w-xs w-full"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" strokeWidth={1.5} />
              <p className="text-sm font-semibold text-foreground">
                השלם {gapPercent}% לפרופיל מלא
              </p>
            </div>
            <div className="space-y-1">
              {insight.missingItems.map((item) => (
                <p key={item} className="text-xs text-muted-foreground">• חסר: {item}</p>
              ))}
            </div>
            <button
              onClick={() => navigate("/")}
              className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              השלם עכשיו ← הטבה בחנות
              <ChevronLeft className="w-3 h-3" />
            </button>
          </motion.div>
        )}

        {/* Scroll hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1.8 }}
          className="text-xs text-muted-foreground mt-4"
        >
          ⬇️ גלול למטה לתוכן
        </motion.p>
      </div>
    </motion.div>
  );
};
