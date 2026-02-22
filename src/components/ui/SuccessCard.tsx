/**
 * SuccessCard — Celebratory "Surprise Insight" popup with confetti.
 * Triggered when users complete tasks or add high-quality products.
 */
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import { X, Sparkles, TrendingUp, ShieldCheck } from "lucide-react";

interface SuccessCardProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  insight?: string;
  score?: number;
  petName?: string;
}

export const SuccessCard = ({ open, onClose, title, subtitle, insight, score, petName }: SuccessCardProps) => {
  const triggerConfetti = useCallback(async () => {
    try {
      const confetti = (await import("canvas-confetti")).default;
      confetti({
        particleCount: 50,
        spread: 55,
        origin: { y: 0.65 },
        colors: ["#2688E6", "#37B679", "#FFD748", "#FF6B8A"],
        shapes: ["circle"],
        scalar: 0.9,
        gravity: 1.3,
      });
    } catch {}
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            onAnimationComplete={() => triggerConfetti()}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[10001] max-w-sm mx-auto"
            dir="rtl"
          >
            <div className="relative overflow-hidden rounded-3xl bg-card border border-border/30 shadow-2xl p-6">
              {/* Decorative top gradient */}
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-primary/8 to-transparent pointer-events-none" />

              {/* Close */}
              <button onClick={onClose} className="absolute top-3 left-3 p-1.5 rounded-full hover:bg-muted/50 transition-colors z-10">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* Icon */}
              <motion.div
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mx-auto mb-4 relative"
                animate={{ scale: [1, 1.08, 1], rotate: [0, -3, 3, 0] }}
                transition={{ duration: 1.5, repeat: 1 }}
              >
                <Sparkles className="w-7 h-7 text-primary" />
                {/* Glow */}
                <motion.div
                  className="absolute inset-[-6px] rounded-2xl pointer-events-none"
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ background: "radial-gradient(circle, hsla(209, 79%, 52%, 0.2) 0%, transparent 70%)" }}
                />
              </motion.div>

              {/* Title */}
              <h3 className="text-lg font-bold text-center mb-1">{title}</h3>
              {subtitle && <p className="text-sm text-muted-foreground text-center mb-3">{subtitle}</p>}

              {/* Score display */}
              {score !== undefined && (
                <motion.div
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-muted/40 mb-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <ShieldCheck className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium">SafeScore</span>
                  <span className="text-xl font-bold text-green-500">{score}/10</span>
                </motion.div>
              )}

              {/* Insight */}
              {insight && (
                <motion.div
                  className="p-3 rounded-xl bg-primary/5 border border-primary/10"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-foreground leading-relaxed">{insight}</p>
                  </div>
                </motion.div>
              )}

              {/* Pet name */}
              {petName && (
                <p className="text-xs text-muted-foreground text-center mt-3">
                  🐾 {petName} יותר בטוח/ה עכשיו
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Hook to trigger success cards

export const useSuccessCard = () => {
  const [cardState, setCardState] = useState<Omit<SuccessCardProps, "open" | "onClose"> | null>(null);

  const showSuccess = useCallback((props: Omit<SuccessCardProps, "open" | "onClose">) => {
    setCardState(props);
  }, []);

  const hideSuccess = useCallback(() => setCardState(null), []);

  return {
    showSuccess,
    hideSuccess,
    SuccessCardElement: cardState ? (
      <SuccessCard open={true} onClose={hideSuccess} {...cardState} />
    ) : null,
  };
};
