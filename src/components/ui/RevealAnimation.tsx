/**
 * RevealAnimation — Gift-unwrap reveal for hidden content.
 * Feels like opening a gift rather than just clicking a link.
 */
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import { Gift, ChevronDown, Sparkles } from "lucide-react";

interface RevealAnimationProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const RevealAnimation = ({ title, description, children, className }: RevealAnimationProps) => {
  const [revealed, setRevealed] = useState(false);
  const [unwrapping, setUnwrapping] = useState(false);

  const handleReveal = useCallback(() => {
    if (revealed) {
      setRevealed(false);
      return;
    }
    setUnwrapping(true);
    // Haptic
    if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
    setTimeout(() => {
      setUnwrapping(false);
      setRevealed(true);
    }, 600);
  }, [revealed]);

  return (
    <div className={className} dir="rtl">
      <button
        onClick={handleReveal}
        className="w-full group"
        disabled={unwrapping}
      >
        <motion.div
          className="relative overflow-hidden rounded-2xl border border-border/30 bg-card"
          whileTap={{ scale: 0.98 }}
        >
          {/* Locked state */}
          <div className="p-4 flex items-center gap-3">
            <motion.div
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0"
              animate={unwrapping ? {
                rotate: [0, -8, 8, -5, 5, 0],
                scale: [1, 1.1, 1.05, 1.1, 1],
              } : revealed ? { rotate: 0 } : {}}
              transition={{ duration: 0.6 }}
            >
              {unwrapping ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                  <Sparkles className="w-5 h-5 text-amber-500" />
                </motion.div>
              ) : revealed ? (
                <ChevronDown className="w-5 h-5 text-primary" />
              ) : (
                <Gift className="w-5 h-5 text-primary" />
              )}
            </motion.div>
            <div className="flex-1 text-right">
              <span className="text-sm font-semibold text-foreground">{title}</span>
              {description && !revealed && (
                <p className="text-[11px] text-muted-foreground">{description}</p>
              )}
            </div>
          </div>

          {/* Unwrap shimmer effect */}
          <AnimatePresence>
            {unwrapping && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                style={{
                  background: "linear-gradient(90deg, transparent, hsla(var(--primary) / 0.08), transparent)",
                }}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </button>

      {/* Revealed content */}
      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="overflow-hidden"
          >
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="pt-2"
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
