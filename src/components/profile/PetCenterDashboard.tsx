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
        <button
          type="button"
          onClick={() => setTasksOpen(true)}
          aria-label="פתח משימות יומיות"
          className="relative outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-full"
          style={{ ['--tw-ring-color' as any]: dailyColor }}
        >
          <motion.div
            key={daily.pct}
            initial={{ scale: 0.96 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="rounded-full p-[3px]"
            style={{
              background: dailyColor,
              boxShadow: `0 0 0 4px ${dailyColor}22, 0 6px 18px ${dailyColor}33`,
            }}
          >
            <img
              src={pet.avatar_url || fallback}
              alt={pet.name}
              className="w-16 h-16 rounded-full object-cover bg-muted block"
            />
          </motion.div>
          <div
            className="absolute -bottom-1 -right-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full border bg-card"
            style={{ borderColor: `${dailyColor}66` }}
          >
            <Flame className="w-3 h-3" style={{ color: dailyColor }} />
            <span className="text-[10px] font-semibold text-foreground">
              {daily.pct}%
            </span>
          </div>
        </button>
        <div className="text-[17px] font-bold text-foreground tracking-tight">
          {pet.name}
        </div>
        <button
          type="button"
          onClick={() => setTasksOpen(true)}
          className="text-[11px] font-medium hover:underline"
          style={{ color: dailyColor }}
        >
          דירוג יומי · {scoreLabel(daily.pct)} ({daily.completed}/{daily.total})
        </button>
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