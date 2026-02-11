import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface QuickReactionsProps {
  postId: string;
  onReact: (postId: string, emoji: string) => void;
  visible: boolean;
  onClose: () => void;
}

const REACTIONS = ["❤️", "🔥", "😂", "😮", "😢", "🙏"];

export const QuickReactions = ({ postId, onReact, visible, onClose }: QuickReactionsProps) => {
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

  const handleReact = (emoji: string) => {
    setSelectedEmoji(emoji);
    onReact(postId, emoji);
    setTimeout(() => {
      setSelectedEmoji(null);
      onClose();
    }, 400);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          className="absolute bottom-full mb-2 right-0 bg-card/95 backdrop-blur-xl rounded-full px-2 py-1.5 shadow-xl border border-border/30 flex items-center gap-1 z-50"
        >
          {REACTIONS.map((emoji, i) => (
            <motion.button
              key={emoji}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 400, damping: 15 }}
              whileHover={{ scale: 1.4, y: -6, rotate: [0, -10, 10, 0] }}
              whileTap={{ scale: 0.8 }}
              onClick={() => handleReact(emoji)}
              className={`text-xl p-1 rounded-full transition-colors ${
                selectedEmoji === emoji ? "bg-primary/20" : "hover:bg-muted"
              }`}
            >
              {emoji}
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Floating emoji animation when reacted
export const FloatingEmoji = ({ emoji, onComplete }: { emoji: string; onComplete: () => void }) => (
  <motion.div
    initial={{ opacity: 1, y: 0, scale: 1 }}
    animate={{ opacity: 0, y: -80, scale: 1.5 }}
    transition={{ duration: 0.8, ease: "easeOut" }}
    onAnimationComplete={onComplete}
    className="absolute bottom-8 right-8 text-3xl pointer-events-none z-50"
  >
    {emoji}
  </motion.div>
);
