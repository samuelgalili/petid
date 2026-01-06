import { motion } from "framer-motion";
import { ChevronLeft, Star, Trophy, Calendar, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLoyalty, LOYALTY_RANKS } from "@/hooks/useLoyalty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoyaltyRankCardProps {
  className?: string;
  compact?: boolean;
}

export const LoyaltyRankCard = ({ className, compact = false }: LoyaltyRankCardProps) => {
  const navigate = useNavigate();
  const { stats, currentRank, tenureDays, progress, loading } = useLoyalty();

  if (loading) {
    return (
      <div className={cn("p-4 rounded-2xl bg-card", className)}>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-full mb-4" />
        <Skeleton className="h-2 w-full" />
      </div>
    );
  }

  if (compact) {
    return (
      <motion.div
        onClick={() => navigate('/rewards')}
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r cursor-pointer",
          currentRank.color,
          className
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="text-2xl">{currentRank.icon}</span>
        <div className="flex-1 text-white">
          <p className="font-bold text-sm">{currentRank.name}</p>
          <p className="text-xs opacity-90">{stats?.totalPoints || 0} נקודות</p>
        </div>
        <ChevronLeft className="w-5 h-5 text-white/70" />
      </motion.div>
    );
  }

  return (
    <motion.div
      onClick={() => navigate('/rewards')}
      className={cn(
        "relative overflow-hidden rounded-2xl cursor-pointer",
        className
      )}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Background gradient */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-90",
        currentRank.color
      )} />
      
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative p-5 text-white">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.span 
              className="text-4xl"
              animate={{ 
                rotate: [0, -10, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                repeatDelay: 3 
              }}
            >
              {currentRank.icon}
            </motion.span>
            <div>
              <h3 className="text-xl font-bold">{currentRank.name}</h3>
              <p className="text-sm opacity-90">{currentRank.description}</p>
            </div>
          </div>
          <ChevronLeft className="w-6 h-6 opacity-70" />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4" />
            <span className="font-semibold">{stats?.totalPoints || 0}</span>
            <span className="text-sm opacity-80">נקודות</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span className="font-semibold">{tenureDays}</span>
            <span className="text-sm opacity-80">ימי ותק</span>
          </div>
        </div>

        {/* Progress to next rank */}
        {progress.nextRank && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="opacity-90">
                התקדמות לדרגת {progress.nextRank.name}
              </span>
              <span className="font-semibold">{Math.round(progress.progress)}%</span>
            </div>
            <div className="relative h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress.progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              />
            </div>
            <div className="flex items-center justify-between text-xs opacity-80">
              {progress.pointsNeeded > 0 && (
                <span>עוד {progress.pointsNeeded} נקודות</span>
              )}
              {progress.daysNeeded > 0 && (
                <span>עוד {progress.daysNeeded} ימי ותק</span>
              )}
            </div>
          </div>
        )}

        {/* Max rank indicator */}
        {!progress.nextRank && (
          <div className="flex items-center justify-center gap-2 py-2 bg-white/20 rounded-lg">
            <Trophy className="w-5 h-5" />
            <span className="font-bold">הגעת לדרגה הגבוהה ביותר!</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
