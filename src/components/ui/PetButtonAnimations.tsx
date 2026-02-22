/**
 * Randomized Pet Button micro-animations.
 * On click, randomly triggers: tail wag, heart-eyes, sparkle burst, or haptic bark.
 */
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import { Heart, Sparkles } from "lucide-react";

type AnimationType = "tailWag" | "heartEyes" | "sparkleBurst" | "bark";

const ANIMATIONS: AnimationType[] = ["tailWag", "heartEyes", "sparkleBurst", "bark"];

export const usePetButtonAnimation = () => {
  const [activeAnim, setActiveAnim] = useState<AnimationType | null>(null);

  const triggerRandom = useCallback(() => {
    const anim = ANIMATIONS[Math.floor(Math.random() * ANIMATIONS.length)];
    setActiveAnim(anim);

    // Haptic feedback for bark
    if (anim === "bark" && navigator.vibrate) {
      navigator.vibrate([30, 50, 30]);
    } else if (navigator.vibrate) {
      navigator.vibrate(15);
    }

    setTimeout(() => setActiveAnim(null), 1200);
  }, []);

  return { activeAnim, triggerRandom };
};

interface PetButtonOverlayProps {
  activeAnim: AnimationType | null;
}

export const PetButtonOverlay = ({ activeAnim }: PetButtonOverlayProps) => {
  return (
    <AnimatePresence>
      {activeAnim === "tailWag" && (
        <motion.div
          key="tailWag"
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-lg pointer-events-none z-30"
          initial={{ rotate: 0, opacity: 0 }}
          animate={{ rotate: [-15, 20, -15, 20, -10, 15, 0], opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          🐾
        </motion.div>
      )}

      {activeAnim === "heartEyes" && (
        <>
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={`heart-${i}`}
              className="absolute pointer-events-none z-30"
              style={{ left: `${20 + i * 18}%`, top: "10%" }}
              initial={{ opacity: 0, y: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: [0, -20 - i * 8, -35 - i * 10, -50],
                scale: [0, 0.8 + i * 0.15, 0.6, 0],
                x: [0, (i % 2 === 0 ? -8 : 8), (i % 2 === 0 ? -12 : 12)],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, delay: i * 0.08 }}
            >
              <Heart className="w-3.5 h-3.5 fill-pink-400 text-pink-400" />
            </motion.div>
          ))}
        </>
      )}

      {activeAnim === "sparkleBurst" && (
        <>
          {[...Array(5)].map((_, i) => {
            const angle = (i / 5) * Math.PI * 2;
            return (
              <motion.div
                key={`sparkle-${i}`}
                className="absolute pointer-events-none z-30"
                style={{ left: "50%", top: "50%" }}
                initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0.3],
                  x: [0, Math.cos(angle) * 28],
                  y: [0, Math.sin(angle) * 28],
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, delay: i * 0.04 }}
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
              </motion.div>
            );
          })}
        </>
      )}

      {activeAnim === "bark" && (
        <motion.div
          key="bark"
          className="absolute -top-4 left-1/2 -translate-x-1/2 pointer-events-none z-30"
          initial={{ opacity: 0, scale: 0.5, y: 5 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.1, 1, 0.8], y: [5, -8, -12, -18] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
            הב! 🐕
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
