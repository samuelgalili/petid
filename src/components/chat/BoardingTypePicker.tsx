import { motion } from "framer-motion";

interface BoardingTypePickerProps {
  onSelect: (option: string) => void;
}

const BOARDING_TYPES = [
  { id: "home", label: "פנסיון ביתי", desc: "בבית של מישהו, אווירה משפחתית", emoji: "🏡" },
  { id: "hotel", label: "מלון כלבים", desc: "מתקן מקצועי עם חצרות גדולות", emoji: "🏨" },
  { id: "sitter", label: "דוגיסיטר", desc: "מישהו שיבוא אליכם הביתה", emoji: "👨‍👩‍👧" },
];

export const BoardingTypePicker = ({ onSelect }: BoardingTypePickerProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-2 mt-2"
      style={{ maxWidth: "320px" }}
    >
      {BOARDING_TYPES.map((type, i) => (
        <motion.button
          key={type.id}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(type.label)}
          className="flex items-center gap-3 py-3 px-4 rounded-2xl border border-border/50 bg-card hover:bg-primary/5 hover:border-primary/30 transition-all text-right"
        >
          <span className="text-2xl">{type.emoji}</span>
          <div className="flex flex-col items-start">
            <span className="text-sm font-semibold text-foreground">{type.label}</span>
            <span className="text-xs text-muted-foreground">{type.desc}</span>
          </div>
        </motion.button>
      ))}
    </motion.div>
  );
};
