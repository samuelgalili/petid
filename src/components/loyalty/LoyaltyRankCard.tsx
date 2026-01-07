import { motion } from "framer-motion";
import { ChevronLeft, Star, Trophy, Calendar, Sparkles, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLoyalty, LOYALTY_RANKS } from "@/hooks/useLoyalty";
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
          "flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r cursor-pointer shadow-lg",
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
        "relative overflow-hidden rounded-3xl cursor-pointer shadow-xl",
        className
      )}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Background gradient */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br",
        currentRank.color
      )} />
      
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-sm" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-sm" />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
      
      {/* Floating sparkles */}
      <motion.div 
        className="absolute top-4 left-8"
        animate={{ 
          opacity: [0.3, 1, 0.3],
          scale: [0.8, 1.2, 0.8],
          rotate: [0, 180, 360]
        }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <Sparkles className="w-4 h-4 text-white/40" />
      </motion.div>
      <motion.div 
        className="absolute bottom-12 right-8"
        animate={{ 
          opacity: [0.5, 1, 0.5],
          scale: [1, 1.3, 1]
        }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
      >
        <Star className="w-3 h-3 text-white/30" />
      </motion.div>
      
      <div className="relative p-6 text-white">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            <motion.div 
              className="relative"
              animate={{ 
                rotate: [0, -5, 5, -5, 0],
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                repeatDelay: 2 
              }}
            >
              {/* Icon glow effect */}
              <div className="absolute inset-0 bg-white/20 rounded-full blur-xl scale-150" />
              <div className="relative bg-white/20 backdrop-blur-sm rounded-2xl p-3 border border-white/20">
                <span className="text-3xl block">{currentRank.icon}</span>
              </div>
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold tracking-tight">{currentRank.name}</h3>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Zap className="w-5 h-5 text-yellow-300" />
                </motion.div>
              </div>
              <p className="text-sm text-white/80 mt-0.5">{currentRank.description}</p>
            </div>
          </div>
          <motion.div 
            className="bg-white/20 rounded-full p-1.5"
            whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.3)' }}
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <motion.div 
            className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 border border-white/10"
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-yellow-300" />
              <span className="text-xs text-white/70">נקודות</span>
            </div>
            <p className="text-2xl font-bold">{stats?.totalPoints || 0}</p>
          </motion.div>
          <motion.div 
            className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 border border-white/10"
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-300" />
              <span className="text-xs text-white/70">ימי ותק</span>
            </div>
            <p className="text-2xl font-bold">{tenureDays}</p>
          </motion.div>
        </div>

        {/* Progress to next rank */}
        {progress.nextRank && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between text-sm mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{progress.nextRank.icon}</span>
                <span className="font-medium">לדרגת {progress.nextRank.name}</span>
              </div>
              <div className="bg-white/20 px-2.5 py-1 rounded-full">
                <span className="font-bold text-sm">{Math.round(progress.progress)}%</span>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="relative h-3 bg-black/20 rounded-full overflow-hidden mb-3">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-white/90 to-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress.progress}%` }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
              />
            </div>
            
            {/* Requirements */}
            <div className="flex items-center justify-between text-xs">
              {progress.pointsNeeded > 0 && (
                <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-lg">
                  <Star className="w-3 h-3 text-yellow-300" />
                  <span>עוד {progress.pointsNeeded} נקודות</span>
                </div>
              )}
              {progress.daysNeeded > 0 && (
                <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-lg">
                  <Calendar className="w-3 h-3 text-blue-300" />
                  <span>עוד {progress.daysNeeded} ימי ותק</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Max rank indicator */}
        {!progress.nextRank && (
          <motion.div 
            className="flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-yellow-400/30 to-orange-400/30 rounded-2xl border border-white/20"
            animate={{ 
              boxShadow: ['0 0 20px rgba(255,255,255,0.1)', '0 0 40px rgba(255,255,255,0.2)', '0 0 20px rgba(255,255,255,0.1)']
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Trophy className="w-6 h-6 text-yellow-300" />
            <span className="font-bold text-lg">הגעת לדרגה הגבוהה ביותר!</span>
            <Trophy className="w-6 h-6 text-yellow-300" />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};