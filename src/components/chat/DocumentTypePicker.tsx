import { motion } from "framer-motion";

interface DocumentTypePickerProps {
  onSelect: (option: string) => void;
}

const DOC_TYPES = [
  { id: "vaccines", label: "פנקס חיסונים", emoji: "💉" },
  { id: "license", label: "רישיון להחזקת כלב (עירייה)", emoji: "📜" },
  { id: "lab_results", label: "תוצאות בדיקות מעבדה", emoji: "🧬" },
  { id: "prescriptions", label: "מרשמים וטיפולים שוטפים", emoji: "💊" },
  { id: "insurance_policy", label: "פוליסת ביטוח", emoji: "📋" },
];

export const DocumentTypePicker = ({ onSelect }: DocumentTypePickerProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-2 mt-2"
      style={{ maxWidth: "300px" }}
    >
      {DOC_TYPES.map((doc, i) => (
        <motion.button
          key={doc.id}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(doc.label)}
          className="flex items-center gap-3 py-3 px-4 rounded-2xl border border-border/50 bg-card hover:bg-primary/5 hover:border-primary/30 transition-all text-right"
        >
          <span className="text-xl">{doc.emoji}</span>
          <span className="text-sm font-semibold text-foreground">{doc.label}</span>
        </motion.button>
      ))}
    </motion.div>
  );
};
