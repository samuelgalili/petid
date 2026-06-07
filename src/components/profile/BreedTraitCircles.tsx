import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Weight,
  Zap,
  Flame,
  Brush,
  Footprints,
  Ruler,
  Scissors,
  Brain,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BreedRow {
  size_category?: string | null;
  energy_level?: number | null;
  grooming_freq?: number | null;
  trainability?: number | null;
  mental_needs?: number | null;
  exercise_needs?: string | null;
  description_he?: string | null;
}

interface Props {
  breed?: string | null;
  weight?: number | null;
  kcalTarget?: number | null;
  accent?: string;
}

const SIZE_HE: Record<string, string> = {
  toy: "ננסי",
  tiny: "ננסי",
  small: "קטן",
  medium: "בינוני",
  large: "גדול",
  extra_large: "ענק",
  giant: "ענק",
};

const SIZE_LEVEL: Record<string, number> = {
  toy: 1,
  tiny: 1,
  small: 2,
  medium: 3,
  large: 4,
  extra_large: 5,
  giant: 5,
};

// Conservative coat inference from description (no DB field yet)
const detectCoat = (desc?: string | null): { label: string; level: number } => {
  if (!desc) return { label: "—", level: 0 };
  const d = desc;
  if (/מקורזל|מתולתל/.test(d)) return { label: "מקורזלת", level: 4 };
  if (/ארוכ/.test(d)) return { label: "ארוכה", level: 3 };
  if (/קצר/.test(d)) return { label: "קצרה וחלקה", level: 1 };
  return { label: "—", level: 0 };
};

const Ring = ({
  pct,
  color,
  size = 64,
}: {
  pct: number;
  color: string;
  size?: number;
}) => {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90"
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={stroke}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </svg>
  );
};

const Circle = ({
  icon: Icon,
  label,
  value,
  pct,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  pct: number;
  color: string;
}) => (
  <div className="flex flex-col items-center shrink-0 w-[78px]">
    <div className="relative" style={{ width: 64, height: 64 }}>
      <Ring pct={pct} color={color} />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Icon className="w-4 h-4" style={{ color }} strokeWidth={2} />
      </div>
    </div>
    <div
      className="mt-1.5 text-[11px] font-semibold text-foreground leading-tight text-center"
      dir="auto"
      style={{ unicodeBidi: "plaintext" }}
    >
      {value}
    </div>
    <div className="text-[10px] text-muted-foreground/70 leading-tight text-center">
      {label}
    </div>
  </div>
);

const lvl = (n?: number | null) =>
  n == null || n === 0 ? "—" : n <= 2 ? "נמוך" : n <= 3 ? "בינוני" : "גבוה";

export const BreedTraitCircles = ({
  breed,
  weight,
  kcalTarget,
  accent = "hsl(var(--primary))",
}: Props) => {
  const [info, setInfo] = useState<BreedRow | null>(null);

  useEffect(() => {
    if (!breed) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("breed_information")
        .select(
          "size_category, energy_level, grooming_freq, trainability, mental_needs, exercise_needs, description_he"
        )
        .or(`breed_name.ilike.%${breed}%,breed_name_he.ilike.%${breed}%`)
        .maybeSingle();
      if (!cancelled && data) setInfo(data as BreedRow);
    })();
    return () => {
      cancelled = true;
    };
  }, [breed]);

  const sizeKey = (info?.size_category || "").toLowerCase();
  const coat = detectCoat(info?.description_he);
  const activityLvl = info?.energy_level ?? 0; // proxy for daily activity demand

  const items = [
    {
      icon: Weight,
      label: "משקל",
      value: weight != null ? `${weight} ק״ג` : "—",
      pct: weight ? Math.min(100, (weight / 50) * 100) : 0,
      color: "hsl(205 80% 58%)",
    },
    {
      icon: Zap,
      label: "אנרגיה",
      value: lvl(info?.energy_level),
      pct: ((info?.energy_level ?? 0) / 5) * 100,
      color: "hsl(35 88% 58%)",
    },
    {
      icon: Flame,
      label: "קלוריות",
      value: kcalTarget ? `${kcalTarget}` : "—",
      pct: kcalTarget ? Math.min(100, (kcalTarget / 1800) * 100) : 0,
      color: "hsl(8 78% 60%)",
    },
    {
      icon: Brush,
      label: "הברשה",
      value: lvl(info?.grooming_freq),
      pct: ((info?.grooming_freq ?? 0) / 5) * 100,
      color: "hsl(280 60% 60%)",
    },
    {
      icon: Footprints,
      label: "פעילות יומית",
      value: lvl(activityLvl),
      pct: (activityLvl / 5) * 100,
      color: "hsl(150 55% 50%)",
    },
    {
      icon: Ruler,
      label: "מימדים",
      value: SIZE_HE[sizeKey] || "—",
      pct: ((SIZE_LEVEL[sizeKey] ?? 0) / 5) * 100,
      color: "hsl(220 60% 60%)",
    },
    {
      icon: Scissors,
      label: "פרווה",
      value: coat.label,
      pct: (coat.level / 5) * 100,
      color: "hsl(25 70% 55%)",
    },
    {
      icon: Brain,
      label: "אינטליגנציה",
      value: lvl(info?.trainability ?? info?.mental_needs),
      pct: ((info?.trainability ?? info?.mental_needs ?? 0) / 5) * 100,
      color: accent,
    },
  ];

  return (
    <div className="mt-1" dir="rtl">
      <div className="flex items-baseline justify-between mb-2 px-1">
        <div className="text-[13px] font-bold text-foreground tracking-tight">
          מאפייני הגזע
        </div>
      </div>
      <div className="rounded-2xl bg-card border border-border/40 px-3 py-3">
        <div
          className="flex gap-3 overflow-x-auto no-scrollbar"
          style={{ scrollbarWidth: "none" }}
        >
          {items.map((it) => (
            <Circle key={it.label} {...it} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BreedTraitCircles;