import { motion } from "framer-motion";

interface QuickReplySuggestionsProps {
  suggestions: string[];
  onSelect: (text: string) => void;
}

export const QuickReplySuggestions = ({ suggestions, onSelect }: QuickReplySuggestionsProps) => {
  if (!suggestions.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-1.5 mt-1.5"
    >
      {suggestions.map((text, i) => (
        <motion.button
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(text)}
          className="px-3 py-1.5 text-xs font-medium rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
        >
          {text}
        </motion.button>
      ))}
    </motion.div>
  );
};
