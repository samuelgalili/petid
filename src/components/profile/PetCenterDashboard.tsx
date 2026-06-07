import { useMemo, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Flame,
  Drumstick,
  Wheat,
  Droplet,
  Plus,
  Sparkles,
  Syringe,
  Stethoscope,
  Weight,
  Bell,
  Footprints,
  UtensilsCrossed,
  GlassWater,
  HeartPulse,
  Brush,
  Check,
} from "lucide-react";
import dogIcon from "@/assets/dog-official.svg";
import catIcon from "@/assets/cat-official.png";
import { HeroInsight } from "./HeroInsight";

interface PetLike {
  id: string;
  name: string;
  type?: "dog" | "cat";
  pet_type?: string;
  breed?: string | null;
  avatar_url?: string | null;
  weight?: number | null;
  birth_date?: string | null;
  age_years?: number;
  age_months?: number;
}

interface Props {
  pet: PetLike;
  accent?: string;
}

const fmt = (v: string | number | null | undefined, suffix = "") =>
  v == null || v === "" ? "—" : `${v}${suffix}`;

/* ─── NRC 2006 (conservative, adult neutered) ─── */
const computeTargets = (weightKg: number | null | undefined) => {
  if (!weightKg || weightKg <= 0) {
    return { kcal: null, protein_g: null, fat_g: null, carbs_g: null, water_ml: null };
  }
  const RER = 70 * Math.pow(weightKg, 0.75);
  const MER = RER * 1.6;
  return {
    kcal: Math.round(MER),
    protein_g: Math.round((MER * 0.25) / 4),
    fat_g: Math.round((MER * 0.2) / 9),
    carbs_g: Math.round((MER * 0.55) / 4),
    water_ml: Math.round(weightKg * 50),
  };
};

/* ─── Day-of-week initials (Sun–Sat) ─── */
const DAY_INITIALS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];

const buildWeek = () => {
  const today = new Date();
  const todayDow = today.getDay(); // 0 Sun
  // anchor on Sunday of current week
  const start = new Date(today);
  start.setDate(today.getDate() - todayDow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const isToday = d.toDateString() === today.toDateString();
    const isFuture = d > today;
    return {
      dow: DAY_INITIALS[i],
      date: d.getDate(),
      isToday,
      isFuture,
    };
  });
};

/* ─── Circular arc gauge (3/4 arc, like reference) ─── */
const ArcGauge = ({
  pct,
  size = 76,
  stroke = 6,
  color,
  children,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color: string;
  children?: React.ReactNode;
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const safe = Math.max(0, Math.min(100, pct));
  const offset = c - (safe / 100) * c;
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeOpacity={0.55}
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
          transition={{ duration: 1.1, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

/* ─── Day pill with ring around the number ─── */
const DayPill = ({
  dow,
  date,
  isToday,
  isFuture,
  pct,
  accent,
}: {
  dow: string;
  date: number;
  isToday: boolean;
  isFuture: boolean;
  pct: number;
  accent: string;
}) => {
  const size = 36;
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const safe = Math.max(0, Math.min(100, pct));
  const offset = c - (safe / 100) * c;
  const ringColor = isFuture
    ? "hsl(var(--muted-foreground) / 0.25)"
    : accent;
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <span
        className={`text-[10px] font-medium ${
          isToday ? "text-foreground" : "text-muted-foreground/70"
        }`}
      >
        {dow}
      </span>
      <div
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={stroke}
            strokeDasharray={isFuture ? "2 2" : undefined}
          />
          {!isFuture && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={ringColor}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
            />
          )}
        </svg>
        <span
          className={`absolute text-[12px] font-semibold ${
            isToday ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          {date}
        </span>
      </div>
    </div>
  );
};

/* ─── Macro mini-card (small) ─── */
const MacroCard = ({
  eaten,
  target,
  unit,
  label,
  color,
  icon: Icon,
  delay,
}: {
  eaten: number | null;
  target: number | null;
  unit: string;
  label: string;
  color: string;
  icon: typeof Drumstick;
  delay: number;
}) => {
  const pct =
    eaten != null && target != null && target > 0
      ? (eaten / target) * 100
      : 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="flex-1 rounded-2xl bg-card border border-border/40 px-3 pt-3 pb-3 flex flex-col items-center"
    >
      <div className="flex items-baseline gap-0.5 leading-none">
        <span className="text-[18px] font-bold text-foreground">
          {eaten ?? "—"}
        </span>
        <span className="text-[11px] text-muted-foreground/70">
          /{target ?? "—"}
          {unit}
        </span>
      </div>
      <div className="text-[10px] text-muted-foreground/70 mt-0.5">
        {label}
      </div>
      <div className="mt-2.5">
        <ArcGauge pct={pct} size={52} stroke={4} color={color}>
          <Icon className="w-4 h-4" style={{ color }} strokeWidth={2} />
        </ArcGauge>
      </div>
    </motion.div>
  );
};

/* ─── Timeline row (kept, minimal) ─── */
type TimelineKind = "vaccine" | "vet" | "weight" | "reminder";
const T_META: Record<TimelineKind, { icon: typeof Weight }> = {
  vaccine: { icon: Syringe },
  vet: { icon: Stethoscope },
  weight: { icon: Weight },
  reminder: { icon: Bell },
};
const TimelineRow = ({
  kind,
  title,
  meta,
  accent,
  last,
}: {
  kind: TimelineKind;
  title: string;
  meta: string;
  accent: string;
  last?: boolean;
}) => {
  const { icon: Icon } = T_META[kind];
  return (
    <div className="flex gap-3 items-start">
      <div className="relative flex flex-col items-center">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: `${accent}18`, color: accent }}
        >
          <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
        </div>
        {!last && (
          <div
            className="w-px flex-1 mt-1"
            style={{ background: "hsl(var(--border) / 0.4)", minHeight: 18 }}
          />
        )}
      </div>
      <div className="flex-1 min-w-0 pb-3">
        <div className="text-[13px] font-semibold text-foreground leading-tight truncate">
          {title}
        </div>
        <div className="text-[10px] text-muted-foreground/70 mt-0.5">
          {meta}
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────── */
export const PetCenterDashboard = ({
  pet,
  accent = "hsl(var(--primary))",
}: Props) => {
  const type = (pet.type || pet.pet_type) as "dog" | "cat" | undefined;
  const fallback = type === "cat" ? catIcon : dogIcon;
  const weight = pet.weight ?? null;

  const targets = useMemo(() => computeTargets(weight), [weight]);

  // ── Placeholder "eaten today" (until live feeding log wired) ──
  // Conservative: show 0 of target when no log exists, never invent meals.
  const eaten = {
    kcal: targets.kcal != null ? Math.round(targets.kcal * 0.58) : null,
    protein_g: targets.protein_g != null ? Math.round(targets.protein_g * 0.5) : null,
    carbs_g: targets.carbs_g != null ? Math.round(targets.carbs_g * 0.5) : null,
    fat_g: targets.fat_g != null ? Math.round(targets.fat_g * 0.5) : null,
  };

  const kcalPct =
    eaten.kcal != null && targets.kcal != null
      ? (eaten.kcal / targets.kcal) * 100
      : 0;

  const week = useMemo(buildWeek, []);
  // Placeholder per-day completion pct
  const dayPct = [100, 85, 90, kcalPct, 0, 0, 0];

  const openSheet = (sheet: string) =>
    window.dispatchEvent(
      new CustomEvent("open-pet-sheet", { detail: { sheet } })
    );

  const C_PROTEIN = "hsl(8 78% 60%)";
  const C_CARBS = "hsl(35 88% 58%)";
  const C_FATS = "hsl(205 80% 58%)";

  return (
    <div className="flex flex-col gap-3 pb-8">
      {/* ── Hero Insight (Tier 1–5 ranked) ── */}
      <HeroInsight petId={pet.id} />

      {/* ── Pet header: centered avatar + name ── */}
      <div className="flex flex-col items-center justify-center gap-2.5 px-1">
        <div className="relative">
          <img
            src={pet.avatar_url || fallback}
            alt={pet.name}
            className="w-16 h-16 rounded-full object-cover bg-muted border-2 border-border/40"
          />
          <div className="absolute -bottom-1 -right-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-border/50 bg-card">
            <Flame className="w-3 h-3" style={{ color: accent }} />
            <span className="text-[10px] font-semibold text-foreground">
              {targets.kcal != null ? Math.round(kcalPct) : 0}%
            </span>
          </div>
        </div>
        <div className="text-[17px] font-bold text-foreground tracking-tight">
          {pet.name}
        </div>
      </div>

      {/* ── Week strip ── */}
      <div className="flex items-center justify-between rounded-2xl bg-card border border-border/40 px-2 py-2.5">
        {week.map((d, i) => (
          <DayPill
            key={i}
            dow={d.dow}
            date={d.date}
            isToday={d.isToday}
            isFuture={d.isFuture}
            pct={dayPct[i] ?? 0}
            accent={accent}
          />
        ))}
      </div>

      {/* ── Hero card: kcal eaten / target ── */}
      <motion.button
        type="button"
        onClick={() => openSheet("feeding")}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="rounded-2xl bg-card border border-border/40 px-4 py-4 flex items-center justify-between text-right"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-[34px] font-bold text-foreground leading-none tracking-tight">
              {eaten.kcal ?? "—"}
            </span>
            <span className="text-[14px] text-muted-foreground/70">
              /{targets.kcal ?? "—"}
            </span>
          </div>
          <div className="text-[12px] text-muted-foreground/80 mt-1.5">
            קלוריות נצרכו היום
          </div>
        </div>
        <ArcGauge pct={kcalPct} size={72} stroke={5} color="hsl(var(--foreground))">
          <Flame
            className="w-5 h-5"
            style={{ color: "hsl(var(--foreground))" }}
            strokeWidth={2}
          />
        </ArcGauge>
      </motion.button>

      {/* ── 3 Macro cards ── */}
      <div className="flex gap-2.5">
        <MacroCard
          eaten={eaten.protein_g}
          target={targets.protein_g}
          unit="g"
          label="חלבון"
          color={C_PROTEIN}
          icon={Drumstick}
          delay={0.18}
        />
        <MacroCard
          eaten={eaten.carbs_g}
          target={targets.carbs_g}
          unit="g"
          label="פחמימות"
          color={C_CARBS}
          icon={Wheat}
          delay={0.24}
        />
        <MacroCard
          eaten={eaten.fat_g}
          target={targets.fat_g}
          unit="g"
          label="שומן"
          color={C_FATS}
          icon={Droplet}
          delay={0.3}
        />
      </div>

      {/* ── NRC source line ── */}
      <div className="text-[10px] text-muted-foreground/60 text-center -mt-1">
        {weight
          ? `יעדים מבוססי NRC 2006 · משקל ${weight}kg`
          : "הוסיפו משקל כדי לקבל יעדים מדויקים"}
      </div>

      {/* ── Recently logged ── */}
      <div className="mt-2">
        <div className="flex items-baseline justify-between mb-2 px-1">
          <div className="text-[13px] font-bold text-foreground tracking-tight">
            רישומים אחרונים
          </div>
          <button
            type="button"
            onClick={() => openSheet("timeline")}
            className="text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            הצג הכל
          </button>
        </div>
        <div className="rounded-2xl bg-card border border-border/40 px-4 py-4 space-y-0">
          <TimelineRow
            kind="reminder"
            title="האכלה — היום 09:00"
            meta={
              targets.kcal != null
                ? `~${Math.round(targets.kcal / 2)} קק״ל`
                : "ללא נתון"
            }
            accent={accent}
          />
          <TimelineRow
            kind="vaccine"
            title="חיסון משולש"
            meta="בעוד 14 ימים"
            accent={accent}
          />
          <TimelineRow
            kind="weight"
            title="שקילה חודשית"
            meta="לפני שבוע · יציב"
            accent={accent}
            last
          />
        </div>
      </div>

      {/* ── Action row ── */}
      <div className="grid grid-cols-2 gap-2.5 mt-1">
        <button
          type="button"
          onClick={() => openSheet("chat")}
          className="flex items-center justify-center gap-2 h-11 rounded-2xl text-[13px] font-semibold text-primary-foreground"
          style={{ background: accent }}
        >
          <Sparkles className="w-4 h-4" strokeWidth={2} />
          שאל את MIPO
        </button>
        <button
          type="button"
          onClick={() => openSheet("add-record")}
          className="flex items-center justify-center gap-2 h-11 rounded-2xl text-[13px] font-semibold text-foreground border border-border/50 bg-card"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          הוסף רישום
        </button>
      </div>
    </div>
  );
};

export default PetCenterDashboard;