/**
 * HeroInsight — top insight banner powered by the Insight Engine.
 *
 * - Calls `generate-pet-insights` on mount per pet.
 * - Renders the single Hero (priority-ranked) above the dashboard avatar.
 * - Falls back silently to nothing when no qualifying insight exists.
 *
 * Stop conditions are server-side (confidence cutoff 0.75). Client only
 * decides how to render the verdict + CTA, never invents content.
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TriangleAlert,
  Syringe,
  Stethoscope,
  Weight,
  ScanLine,
  Cake,
  ChevronLeft,
  Check,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const ICONS: Record<string, typeof Weight> = {
  TriangleAlert,
  Syringe,
  Stethoscope,
  Weight,
  ScanLine,
  Cake,
};

const TIER_TONE: Record<number, { bg: string; ring: string; text: string }> = {
  1: { bg: "hsl(var(--destructive) / 0.12)", ring: "hsl(var(--destructive) / 0.45)", text: "hsl(var(--destructive))" },
  2: { bg: "hsl(var(--primary) / 0.12)", ring: "hsl(var(--primary) / 0.45)", text: "hsl(var(--primary))" },
  3: { bg: "hsl(var(--muted) / 0.6)", ring: "hsl(var(--border))", text: "hsl(var(--foreground))" },
  4: { bg: "hsl(var(--primary) / 0.10)", ring: "hsl(var(--primary) / 0.35)", text: "hsl(var(--primary))" },
  5: { bg: "hsl(var(--muted) / 0.5)", ring: "hsl(var(--border))", text: "hsl(var(--foreground))" },
};

interface InsightRow {
  id: string;
  tier: 1 | 2 | 3 | 4 | 5;
  category: string;
  hero_text: string;
  hero_subtext?: string | null;
  cta_label?: string | null;
  cta_action?: string | null;
  icon_name?: string | null;
}

export const HeroInsight = ({ petId }: { petId: string }) => {
  const [hero, setHero] = useState<InsightRow | null>(null);
  const [resolved, setResolved] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setResolved(false);
    setHero(null);
    (async () => {
      const { data, error } = await supabase.functions.invoke(
        "generate-pet-insights",
        { body: { pet_id: petId, surface: "dashboard" } },
      );
      if (cancelled) return;
      if (error || !data?.hero) return;
      setHero(data.hero as InsightRow);
    })();
    return () => {
      cancelled = true;
    };
  }, [petId]);

  const runCta = async () => {
    if (!hero) return;
    const action = hero.cta_action ?? "";
    if (action.startsWith("navigate:")) {
      navigate(action.slice("navigate:".length));
    } else if (action.startsWith("open_sheet:")) {
      window.dispatchEvent(
        new CustomEvent("open-pet-sheet", {
          detail: { sheet: action.slice("open_sheet:".length) },
        }),
      );
    } else if (action.startsWith("add_record:")) {
      window.dispatchEvent(
        new CustomEvent("open-pet-sheet", {
          detail: { sheet: `add-${action.slice("add_record:".length)}` },
        }),
      );
    }
    await supabase
      .from("pet_insights")
      .update({ acted_at: new Date().toISOString() })
      .eq("id", hero.id);
    setResolved(true);
  };

  const dismiss = async () => {
    if (!hero) return;
    await supabase
      .from("pet_insights")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("id", hero.id);
    setResolved(true);
  };

  return (
    <AnimatePresence mode="wait">
      {hero && !resolved && (
        <motion.div
          key={hero.id}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative rounded-2xl px-3.5 py-3 flex items-center gap-3 border"
          style={{
            background: TIER_TONE[hero.tier].bg,
            borderColor: TIER_TONE[hero.tier].ring,
          }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "hsl(var(--background) / 0.6)", color: TIER_TONE[hero.tier].text }}
          >
            {(() => {
              const Icon = ICONS[hero.icon_name ?? ""] ?? TriangleAlert;
              return <Icon className="w-4 h-4" strokeWidth={1.8} />;
            })()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-foreground leading-tight truncate">
              {hero.hero_text}
            </div>
            {hero.hero_subtext && (
              <div className="text-[11px] text-muted-foreground/80 leading-tight mt-0.5 line-clamp-1">
                {hero.hero_subtext}
              </div>
            )}
          </div>

          {hero.cta_label && (
            <button
              type="button"
              onClick={runCta}
              className="shrink-0 flex items-center gap-1 h-8 px-3 rounded-full text-[12px] font-semibold"
              style={{
                background: TIER_TONE[hero.tier].text,
                color: "hsl(var(--primary-foreground))",
              }}
            >
              {hero.cta_label}
              <ChevronLeft className="w-3 h-3" />
            </button>
          )}

          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors"
            aria-label="סגור"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.8} />
          </button>
        </motion.div>
      )}

      {resolved && (
        <motion.div
          key="resolved"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="flex items-center justify-center gap-1.5 h-9 rounded-2xl bg-muted/40 text-[11px] text-muted-foreground"
        >
          <Check className="w-3.5 h-3.5" />
          טופל היום
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HeroInsight;