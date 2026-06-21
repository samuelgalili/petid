import { useMemo, useState, useEffect, useCallback, useId, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
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
  Share2,
  Sun,
  Moon,
  Sunrise,
  CalendarCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ─────────────────────────────────────────────────────────── */
/* Unified icon system — single stroke + size, currentColor.
   Use this everywhere instead of raw lucide elements so the
   dashboard stays monochrome and visually consistent. */
const ICON_STROKE = 1.5;
type IcoSize = "xs" | "sm" | "md" | "lg";
const ICO_PX: Record<IcoSize, number> = { xs: 12, sm: 14, md: 18, lg: 20 };

/* Mipo brand gradient — single source of truth lives in index.css
   (--mipo-brand-1..4, --mipo-gradient, --mipo-gradient-conic).
   Use ONLY on: daily-goal ring, streak chip, one active state.
   Everything else on the dashboard must stay glass/neutral
   (--mipo-glass-bg / --mipo-glass-border / --mipo-glass-highlight). */
const BRAND_STOPS = [
  { offset: "0%",   color: "hsl(var(--mipo-brand-1))" },
  { offset: "35%",  color: "hsl(var(--mipo-brand-2))" },
  { offset: "70%",  color: "hsl(var(--mipo-brand-3))" },
  { offset: "100%", color: "hsl(var(--mipo-brand-4))" },
];
const Ico = ({
  icon: I,
  size = "md",
  className = "",
}: {
  icon: LucideIcon;
  size?: IcoSize;
  className?: string;
}) => {
  const px = ICO_PX[size];
  return (
    <I
      width={px}
      height={px}
      strokeWidth={ICON_STROKE}
      className={className}
      aria-hidden
    />
  );
};
import dogIcon from "@/assets/dog-official.svg";
import catIcon from "@/assets/cat-official.png";
import dobermanAsset from "@/assets/doberman.jpg.asset.json";
import { HeroInsight } from "./HeroInsight";
import { BreedTraitCircles } from "./BreedTraitCircles";
import { AnimatedCounter } from "./AnimatedCounter";
import { supabase } from "@/integrations/supabase/client";
import { usePetMetrics, DAILY_TASK_KEYS, type DailyTaskKey } from "@/hooks/usePetMetrics";

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

/* ─── Liquid Fill Gauge: circular vessel that fills with animated waves up to pct% ─── */
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
  const safe = Math.max(0, Math.min(100, pct));
  const rid = useId().replace(/:/g, "");
  const clipId = `lqc-${rid}`;
  // Fill height inside the circle (top y of liquid surface)
  const padding = stroke;
  const innerTop = padding;
  const innerBottom = size - padding;
  const innerH = innerBottom - innerTop;
  const surfaceY = innerBottom - (safe / 100) * innerH;
  const w = size;
  // Two stacked sine waves built from a quartet of quadratic curves
  const wavePath = (yBase: number, amp: number) =>
    `M${-w},${yBase} q${w / 4},${-amp} ${w / 2},0 t${w / 2},0 t${w / 2},0 t${w / 2},0 L${2 * w},${size} L${-w},${size} Z`;
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} aria-hidden className="absolute inset-0">
        <defs>
          <clipPath id={clipId}>
            <circle cx={size / 2} cy={size / 2} r={r} />
          </clipPath>
        </defs>
        {/* Vessel: subtle ring + faint inner wash */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="hsl(var(--muted) / 0.18)"
          stroke={color}
          strokeOpacity={0.35}
          strokeWidth={stroke / 2}
        />
        {/* Liquid */}
        <g clipPath={`url(#${clipId})`}>
          {/* Animate the surface Y as pct changes */}
          <motion.g
            initial={{ y: innerH }}
            animate={{ y: 0 }}
            transition={{ duration: 1.1, ease: "easeOut", delay: 0.15 }}
          >
            {/* Back wave — slower, more transparent */}
            <motion.path
              d={wavePath(surfaceY, Math.max(2, size * 0.06))}
              fill={color}
              fillOpacity={0.35}
              animate={{ x: [0, w] }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />
            {/* Front wave — faster, more opaque */}
            <motion.path
              d={wavePath(surfaceY + 2, Math.max(2, size * 0.05))}
              fill={color}
              fillOpacity={0.75}
              animate={{ x: [0, -w] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
          </motion.g>
        </g>
        {/* Crisp outline on top */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeOpacity={0.55}
          strokeWidth={Math.max(1, stroke / 2)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

/* ─── LiquidMini: standalone liquid fill for small side-column buttons ─── */
const LiquidMini = ({
  pct,
  size,
  color,
  icon: Icon,
  iconSize = 14,
}: {
  pct: number;
  size: number;
  color: string;
  icon: LucideIcon;
  iconSize?: number;
}) => (
  <ArcGauge pct={pct} size={size} stroke={4} color={color}>
    <Icon
      width={iconSize}
      height={iconSize}
      strokeWidth={ICON_STROKE}
      style={{ color }}
      aria-hidden
    />
  </ArcGauge>
);

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
            style={{ background: 'hsl(var(--foreground))' }}
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
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-muted/40 border border-border/40 text-foreground">
          <Ico icon={Icon} size="sm" />
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

/* Streak is derived from the DB-backed weekTaskPct in PetCenterDashboard. */

/* ─── Time-of-day awareness ─── */
const useTimeOfDay = () => {
  const [tod, setTod] = useState<"morning" | "noon" | "evening" | "night">(() => {
    const h = new Date().getHours();
    if (h < 6) return "night";
    if (h < 11) return "morning";
    if (h < 17) return "noon";
    if (h < 21) return "evening";
    return "night";
  });
  useEffect(() => {
    const id = setInterval(() => {
      const h = new Date().getHours();
      setTod(h < 6 ? "night" : h < 11 ? "morning" : h < 17 ? "noon" : h < 21 ? "evening" : "night");
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return tod;
};

/* ─── Daily Brief: time-aware greeting card with ONE action ─── */
const DailyBrief = ({
  petName,
  weight,
  dailyPct,
  topAction,
}: {
  petName: string;
  weight: number | null;
  dailyPct: number;
  topAction: { label: string; onClick: () => void; icon: typeof Plus };
}) => {
  const tod = useTimeOfDay();
  const briefKey = `petid:brief:dismiss:${todayKey()}`;
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(briefKey) === "1";
  });
  if (dismissed) return null;

  const meta = {
    morning: { Icon: Sunrise, greet: "בוקר טוב",       msg: "בואו נתחיל את היום עם הליכה קצרה ומים נקיים." },
    noon:    { Icon: Sun,     greet: "צהריים טובים",  msg: "זמן טוב לבדוק שיש מים קרים ומקום מוצל." },
    evening: { Icon: Moon,    greet: "ערב טוב",        msg: "סיום היום: ארוחת ערב, פעילות קלה ומנוחה." },
    night:   { Icon: Moon,    greet: "לילה טוב",       msg: "השעה מאוחרת — מומלץ לבדוק שאוכל לא נשאר בקערה." },
  }[tod];
  const { Icon } = meta;

  // Conservative tone — never push if data is missing
  const note = weight == null
    ? "כדי לקבל המלצות מדויקות, מומלץ להוסיף משקל עדכני."
    : dailyPct >= 75
      ? "המצב היומי נראה תקין. ממשיכים ברוטינה."
      : meta.msg;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative rounded-2xl backdrop-blur-xl border border-border/30 px-3 py-3 overflow-hidden bg-card/40"
    >
      <button
        type="button"
        onClick={() => { setDismissed(true); try { localStorage.setItem(briefKey, "1"); } catch {} }}
        className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground/70 hover:text-foreground"
        aria-label="סגור"
      >
        <Ico icon={X} size="sm" />
      </button>
      <div className="relative flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-border/30 bg-muted/40">
          <Ico icon={Icon} size="lg" className="text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0 pr-4">
          <div className="text-[13px] font-bold text-foreground leading-tight">
            {meta.greet}, {petName}
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 leading-snug">
            {note}
          </div>
          <button
            type="button"
            onClick={topAction.onClick}
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full transition-transform active:scale-95 bg-foreground text-background"
          >
            <Ico icon={topAction.icon} size="xs" />
            {topAction.label}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Build a shareable vet summary (last 7 days) ─── */
const buildVetSummary = (pet: PetLike, weight: number | null, dailyPct: number) => {
  const lines = [
    `סיכום שבועי — ${pet.name}`,
    pet.breed ? `גזע: ${pet.breed}` : null,
    weight != null ? `משקל נוכחי: ${weight} ק״ג` : `משקל: לא הוזן`,
    `שלמות שגרה יומית: ${dailyPct}%`,
    `תאריך: ${new Date().toLocaleDateString("he-IL")}`,
    ``,
    `הופק מ-Mipo`,
  ].filter(Boolean) as string[];
  return lines.join("\n");
};

const shareToVet = async (pet: PetLike, weight: number | null, dailyPct: number) => {
  const text = buildVetSummary(pet, weight, dailyPct);
  const title = `סיכום ${pet.name}`;
  try {
    if (navigator.share) {
      await navigator.share({ title, text });
      return;
    }
  } catch {}
  // WhatsApp fallback
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener");
};

/* ─── Mood inference (real data only — never invent emotion) ─── */
type Mood = "unknown" | "asleep" | "calm" | "alert" | "attention" | "vet";
const HALO: Record<Mood, { color: string; pulse: boolean; opacity: number }> = {
  unknown:   { color: "hsl(220 10% 60%)",  pulse: false, opacity: 0 },
  asleep:    { color: "hsl(230 50% 55%)",  pulse: false, opacity: 0.18 },
  calm:      { color: "hsl(142 65% 50%)",  pulse: false, opacity: 0.28 },
  alert:     { color: "hsl(45 90% 58%)",   pulse: false, opacity: 0.35 },
  attention: { color: "hsl(28 92% 58%)",   pulse: true,  opacity: 0.45 },
  vet:       { color: "hsl(0 78% 58%)",    pulse: true,  opacity: 0.5  },
};
const inferMood = ({
  hasBreed, hasWeight, dailyPct, isNight,
}: { hasBreed: boolean; hasWeight: boolean; dailyPct: number; isNight: boolean }): Mood => {
  if (!hasBreed && !hasWeight) return "unknown";
  if (isNight) return "asleep";
  if (!hasWeight) return "attention";
  if (dailyPct >= 75) return "calm";
  if (dailyPct >= 40) return "alert";
  return "attention";
};

/* ─── MoodAvatar: real image + breathing + state-driven halo + celebrate on real action ─── */
const MoodAvatar = ({ src, alt, mood, celebrateKey }: { src: string; alt: string; mood: Mood; celebrateKey: number }) => {
  const h = HALO[mood];
  const sleeping = mood === "asleep";
  const [wagging, setWagging] = useState(false);
  useEffect(() => {
    if (celebrateKey === 0) return;
    setWagging(true);
    const t = setTimeout(() => setWagging(false), 1500);
    return () => clearTimeout(t);
  }, [celebrateKey]);
  return (
    <div className="relative w-[200px] h-[200px]">
      {/* Halo — mood color */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${h.color} 0%, transparent 65%)`, filter: "blur(18px)" }}
        initial={false}
        animate={
          wagging
            ? { opacity: [0.45, 0.7, 0.45], scale: [1, 1.08, 1] }
            : h.pulse
            ? { opacity: [h.opacity * 0.6, h.opacity, h.opacity * 0.6], scale: [0.95, 1.05, 0.95] }
            : { opacity: h.opacity, scale: 1 }
        }
        transition={
          wagging
            ? { duration: 0.5, repeat: 2, ease: "easeInOut" }
            : h.pulse
              ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
              : { duration: 0.6 }
        }
        aria-hidden
      />
      {/* Breathing avatar */}
      <motion.img
        src={src}
        alt={alt}
        className="relative w-[200px] h-[200px] rounded-full object-contain bg-muted block"
        style={{ opacity: mood === "unknown" ? 0.5 : sleeping ? 0.85 : 1, filter: sleeping ? "brightness(0.85)" : "none" }}
        animate={
          wagging
            ? { scale: [1, 1.08, 1], rotate: [0, -6, 6, -4, 4, 0] }
            : { scale: sleeping ? [1, 1.012, 1] : [1, 1.02, 1] }
        }
        transition={
          wagging
            ? { duration: 1.2, ease: "easeOut" }
            : { duration: sleeping ? 5 : 3.2, repeat: Infinity, ease: "easeInOut" }
        }
      />
      {/* Sleeping Z marks */}
      {sleeping && (
        <motion.div
          className="absolute -top-1 right-2 text-[16px] font-bold select-none"
          style={{ color: "hsl(230 60% 70%)" }}
          animate={{ y: [-2, -10, -2], opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        >
          z
        </motion.div>
      )}
    </div>
  );
};

export const PetCenterDashboard = ({
  pet,
  accent = "hsl(var(--primary))",
}: Props) => {
  const type = (pet.type || pet.pet_type) as "dog" | "cat" | undefined;
  const fallback = type === "cat" ? catIcon : dogIcon;
  const weight = pet.weight ?? null;

  const targets = useMemo(() => computeTargets(weight), [weight]);

  const metrics = usePetMetrics(pet.id);
  const daily = useMemo(
    () => ({
      done: metrics.todayTasks,
      toggle: metrics.toggleTask,
      completed: metrics.completedToday,
      total: metrics.totalTasks,
      pct: metrics.taskPctToday,
    }),
    [metrics]
  );
  const dailyColor = scoreColor(daily.pct);
  /* Streak = consecutive days up to today with pct ≥ 75 (DB-backed). */
  const streak = useMemo(() => {
    const todayDow = new Date().getDay();
    let n = 0;
    for (let i = todayDow; i >= 0; i--) {
      if ((metrics.weekTaskPct[i] ?? 0) >= 75) n++;
      else break;
    }
    return n;
  }, [metrics.weekTaskPct]);
  const [celebrateKey, setCelebrateKey] = useState(0);
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

  // Real consumption today (from pet_feeding_logs / pet_water_logs).
  // Macros are not yet logged per meal — show "—" rather than invent ratios.
  const eaten = {
    kcal: metrics.kcalToday,
    protein_g: null as number | null,
    carbs_g: null as number | null,
    fat_g: null as number | null,
  };

  const kcalPct =
    eaten.kcal != null && targets.kcal != null
      ? (eaten.kcal / targets.kcal) * 100
      : 0;

  const week = useMemo(buildWeek, []);
  // Real per-day completion % from DB
  const dayPct = metrics.weekTaskPct;

  const openSheet = (sheet: string) =>
    window.dispatchEvent(
      new CustomEvent("open-pet-sheet", { detail: { sheet } })
    );

  // Monochrome palette — single foreground tint everywhere
  const C_FG = "hsl(var(--foreground))";
  const C_PROTEIN = C_FG;
  const C_CARBS = C_FG;
  const C_FATS = C_FG;

  return (
    <div className="flex flex-col gap-3 pb-8">

      {/* ── Daily Brief: time-aware, one CTA, dismissable per day ── */}
      <DailyBrief
        petName={pet.name}
        weight={weight}
        dailyPct={daily.pct}
        topAction={
          weight == null
            ? { label: "הוספת משקל", onClick: () => openSheet("weight"), icon: Plus }
            : daily.pct < 75
              ? { label: "פתיחת משימות", onClick: () => setTasksOpen(true), icon: CalendarCheck }
              : { label: "שליחה לוטרינר", onClick: () => shareToVet(pet, weight, daily.pct), icon: Share2 }
        }
      />

      {/* ── Hero Insight (Tier 1–5 ranked) ── */}
      <HeroInsight petId={pet.id} />

      {/* ── Week strip ── */}
      <div className="relative flex items-center justify-between rounded-2xl bg-card/30 backdrop-blur-xl border border-white/10 px-2 py-2.5 shadow-[0_8px_28px_-12px_hsl(var(--primary)/0.25)]">
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
        {streak > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute -top-2 -left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md text-foreground"
            style={{
              background: "var(--mipo-glass-bg)",
              border: "1px solid var(--mipo-glass-border)",
              boxShadow: "0 6px 18px -8px hsl(var(--mipo-brand-3) / 0.55)",
            }}
            aria-label={`רצף של ${streak} ימים`}
          >
            {/* Brand gradient streak dot — one of the two allowed brand moments */}
            <span
              aria-hidden
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--mipo-gradient)" }}
            />
            <span dir="ltr">{streak}</span>
          </motion.div>
        )}
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
                  <Ico icon={X} size="md" />
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
                      onClick={async () => {
                        const newly = await daily.toggle(t.key);
                        if (newly) {
                          setCelebrateKey((k) => k + 1);
                          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                            try { (navigator as any).vibrate?.(15); } catch {}
                          }
                        }
                      }}
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
                          background: checked ? "hsl(var(--foreground))" : "transparent",
                          borderColor: checked
                            ? "hsl(var(--foreground))"
                            : "hsl(var(--border))",
                        }}
                      >
                        {checked && (
                          <Ico icon={Check} size="sm" className="text-background" />
                        )}
                      </div>
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-muted/40 border border-border/40 ${
                          checked ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        <Ico icon={Icon} size="md" />
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
        const gradId = `mipo-ring-grad-${pet.id}`;

        // 4 floating glass satellites — parallax depth, no orbit line.
        // Positions are absolute around the centered avatar (340h container).
        const satellites: Array<{
          key: string;
          icon: LucideIcon;
          value: ReactNode;
          label: string;
          onClick: () => void;
          // parallax: depth 0 = front (big, sharp), 2 = back (small, dim)
          depth: 0 | 1 | 2;
          // position relative to avatar center
          x: number; // px, positive = right
          y: number; // px, positive = down
          // float phase for staggered sine
          phase: number;
        }> = [
          {
            key: "energy",
            icon: Zap,
            value:
              energyLevel == null || energyLevel === 0
                ? "—"
                : energyLevel <= 2 ? "נמוך" : energyLevel <= 3 ? "בינוני" : "גבוה",
            label: "אנרגיה",
            onClick: () => openSheet("activity"),
            depth: 1,
            x: 122,
            y: -96,
            phase: 0,
          },
          {
            key: "weight",
            icon: Weight,
            value: metrics.latestWeight != null
              ? `${metrics.latestWeight}`
              : weight ? `${weight}` : "+",
            label:
              metrics.weightDelta != null && metrics.weightDelta !== 0
                ? `${metrics.weightDelta > 0 ? "↑" : "↓"} ${Math.abs(metrics.weightDelta)} ק״ג`
                : metrics.latestWeight != null || weight
                  ? "ק״ג"
                  : "משקל",
            onClick: () => openSheet("weight"),
            depth: 0,
            x: 134,
            y: 78,
            phase: 1.2,
          },
          {
            key: "vaccines",
            icon: Syringe,
            value:
              metrics.vaccinesActive + metrics.vaccinesExpired === 0
                ? "—"
                : metrics.vaccinesExpired > 0
                  ? `${metrics.vaccinesExpired}`
                  : `${metrics.vaccinesActive}`,
            label:
              metrics.vaccinesActive + metrics.vaccinesExpired === 0
                ? "חיסונים"
                : metrics.vaccinesExpired > 0
                  ? "פג תוקף"
                  : "בתוקף",
            onClick: () => openSheet("vaccines"),
            depth: 2,
            x: -130,
            y: 88,
            phase: 2.4,
          },
          {
            key: "hydration",
            icon: GlassWater,
            value:
              metrics.waterToday != null && metrics.waterToday > 0
                ? `${Math.round(metrics.waterToday)}`
                : targets.water_ml
                  ? `0/${Math.round(targets.water_ml / 100) * 100}`
                  : "—",
            label: targets.water_ml ? "מ״ל היום" : "מים",
            onClick: () => openSheet("water"),
            depth: 1,
            x: -118,
            y: -104,
            phase: 3.6,
          },
        ];
        const DEPTH = {
          0: { size: 64, iconSize: "lg" as IcoSize, opacity: 1,    blur: 0,  shadow: "0 18px 40px -14px hsl(0 0% 0% / 0.55)" },
          1: { size: 56, iconSize: "md" as IcoSize, opacity: 0.92, blur: 0,  shadow: "0 12px 28px -12px hsl(0 0% 0% / 0.45)" },
          2: { size: 50, iconSize: "md" as IcoSize, opacity: 0.7,  blur: 0.4, shadow: "0 8px 20px -10px hsl(0 0% 0% / 0.35)" },
        };
        return (
          <div className="relative w-full flex items-center justify-center" style={{ height: 340 }} dir="rtl">
            {/* Single subtle ambient glow — neutral, no rainbow */}
            <motion.div
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-3xl"
              style={{ background: `radial-gradient(circle, ${ringColor} 0%, transparent 70%)` }}
              animate={{ opacity: [0.08, 0.16, 0.08], scale: [1, 1.05, 1] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden
            />

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
            {/* Daily-goal ring — Mipo brand gradient sweep */}
            <svg
              width={SIZE}
              height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className="absolute inset-0 -rotate-90"
              aria-hidden
            >
              <defs>
                <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                  {BRAND_STOPS.map((s) => (
                    <stop key={s.offset} offset={s.offset} stopColor={s.color} />
                  ))}
                </linearGradient>
              </defs>
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke="hsl(var(--muted) / 0.3)"
                strokeWidth={STROKE}
              />
              <motion.circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={C}
                initial={{ strokeDashoffset: C }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
            </svg>
            {/* Avatar inside the ring */}
            <div className="absolute inset-0 flex items-center justify-center">
              <MoodAvatar
                src={dobermanAsset.url}
                alt={pet.name}
                celebrateKey={celebrateKey}
                mood={inferMood({
                  hasBreed: !!pet.breed,
                  hasWeight: weight != null,
                  dailyPct: daily.pct,
                  isNight: (() => { const h = new Date().getHours(); return h >= 22 || h < 6; })(),
                })}
              />
            </div>
            {/* Goal % badge */}
            <div
              className="absolute left-1/2 -translate-x-1/2 -bottom-3 px-3 py-1 rounded-full text-[12px] font-bold shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.5)] backdrop-blur-xl"
              style={{
                background: "hsl(var(--card) / 0.85)",
                color: "hsl(var(--foreground))",
                border: "1px solid hsl(var(--border) / 0.6)",
              }}
            >
              <AnimatedCounter value={overall} duration={900} /><span>% יעד יומי</span>
            </div>
          </motion.button>

            {/* ── Floating Glass Stack: 4 satellites with parallax depth, no orbit ring ── */}
            {satellites.map((s, i) => {
              const d = DEPTH[s.depth];
              return (
                <motion.button
                  key={s.key}
                  type="button"
                  onClick={s.onClick}
                  initial={{ opacity: 0, scale: 0.6, y: s.y + 10 }}
                  animate={{
                    opacity: d.opacity,
                    scale: 1,
                    y: [s.y - 4, s.y + 4, s.y - 4],
                    x: [s.x - 2, s.x + 2, s.x - 2],
                  }}
                  transition={{
                    opacity: { delay: 0.15 + i * 0.08, duration: 0.5 },
                    scale:   { delay: 0.15 + i * 0.08, duration: 0.5, ease: "easeOut" },
                    y: { duration: 5.5 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: s.phase * 0.3 },
                    x: { duration: 7.5 + i * 0.4, repeat: Infinity, ease: "easeInOut", delay: s.phase * 0.3 },
                  }}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                  className="absolute left-1/2 top-1/2 flex flex-col items-center group"
                  style={{
                    marginLeft: -d.size / 2,
                    marginTop:  -d.size / 2,
                    filter: d.blur ? `blur(${d.blur}px)` : undefined,
                    zIndex: 10 - s.depth,
                  }}
                  aria-label={s.label}
                >
                  <div
                    className="relative rounded-full flex items-center justify-center backdrop-blur-xl"
                    style={{
                      width: d.size,
                      height: d.size,
                      background: "var(--mipo-glass-bg)",
                      border: "1px solid var(--mipo-glass-border)",
                      boxShadow: `${d.shadow}, inset 0 1px 0 var(--mipo-glass-highlight)`,
                    }}
                  >
                    <div className="text-foreground/85">
                      <Ico icon={s.icon} size={d.iconSize} />
                    </div>
                  </div>
                  <div
                    className="mt-1.5 text-[10px] font-semibold leading-none tabular-nums text-foreground"
                    dir="auto"
                    style={{ unicodeBidi: "plaintext" }}
                  >
                    {s.value}
                  </div>
                  <div className="text-[9px] text-muted-foreground/70 leading-tight mt-0.5">
                    {s.label}
                  </div>
                </motion.button>
              );
            })}
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
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/40 border border-border/40 text-foreground">
                      <Ico icon={Zap} size="md" />
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
                    <Ico icon={X} size="md" />
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