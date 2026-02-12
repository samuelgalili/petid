import { motion } from "framer-motion";

interface DogParkPickerProps {
  onSelect: (option: string) => void;
}

const PARK_OPTIONS = [
  { id: "nearest", label: "הגינה הכי קרובה אליי", emoji: "📍" },
  { id: "popular", label: "איפה שיש הכי הרבה כלבים עכשיו", emoji: "🐕" },
  { id: "shaded", label: "גינה עם הרבה צל/דשא", emoji: "🌳" },
  { id: "water", label: "גינה עם מתקני מים / בריכה", emoji: "💧" },
];

export const DogParkPicker = ({ onSelect }: DogParkPickerProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-2 mt-2"
      style={{ maxWidth: "300px" }}
    >
      {PARK_OPTIONS.map((opt, i) => (
        <motion.button
          key={opt.id}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(opt.label)}
          className="flex items-center gap-3 py-3 px-4 rounded-2xl border border-border/50 bg-card hover:bg-primary/5 hover:border-primary/30 transition-all text-right"
        >
          <span className="text-xl">{opt.emoji}</span>
          <span className="text-sm font-semibold text-foreground">{opt.label}</span>
        </motion.button>
      ))}
    </motion.div>
  );
};
