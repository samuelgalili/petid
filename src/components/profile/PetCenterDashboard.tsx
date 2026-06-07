import { motion } from "framer-motion";
import { Cake, Weight, Thermometer, HeartPulse, UtensilsCrossed, Flame, Bell, Syringe } from "lucide-react";
import dogIcon from "@/assets/dog-official.svg";
import catIcon from "@/assets/cat-official.png";

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

const StatCard = ({
  icon: Icon,
  value,
  label,
  delay,
  accent,
}: {
  icon: typeof Cake;
  value: string;
  label: string;
  delay: number;
  accent: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12, scale: 0.96 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, type: "spring", damping: 18, stiffness: 220 }}
    className="relative rounded-2xl bg-card px-3.5 py-3 border"
    style={{ borderColor: `${accent}55`, boxShadow: `0 1px 0 ${accent}10` }}
  >
    <Icon className="w-4 h-4 mb-1.5" style={{ color: accent }} strokeWidth={1.6} />
    <div className="text-[17px] font-extrabold leading-tight tracking-tight text-foreground">
      {value}
    </div>
    <div className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">{label}</div>
  </motion.div>
);

const VitalBar = ({
  label,
  value,
  delay,
  accent,
}: {
  label: string;
  value: number;
  delay: number;
  accent: string;
}) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay }}
    className="flex items-center gap-3"
  >
    <span className="text-[11px] text-muted-foreground min-w-[88px]">{label}</span>
    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: `${accent}1f` }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ delay: delay + 0.1, duration: 0.8, ease: "easeOut" }}
        className="h-full rounded-full"
        style={{ background: accent }}
      />
    </div>
    <span className="text-[11px] font-semibold text-foreground min-w-[34px] text-left">{value}%</span>
  </motion.div>
);

export const PetCenterDashboard = ({ pet, accent = "hsl(var(--primary))" }: Props) => {
  const type = (pet.type || pet.pet_type) as "dog" | "cat" | undefined;
  const fallback = type === "cat" ? catIcon : dogIcon;
  const ageY = calcAgeYears(pet);
  const weight = pet.weight;

  // Reference ranges (placeholder defaults — replaced when system supplies them)
  const stats = [
    { icon: Cake, value: ageY != null ? `${ageY}` : "—", label: "גיל (שנים)" },
    { icon: Weight, value: fmt(weight, " ק״ג"), label: "משקל" },
    { icon: Thermometer, value: "38.5°C", label: "טווח 38–39" },
    { icon: HeartPulse, value: "80–120", label: "דופק / דקה" },
    { icon: UtensilsCrossed, value: "250g", label: "מנה יומית" },
    { icon: Flame, value: "~430", label: "קק״ל ליום" },
  ];

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* ── 6 Stat Cards (3 rows × 2 cols) ── */}
      <div className="grid grid-cols-2 gap-2.5">
        {stats.map((s, i) => (
          <StatCard key={s.label} {...s} delay={0.04 * i} accent={accent} />
        ))}
      </div>

      {/* ── Centered Pet Image ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.25, type: "spring", damping: 18, stiffness: 200 }}
        className="flex flex-col items-center justify-center py-4"
      >
        <img
          src={pet.avatar_url || fallback}
          alt={pet.name}
          className="h-56 w-auto object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.18)]"
        />
      </motion.div>

      {/* ── Vitality Section ── */}
      <div className="rounded-2xl bg-card border border-border/40 px-4 py-4">
        <div className="text-[11px] font-semibold text-muted-foreground mb-3 tracking-wide">
          מדדי חיוניות
        </div>
        <div className="flex flex-col gap-2.5">
          <VitalBar label="פעילות"  value={78} delay={0.30} accent={accent} />
          <VitalBar label="תזונה"   value={65} delay={0.36} accent={accent} />
          <VitalBar label="שינה"    value={88} delay={0.42} accent={accent} />
          <VitalBar label="מצב רוח" value={72} delay={0.48} accent={accent} />
        </div>
      </div>

      {/* ── Reminders ── */}
      <div>
        <div className="text-[11px] font-semibold text-muted-foreground mb-2 tracking-wide">
          תזכורות קרובות
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div
            className="rounded-2xl bg-card border px-3 py-2.5"
            style={{ borderColor: `${accent}40` }}
          >
            <div className="flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" style={{ color: accent }} />
              <span className="text-[13px] font-bold text-foreground">האכלה</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">היום 09:00</div>
          </div>
          <div
            className="rounded-2xl bg-card border px-3 py-2.5"
            style={{ borderColor: `${accent}40` }}
          >
            <div className="flex items-center gap-1.5">
              <Syringe className="w-3.5 h-3.5" style={{ color: accent }} />
              <span className="text-[13px] font-bold text-foreground">חיסון</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">בעוד 14 ימים</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PetCenterDashboard;