import { motion } from "framer-motion";
import { Scissors, Droplets, Hand } from "lucide-react";

interface GroomingServicePickerProps {
  petName: string;
  onSelect: (service: string) => void;
}

const SERVICES = [
  { id: "haircut", label: "תספורת", icon: Scissors, emoji: "✂️" },
  { id: "bath", label: "מקלחת", icon: Droplets, emoji: "🫧" },
  { id: "nails", label: "ציפורניים", icon: Hand, emoji: "💅" },
  { id: "full", label: "חבילה מלאה", icon: Scissors, emoji: "🐩" },
];

export const GroomingServicePicker = ({ petName, onSelect }: GroomingServicePickerProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-2 gap-2 mt-2"
      style={{ maxWidth: "300px" }}
    >
      {SERVICES.map((service, i) => (
        <motion.button
          key={service.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(service.label)}
          className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border border-border/50 bg-card hover:bg-primary/5 hover:border-primary/30 transition-all"
        >
          <span className="text-2xl">{service.emoji}</span>
          <span className="text-xs font-semibold text-foreground">{service.label}</span>
        </motion.button>
      ))}
    </motion.div>
  );
};
