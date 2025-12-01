import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { fadeIn } from "@/lib/animations";

interface StreakIndicatorProps {
  currentStreak: number;
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
}

const levelColors = {
  bronze: "text-orange-600",
  silver: "text-gray-400",
  gold: "text-yellow-500",
  platinum: "text-purple-500"
};

const levelGradients = {
  bronze: "from-orange-400 to-orange-600",
  silver: "from-gray-300 to-gray-500",
  gold: "from-yellow-400 to-yellow-600",
  platinum: "from-purple-400 to-purple-600"
};

const StreakIndicator = ({ currentStreak, level }: StreakIndicatorProps) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="flex items-center gap-2 bg-card rounded-full px-4 py-2 shadow-sm border border-border"
    >
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          rotate: [0, 10, -10, 0]
        }}
        transition={{ 
          duration: 0.5,
          repeat: Infinity,
          repeatDelay: 2
        }}
      >
        <Flame className={`w-5 h-5 ${levelColors[level]}`} fill="currentColor" />
      </motion.div>
      
      <div className="flex flex-col items-start">
        <div className="text-sm font-bold">{currentStreak} ימים</div>
        <div className={`text-xs font-semibold bg-gradient-to-r ${levelGradients[level]} bg-clip-text text-transparent`}>
          {level === 'bronze' && 'רמת ארד'}
          {level === 'silver' && 'רמת כסף'}
          {level === 'gold' && 'רמת זהב'}
          {level === 'platinum' && 'רמת פלטינום'}
        </div>
      </div>
    </motion.div>
  );
};

export default StreakIndicator;
