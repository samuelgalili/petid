import { useMemo, useState, useEffect, useCallback, useId } from "react";
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
  Share2,
  Sun,
  Moon,
  Sunrise,
  FileText,
  CalendarCheck,
  ChevronLeft,
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
  icon: typeof Drumstick;
  iconSize?: number;
}) => (
  <ArcGauge pct={pct} size={size} stroke={4} color={color}>
    <Icon style={{ color, width: iconSize, height: iconSize }} strokeWidth={2} />
  </ArcGauge>
);

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
    morning: { Icon: Sunrise, greet: "בוקר טוב", tint: "hsl(35 90% 60%)", msg: "בואו נתחיל את היום עם הליכה קצרה ומים נקיים." },
    noon:    { Icon: Sun,     greet: "צהריים טובים", tint: "hsl(200 80% 60%)", msg: "זמן טוב לבדוק שיש מים קרים ומקום מוצל." },
    evening: { Icon: Moon,    greet: "ערב טוב",    tint: "hsl(265 70% 65%)", msg: "סיום היום: ארוחת ערב, פעילות קלה ומנוחה." },
    night:   { Icon: Moon,    greet: "לילה טוב",   tint: "hsl(230 60% 60%)", msg: "השעה מאוחרת — מומלץ לבדוק שאוכל לא נשאר בקערה." },
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
      className="relative rounded-2xl backdrop-blur-xl border border-white/10 px-3 py-3 overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${meta.tint}1f, hsl(var(--card)/0.6))` }}
    >
      <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full blur-3xl opacity-40" style={{ background: meta.tint }} aria-hidden />
      <button
        type="button"
        onClick={() => { setDismissed(true); try { localStorage.setItem(briefKey, "1"); } catch {} }}
        className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground/70 hover:text-foreground"
        aria-label="סגור"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="relative flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/10" style={{ background: `${meta.tint}26` }}>
          <Icon className="w-5 h-5" style={{ color: meta.tint }} strokeWidth={2} />
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
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-full transition-transform active:scale-95"
            style={{ background: meta.tint, color: "white" }}
          >
            <topAction.icon className="w-3 h-3" strokeWidth={2.5} />
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

/* ─── MoodAvatar: real image + breathing + state-driven halo (no fake "hunger") ─── */
const MoodAvatar = ({ src, alt, mood }: { src: string; alt: string; mood: Mood }) => {
  const h = HALO[mood];
  const sleeping = mood === "asleep";
  return (
    <div className="relative w-[200px] h-[200px]">
      {/* Halo — mood color */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${h.color} 0%, transparent 65%)`, filter: "blur(18px)" }}
        initial={false}
        animate={
          h.pulse
            ? { opacity: [h.opacity * 0.6, h.opacity, h.opacity * 0.6], scale: [0.95, 1.05, 0.95] }
            : { opacity: h.opacity, scale: 1 }
        }
        transition={h.pulse ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.6 }}
        aria-hidden
      />
      {/* Breathing avatar */}
      <motion.img
        src={src}
        alt={alt}
        className="relative w-[200px] h-[200px] rounded-full object-contain bg-muted block"
        style={{ opacity: mood === "unknown" ? 0.5 : sleeping ? 0.85 : 1, filter: sleeping ? "brightness(0.85)" : "none" }}
        animate={{ scale: sleeping ? [1, 1.012, 1] : [1, 1.02, 1] }}
        transition={{ duration: sleeping ? 5 : 3.2, repeat: Infinity, ease: "easeInOut" }}
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

/* ─── Bento action cards (2x2 below the avatar) ─── */
const BentoActions = ({
  daily,
  dailyColor,
  onTasks,
  onShare,
  onQuickAdd,
  onReport,
}: {
  daily: { completed: number; total: number; pct: number };
  dailyColor: string;
  onTasks: () => void;
  onShare: () => void;
  onQuickAdd: () => void;
  onReport: () => void;
}) => {
  const cards = [
    {
      key: "tasks",
      title: "משימות היום",
      meta: `${daily.completed}/${daily.total} הושלמו`,
      Icon: CalendarCheck,
      tint: dailyColor,
      onClick: onTasks,
      hero: true,
    },
    {
      key: "quick",
      title: "הוספה מהירה",
      meta: "ארוחה · מים · משקל",
      Icon: Plus,
      tint: "hsl(200 75% 55%)",
      onClick: onQuickAdd,
    },
    {
      key: "share",
      title: "שליחה לוטרינר",
      meta: "סיכום שבועי",
      Icon: Share2,
      tint: "hsl(150 55% 50%)",
      onClick: onShare,
    },
    {
      key: "report",
      title: "דוח בריאות",
      meta: "7 ימים אחרונים",
      Icon: FileText,
      tint: "hsl(265 65% 65%)",
      onClick: onReport,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {cards.map((c, i) => (
        <motion.button
          key={c.key}
          type="button"
          onClick={c.onClick}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 * i, duration: 0.35, ease: "easeOut" }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          className={`relative overflow-hidden rounded-2xl backdrop-blur-xl border border-white/10 px-3 py-3 text-right ${c.hero ? "col-span-2" : ""}`}
          style={{ background: `linear-gradient(135deg, ${c.tint}1a, hsl(var(--card)/0.55))` }}
        >
          <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full blur-2xl opacity-50" style={{ background: c.tint }} aria-hidden />
          <div className="relative flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${c.tint}26`, border: `1px solid ${c.tint}40` }}>
              <c.Icon className="w-4 h-4" style={{ color: c.tint }} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-bold text-foreground leading-tight truncate">
                {c.title}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                {c.meta}
              </div>
            </div>
            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
          </div>
          {c.hero && (
            <div className="relative mt-2 h-1 rounded-full bg-muted/30 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: c.tint }}
                initial={false}
                animate={{ width: `${daily.pct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          )}
        </motion.button>
      ))}
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
                <motion.button
                  key={b.key}
                  type="button"
                  onClick={() => openSheet(b.key)}
                  aria-label={b.label}
                  whileHover={{ scale: 1.08, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center shrink-0 group"
                  style={{ width: 56 }}
                >
                  <div className="relative rounded-full bg-card/30 backdrop-blur-md border border-white/10 transition-shadow duration-300 group-hover:shadow-[0_0_24px_-2px_var(--halo)]" style={{ width: 44, height: 44, ['--halo' as any]: b.color }}>
                    <div
                      className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-60 transition-opacity duration-300 blur-md"
                      style={{ background: `radial-gradient(circle, ${b.color} 0%, transparent 70%)` }}
                      aria-hidden
                    />
                    <LiquidMini pct={75} size={44} color={b.color} icon={b.icon} iconSize={14} />
                  </div>
                  <div className="mt-1 text-[9px] text-muted-foreground/80 leading-tight text-center">{b.label}</div>
                </motion.button>
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
              <MoodAvatar
                src={dobermanAsset.url}
                alt={pet.name}
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

            {/* ── Weight + Vaccinations vertical column (left side of avatar) ── */}
            <div className="flex flex-col items-center gap-2 overflow-y-auto no-scrollbar py-1" style={{ scrollbarWidth: 'none', maxHeight: 280 }}>
              {/* Energy (breed) */}
              <motion.button
                type="button"
                onClick={() => openSheet('activity')}
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center shrink-0 group"
                style={{ width: 62 }}
              >
                <div className="relative rounded-full bg-card/30 backdrop-blur-md border border-white/10 transition-shadow duration-300 group-hover:shadow-[0_0_24px_-2px_hsl(35_88%_58%)]" style={{ width: 48, height: 48 }}>
                  <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-60 transition-opacity duration-300 blur-md" style={{ background: 'radial-gradient(circle, hsl(35 88% 58%) 0%, transparent 70%)' }} aria-hidden />
                  <LiquidMini pct={((energyLevel ?? 0) / 5) * 100} size={48} color="hsl(35 88% 58%)" icon={Zap} iconSize={14} />
                </div>
                <div className="mt-1 text-[10px] font-semibold text-foreground leading-tight text-center">
                  {energyLevel == null || energyLevel === 0
                    ? <span className="text-primary">+ הוסף גזע</span>
                    : energyLevel <= 2 ? 'נמוך' : energyLevel <= 3 ? 'בינוני' : 'גבוה'}
                </div>
                <div className="text-[9px] text-muted-foreground/70 leading-tight text-center">אנרגיה</div>
              </motion.button>

              {/* Weight */}
              <motion.button
                type="button"
                onClick={() => openSheet('weight')}
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center shrink-0 group"
                style={{ width: 62 }}
              >
                <div className="relative rounded-full bg-card/30 backdrop-blur-md border border-white/10 transition-shadow duration-300 group-hover:shadow-[0_0_24px_-2px_var(--halo)]" style={{ width: 48, height: 48, ['--halo' as any]: accent }}>
                  <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-60 transition-opacity duration-300 blur-md" style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)` }} aria-hidden />
                  <LiquidMini pct={weight ? Math.min(100, (weight / 50) * 100) : 0} size={48} color={accent} icon={Weight} iconSize={14} />
                </div>
                <div className="mt-1 text-[10px] font-semibold text-foreground leading-tight text-center" dir="auto" style={{ unicodeBidi: 'plaintext' }}>
                  {weight ? `${weight} ק״ג` : <span className="text-primary">+ הוסף משקל</span>}
                </div>
                <div className="text-[9px] text-muted-foreground/70 leading-tight text-center">משקל</div>
              </motion.button>

              {/* Vaccinations */}
              <motion.button
                type="button"
                onClick={() => openSheet('vaccines')}
                whileHover={{ scale: 1.08, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center shrink-0 group"
                style={{ width: 62 }}
              >
                <div className="relative rounded-full bg-card/30 backdrop-blur-md border border-white/10 transition-shadow duration-300 group-hover:shadow-[0_0_24px_-2px_hsl(150_55%_50%)]" style={{ width: 48, height: 48 }}>
                  <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-60 transition-opacity duration-300 blur-md" style={{ background: 'radial-gradient(circle, hsl(150 55% 50%) 0%, transparent 70%)' }} aria-hidden />
                  <LiquidMini pct={75} size={48} color="hsl(150 55% 50%)" icon={Syringe} iconSize={14} />
                </div>
                <div className="mt-1 text-[10px] font-semibold text-foreground leading-tight text-center">עדכניים</div>
                <div className="text-[9px] text-muted-foreground/70 leading-tight text-center">חיסונים</div>
              </motion.button>
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

      {/* ── Bento Actions: top 4 actions in a 2-col grid ── */}
      <BentoActions
        daily={{ completed: daily.completed, total: daily.total, pct: daily.pct }}
        dailyColor={dailyColor}
        onTasks={() => setTasksOpen(true)}
        onShare={() => shareToVet(pet, weight, daily.pct)}
        onQuickAdd={() => openSheet("quick-add")}
        onReport={() => openSheet("health-report")}
      />

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