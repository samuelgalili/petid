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
      
      <div className="relative p-4 text-white">
        {/* Main content row */}
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2 border border-white/10">
            <span className="text-xl block">{currentRank.icon}</span>
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-bold">{currentRank.name}</h3>
              <Zap className="w-3.5 h-3.5 text-yellow-300" />
            </div>
            <p className="text-xs text-white/80 truncate">{currentRank.description}</p>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-3 text-center">
            <div className="text-right">
              <p className="text-lg font-bold">{stats?.totalPoints || 0}</p>
              <p className="text-[10px] text-white/70">נקודות</p>
            </div>
            <ChevronLeft className="w-4 h-4 text-white/60" />
          </div>
        </div>
        
        {/* Progress bar */}
        {progress.nextRank && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <div className="flex items-center gap-1">
                <span>{progress.nextRank.icon}</span>
                <span className="text-white/80">לדרגת {progress.nextRank.name}</span>
              </div>
              <span className="font-medium">{Math.round(progress.progress)}%</span>
            </div>
            <div className="h-1.5 bg-black/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white/90 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress.progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        )}

        {/* Max rank indicator */}
        {!progress.nextRank && (
          <div className="mt-3 flex items-center justify-center gap-1.5 py-1.5 bg-white/10 rounded-lg text-xs">
            <Trophy className="w-3.5 h-3.5 text-yellow-300" />
            <span className="font-medium">דרגה מקסימלית!</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};