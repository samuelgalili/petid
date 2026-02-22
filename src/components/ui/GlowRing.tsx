/**
 * GlowRing — Milestone-triggered glow effect for circular UI elements.
 * Uses framer-motion for fluid color transitions when milestones are reached.
 */
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface GlowRingProps {
  score: number;
  size?: number;
  children: React.ReactNode;
  className?: string;
}

const MILESTONE_THRESHOLDS = [25, 50, 70, 85, 100];

const MILESTONE_COLORS: Record<number, { color: string; label: string }> = {
  25: { color: "hsla(0, 84%, 60%, 0.5)", label: "התחלה" },
  50: { color: "hsla(38, 92%, 50%, 0.5)", label: "בדרך הנכונה" },
  70: { color: "hsla(209, 79%, 52%, 0.5)", label: "מרשים" },
  85: { color: "hsla(142, 71%, 45%, 0.5)", label: "מצוין" },
  100: { color: "hsla(280, 70%, 55%, 0.6)", label: "מושלם ✨" },
};

export const GlowRing = ({ score, size = 64, children, className }: GlowRingProps) => {
  const [glowActive, setGlowActive] = useState(false);
  const [glowColor, setGlowColor] = useState("transparent");
  const [milestoneLabel, setMilestoneLabel] = useState("");

  useEffect(() => {
    const milestone = MILESTONE_THRESHOLDS.find((t) => score >= t && score < t + 3);
    if (milestone && MILESTONE_COLORS[milestone]) {
      setGlowColor(MILESTONE_COLORS[milestone].color);
      setMilestoneLabel(MILESTONE_COLORS[milestone].label);
      setGlowActive(true);
      const timer = setTimeout(() => setGlowActive(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [score]);

  return (
    <div className={`relative ${className || ""}`} style={{ width: size, height: size }}>
      {/* Glow layers */}
      <AnimatePresence>
        {glowActive && (
          <>
            <motion.div
              className="absolute inset-[-8px] rounded-full pointer-events-none"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: [0, 0.8, 0.4, 0.7, 0],
                scale: [0.9, 1.2, 1.1, 1.25, 1.3],
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 2.5, ease: "easeOut" }}
              style={{
                background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
              }}
            />
            <motion.div
              className="absolute inset-[-12px] rounded-full pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 0.3, 0.15, 0.25, 0],
                scale: [1, 1.4, 1.3, 1.45, 1.5],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 3, ease: "easeOut" }}
              style={{
                background: `radial-gradient(circle, ${glowColor} 0%, transparent 60%)`,
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Milestone label */}
      <AnimatePresence>
        {glowActive && milestoneLabel && (
          <motion.div
            className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap z-20"
            initial={{ opacity: 0, y: 8, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.8 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-background/90 border border-border/40 shadow-sm text-foreground">
              {milestoneLabel}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
};
