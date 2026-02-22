/**
 * HeartRain — Triggered when clicking the pet avatar.
 * Rains heart icons from above with randomized positions and delays.
 */
import { motion, AnimatePresence } from "framer-motion";

interface HeartRainProps {
  active: boolean;
}

const HEARTS = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 0.4,
  size: 12 + Math.random() * 10,
  rotation: -30 + Math.random() * 60,
  emoji: ["❤️", "🧡", "💛", "💖", "💕", "🐾"][Math.floor(Math.random() * 6)],
}));

export const HeartRain = ({ active }: HeartRainProps) => {
  return (
    <AnimatePresence>
      {active && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
          {HEARTS.map((heart) => (
            <motion.div
              key={heart.id}
              initial={{ 
                opacity: 1, 
                y: -20, 
                x: `${heart.x}vw`,
                rotate: heart.rotation,
                scale: 0.5,
              }}
              animate={{ 
                opacity: [1, 1, 0],
                y: "110vh",
                rotate: heart.rotation + 180,
                scale: [0.5, 1, 0.8],
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 1.8 + Math.random() * 0.8, 
                delay: heart.delay,
                ease: "easeIn",
              }}
              style={{ 
                position: "absolute",
                fontSize: heart.size,
                left: 0,
              }}
            >
              {heart.emoji}
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};
