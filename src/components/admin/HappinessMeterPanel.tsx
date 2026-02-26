import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Star, SmilePlus, Meh, AlertTriangle, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * HappinessMeterPanel — Admin sentiment dashboard
 * Aggregates star ratings + categorizes text feedback
 */
export const HappinessMeterPanel = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["happiness-meter", refreshKey],
    queryFn: async () => {
      const { data: feedback, error } = await supabase
        .from("user_feedback" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      const items = (feedback || []) as any[];

      // Aggregate
      const total = items.length;
      const avgRating = total > 0
        ? items.reduce((sum: number, f: any) => sum + (f.rating || 0), 0) / total
        : 0;

      const positive = items.filter((f: any) => f.sentiment === "happy" || (!f.sentiment && f.rating >= 4)).length;
      const needsAttention = items.filter((f: any) => f.sentiment === "neutral" || (!f.sentiment && f.rating === 3)).length;
      const urgentFix = items.filter((f: any) => f.sentiment === "angry" || (!f.sentiment && f.rating <= 2)).length;

      const recent = items.slice(0, 8);

      return { total, avgRating, positive, needsAttention, urgentFix, recent };
    },
  });

  const healthPercent = data ? Math.round((data.avgRating / 5) * 100) : 0;

  const getHealthColor = (pct: number) => {
    if (pct >= 80) return "text-emerald-500";
    if (pct >= 50) return "text-amber-500";
    return "text-destructive";
  };

  const sentimentIcon = (sentiment: string, rating: number) => {
    if (sentiment === "angry" || rating <= 2) return <AlertTriangle className="w-3.5 h-3.5 text-destructive" />;
    if (sentiment === "neutral" || rating === 3) return <Meh className="w-3.5 h-3.5 text-amber-500" />;
    return <SmilePlus className="w-3.5 h-3.5 text-emerald-500" />;
  };

  const sentimentLabel = (sentiment: string, rating: number) => {
    if (sentiment === "angry" || rating <= 2) return "Urgent Fix";
    if (sentiment === "neutral" || rating === 3) return "Needs Attention";
    return "Positive";
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <SmilePlus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Happiness Meter — מד שביעות רצון</h3>
            <p className="text-[10px] text-muted-foreground">ניתוח פידבקים ותחושות משתמשים</p>
          </div>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4 text-muted-foreground", isLoading && "animate-spin")} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Score Ring */}
        <div className="flex items-center gap-6">
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                className="stroke-muted/30"
                strokeWidth="3"
              />
              <motion.path
                d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                className={cn("transition-colors", healthPercent >= 80 ? "stroke-emerald-500" : healthPercent >= 50 ? "stroke-amber-500" : "stroke-destructive")}
                strokeWidth="3"
                strokeDasharray={`${healthPercent}, 100`}
                strokeLinecap="round"
                initial={{ strokeDasharray: "0, 100" }}
                animate={{ strokeDasharray: `${healthPercent}, 100` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-lg font-bold", getHealthColor(healthPercent))}>
                {healthPercent}%
              </span>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-xl bg-emerald-500/10">
              <p className="text-lg font-bold text-emerald-600">{data?.positive ?? 0}</p>
              <p className="text-[9px] text-muted-foreground">Positive</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-amber-500/10">
              <p className="text-lg font-bold text-amber-600">{data?.needsAttention ?? 0}</p>
              <p className="text-[9px] text-muted-foreground">Attention</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-destructive/10">
              <p className="text-lg font-bold text-destructive">{data?.urgentFix ?? 0}</p>
              <p className="text-[9px] text-muted-foreground">Urgent</p>
            </div>
          </div>
        </div>

        {/* Avg stars */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={cn(
                  "w-3.5 h-3.5",
                  s <= Math.round(data?.avgRating ?? 0)
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/20"
                )}
              />
            ))}
          </div>
          <span>{(data?.avgRating ?? 0).toFixed(1)} ממוצע ({data?.total ?? 0} פידבקים)</span>
        </div>

        {/* Recent feedback */}
        {(data?.recent?.length ?? 0) > 0 && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {data!.recent.map((f: any) => (
              <div
                key={f.id}
                className="flex items-start gap-2 p-2 rounded-xl bg-muted/20 text-xs"
              >
                {sentimentIcon(f.sentiment, f.rating)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={cn(
                            "w-2.5 h-2.5",
                            s <= f.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"
                          )}
                        />
                      ))}
                    </div>
                    <Badge variant="outline" className="text-[8px] px-1 py-0">
                      {sentimentLabel(f.sentiment, f.rating)}
                    </Badge>
                  </div>
                  {f.message && (
                    <p className="text-muted-foreground mt-0.5 line-clamp-2">{f.message}</p>
                  )}
                  <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                    {f.route} · {new Date(f.created_at).toLocaleString("he-IL", {
                      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
