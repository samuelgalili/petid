/**
 * DailyInsightCard — Personalized greeting + health tip at top of feed
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface PetInsight {
  petName: string;
  ageWeeks: number | null;
  ageText: string;
  healthScore: number;
  missingItems: string[];
  breed: string | null;
  gender: string | null;
}

export const DailyInsightCard = () => {
  const navigate = useNavigate();
  const { t, direction } = useLanguage();
  const isRtl = direction === "rtl";
  const [insight, setInsight] = useState<PetInsight | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const getGreeting = (): string => {
    const h = new Date().getHours();
    if (h < 12) return t("dailyInsight.goodMorning");
    if (h < 17) return t("dailyInsight.goodAfternoon");
    if (h < 21) return t("dailyInsight.goodEvening");
    return t("dailyInsight.goodNight");
  };

  const getCheckLabels = () => [
    { field: "breed", label: t("dailyInsight.breed"), weight: 10 },
    { field: "birth_date", label: t("dailyInsight.birthDate"), weight: 10 },
    { field: "weight", label: t("dailyInsight.weight"), weight: 10 },
    { field: "gender", label: t("dailyInsight.gender"), weight: 5 },
    { field: "microchip_number", label: t("dailyInsight.microchip"), weight: 10 },
    { field: "is_neutered", label: t("dailyInsight.neutered"), weight: 5 },
    { field: "current_food", label: t("dailyInsight.currentFood"), weight: 10 },
    { field: "vet_name", label: t("dailyInsight.vetName"), weight: 10 },
    { field: "has_insurance", label: t("dailyInsight.insurance"), weight: 10 },
    { field: "avatar_url", label: t("dailyInsight.profilePhoto"), weight: 5 },
  ];

  const calculateHealthScore = (pet: any): { score: number; missing: string[] } => {
    let score = 0;
    const missing: string[] = [];
    const checks = getCheckLabels();

    for (const c of checks) {
      const val = pet[c.field];
      if (val !== null && val !== undefined && val !== "" && val !== false) {
        score += c.weight;
      } else {
        missing.push(c.label);
      }
    }

    if (pet._hasVetVisits) score += 10;
    else missing.push(t("dailyInsight.vetVisit"));

    if (pet._hasVaccines) score += 5;
    else missing.push(t("dailyInsight.vaccines"));

    return { score: Math.min(score, 100), missing };
  };

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

      const [visitsRes, carePlanRes] = await Promise.all([
        supabase.from("pet_vet_visits").select("id, vaccines").eq("pet_id", pet.id).limit(5),
        (supabase as any).from("pet_care_plans").select("points_awarded, is_scientist_approved").eq("pet_id", pet.id).limit(20),
      ]);
      pet._hasVetVisits = (visitsRes.data?.length || 0) > 0;
      pet._hasVaccines = visitsRes.data?.some((v: any) => v.vaccines?.length > 0) || false;
      
      // Care plan bonus
      const carePlanPoints = (carePlanRes.data || []).reduce((sum: number, i: any) => sum + (i.points_awarded || 0), 0);
      const carePlanBonus = Math.min(carePlanPoints, 15); // Cap at 15 extra points
      if (carePlanRes.data?.some((i: any) => i.is_scientist_approved)) {
        pet.current_food = pet.current_food || "care-plan-food";
      }

      const { score, missing } = calculateHealthScore(pet);

      let ageWeeks: number | null = null;
      let ageText = "";
      if (pet.birth_date) {
        const birth = new Date(pet.birth_date);
        const diffMs = Date.now() - birth.getTime();
        const totalWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
        ageWeeks = totalWeeks;
        if (totalWeeks < 52) {
          ageText = `${totalWeeks} ${t("dailyInsight.weeks")}`;
        } else {
          const years = Math.floor(totalWeeks / 52);
          ageText = `${years} ${years === 1 ? t("dailyInsight.year") : t("dailyInsight.years")}`;
        }
      }

      setInsight({
        petName: pet.name,
        ageWeeks,
        ageText,
        healthScore: Math.min(score + carePlanBonus, 100),
        missingItems: missing.slice(0, 3),
        breed: pet.breed,
        gender: pet.gender,
      });
      setLoading(false);
    };
    fetch();

    // Listen for care plan updates to refresh score
    const handleUpdate = () => fetch();
    window.addEventListener("care-plan-updated", handleUpdate);
    return () => window.removeEventListener("care-plan-updated", handleUpdate);
  }, []);

  if (loading || !insight) return null;

  const gapPercent = 100 - insight.healthScore;
  const agePrefix = insight.gender === 'female' ? t("dailyInsight.daughter") : t("dailyInsight.son");
  const ageDisplay = insight.ageText
    ? `${agePrefix ? agePrefix + ' ' : ''}${insight.ageText}`
    : t("dailyInsight.waitingForYou");
  const ArrowIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="snap-start flex-shrink-0 w-full px-4 pt-16 pb-4"
      style={{ minHeight: "100dvh" }}
    >
      <div className="h-full flex flex-col items-center justify-center gap-6 text-center" dir={direction}>
        {/* Greeting */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
        >
          <p className="text-lg text-muted-foreground">{getGreeting()}{userName ? ` ${userName}` : ""} 👋</p>
          <h1 className="text-2xl font-bold text-foreground mt-1">
            {insight.petName} {ageDisplay}!
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
            <span className="text-[10px] text-muted-foreground">{t("dailyInsight.healthScore")}</span>
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
                {t("dailyInsight.completeProfile").replace("{gap}", String(gapPercent))}
              </p>
            </div>
            <div className="space-y-1">
              {insight.missingItems.map((item) => (
                <p key={item} className="text-xs text-muted-foreground">• {t("dailyInsight.missing")} {item}</p>
              ))}
            </div>
            <button
              onClick={() => navigate("/")}
              className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {t("dailyInsight.completeNow")}
              <ArrowIcon className="w-3 h-3" />
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
          {t("feedPage.scrollDown")}
        </motion.p>
      </div>
    </motion.div>
  );
};
