import { motion } from "framer-motion";

interface AdoptionTraitPickerProps {
  onSelect: (traits: string[]) => void;
}

const TRAITS = [
  { id: "energetic", label: "אנרגטי ושובב", emoji: "🧸" },
  { id: "calm", label: "רגוע ואוהב לישון", emoji: "💤" },
  { id: "kids_friendly", label: "מעולה עם ילדים", emoji: "👶" },
  { id: "cat_friendly", label: "מסתדר עם חתולים", emoji: "🐱" },
  { id: "dog_shy", label: "חששן מכלבים אחרים", emoji: "🐕" },
];

import { useState } from "react";

export const AdoptionTraitPicker = ({ onSelect }: AdoptionTraitPickerProps) => {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (label: string) => {
    setSelected(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-2 mt-2"
      style={{ maxWidth: "320px" }}
    >
      <div className="flex flex-wrap gap-2">
        {TRAITS.map((trait, i) => (
          <motion.button
            key={trait.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => toggle(trait.label)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm font-medium transition-all ${
              selected.includes(trait.label)
                ? "bg-primary/15 border-primary/40 text-primary"
                : "border-border/50 bg-card text-foreground hover:bg-primary/5"
            }`}
          >
            <span>{trait.emoji}</span>
            <span>{trait.label}</span>
          </motion.button>
        ))}
      </div>
      {selected.length > 0 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(selected)}
          className="mt-1 py-2.5 px-4 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold"
        >
          אישור ({selected.length} תכונות)
        </motion.button>
      )}
    </motion.div>
  );
};
