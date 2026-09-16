import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * NOTE: nothing imports this. It is a near-duplicate of AdminStatCard in
 * AdminStyles.tsx, one letter apart, which is how someone ends up editing the
 * wrong one. Kept in the new language rather than left as a landmine; worth
 * deleting once that is confirmed.
 */
interface AdminStatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  /** Icon accent, e.g. "text-emerald-600 bg-emerald-500/10". */
  accent?: string;
  change?: number | string | null;
  index?: number;
}

export const AdminStatsCard = ({
  title,
  value,
  icon: Icon,
  accent = "text-primary bg-primary/10",
  change,
  index = 0,
}: AdminStatsCardProps) => {
  const numericChange = typeof change === 'string' ? parseFloat(change) : change;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="relative overflow-hidden border border-mipo-line bg-mipo-surface transition-colors">
        <CardContent className="p-4 relative">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              {numericChange !== null && numericChange !== undefined && numericChange !== 0 && (
                <div className={cn(
                  "flex items-center gap-1 text-xs mt-1",
                  numericChange > 0 ? "text-emerald-500" : "text-red-500"
                )}>
                  {numericChange > 0 ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  <span>{Math.abs(numericChange)}%</span>
                </div>
              )}
            </div>
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", accent)}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
