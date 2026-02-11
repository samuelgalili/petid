import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp } from "lucide-react";

interface NewPostToastProps {
  visible: boolean;
  count: number;
  onTap: () => void;
}

/** Floating toast that appears when new posts arrive via realtime */
export const NewPostToast = ({ visible, count, onTap }: NewPostToastProps) => (
  <AnimatePresence>
    {visible && count > 0 && (
      <motion.button
        initial={{ y: -50, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -50, opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        onClick={onTap}
        className="fixed top-14 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 px-4 py-2 rounded-full shadow-xl"
        style={{
          background: "rgba(255,140,66,0.95)",
          backdropFilter: "blur(12px)",
        }}
      >
        <ChevronUp className="w-4 h-4 text-white" />
        <span className="text-white text-sm font-semibold">
          {count} {count === 1 ? "פוסט חדש" : "פוסטים חדשים"}
        </span>
      </motion.button>
    )}
  </AnimatePresence>
);
