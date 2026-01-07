import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AdminStatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  gradient?: string;
  change?: number | string | null;
  index?: number;
}

export const AdminStatsCard = ({
  title,
  value,
  icon: Icon,
  gradient = "from-primary to-primary/80",
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
      <Card className="relative overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5`} />
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
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
