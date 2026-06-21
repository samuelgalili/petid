import { useMemo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  X,
  Zap,
} from "lucide-react";
import dogIcon from "@/assets/dog-official.svg";
import catIcon from "@/assets/cat-official.png";
import dobermanAsset from "@/assets/doberman.jpg.asset.json";
import { HeroInsight } from "./HeroInsight";
import { BreedTraitCircles } from "./BreedTraitCircles";
import { AnimatedCounter } from "./AnimatedCounter";
import { supabase } from "@/integrations/supabase/client";

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

/* ─── Flip Gauge: ring with icon ⇄ value flipping inside ─── */
const FlipGauge = ({
  pct,
  size,
  stroke,
  color,
  icon: Icon,
  eaten,
  target,
  unit,
  iconSize,
  numberClass,
  unitClass,
  onClick,
  ariaLabel,
}: {
  pct: number;
  size: number;
  stroke: number;
  color: string;
  icon: typeof Drumstick;
  eaten: number | null;
  target: number | null;
  unit: string;
  iconSize: number;
  numberClass: string;
  unitClass: string;
  onClick?: () => void;
  ariaLabel?: string;
}) => {
  const [showValue, setShowValue] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setShowValue((v) => !v), 2600);
    return () => clearInterval(t);
  }, []);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="relative outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-full"
      style={{ width: size, height: size, ['--tw-ring-color' as any]: color }}
    >
      <ArcGauge pct={pct} size={size} stroke={stroke} color={color}>
        <div className="relative w-full h-full" style={{ perspective: 600 }}>
          <AnimatePresence mode="wait" initial={false}>
            {showValue ? (
              <motion.div
                key="value"
                initial={{ rotateY: -90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: 90, opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="absolute inset-0 flex flex-col items-center justify-center leading-none"
                style={{ backfaceVisibility: "hidden" }}
              >
                <div className="flex items-baseline gap-0.5" dir="ltr">
                  <span className={numberClass} style={{ color }}>
                    {eaten ?? "—"}
                  </span>
                  <span className={unitClass}>
                    /{target ?? "—"}{unit}
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="icon"
                initial={{ rotateY: -90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: 90, opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="absolute inset-0 flex items-center justify-center"
                style={{ backfaceVisibility: "hidden" }}
              >
                <Icon
                  style={{ color, width: iconSize, height: iconSize }}
                  strokeWidth={2}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ArcGauge>
    </button>
  );
};

/* ─── Day pill with ring around the number ─── */

/* ─── Orbit Gauge: borderless flipping ring used around the avatar ─── */
const OrbitGauge = ({
  pct,
  color,
  icon,
  eaten,
  target,
  unit,
  label,
  onClick,
}: {
  pct: number;
  color: string;
  icon: typeof Drumstick;
  eaten: number | null;
  target: number | null;
  unit: string;
  label: string;
  onClick: () => void;
}) => {
  return (
    <div className="flex flex-col items-center gap-1">
      <FlipGauge
        pct={pct}
        size={64}
        stroke={4}
        color={color}
        icon={icon}
        eaten={eaten}
        target={target}
        unit={unit}
        iconSize={20}
        numberClass="text-[13px] font-bold"
        unitClass="text-[8px] text-muted-foreground/70"
        onClick={onClick}
        ariaLabel={label}
      />
      <span
        className="text-[10px] font-medium"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
};

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
  const size = 40;
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const safe = Math.max(0, Math.min(100, pct));
  const offset = c - (safe / 100) * c;
  const ringColor = isFuture
    ? "hsl(var(--muted-foreground) / 0.25)"
    : accent;
  // Alternate between day-of-week and date number inside the circle
  const [showDow, setShowDow] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setShowDow((v) => !v), 2200);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      <div
        className={`relative flex items-center justify-center rounded-full ${isToday ? 'shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.6)]' : ''}`}
        style={{ width: size, height: size }}
      >
        {isToday && (
          <div
            className="absolute inset-1 rounded-full opacity-90"
            style={{ background: 'conic-gradient(from 140deg, #FF9A6C, #FF7BAC, #C58BFA, #6BB8FF, #FF9A6C)' }}
            aria-hidden
          />
        )}
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
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={showDow ? `dow-${dow}` : `date-${date}`}
            initial={{ opacity: 0, y: 6, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.85 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className={`absolute font-bold tabular-nums z-10 ${
              showDow ? "text-[11px]" : "text-[13px]"
            } ${isToday ? "text-white drop-shadow" : isFuture ? "text-muted-foreground/50" : "text-muted-foreground"}`}
          >
            {showDow ? dow : date}
          </motion.span>
        </AnimatePresence>
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
  onInfo,
}: {
  eaten: number | null;
  target: number | null;
  unit: string;
  label: string;
  color: string;
  icon: typeof Drumstick;
  delay: number;
  onInfo: () => void;
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
      className="flex-1 rounded-2xl bg-card border border-border/40 px-2 pt-3 pb-3 flex flex-col items-center gap-2"
    >
      <FlipGauge
        pct={pct}
        size={64}
        stroke={4}
        color={color}
        icon={Icon}
        eaten={eaten}
        target={target}
        unit={unit}
        iconSize={18}
        numberClass="text-[13px] font-bold"
        unitClass="text-[8px] text-muted-foreground/70"
        onClick={onInfo}
        ariaLabel={label}
      />
      <div className="text-[10px] text-muted-foreground/70">
        {label}
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
/* ─── Daily care tasks ─── */
type DailyTaskKey =
  | "walk_morning"
  | "walk_evening"
  | "feed_morning"
  | "feed_evening"
  | "water"
  | "health_check"
  | "grooming"
  | "play";

const DAILY_TASKS: { key: DailyTaskKey; label: string; icon: typeof Footprints }[] = [
  { key: "walk_morning", label: "הליכת בוקר", icon: Footprints },
  { key: "feed_morning", label: "ארוחת בוקר", icon: UtensilsCrossed },
  { key: "water", label: "מים נקיים", icon: GlassWater },
  { key: "play", label: "משחק", icon: Sparkles },
  { key: "walk_evening", label: "הליכת ערב", icon: Footprints },
  { key: "feed_evening", label: "ארוחת ערב", icon: UtensilsCrossed },
  { key: "grooming", label: "טיפוח / מברשת", icon: Brush },
  { key: "health_check", label: "בדיקת בריאות", icon: HeartPulse },
];

/* MIPO score color: red <40, orange <75, green ≥75 */
const scoreColor = (pct: number) => {
  if (pct >= 75) return "hsl(142 70% 45%)";
  if (pct >= 40) return "hsl(30 92% 55%)";
  return "hsl(0 78% 58%)";
};
const scoreLabel = (pct: number) =>
  pct >= 75 ? "מצוין" : pct >= 40 ? "בסדר" : "נמוך";

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const useDailyTasks = (petId: string) => {
  const storageKey = `petid:daily:${petId}:${todayKey()}`;
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(done));
    } catch {}
  }, [storageKey, done]);
  const toggle = useCallback((key: string) => {
    setDone((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);
  const completed = DAILY_TASKS.filter((t) => done[t.key]).length;
  const pct = Math.round((completed / DAILY_TASKS.length) * 100);
  return { done, toggle, completed, total: DAILY_TASKS.length, pct };
};

export const PetCenterDashboard = ({
  pet,
  accent = "hsl(var(--primary))",
}: Props) => {
  const type = (pet.type || pet.pet_type) as "dog" | "cat" | undefined;
  const fallback = type === "cat" ? catIcon : dogIcon;
  const weight = pet.weight ?? null;

  const targets = useMemo(() => computeTargets(weight), [weight]);

  const daily = useDailyTasks(pet.id);
  const dailyColor = scoreColor(daily.pct);
  const [tasksOpen, setTasksOpen] = useState(false);
  const [infoKey, setInfoKey] = useState<null | "kcal" | "protein" | "carbs" | "fat">(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  useEffect(() => {
    if (!pet.breed) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("breed_information")
        .select("energy_level")
        .or(`breed_name.ilike.%${pet.breed}%,breed_name_he.ilike.%${pet.breed}%`)
        .maybeSingle();
      if (!cancelled && data) setEnergyLevel((data as { energy_level: number | null }).energy_level ?? null);
    })();
    return () => { cancelled = true; };
  }, [pet.breed]);

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

      {/* ── Week strip ── */}
      <div className="flex items-center justify-between rounded-2xl bg-card/30 backdrop-blur-xl border border-white/10 px-2 py-2.5 shadow-[0_8px_28px_-12px_hsl(var(--primary)/0.25)]">
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

      {/* ── Daily Tasks Bottom Sheet ── */}
      <AnimatePresence>
        {tasksOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-sm"
              onClick={() => setTasksOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="fixed inset-x-0 bottom-0 z-[81] rounded-t-3xl bg-card border-t border-border/50 px-4 pt-3 pb-6 max-h-[85vh] overflow-y-auto"
            >
              {/* Grabber */}
              <div className="flex justify-center mb-3">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="text-[16px] font-bold text-foreground tracking-tight">
                    משימות יומיות
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    סמנו מה כבר ביצעתם — הדירוג מתעדכן אוטומטית
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTasksOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center border border-border/50 text-muted-foreground hover:text-foreground"
                  aria-label="סגור"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Score row */}
              <div className="flex items-center justify-between mt-3 mb-2">
                <span
                  className="text-[12px] font-semibold"
                  style={{ color: dailyColor }}
                >
                  {scoreLabel(daily.pct)} · {daily.pct}%
                </span>
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ color: dailyColor, background: `${dailyColor}1a` }}
                >
                  {daily.completed}/{daily.total}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden mb-4">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: dailyColor }}
                  initial={false}
                  animate={{ width: `${daily.pct}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>

              {/* Tasks list */}
              <div className="flex flex-col gap-2">
                {DAILY_TASKS.map((t) => {
                  const Icon = t.icon;
                  const checked = !!daily.done[t.key];
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => daily.toggle(t.key)}
                      className="flex items-center gap-3 px-3 py-3 rounded-2xl border transition-colors text-right"
                      style={{
                        borderColor: checked
                          ? `${dailyColor}55`
                          : "hsl(var(--border) / 0.5)",
                        background: checked ? `${dailyColor}10` : "transparent",
                      }}
                      aria-pressed={checked}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2"
                        style={{
                          background: checked ? dailyColor : "transparent",
                          borderColor: checked
                            ? dailyColor
                            : "hsl(var(--border))",
                        }}
                      >
                        {checked && (
                          <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                        )}
                      </div>
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: checked
                            ? `${dailyColor}1f`
                            : "hsl(var(--muted) / 0.5)",
                        }}
                      >
                        <Icon
                          className="w-4 h-4"
                          style={{
                            color: checked
                              ? dailyColor
                              : "hsl(var(--muted-foreground))",
                          }}
                          strokeWidth={2}
                        />
                      </div>
                      <span
                        className={`text-[14px] font-medium flex-1 ${
                          checked ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Hero: avatar centered with a single Daily Goal ring ── */}
      {(() => {
        const SIZE = 240;
        const STROKE = 10;
        const R = (SIZE - STROKE) / 2;
        const C = 2 * Math.PI * R;
        // Overall daily target: average of kcal % and daily-tasks completion
        const overall = Math.round(
          Math.min(100, (Math.min(100, kcalPct) + daily.pct) / 2)
        );
        const offset = C - (overall / 100) * C;
        const ringColor = scoreColor(overall);
        return (
          <div className="relative flex items-center justify-between gap-2 w-full px-2" dir="rtl">
            {/* Animated aurora — two drifting orbs that breathe behind the pet */}
            <motion.div
              className="pointer-events-none absolute left-1/3 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-3xl"
              style={{ background: 'radial-gradient(circle, hsl(20 90% 60%) 0%, hsl(340 80% 60%) 50%, transparent 100%)' }}
              animate={{ opacity: [0.15, 0.3, 0.15], scale: [1, 1.1, 1], x: [-20, 20, -20] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden
            />
            <motion.div
              className="pointer-events-none absolute left-2/3 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl"
              style={{ background: 'radial-gradient(circle, hsl(265 80% 65%) 0%, hsl(205 80% 60%) 55%, transparent 100%)' }}
              animate={{ opacity: [0.12, 0.28, 0.12], scale: [1.1, 1, 1.1], x: [20, -20, 20] }}
              transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden
            />
            <BreedTraitCircles
              breed={pet.breed}
              weight={weight}
              kcalTarget={targets.kcal}
              accent={accent}
              vertical
            />

            {/* ── Breed-recommended actions vertical column ── */}
            <div className="flex flex-col items-center gap-2 overflow-y-auto no-scrollbar py-1" style={{ scrollbarWidth: 'none', maxHeight: 280 }} aria-label="פעולות מומלצות לגזע">
              {[
                { key: "water", icon: GlassWater, label: "מים", color: "hsl(200 70% 55%)" },
                { key: "activity", icon: Footprints, label: "פעילות", color: "hsl(30 80% 55%)" },
                { key: "health", icon: HeartPulse, label: "בריאות", color: "hsl(0 70% 60%)" },
                { key: "grooming", icon: Brush, label: "טיפוח", color: "hsl(280 60% 60%)" },
              ].map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => openSheet(b.key)}
                  aria-label={b.label}
                  className="flex flex-col items-center shrink-0"
                  style={{ width: 56 }}
                >
                  <div className="relative rounded-full bg-card/30 border border-border/20" style={{ width: 44, height: 44 }}>
                    <svg width={44} height={44} viewBox="0 0 44 44" className="-rotate-90" aria-hidden>
                      <circle cx={22} cy={22} r={18} fill="none" stroke="hsl(var(--muted))" strokeWidth={3} />
                      <circle cx={22} cy={22} r={18} fill="none" stroke={b.color} strokeWidth={3} strokeLinecap="round" strokeDasharray={113} strokeDashoffset={28} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <b.icon style={{ color: b.color, width: 14, height: 14 }} strokeWidth={2} />
                    </div>
                  </div>
                  <div className="mt-1 text-[9px] text-muted-foreground/80 leading-tight text-center">{b.label}</div>
                </button>
              ))}
            </div>

          <motion.button
            type="button"
            onClick={() => setInfoKey("kcal")}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
            className="relative block shrink-0"
            style={{ width: SIZE, height: SIZE }}
            aria-label={`יעד יומי ${overall}%`}
          >
            {/* Subtle brand halo behind the ring */}
            <div
              className="absolute inset-0 pointer-events-none rounded-full"
              aria-hidden
              style={{
                background:
                  "conic-gradient(from 0deg, #FF9A6C, #FF7BAC, #C58BFA, #6BB8FF, #FF9A6C)",
                filter: "blur(28px)",
                opacity: 0.28,
              }}
            />
            {/* Single daily-goal ring with MIPO gradient */}
            <svg
              width={SIZE}
              height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className="absolute inset-0 -rotate-90"
              aria-hidden
            >
              <defs>
                <linearGradient id="mipoRing" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF9A6C" />
                  <stop offset="35%" stopColor="#FF7BAC" />
                  <stop offset="70%" stopColor="#C58BFA" />
                  <stop offset="100%" stopColor="#6BB8FF" />
                </linearGradient>
                <filter id="mipoGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke="hsl(var(--muted) / 0.4)"
                strokeWidth={STROKE}
              />
              <motion.circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke="url(#mipoRing)"
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={C}
                filter="url(#mipoGlow)"
                initial={{ strokeDashoffset: C }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
            </svg>
            {/* Avatar inside the ring */}
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src={dobermanAsset.url}
                alt={pet.name}
                className="w-[200px] h-[200px] rounded-full object-contain bg-muted block"
              />
            </div>
            {/* Goal % badge */}
            <div
              className="absolute left-1/2 -translate-x-1/2 -bottom-3 px-3 py-1 rounded-full text-[12px] font-bold shadow-md"
              style={{
                background: "hsl(var(--card))",
                color: "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border))",
              }}
            >
              {overall}% יעד יומי
            </div>
          </motion.button>

            {/* ── Weight + Vaccinations vertical column (left side of avatar) ── */}
            <div className="flex flex-col items-center gap-2 overflow-y-auto no-scrollbar py-1" style={{ scrollbarWidth: 'none', maxHeight: 280 }}>
              {/* Energy (breed) */}
              <button
                type="button"
                onClick={() => openSheet('activity')}
                className="flex flex-col items-center shrink-0"
                style={{ width: 62 }}
              >
                <div className="relative rounded-full bg-card/30 border border-border/20" style={{ width: 48, height: 48 }}>
                  <svg width={48} height={48} viewBox="0 0 48 48" className="-rotate-90" aria-hidden>
                    <circle cx={24} cy={24} r={20} fill="none" stroke="hsl(var(--muted))" strokeWidth={4} />
                    <circle cx={24} cy={24} r={20} fill="none" stroke="hsl(35 88% 58%)" strokeWidth={4} strokeLinecap="round" strokeDasharray={125.6} strokeDashoffset={125.6 - ((energyLevel ?? 0) / 5) * 125.6} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap style={{ color: 'hsl(35 88% 58%)', width: 14, height: 14 }} strokeWidth={2} />
                  </div>
                </div>
                <div className="mt-1 text-[10px] font-semibold text-foreground leading-tight text-center">
                  {energyLevel == null || energyLevel === 0 ? '—' : energyLevel <= 2 ? 'נמוך' : energyLevel <= 3 ? 'בינוני' : 'גבוה'}
                </div>
                <div className="text-[9px] text-muted-foreground/70 leading-tight text-center">אנרגיה</div>
              </button>

              {/* Weight */}
              <button
                type="button"
                onClick={() => openSheet('weight')}
                className="flex flex-col items-center shrink-0"
                style={{ width: 62 }}
              >
                <div className="relative rounded-full bg-card/30 border border-border/20" style={{ width: 48, height: 48 }}>
                  <svg width={48} height={48} viewBox="0 0 48 48" className="-rotate-90" aria-hidden>
                    <circle cx={24} cy={24} r={20} fill="none" stroke="hsl(var(--muted))" strokeWidth={4} />
                    <circle cx={24} cy={24} r={20} fill="none" stroke={accent} strokeWidth={4} strokeLinecap="round" strokeDasharray={125.6} strokeDashoffset={weight ? 125.6 - ((Math.min(100, weight / 50 * 100)) / 100) * 125.6 : 125.6} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Weight style={{ color: accent, width: 14, height: 14 }} strokeWidth={2} />
                  </div>
                </div>
                <div className="mt-1 text-[10px] font-semibold text-foreground leading-tight text-center" dir="auto" style={{ unicodeBidi: 'plaintext' }}>
                  {weight ? `${weight} ק״ג` : '—'}
                </div>
                <div className="text-[9px] text-muted-foreground/70 leading-tight text-center">משקל</div>
              </button>

              {/* Vaccinations */}
              <button
                type="button"
                onClick={() => openSheet('vaccines')}
                className="flex flex-col items-center shrink-0"
                style={{ width: 62 }}
              >
                <div className="relative rounded-full bg-card/30 border border-border/20" style={{ width: 48, height: 48 }}>
                  <svg width={48} height={48} viewBox="0 0 48 48" className="-rotate-90" aria-hidden>
                    <circle cx={24} cy={24} r={20} fill="none" stroke="hsl(var(--muted))" strokeWidth={4} />
                    <circle cx={24} cy={24} r={20} fill="none" stroke="hsl(150 55% 50%)" strokeWidth={4} strokeLinecap="round" strokeDasharray={125.6} strokeDashoffset={31.4} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Syringe style={{ color: 'hsl(150 55% 50%)', width: 14, height: 14 }} strokeWidth={2} />
                  </div>
                </div>
                <div className="mt-1 text-[10px] font-semibold text-foreground leading-tight text-center">עדכניים</div>
                <div className="text-[9px] text-muted-foreground/70 leading-tight text-center">חיסונים</div>
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── NRC source line ── */}
      <div className="mt-2 flex justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-card/40 border border-border/30 backdrop-blur-md">
          <span className="h-[1px] w-4 bg-gradient-to-r from-transparent via-foreground/40 to-transparent" />
          <span className="text-[10px] tracking-[0.15em] text-muted-foreground/80 font-medium" dir="auto" style={{ unicodeBidi: 'plaintext' }}>
            {weight ? `NRC 2006 · ${weight}KG` : 'הוסיפו משקל ליעדים מדויקים'}
          </span>
          <span className="h-[1px] w-4 bg-gradient-to-r from-transparent via-foreground/40 to-transparent" />
        </div>
      </div>



      {/* ── Metric Info Sheet ── */}
      <AnimatePresence>
        {infoKey && (() => {
          const META = {
            kcal:    { title: "קלוריות",   color: "hsl(var(--foreground))", eaten: eaten.kcal,      target: targets.kcal,      unit: "קק״ל", desc: "סך האנרגיה היומית הנדרשת לפי NRC 2006, מחושבת לפי משקל הגוף (MER = 1.6 × 70 × kg^0.75). נצרך / יעד יומי." },
            protein: { title: "חלבון",     color: C_PROTEIN,                eaten: eaten.protein_g, target: targets.protein_g, unit: "גרם",   desc: "בונה שריר, מערכת חיסון ורקמות. כ-25% מסך הקלוריות, מחושב לפי 4 קק״ל לגרם. חוסר ארוך-טווח עלול לפגוע בריפוי ובמסת השריר." },
            carbs:   { title: "פחמימות",  color: C_CARBS,                  eaten: eaten.carbs_g,   target: targets.carbs_g,   unit: "גרם",   desc: "מקור אנרגיה זמין. כ-55% מהקלוריות, 4 קק״ל לגרם. עודף הופך לשומן — להתאים לפעילות בפועל." },
            fat:     { title: "שומן",     color: C_FATS,                   eaten: eaten.fat_g,     target: targets.fat_g,     unit: "גרם",   desc: "אנרגיה דחוסה וויטמינים מסיסים. כ-20% מהקלוריות, 9 קק״ל לגרם. חיוני לעור ופרווה — אך לא להגזים." },
          } as const;
          const m = META[infoKey];
          const pct = m.eaten != null && m.target != null && m.target > 0
            ? Math.round((m.eaten / m.target) * 100) : 0;
          return (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-sm"
                onClick={() => setInfoKey(null)}
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 32, stiffness: 320 }}
                className="fixed inset-x-0 bottom-0 z-[81] rounded-t-3xl bg-card border-t border-border/50 px-4 pt-3 pb-7 max-h-[80vh] overflow-y-auto"
              >
                <div className="flex justify-center mb-3">
                  <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: `${m.color}1a` }}
                    >
                      <Flame className="w-4 h-4" style={{ color: m.color }} />
                    </div>
                    <div>
                      <div className="text-[16px] font-bold text-foreground">{m.title}</div>
                      <div className="text-[11px] text-muted-foreground">נתונים יומיים</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInfoKey(null)}
                    className="w-8 h-8 rounded-full flex items-center justify-center border border-border/50 text-muted-foreground"
                    aria-label="סגור"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="rounded-2xl border border-border/40 px-4 py-3 mb-3 flex items-baseline justify-between" dir="ltr">
                  <span className="text-[12px] text-muted-foreground/70">{m.unit}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[28px] font-bold" style={{ color: m.color }}>
                      {m.eaten ?? "—"}
                    </span>
                    <span className="text-[13px] text-muted-foreground/70">
                      / {m.target ?? "—"}
                    </span>
                  </div>
                </div>

                <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden mb-4">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: m.color }}
                    initial={false}
                    animate={{ width: `${Math.min(100, pct)}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>

                <p className="text-[13px] leading-[1.6] text-foreground/85 mb-2" dir="auto">
                  {m.desc}
                </p>
                <p className="text-[10px] text-muted-foreground/60">
                  יעדים מבוססי NRC 2006 · ערך שמרני, אינו תחליף לייעוץ וטרינרי.
                </p>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

export default PetCenterDashboard;