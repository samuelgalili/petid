import { motion, AnimatePresence } from "framer-motion";

interface Achievement {
  id: number;
  name: string;
  threshold: number;
  icon: string;
  color: string;
  description: string;
}

interface AchievementDialogProps {
  achievement: Achievement | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AchievementDialog = ({ achievement, isOpen, onClose }: AchievementDialogProps) => {
  if (!achievement) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 50 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className={`bg-gradient-to-br ${achievement.color} p-8 rounded-3xl shadow-2xl max-w-sm w-full border-4 border-white relative overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated Background Pattern */}
            <motion.div
              className="absolute inset-0 opacity-20"
              animate={{ rotate: [0, 360] }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{
                backgroundImage: 'radial-gradient(circle at 20% 50%, white 2px, transparent 2px)',
                backgroundSize: '30px 30px'
              }}
            />

            {/* Content */}
            <div className="relative z-10 text-center text-white">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="text-8xl mb-4"
              >
                {achievement.icon}
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-black mb-2 font-jakarta drop-shadow-lg"
              >
                הישג חדש! 🎉
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xl font-bold mb-1 font-jakarta"
              >
                {achievement.name}
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-sm opacity-90 mb-6 font-jakarta"
              >
                {achievement.description}
              </motion.p>

              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="bg-card text-foreground px-8 py-3 rounded-full font-bold text-sm shadow-xl hover:shadow-2xl transition-all font-jakarta"
              >
                מעולה! 🚀
              </motion.button>
            </div>

            {/* Floating Particles */}
            <motion.div
              className="absolute top-1/4 left-1/4 w-4 h-4 bg-white rounded-full"
              animate={{
                y: [-20, -40, -20],
                opacity: [0.5, 1, 0.5],
                scale: [0.8, 1.2, 0.8]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="absolute top-1/3 right-1/4 w-3 h-3 bg-white rounded-full"
              animate={{
                y: [-15, -35, -15],
                opacity: [0.6, 1, 0.6],
                scale: [0.9, 1.1, 0.9]
              }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
            />
            <motion.div
              className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-white rounded-full"
              animate={{
                y: [-10, -30, -10],
                opacity: [0.7, 1, 0.7],
                scale: [1, 1.3, 1]
              }}
              transition={{ duration: 3, repeat: Infinity, delay: 1 }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
