import { motion } from "framer-motion";
import { ChevronLeft, Star, Trophy, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLoyalty } from "@/hooks/useLoyalty";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoyaltyRankCardProps {
  className?: string;
  compact?: boolean;
}

export const LoyaltyRankCard = ({ className, compact = false }: LoyaltyRankCardProps) => {
  const navigate = useNavigate();
  const { stats, currentRank, progress, loading } = useLoyalty();

  if (loading) {
    return (
      <div className={cn("p-3 rounded-xl bg-muted/50", className)}>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (compact) {
    return (
      <motion.div
      onClick={() => navigate('/my-progress')}
        className={cn(
          "flex items-center gap-2.5 p-2.5 rounded-xl bg-card border border-border cursor-pointer",
          className
        )}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <span className="text-lg">{currentRank.icon}</span>
        <div className="flex-1">
          <p className="font-semibold text-sm text-foreground">{currentRank.name}</p>
          <p className="text-xs text-muted-foreground">{stats?.totalPoints || 0} נקודות</p>
        </div>
        <ChevronLeft className="w-4 h-4 text-muted-foreground" />
      </motion.div>
    );
  }

  return (
    <motion.div
      onClick={() => navigate('/my-progress')}
      className={cn(
        "relative rounded-xl border border-border bg-card overflow-hidden cursor-pointer",
        className
      )}
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
    >
      {/* Subtle gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      
      <div className="p-3.5">
        {/* Main row */}
        <div className="flex items-center gap-3">
          {/* Icon with subtle background */}
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-lg">{currentRank.icon}</span>
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-foreground">{currentRank.name}</h3>
              <Gift className="w-3.5 h-3.5 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground truncate">{currentRank.description}</p>
          </div>
          
          {/* Points */}
          <div className="flex items-center gap-2">
            <div className="text-left">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                <p className="text-base font-bold text-foreground">{stats?.totalPoints || 0}</p>
              </div>
              <p className="text-[10px] text-muted-foreground">נקודות</p>
            </div>
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
        
        {/* Progress bar */}
        {progress.nextRank && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center justify-between text-[10px] mb-1.5">
              <div className="flex items-center gap-1 text-muted-foreground">
                <span>{progress.nextRank.icon}</span>
                <span>לדרגת {progress.nextRank.name}</span>
              </div>
              <span className="font-semibold text-primary">{Math.round(progress.progress)}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress.progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        )}

        {/* Max rank */}
        {!progress.nextRank && (
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>דרגה מקסימלית!</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};