import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp } from "lucide-react";

interface BackToTopButtonProps {
  visible: boolean;
}

export const BackToTopButton = ({ visible }: BackToTopButtonProps) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          whileTap={{ scale: 0.9 }}
          onClick={scrollToTop}
          className="fixed bottom-24 left-4 z-40 w-10 h-10 rounded-full bg-card/90 backdrop-blur-md border border-border/40 shadow-lg flex items-center justify-center text-foreground hover:bg-card transition-colors"
          aria-label="חזור למעלה"
        >
          <ChevronUp className="w-5 h-5" strokeWidth={2} />
        </motion.button>
      )}
    </AnimatePresence>
  );
};
