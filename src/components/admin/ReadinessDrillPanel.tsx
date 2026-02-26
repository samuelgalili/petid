import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Shield, CheckCircle, XCircle, RefreshCw, Zap,
  HeartPulse, Activity, Database, Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusGlow = {
  green: "shadow-[0_0_30px_rgba(34,197,94,0.25)]",
  red: "shadow-[0_0_30px_rgba(239,68,68,0.25)]",
};

export const ReadinessDrillPanel = () => {
  const queryClient = useQueryClient();

  const { data: latestDrill, isLoading } = useQuery({
    queryKey: ["readiness-drill-latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("readiness_drill_results" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    refetchInterval: 60_000,
  });

  const runDrill = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("readiness-drill");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["readiness-drill-latest"] });
      toast.success(`Drill complete — ${data?.summary || "Done"}`);
    },
    onError: (err: any) => toast.error(err.message || "Drill failed"),
  });

  const status = latestDrill?.overall_status || "green";
  const score = latestDrill?.stability_score ?? 100;
  const isGreen = status === "green";
  const agentResults = (latestDrill?.agent_results || []) as any[];

  return (
    <div className="space-y-4">
      {/* ─── Pulse Header ─── */}
      <Card className={cn(
        "relative p-5 overflow-hidden border-2 transition-all",
        isGreen ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5",
        statusGlow[status as keyof typeof statusGlow],
      )}>
        {/* Pulse wave animation */}
        <div className="absolute inset-0 pointer-events-none">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={cn(
                "absolute inset-0 rounded-lg border-2",
                isGreen ? "border-emerald-500/20" : "border-destructive/20",
              )}
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{
                duration: 3,
                delay: i * 1,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <HeartPulse className={cn("w-8 h-8", isGreen ? "text-emerald-500" : "text-destructive")} />
            </motion.div>
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                System Health — 3 AM Drill
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px]",
                    isGreen
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                      : "bg-destructive/10 text-destructive border-destructive/30"
                  )}
                >
                  {isGreen ? "Combat Ready" : "Needs Attention"}
                </Badge>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {latestDrill?.details || "No drill results yet"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className={cn("text-2xl font-black tabular-nums", isGreen ? "text-emerald-500" : "text-destructive")}>
                {score}%
              </p>
              <p className="text-[9px] text-muted-foreground">Stability</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-[10px]"
              onClick={() => runDrill.mutate()}
              disabled={runDrill.isPending}
            >
              {runDrill.isPending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              {runDrill.isPending ? "Running..." : "Run Drill Now"}
            </Button>
          </div>
        </div>

        {/* Animated pulse bar */}
        <div className="relative z-10 mt-4 w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", isGreen ? "bg-emerald-500" : "bg-destructive")}
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
          {/* Scanning light effect */}
          <motion.div
            className={cn(
              "absolute top-0 h-full w-16 rounded-full",
              isGreen
                ? "bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent"
                : "bg-gradient-to-r from-transparent via-destructive/40 to-transparent"
            )}
            animate={{ x: ["-64px", "calc(100vw)"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </Card>

      {/* ─── Agent Results Grid ─── */}
      {agentResults.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {agentResults.map((agent: any, i: number) => {
            const isPassed = agent.status === "pass";
            const isHealed = agent.status === "healed";
            const Icon = agent.slug?.startsWith("Edge") ? Activity : Bot;

            return (
              <motion.div
                key={agent.slug + i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className={cn(
                  "p-3 text-center transition-all",
                  isPassed && "border-emerald-500/20",
                  isHealed && "border-amber-500/20 bg-amber-500/5",
                  !isPassed && !isHealed && "border-destructive/20 bg-destructive/5",
                )}>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    {isPassed ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    ) : isHealed ? (
                      <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-destructive" />
                    )}
                    <span className="text-[10px] font-semibold truncate">{agent.name}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground">{agent.response_ms}ms</p>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ─── Integrity Checks ─── */}
      {latestDrill?.integrity_results && Object.keys(latestDrill.integrity_results).length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-xs font-semibold">Data Integrity</h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(latestDrill.integrity_results).map(([key, val]: [string, any]) => (
              <div key={key} className="flex items-center justify-between text-[10px] p-2 bg-muted/30 rounded">
                <span className="text-muted-foreground">{key.replace(/_/g, " ")}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px]",
                    val.status === "pass"
                      ? "text-emerald-600 border-emerald-500/30"
                      : val.status === "warn"
                      ? "text-amber-600 border-amber-500/30"
                      : "text-destructive border-destructive/30"
                  )}
                >
                  {val.status === "pass" ? "✓" : val.count} {val.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ─── Timestamp ─── */}
      {latestDrill?.created_at && (
        <p className="text-[9px] text-muted-foreground text-center">
          Last drill: {new Date(latestDrill.created_at).toLocaleString("he-IL")}
        </p>
      )}
    </div>
  );
};
