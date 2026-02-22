import { motion, AnimatePresence } from 'framer-motion';
import { PawPrint } from 'lucide-react';

interface HeartBurstAnimationProps {
  isVisible: boolean;
}

export const HeartBurstAnimation = ({ isVisible }: HeartBurstAnimationProps) => {
  const miniPaws = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    angle: (i * 45) * (Math.PI / 180),
    delay: i * 0.02,
    size: Math.random() * 8 + 8,
    rotation: Math.random() * 60 - 30,
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
          {/* Main Paw */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ 
              scale: [0, 1.3, 1],
              rotate: [-20, 5, 0],
            }}
            transition={{ 
              duration: 0.5,
              ease: [0.175, 0.885, 0.32, 1.275]
            }}
          >
            <PawPrint 
              className="w-24 h-24 text-white fill-white drop-shadow-2xl" 
              strokeWidth={0.5}
            />
          </motion.div>

          {/* Mini Paws Burst */}
          {miniPaws.map((paw) => (
            <motion.div
              key={paw.id}
              initial={{ 
                opacity: 0, 
                scale: 0,
                x: 0,
                y: 0,
                rotate: 0,
              }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0, 1, 0.5],
                x: Math.cos(paw.angle) * 80,
                y: Math.sin(paw.angle) * 80,
                rotate: paw.rotation,
              }}
              transition={{ 
                duration: 0.6,
                delay: paw.delay + 0.1,
                ease: "easeOut"
              }}
              className="absolute"
            >
              <PawPrint 
                className="text-white fill-white drop-shadow-lg" 
                style={{ width: paw.size, height: paw.size }}
                strokeWidth={0.5}
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
