import { motion } from "framer-motion";

interface VirtualTreatAnimationProps {
  onComplete: () => void;
}

export const VirtualTreatAnimation = ({ onComplete }: VirtualTreatAnimationProps) => {
  const treats = ["🦴", "🍖", "🥩", "🍗", "🦴"];

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: 1.8, duration: 0.3 }}
      onAnimationComplete={onComplete}
      className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
    >
      {/* Central treat */}
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: [0, 1.6, 1.2], rotate: [-30, 15, 0] }}
        transition={{ type: "spring", stiffness: 300, damping: 12 }}
        className="text-6xl"
      >
        🦴
      </motion.div>

      {/* Bursting mini-treats */}
      {treats.map((treat, i) => {
        const angle = (i / treats.length) * Math.PI * 2;
        const radius = 120;
        return (
          <motion.div
            key={i}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
            animate={{
              x: Math.cos(angle) * radius,
              y: Math.sin(angle) * radius,
              scale: [0, 1.2, 0.6],
              opacity: [0, 1, 0],
              rotate: [0, 360],
            }}
            transition={{
              duration: 1.2,
              delay: 0.2 + i * 0.06,
              ease: "easeOut",
            }}
            className="absolute text-3xl"
          >
            {treat}
          </motion.div>
        );
      })}

      {/* Sparkle ring */}
      <motion.div
        initial={{ scale: 0, opacity: 0.8 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 1, delay: 0.1 }}
        className="absolute w-16 h-16 rounded-full border-2 border-primary/40"
      />
    </motion.div>
  );
};
