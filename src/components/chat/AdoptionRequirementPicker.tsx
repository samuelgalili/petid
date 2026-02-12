import { motion } from "framer-motion";

interface AdoptionRequirementPickerProps {
  onSelect: (reqs: string[]) => void;
}

const REQUIREMENTS = [
  { id: "yard", label: "חייב חצר", emoji: "🏡" },
  { id: "apartment", label: "מתאים לדירה", emoji: "🏢" },
  { id: "no_pets", label: "עדיפות לבית ללא חיות אחרות", emoji: "🚫" },
  { id: "experience", label: "ניסיון עם הגזע חובה", emoji: "🎓" },
];

import { useState } from "react";

export const AdoptionRequirementPicker = ({ onSelect }: AdoptionRequirementPickerProps) => {
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
      {REQUIREMENTS.map((req, i) => (
        <motion.button
          key={req.id}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => toggle(req.label)}
          className={`flex items-center gap-3 py-3 px-4 rounded-2xl border transition-all text-right ${
            selected.includes(req.label)
              ? "bg-primary/15 border-primary/40"
              : "border-border/50 bg-card hover:bg-primary/5"
          }`}
        >
          <span className="text-xl">{req.emoji}</span>
          <span className="text-sm font-semibold text-foreground">{req.label}</span>
        </motion.button>
      ))}
      {selected.length > 0 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(selected)}
          className="mt-1 py-2.5 px-4 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold"
        >
          אישור
        </motion.button>
      )}
    </motion.div>
  );
};
