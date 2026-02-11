import { motion } from "framer-motion";
import { Award, Star, Trophy, Sparkles, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

interface ExpertiseLevelCardProps {
  points: number;
  className?: string;
}

const LEVELS = [
  { name: "מתחיל", nameEn: "Beginner", minPoints: 0, maxPoints: 99, icon: Star, color: "from-muted to-muted-foreground/50" },
  { name: "חובב", nameEn: "Amateur", minPoints: 100, maxPoints: 299, icon: Award, color: "from-amber-500/80 to-amber-600" },
  { name: "מומחה", nameEn: "Expert", minPoints: 300, maxPoints: 599, icon: Trophy, color: "from-primary to-primary-dark" },
  { name: "אלוף", nameEn: "Champion", minPoints: 600, maxPoints: 999, icon: Sparkles, color: "from-accent to-accent-foreground" },
  { name: "אגדה", nameEn: "Legend", minPoints: 1000, maxPoints: Infinity, icon: Sparkles, color: "from-yellow-400 via-amber-500 to-orange-500" }
];

export const ExpertiseLevelCard = ({ points, className = "" }: ExpertiseLevelCardProps) => {
  const navigate = useNavigate();
  
  // Find current level
  const currentLevel = LEVELS.find(level => points >= level.minPoints && points <= level.maxPoints) || LEVELS[0];
  const currentLevelIndex = LEVELS.indexOf(currentLevel);
  const nextLevel = LEVELS[currentLevelIndex + 1];
  
  // Calculate progress to next level
  const pointsInCurrentLevel = points - currentLevel.minPoints;
  const pointsNeededForNextLevel = nextLevel ? nextLevel.minPoints - currentLevel.minPoints : 100;
  const progress = nextLevel ? Math.min((pointsInCurrentLevel / pointsNeededForNextLevel) * 100, 100) : 100;
  const pointsToNextLevel = nextLevel ? nextLevel.minPoints - points : 0;

  const LevelIcon = currentLevel.icon;

  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl border border-border/50 ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => navigate('/')}
    >
      {/* Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${currentLevel.color} opacity-10`} />
      
      {/* Animated shimmer effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
      />

      <div className="relative p-4">
        {/* Main Row - Icon, Level, Points */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Star Icon */}
            <motion.div 
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${currentLevel.color} flex items-center justify-center shadow-md`}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Star className="w-5 h-5 text-white fill-white drop-shadow" />
            </motion.div>
            
            {/* Level Name */}
            <div className="flex flex-col">
              <span className="text-base font-bold text-foreground">{currentLevel.name}</span>
              <span className="text-xs text-muted-foreground">{currentLevel.nameEn}</span>
            </div>
          </div>

          {/* Points Display */}
          <div className="flex items-center gap-2">
            <motion.span 
              className="text-2xl font-bold text-foreground"
              key={points}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
            >
              {points.toLocaleString()}
            </motion.span>
            <span className="text-xs text-muted-foreground">נקודות</span>
            <ChevronLeft className="w-4 h-4 text-muted-foreground mr-1" />
          </div>
        </div>

        {/* Progress Bar */}
        {nextLevel && (
          <div className="mt-3 space-y-1.5">
            <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className={`absolute inset-y-0 right-0 rounded-full bg-gradient-to-l ${currentLevel.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, delay: 0.3 }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-muted-foreground">
              <span>עוד {pointsToNextLevel} לרמה הבאה</span>
              <span className="flex items-center gap-1">
                <nextLevel.icon className="w-2.5 h-2.5" />
                {nextLevel.name}
              </span>
            </div>
          </div>
        )}

        {/* Max level indicator */}
        {!nextLevel && (
          <div className="flex items-center justify-center gap-2 mt-3 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
            <span className="font-medium bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
              הגעת לרמה הגבוהה ביותר!
            </span>
            <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
          </div>
        )}
      </div>
    </motion.div>
  );
};
