import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Weight,
  Activity,
  Syringe,
  ShieldCheck,
  HeartPulse,
  UtensilsCrossed,
  Sparkles,
  Plus,
  Bell,
  Stethoscope,
  Drumstick,
  Wheat,
  Droplet,
  Bone,
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

const calcAgeYears = (pet: PetLike) => {
  if (pet.age_years != null) return pet.age_years;
  if (!pet.birth_date) return null;
  const diff = Date.now() - new Date(pet.birth_date).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
};

const fmt = (v: string | number | null | undefined, suffix = "") =>
  v == null || v === "" ? "—" : `${v}${suffix}`;

/* ───────────────────────────────────────────────────────────────
 * NRC 2006 macros (conservative defaults for adult, neutered)
 * RER = 70 * weight_kg^0.75
 * MER = RER * 1.6
 * Protein ~25% kcal, Fat ~20% kcal, Carbs remainder
 * ─────────────────────────────────────────────────────────────── */
const computeMacros = (weightKg: number | null | undefined) => {
  if (!weightKg || weightKg <= 0) {
    return { kcal: null, protein_g: null, fat_g: null, carbs_g: null };
  }
  const RER = 70 * Math.pow(weightKg, 0.75);
  const MER = RER * 1.6;
  const protein_g = Math.round((MER * 0.25) / 4);
  const fat_g = Math.round((MER * 0.2) / 9);
  const carbs_g = Math.round((MER * 0.55) / 4);
  return { kcal: Math.round(MER), protein_g, fat_g, carbs_g };
};

/* ───────────────────────────────────────────────────────────────
 * Donut ring with bold % label inside (macro / score)
 * ─────────────────────────────────────────────────────────────── */
const Donut = ({
  pct,
  label,
  value,
  color,
  size = 92,
  stroke = 8,
  delay = 0,
}: {
  pct: number;
  label: string;
  value: string;
  color: string;
  size?: number;
  stroke?: number;
  delay?: number;
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const safe = Math.max(0, Math.min(100, pct));
  const offset = c - (safe / 100) * c;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.45, ease: "easeOut" }}
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeOpacity={0.18}
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
          transition={{ duration: 1.1, ease: "easeOut", delay: delay + 0.15 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="text-[9px] font-semibold uppercase tracking-[0.14em]"
          style={{ color }}
        >
          {label}
        </div>
        <div className="text-[18px] font-extrabold text-foreground leading-none mt-0.5">
          {value}
        </div>
      </div>
    </motion.div>
  );
};

/* ───────────────────────────────────────────────────────────────
 * Satellite node (icon bubble + value + caption) — positioned
 * around the mascot with absolute coords. Connector line is drawn
 * by the parent SVG using the same fractional anchor.
 * ─────────────────────────────────────────────────────────────── */
type NodePos = { x: number; y: number }; // fractional 0..1 within hero box

const SatelliteNode = ({
  icon: Icon,
  value,
  label,
  color,
  pos,
  delay = 0,
}: {
  icon: typeof Weight;
  value: string;
  label: string;
  color: string;
  pos: NodePos;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.7 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.45, ease: "easeOut" }}
    className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
    style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
  >
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center border border-border/40"
      style={{
        background: `${color}1a`,
        boxShadow: `0 6px 18px ${color}26`,
      }}
    >
      <Icon className="w-5 h-5" style={{ color }} strokeWidth={1.8} />
    </div>
    <div className="text-[13px] font-bold text-foreground leading-none mt-1.5">
      {value}
    </div>
    <div className="text-[10px] text-muted-foreground/70 leading-none mt-0.5">
      {label}
    </div>
  </motion.div>
);

/* ───────────────────────────────────────────────────────────────
 * Connector lines — thin dashed lines from each node anchor
 * toward the mascot center, with small sparkle dots.
 * ─────────────────────────────────────────────────────────────── */
const ConnectorLines = ({
  anchors,
}: {
  anchors: { pos: NodePos; color: string }[];
}) => (
  <svg
    className="absolute inset-0 w-full h-full pointer-events-none"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    aria-hidden
  >
    {anchors.map((a, i) => {
      // line endpoint slightly toward center from the node
      const cx = 50;
      const cy = 50;
      const dx = cx - a.pos.x * 100;
      const dy = cy - a.pos.y * 100;
      const len = Math.hypot(dx, dy);
      const tStart = 8 / len; // gap near node
      const tEnd = 22 / len; // stop short of mascot
      const x1 = a.pos.x * 100 + dx * tStart;
      const y1 = a.pos.y * 100 + dy * tStart;
      const x2 = a.pos.x * 100 + dx * (1 - tEnd);
      const y2 = a.pos.y * 100 + dy * (1 - tEnd);
      return (
        <g key={i}>
          <motion.line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={a.color}
            strokeOpacity={0.55}
            strokeWidth={0.4}
            strokeDasharray="1.2 1.2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.5 + i * 0.08, duration: 0.7 }}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      );
    })}
  </svg>
);

/* ─── Timeline ─── */
type TimelineKind = "vaccine" | "vet" | "weight" | "reminder";

const TIMELINE_META: Record<TimelineKind, { icon: typeof Weight }> = {
  vaccine: { icon: Syringe },
  vet: { icon: Stethoscope },
  weight: { icon: Weight },
  reminder: { icon: Bell },
};

const TimelineRow = ({
  kind,
  title,
  meta,
  delay,
  accent,
  last,
}: {
  kind: TimelineKind;
  title: string;
  meta: string;
  delay: number;
  accent: string;
  last?: boolean;
}) => {
  const { icon: Icon } = TIMELINE_META[kind];
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: "easeOut" }}
      className="flex gap-3 items-start"
    >
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
        <div className="text-[10px] text-muted-foreground/70 mt-0.5">{meta}</div>
      </div>
    </motion.div>
  );
};

/* ─── Tab pill ─── */
const TabPill = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex-1 h-9 rounded-xl text-[12px] font-semibold transition-colors ${
      active
        ? "bg-foreground text-background"
        : "text-muted-foreground/80 hover:text-foreground"
    }`}
  >
    {children}
  </button>
);

/* ───────────────────────────────────────────────────────────────
 * Main component
 * ─────────────────────────────────────────────────────────────── */
export const PetCenterDashboard = ({
  pet,
  accent = "hsl(var(--primary))",
}: Props) => {
  const type = (pet.type || pet.pet_type) as "dog" | "cat" | undefined;
  const fallback = type === "cat" ? catIcon : dogIcon;
  const ageY = calcAgeYears(pet);
  const weight = pet.weight ?? null;

  const [tab, setTab] = useState<"nutrition" | "wellbeing">("nutrition");

  // ── NRC macros (conservative; if weight missing → asks user) ──
  const macros = useMemo(() => computeMacros(weight), [weight]);

  // ── Scores (placeholder; HeroInsight engine drives real values later) ──
  const healthScore = 82;
  const careScore = 68;
  const activityScore = 74;

  // Macro fixed targets (% kcal split) — these are the ring fills
  const PROTEIN_PCT = 25;
  const FAT_PCT = 20;
  const CARBS_PCT = 55;

  // Data viz colors — distinct, accessible
  const C_PROTEIN = "hsl(8 78% 60%)";
  const C_CARBS = "hsl(45 90% 55%)";
  const C_FATS = "hsl(205 80% 58%)";
  const C_WATER = "hsl(180 70% 50%)";
  const C_TREATS = "hsl(140 55% 50%)";

  const openSheet = (sheet: string) =>
    window.dispatchEvent(
      new CustomEvent("open-pet-sheet", { detail: { sheet } })
    );

  // Satellite node positions (fractional within hero box)
  // Mirrors the reference image: 2 left, 2 right around the mascot.
  const nutritionNodes = [
    {
      icon: Drumstick,
      value: macros.protein_g != null ? `${macros.protein_g}g` : "—",
      label: "חלבון",
      color: C_PROTEIN,
      pos: { x: 0.12, y: 0.32 },
    },
    {
      icon: Wheat,
      value: macros.carbs_g != null ? `${macros.carbs_g}g` : "—",
      label: "פחמימות",
      color: C_CARBS,
      pos: { x: 0.12, y: 0.72 },
    },
    {
      icon: Droplet,
      value: macros.kcal != null ? `${Math.round(weight! * 50)}ml` : "—",
      label: "מים",
      color: C_WATER,
      pos: { x: 0.88, y: 0.32 },
    },
    {
      icon: Bone,
      value: macros.fat_g != null ? `${macros.fat_g}g` : "—",
      label: "שומן",
      color: C_FATS,
      pos: { x: 0.88, y: 0.72 },
    },
  ];

  const wellbeingNodes = [
    {
      icon: HeartPulse,
      value: `${healthScore}`,
      label: "בריאות",
      color: C_PROTEIN,
      pos: { x: 0.12, y: 0.32 },
    },
    {
      icon: ShieldCheck,
      value: `${careScore}`,
      label: "טיפול",
      color: C_CARBS,
      pos: { x: 0.12, y: 0.72 },
    },
    {
      icon: Activity,
      value: `${activityScore}`,
      label: "פעילות",
      color: C_FATS,
      pos: { x: 0.88, y: 0.32 },
    },
    {
      icon: Weight,
      value: fmt(weight, "kg"),
      label: "משקל",
      color: C_WATER,
      pos: { x: 0.88, y: 0.72 },
    },
  ];

  const activeNodes = tab === "nutrition" ? nutritionNodes : wellbeingNodes;

  // Top donuts per tab
  const topDonuts =
    tab === "nutrition"
      ? [
          { pct: PROTEIN_PCT, label: "PROTEIN", value: `${PROTEIN_PCT}%`, color: C_PROTEIN },
          { pct: CARBS_PCT, label: "CARBS", value: `${CARBS_PCT}%`, color: C_CARBS },
          { pct: FAT_PCT, label: "FATS", value: `${FAT_PCT}%`, color: C_FATS },
        ]
      : [
          { pct: healthScore, label: "HEALTH", value: `${healthScore}`, color: C_PROTEIN },
          { pct: careScore, label: "CARE", value: `${careScore}`, color: C_CARBS },
          { pct: activityScore, label: "ACTIVE", value: `${activityScore}`, color: C_FATS },
        ];

  const heroTitle = tab === "nutrition" ? "MACRO TRACKING" : "WELLBEING SCORE";
  const heroSubtitle =
    tab === "nutrition" ? "מבוסס NRC 2006 — מדויק למשקל" : "בריאות · טיפול · פעילות";

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* ── Hero Insight (Tier 1–5 ranked) ── */}
      <HeroInsight petId={pet.id} />

      {/* ── Infographic Hero ── */}
      <div className="relative rounded-3xl bg-card border border-border/40 px-4 pt-5 pb-4 overflow-hidden">
        {/* Title */}
        <div className="text-center">
          <h2 className="text-[22px] font-extrabold tracking-tight text-foreground leading-tight">
            {heroTitle}
          </h2>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            {heroSubtitle}
          </p>
        </div>

        {/* 3 donut rings */}
        <div className="flex items-start justify-around mt-4 px-1">
          {topDonuts.map((d, i) => (
            <Donut key={d.label} {...d} delay={0.05 + i * 0.07} />
          ))}
        </div>

        {/* Mascot canvas with satellites + connectors */}
        <div className="relative w-full mt-3" style={{ height: 260 }}>
          <ConnectorLines
            anchors={activeNodes.map((n) => ({ pos: n.pos, color: n.color }))}
          />

          {/* Mascot */}
          <motion.img
            src={pet.avatar_url || fallback}
            alt={pet.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
              opacity: 1,
              scale: [1, 1.02, 1],
            }}
            transition={{
              opacity: { duration: 0.5, ease: "easeOut" },
              scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
            }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[180px] w-[180px] object-contain z-10"
            style={{ filter: "drop-shadow(0 12px 22px rgba(0,0,0,0.18))" }}
          />

          {/* Sparkle accents */}
          <div
            className="absolute left-[34%] top-[18%] w-1 h-1 rounded-full"
            style={{ background: accent, opacity: 0.6 }}
          />
          <div
            className="absolute right-[30%] bottom-[16%] w-1.5 h-1.5 rounded-full"
            style={{ background: accent, opacity: 0.5 }}
          />

          {/* Satellites */}
          {activeNodes.map((n, i) => (
            <SatelliteNode key={`${tab}-${i}`} {...n} delay={0.35 + i * 0.07} />
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mt-2 rounded-2xl bg-muted/40 p-1">
          <TabPill active={tab === "nutrition"} onClick={() => setTab("nutrition")}>
            תזונה
          </TabPill>
          <TabPill active={tab === "wellbeing"} onClick={() => setTab("wellbeing")}>
            בריאות
          </TabPill>
        </div>
      </div>

      {/* ── Context strip under hero ── */}
      {tab === "nutrition" ? (
        <button
          type="button"
          onClick={() => openSheet("feeding")}
          className="rounded-2xl bg-card border border-border/40 px-4 py-3 flex items-center justify-between text-right"
        >
          <div>
            <div className="text-[11px] text-muted-foreground/70">צריכה יומית מומלצת</div>
            <div className="text-[18px] font-bold text-foreground leading-tight">
              {macros.kcal != null ? `${macros.kcal} קק״ל` : "השלימו משקל"}
            </div>
            <div className="text-[10px] text-muted-foreground/60 mt-0.5">
              {weight ? `מבוסס משקל ${weight}kg · NRC 2006` : "נדרש כדי לחשב מאקרו"}
            </div>
          </div>
          <UtensilsCrossed className="w-5 h-5" style={{ color: accent }} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => openSheet("health")}
          className="rounded-2xl bg-card border border-border/40 px-4 py-3 flex items-center justify-between text-right"
        >
          <div>
            <div className="text-[11px] text-muted-foreground/70">ציון רווחה כולל</div>
            <div className="text-[18px] font-bold text-foreground leading-tight">
              {Math.round((healthScore + careScore + activityScore) / 3)} / 100
            </div>
            <div className="text-[10px] text-muted-foreground/60 mt-0.5">
              {ageY != null ? `גיל ${ageY} · ` : ""}
              עדכון אחרון: היום
            </div>
          </div>
          <HeartPulse className="w-5 h-5" style={{ color: accent }} />
        </button>
      )}

      {/* ── Timeline ── */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <div className="text-[11px] font-semibold text-muted-foreground/80 tracking-wide">
            ציר זמן
          </div>
          <button
            type="button"
            onClick={() => openSheet("timeline")}
            className="text-[11px] text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            הצג הכל
          </button>
        </div>
        <div className="rounded-2xl bg-card border border-border/40 px-4 py-4">
          <TimelineRow
            kind="reminder"
            title="האכלה — היום 09:00"
            meta={macros.kcal != null ? `יעד ${macros.kcal} קק״ל` : "השלימו משקל"}
            delay={0.58}
            accent={accent}
          />
          <TimelineRow
            kind="vaccine"
            title="חיסון משולש"
            meta="בעוד 14 ימים"
            delay={0.62}
            accent={accent}
          />
          <TimelineRow
            kind="weight"
            title="שקילה חודשית"
            meta="לפני שבוע · יציב"
            delay={0.66}
            accent={accent}
          />
          <TimelineRow
            kind="vet"
            title="ביקור וטרינר"
            meta="לפני 3 שבועות · בריא"
            delay={0.7}
            accent={accent}
            last
          />
        </div>
      </div>

      {/* ── Action row ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.78, duration: 0.4 }}
        className="grid grid-cols-2 gap-2.5"
      >
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
      </motion.div>
    </div>
  );
};

export default PetCenterDashboard;