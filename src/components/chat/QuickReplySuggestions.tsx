import { motion } from "framer-motion";

export interface SuggestionItem {
  text: string;
  avatarUrl?: string | null;
  icon?: string;
}

interface QuickReplySuggestionsProps {
  suggestions: string[];
  petAvatars?: { name: string; avatarUrl: string | null; type: string }[];
  onSelect: (text: string) => void;
}

export const QuickReplySuggestions = ({ suggestions, petAvatars, onSelect }: QuickReplySuggestionsProps) => {
  if (!suggestions.length) return null;

  const getPetAvatar = (text: string) => petAvatars?.find(p => p.name === text);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-2 mt-1.5"
    >
      {suggestions.map((text, i) => {
        const pet = getPetAvatar(text);
        return (
          <motion.button
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(text)}
            className={`flex items-center gap-2 text-xs font-medium rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors ${pet ? 'px-2 py-1.5' : 'px-3 py-1.5'}`}
          >
            {pet && (
              <div className="w-6 h-6 rounded-full overflow-hidden bg-muted flex-shrink-0">
                {pet.avatarUrl ? (
                  <img src={pet.avatarUrl} alt={text} className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-sm">
                    {pet.type === 'dog' ? '🐕' : pet.type === 'cat' ? '🐈' : '🐾'}
                  </span>
                )}
              </div>
            )}
            {text}
          </motion.button>
        );
      })}
    </motion.div>
  );
};
