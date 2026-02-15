import { memo } from "react";
import { motion } from "framer-motion";
import { Shield, Stethoscope, GraduationCap, Scissors, Building2, TreePine, Scale, Flame } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ExpertSphere {
  id: string;
  label: string;
  emoji: string;
  icon: LucideIcon;
  gradient: string;
  contextualPrompt: string;
}

const spheres: ExpertSphere[] = [
  {
    id: "insurance",
    label: "ביטוח",
    emoji: "🛡️",
    icon: Shield,
    gradient: "from-blue-500 to-cyan-500",
    contextualPrompt: "בדוק את מצב הביטוח שלי — האם יש החזרים שמגיעים לי?",
  },
  {
    id: "medical",
    label: "רפואי",
    emoji: "🦴",
    icon: Stethoscope,
    gradient: "from-red-500 to-rose-400",
    contextualPrompt: "הצג סיכום רפואי — חיסונים, ביקורי וטרינר, ומצב בריאותי נוכחי",
  },
  {
    id: "training",
    label: "אילוף",
    emoji: "🎓",
    icon: GraduationCap,
    gradient: "from-amber-500 to-orange-400",
    contextualPrompt: "תן לי טיפים לאילוף שמתאימים לגיל ולגזע שלי",
  },
  {
    id: "grooming",
    label: "טיפוח",
    emoji: "✂️",
    icon: Scissors,
    gradient: "from-pink-500 to-fuchsia-400",
    contextualPrompt: "מה הטיפוח המומלץ לגזע שלי? אני רוצה לקבוע תור",
  },
  {
    id: "boarding",
    label: "פנסיון",
    emoji: "🏨",
    icon: Building2,
    gradient: "from-sky-500 to-indigo-400",
    contextualPrompt: "אני מתכנן חופשה — בדוק מוכנות לפנסיון ודרישות חיסון",
  },
  {
    id: "parks",
    label: "פארקים",
    emoji: "🌳",
    icon: TreePine,
    gradient: "from-emerald-500 to-green-400",
    contextualPrompt: "הצג גינות כלבים קרובות למיקום שלי",
  },
  {
    id: "authorities",
    label: "רשויות",
    emoji: "⚖️",
    icon: Scale,
    gradient: "from-slate-500 to-zinc-400",
    contextualPrompt: "תן לי את פרטי הקשר של השירות הווטרינרי העירוני בעיר שלי",
  },
  {
    id: "end_of_life",
    label: "פרידה",
    emoji: "🕯️",
    icon: Flame,
    gradient: "from-purple-400 to-violet-300",
    contextualPrompt: "אני צריך מידע על שירותי פרידה והנצחה",
  },
];

interface ExpertSpheresProps {
  onSelect: (sphere: ExpertSphere) => void;
  disabled?: boolean;
}

export const ExpertSpheres = memo(({ onSelect, disabled }: ExpertSpheresProps) => {
  return (
    <div className="px-4 py-2">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1" dir="rtl">
        {spheres.map((sphere, index) => {
          const IconComp = sphere.icon;
          return (
            <motion.button
              key={sphere.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.04, type: "spring", stiffness: 300 }}
              whileHover={{ scale: 1.08, y: -3 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => !disabled && onSelect(sphere)}
              disabled={disabled}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
            >
              <div
                className={`w-14 h-14 rounded-full bg-gradient-to-br ${sphere.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow relative`}
              >
                <IconComp className="w-6 h-6 text-white" strokeWidth={1.5} />
                {/* Subtle ring on hover */}
                <div className="absolute inset-0 rounded-full border-2 border-white/0 group-hover:border-white/30 transition-all" />
              </div>
              <span className="text-[10px] text-muted-foreground font-heebo font-medium leading-tight text-center whitespace-nowrap">
                {sphere.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
});

ExpertSpheres.displayName = "ExpertSpheres";

export type { ExpertSphere };
