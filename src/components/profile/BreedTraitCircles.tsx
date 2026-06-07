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
  /** When set, renders the 8 traits as an absolute orbit ring around a parent (no card wrapper). */
  orbit?: { radius: number; size?: number };
  /** When true, renders a compact vertical column (used beside the avatar). */
  vertical?: boolean;
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
  size = 64,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  pct: number;
  color: string;
  size?: number;
}) => (
  <div className="flex flex-col items-center shrink-0" style={{ width: size + 14 }}>
    <div className="relative" style={{ width: size, height: size }}>
      <Ring pct={pct} color={color} size={size} />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Icon style={{ color, width: size * 0.28, height: size * 0.28 }} strokeWidth={2} />
      </div>
    </div>
    <div
      className="mt-1 text-[10px] font-semibold text-foreground leading-tight text-center"
      dir="auto"
      style={{ unicodeBidi: "plaintext" }}
    >
      {value}
    </div>
    <div className="text-[9px] text-muted-foreground/70 leading-tight text-center">
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
  orbit,
  vertical,
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

  if (orbit) {
    const { radius, size = 48 } = orbit;
    // 8 angles, offset 22.5° to avoid the 4 cardinal nutrient gauges
    const angles = items.map((_, i) => -90 + 22.5 + i * 45);
    return (
      <>
        {items.map((it, i) => {
          const a = (angles[i] * Math.PI) / 180;
          const x = Math.cos(a) * radius;
          const y = Math.sin(a) * radius;
          return (
            <div
              key={it.label}
              className="absolute"
              style={{
                left: "50%",
                top: "50%",
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              }}
            >
              <Circle {...it} size={size} />
            </div>
          );
        })}
      </>
    );
  }

  if (vertical) {
    return (
      <div
        dir="rtl"
        className="flex flex-col items-center gap-2 overflow-y-auto no-scrollbar py-1"
        style={{ scrollbarWidth: "none", maxHeight: 280 }}
      >
        {items.map((it) => (
          <Circle key={it.label} {...it} size={48} />
        ))}
      </div>
    );
  }

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