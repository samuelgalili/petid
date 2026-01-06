import { motion } from "framer-motion";
import { Lock, Check } from "lucide-react";
import { LOYALTY_RANKS } from "@/hooks/useLoyalty";
import { cn } from "@/lib/utils";

interface LoyaltyRankProgressProps {
  currentRankLevel: number;
  totalPoints: number;
  tenureDays: number;
  className?: string;
}

export const LoyaltyRankProgress = ({ 
  currentRankLevel, 
  totalPoints, 
  tenureDays,
  className 
}: LoyaltyRankProgressProps) => {
  return (
    <div className={cn("space-y-3", className)}>
      {LOYALTY_RANKS.map((rank, index) => {
        const isUnlocked = currentRankLevel >= rank.level;
        const isCurrent = currentRankLevel === rank.level;
        const meetsPoints = totalPoints >= rank.minPoints;
        const meetsTenure = tenureDays >= rank.minTenureDays;
        
        return (
          <motion.div
            key={rank.level}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "relative p-4 rounded-xl border-2 transition-all",
              isCurrent && "border-primary bg-primary/5 shadow-md",
              isUnlocked && !isCurrent && "border-green-500/50 bg-green-50/50 dark:bg-green-950/20",
              !isUnlocked && "border-border bg-muted/30 opacity-70"
            )}
          >
            <div className="flex items-center gap-4">
              {/* Rank icon */}
              <div className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center text-2xl",
                isUnlocked ? `bg-gradient-to-br ${rank.color}` : "bg-muted"
              )}>
                {isUnlocked ? (
                  <span>{rank.icon}</span>
                ) : (
                  <Lock className="w-6 h-6 text-muted-foreground" />
                )}
              </div>

              {/* Rank info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className={cn(
                    "font-bold text-lg",
                    isUnlocked ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {rank.name}
                  </h4>
                  {isUnlocked && (
                    <Check className="w-5 h-5 text-green-500" />
                  )}
                  {isCurrent && (
                    <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                      הדרגה שלך
                    </span>
                  )}
                </div>
                <p className={cn(
                  "text-sm",
                  isUnlocked ? "text-muted-foreground" : "text-muted-foreground/70"
                )}>
                  {rank.description}
                </p>
              </div>
            </div>

            {/* Requirements */}
            {!isUnlocked && (
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-4 text-sm">
                <div className={cn(
                  "flex items-center gap-1",
                  meetsPoints ? "text-green-600" : "text-muted-foreground"
                )}>
                  {meetsPoints ? <Check className="w-4 h-4" /> : null}
                  <span>{rank.minPoints} נקודות</span>
                </div>
                <div className={cn(
                  "flex items-center gap-1",
                  meetsTenure ? "text-green-600" : "text-muted-foreground"
                )}>
                  {meetsTenure ? <Check className="w-4 h-4" /> : null}
                  <span>{rank.minTenureDays} ימי ותק</span>
                </div>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
