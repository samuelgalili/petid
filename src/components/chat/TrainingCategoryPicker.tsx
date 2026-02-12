import { motion } from "framer-motion";

interface TrainingCategoryPickerProps {
  petName: string;
  onSelect: (category: string) => void;
}

const CATEGORIES = [
  { id: "puppy_basics", label: "אילוף גורים (בסיסי)", emoji: "🐾" },
  { id: "leash_pulling", label: "משיכה ברצועה", emoji: "🐕" },
  { id: "house_training", label: "צרכים בבית", emoji: "🏠" },
  { id: "barking_aggression", label: "נביחות / תוקפנות", emoji: "🗣️" },
  { id: "separation_anxiety", label: "חרדת נטישה", emoji: "🛋️" },
];

export const TrainingCategoryPicker = ({ petName, onSelect }: TrainingCategoryPickerProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-2 mt-2"
      style={{ maxWidth: "300px" }}
    >
      {CATEGORIES.map((cat, i) => (
        <motion.button
          key={cat.id}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(cat.label)}
          className="flex items-center gap-3 py-3 px-4 rounded-2xl border border-border/50 bg-card hover:bg-primary/5 hover:border-primary/30 transition-all text-right"
        >
          <span className="text-xl">{cat.emoji}</span>
          <span className="text-sm font-semibold text-foreground">{cat.label}</span>
        </motion.button>
      ))}
    </motion.div>
  );
};
