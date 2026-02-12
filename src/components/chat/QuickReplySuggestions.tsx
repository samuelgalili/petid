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

  // If we have pet avatars, render circle-style like user profile page
  const hasPetMode = petAvatars && petAvatars.length > 0;

  if (hasPetMode) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap gap-4 justify-center mt-3"
      >
        {suggestions.map((text, i) => {
          const pet = getPetAvatar(text);
          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelect(text)}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="w-14 h-14 rounded-full bg-primary p-[2px]">
                <div className="w-full h-full rounded-full overflow-hidden bg-card">
                  {pet?.avatarUrl ? (
                    <img src={pet.avatarUrl} alt={text} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <span className="text-xl">
                        {pet?.type === 'dog' ? '🐕' : pet?.type === 'cat' ? '🐈' : '🐾'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <span className="text-xs font-medium text-foreground">{text}</span>
            </motion.button>
          );
        })}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-2 mt-1.5"
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
