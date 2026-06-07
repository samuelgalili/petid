import { motion } from "framer-motion";
import {
  Weight,
  Activity,
  Syringe,
  ShieldCheck,
  HeartPulse,
  UtensilsCrossed,
  ImageIcon,
  Sparkles,
  Plus,
  ChevronLeft,
  Bell,
  Stethoscope,
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

/* ─── Aurora ring — slow rotating conic gradient (matches onboarding) ─── */
const AuroraRing = ({ size = 220 }: { size?: number }) => (
  <motion.div
    aria-hidden
    className="absolute inset-0 m-auto rounded-full pointer-events-none"
    style={{
      width: size,
      height: size,
      background:
        "conic-gradient(from 0deg, hsl(20 95% 70% / 0.78), hsl(330 85% 72% / 0.78), hsl(270 75% 72% / 0.78), hsl(200 90% 70% / 0.78), hsl(20 95% 70% / 0.78))",
      filter: "blur(8px)",
      WebkitMaskImage:
        "radial-gradient(circle, transparent 56%, #000 58%, #000 70%, transparent 76%)",
      maskImage:
        "radial-gradient(circle, transparent 56%, #000 58%, #000 70%, transparent 76%)",
    }}
    animate={{ rotate: 360 }}
    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
  />
);

/* ─── Health Score ring (SVG, animated) ─── */
const HealthRing = ({
  score,
  size = 168,
  stroke = 6,
  accent,
}: {
  score: number;
  size?: number;
  stroke?: number;
  accent: string;
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, score)) / 100) * c;
  return (
    <svg
      width={size}
      height={size}
      className="absolute inset-0 m-auto -rotate-90"
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeOpacity={0.25}
        strokeWidth={stroke}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={accent}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.25 }}
      />
    </svg>
  );
};

const MicroStat = ({
  icon: Icon,
  value,
  label,
  delay,
  accent,
}: {
  icon: typeof Weight;
  value: string;
  label: string;
  delay: number;
  accent: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: "easeOut" }}
    className="flex flex-col items-center gap-1 flex-1 min-w-0"
  >
    <Icon className="w-4 h-4" style={{ color: accent }} strokeWidth={1.6} />
    <div className="text-[15px] font-bold text-foreground leading-none">
      {value}
    </div>
    <div className="text-[10px] text-muted-foreground/70 truncate">{label}</div>
  </motion.div>
);

const BentoTile = ({
  icon: Icon,
  title,
  primary,
  caption,
  delay,
  accent,
  large,
  onClick,
}: {
  icon: typeof Weight;
  title: string;
  primary: string;
  caption: string;
  delay: number;
  accent: string;
  large?: boolean;
  onClick?: () => void;
}) => (
  <motion.button
    onClick={onClick}
    type="button"
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: "easeOut" }}
    whileTap={{ scale: 0.97 }}
    className={`relative rounded-2xl bg-card border border-border/40 px-3.5 py-3.5 text-right overflow-hidden ${
      large ? "col-span-2 min-h-[110px]" : "min-h-[96px]"
    }`}
  >
    <div className="flex items-start justify-between mb-2">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center"
        style={{ background: `${accent}18`, color: accent }}
      >
        <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
      </div>
      <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground/40" />
    </div>
    <div className="text-[11px] text-muted-foreground/70 mb-0.5">{title}</div>
    <div className="text-[18px] font-bold text-foreground leading-tight tracking-tight">
      {primary}
    </div>
    <div className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">
      {caption}
    </div>
  </motion.button>
);

type TimelineKind = "vaccine" | "vet" | "weight" | "reminder";

const TIMELINE_META: Record<TimelineKind, { icon: typeof Weight; tone: string }> = {
  vaccine: { icon: Syringe, tone: "hsl(var(--primary))" },
  vet: { icon: Stethoscope, tone: "hsl(var(--primary))" },
  weight: { icon: Weight, tone: "hsl(var(--primary))" },
  reminder: { icon: Bell, tone: "hsl(var(--primary))" },
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

export const PetCenterDashboard = ({ pet, accent = "hsl(var(--primary))" }: Props) => {
  const type = (pet.type || pet.pet_type) as "dog" | "cat" | undefined;
  const fallback = type === "cat" ? catIcon : dogIcon;
  const ageY = calcAgeYears(pet);
  const weight = pet.weight;

  // TODO: wire to live health score + events. Placeholder values for now.
  const healthScore = 82;
  const healthDelta = "+4 השבוע";

  const openSheet = (sheet: string) =>
    window.dispatchEvent(new CustomEvent("open-pet-sheet", { detail: { sheet } }));

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* ── Hero Insight (Tier 1-5 ranked, server-driven) ── */}
      <HeroInsight petId={pet.id} />

      {/* ── Hero: Aurora Ring + Health Score ring + transparent pet avatar ── */}
      <div className="relative w-full flex items-center justify-center pt-4 pb-2">
        <div className="relative w-[220px] h-[220px] flex items-center justify-center">
          <AuroraRing size={220} />
          <HealthRing score={healthScore} size={184} stroke={5} accent={accent} />
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
            className="relative z-10 h-[150px] w-[150px] object-contain"
            style={{ filter: "drop-shadow(0 10px 18px rgba(0,0,0,0.18))" }}
          />
        </div>
      </div>

      {/* ── Health Score readout ── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="flex flex-col items-center -mt-2"
      >
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
          Health Score
        </div>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-[34px] font-bold text-foreground leading-none tracking-tight">
            {healthScore}
          </span>
          <span className="text-[12px] text-muted-foreground/70">/100</span>
        </div>
        <div className="text-[11px] mt-1" style={{ color: accent }}>
          {healthDelta}
        </div>
      </motion.div>

      {/* ── Micro-stats row ── */}
      <div className="flex items-stretch justify-between rounded-2xl bg-card border border-border/40 px-2 py-3">
        <MicroStat
          icon={Weight}
          value={fmt(weight, "kg")}
          label="משקל"
          delay={0.2}
          accent={accent}
        />
        <div className="w-px bg-border/30 my-1" />
        <MicroStat
          icon={Activity}
          value="78%"
          label="פעילות"
          delay={0.26}
          accent={accent}
        />
        <div className="w-px bg-border/30 my-1" />
        <MicroStat
          icon={ShieldCheck}
          value={ageY != null ? `${ageY}y` : "—"}
          label="גיל"
          delay={0.32}
          accent={accent}
        />
      </div>

      {/* ── Bento grid: Health Vault (large), Care Plan, Nutrition, Memories ── */}
      <div className="grid grid-cols-2 gap-2.5">
        <BentoTile
          icon={HeartPulse}
          title="Health Vault"
          primary="12 מסמכים"
          caption="עדכון אחרון: לפני 3 ימים"
          delay={0.36}
          accent={accent}
          large
          onClick={() => openSheet("vault")}
        />
        <BentoTile
          icon={Syringe}
          title="Care Plan"
          primary="חיסון"
          caption="בעוד 14 ימים"
          delay={0.42}
          accent={accent}
          onClick={() => openSheet("vaccine")}
        />
        <BentoTile
          icon={UtensilsCrossed}
          title="Nutrition"
          primary="250g / יום"
          caption="~430 קק״ל"
          delay={0.48}
          accent={accent}
          onClick={() => openSheet("feeding")}
        />
        <BentoTile
          icon={ImageIcon}
          title="Memories"
          primary="38 רגעים"
          caption="הוסיפו תמונה"
          delay={0.54}
          accent={accent}
          large
          onClick={() => openSheet("memories")}
        />
      </div>

      {/* ── Unified timeline ── */}
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
            meta="מנה יומית 250g"
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
            delay={0.70}
            accent={accent}
            last
          />
        </div>
      </div>

      {/* ── Inline action row (no FAB — mascot already floats over BottomNav) ── */}
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