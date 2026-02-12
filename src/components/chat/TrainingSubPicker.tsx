import { motion } from "framer-motion";

interface TrainingSubPickerProps {
  options: string[];
  onSelect: (option: string) => void;
}

export const TrainingSubPicker = ({ options, onSelect }: TrainingSubPickerProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-2 mt-2"
      style={{ maxWidth: "300px" }}
    >
      {options.map((option, i) => (
        <motion.button
          key={i}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(option)}
          className="py-2.5 px-4 rounded-2xl border border-border/50 bg-card hover:bg-primary/5 hover:border-primary/30 transition-all text-right text-sm font-medium text-foreground"
        >
          {option}
        </motion.button>
      ))}
    </motion.div>
  );
};
