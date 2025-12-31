import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';

interface HeartBurstAnimationProps {
  isVisible: boolean;
}

export const HeartBurstAnimation = ({ isVisible }: HeartBurstAnimationProps) => {
  // Generate random positions for mini hearts
  const miniHearts = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    angle: (i * 45) * (Math.PI / 180),
    delay: i * 0.02,
    size: Math.random() * 8 + 8, // 8-16px
  }));

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        >
          {/* Main Heart */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ 
              scale: [0, 1.3, 1],
            }}
            transition={{ 
              duration: 0.4,
              ease: [0.175, 0.885, 0.32, 1.275] // Custom easing for bounce
            }}
          >
            <Heart 
              className="w-24 h-24 text-white fill-white drop-shadow-2xl" 
              strokeWidth={0}
            />
          </motion.div>

          {/* Mini Hearts Burst */}
          {miniHearts.map((heart) => (
            <motion.div
              key={heart.id}
              initial={{ 
                opacity: 0, 
                scale: 0,
                x: 0,
                y: 0 
              }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0, 1, 0.5],
                x: Math.cos(heart.angle) * 80,
                y: Math.sin(heart.angle) * 80,
              }}
              transition={{ 
                duration: 0.6,
                delay: heart.delay + 0.1,
                ease: "easeOut"
              }}
              className="absolute"
            >
              <Heart 
                className="text-white fill-white drop-shadow-lg" 
                style={{ width: heart.size, height: heart.size }}
                strokeWidth={0}
              />
            </motion.div>
          ))}

          {/* Ring Effect */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0.8 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute w-32 h-32 rounded-full border-4 border-white/50"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
