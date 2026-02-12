import { motion } from "framer-motion";

interface StoreCategoryPickerProps {
  onSelect: (option: string) => void;
}

const STORE_CATEGORIES = [
  { id: "food", label: "אוכל (יבש/רטוב)", emoji: "🥩" },
  { id: "treats", label: "חטיפים וצ'ופרים", emoji: "🦴" },
  { id: "pest", label: "הדברה (פרעושים וקרציות)", emoji: "💊" },
  { id: "toys", label: "צעצועים ואביזרים", emoji: "🧸" },
  { id: "hygiene", label: "היגיינה (שקיות/חול)", emoji: "🧻" },
];

export const StoreCategoryPicker = ({ onSelect }: StoreCategoryPickerProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-2 mt-2"
      style={{ maxWidth: "300px" }}
    >
      {STORE_CATEGORIES.map((cat, i) => (
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
