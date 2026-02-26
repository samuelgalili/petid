import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, CheckCircle, XCircle, AlertTriangle, RefreshCw,
  Sparkles, Monitor, ChevronDown, ChevronUp, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const severityStyles: Record<string, string> = {
  critical: "text-destructive border-destructive/30 bg-destructive/10",
  error: "text-amber-600 border-amber-500/30 bg-amber-500/10",
  warning: "text-yellow-600 border-yellow-500/30 bg-yellow-500/10",
};

export const UIHealthPanel = () => {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  // Latest audit issues
  const { data: issues = [], isLoading } = useQuery({
    queryKey: ["ui-audit-issues"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ui_visual_audit_logs" as any)
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as any[];
    },
    refetchInterval: 60_000,
  });

  // Aggregated health
  const totalIssues = issues.length;
  const criticalCount = issues.filter((i: any) => i.severity === "critical" || i.is_critical_path).length;
  const healthScore = totalIssues === 0 ? 100 : Math.max(0, 100 - totalIssues * 10 - criticalCount * 25);
  const isPixelPerfect = totalIssues === 0;

  // Run audit mutation
  const runAudit = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ofek-visual-audit");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ui-audit-issues"] });
      toast.success(`Ofek סיים סריקה — ${data?.issues_found || 0} ממצאים`);
    },
    onError: (err: any) => toast.error(err.message || "שגיאה בסריקה"),
  });

  // Resolve issue
  const resolveIssue = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ui_visual_audit_logs" as any)
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ui-audit-issues"] }),
  });

  return (
    <Card className={cn(
      "overflow-hidden border-2 transition-all",
      isPixelPerfect
        ? "border-emerald-500/30 bg-emerald-500/5"
        : criticalCount > 0
        ? "border-destructive/30 bg-destructive/5"
        : "border-amber-500/20 bg-amber-500/5"
    )}>
      {/* Pixel Perfect shimmer */}
      {isPixelPerfect && (
        <motion.div
          className="h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
          animate={{ backgroundPosition: ["0% 0%", "200% 0%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{ backgroundSize: "200% 100%" }}
        />
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            isPixelPerfect
              ? "bg-emerald-500/15"
              : criticalCount > 0
              ? "bg-destructive/15"
              : "bg-amber-500/15"
          )}>
            {isPixelPerfect ? (
              <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}>
                <Sparkles className="w-5 h-5 text-emerald-500" />
              </motion.div>
            ) : (
              <Monitor className={cn("w-5 h-5", criticalCount > 0 ? "text-destructive" : "text-amber-500")} />
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Ofek — UI Health</h3>
              {isPixelPerfect ? (
                <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  ✨ Pixel Perfect
                </Badge>
              ) : (
                <Badge variant="outline" className={cn(
                  "text-[9px]",
                  criticalCount > 0
                    ? "bg-destructive/10 text-destructive border-destructive/30"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                )}>
                  {totalIssues} issues
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Visual Monitor — {healthScore}% health
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-xl font-black tabular-nums",
            isPixelPerfect ? "text-emerald-500" : criticalCount > 0 ? "text-destructive" : "text-amber-500"
          )}>
            {healthScore}%
          </span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t"
          >
            <div className="p-4 space-y-3">
              {/* Run Audit Button */}
              <Button
                onClick={() => runAudit.mutate()}
                disabled={runAudit.isPending}
                size="sm"
                className="w-full gap-2 text-xs"
              >
                {runAudit.isPending ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                {runAudit.isPending ? "Ofek סורק..." : "הפעל סריקת UI"}
              </Button>

              {/* Issues List */}
              {isLoading ? (
                <p className="text-xs text-muted-foreground text-center py-4">טוען...</p>
              ) : totalIssues === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                  <p className="text-xs font-medium">כל האלמנטים תקינים ✨</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {issues.map((issue: any) => (
                    <div
                      key={issue.id}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded-lg border text-[10px]",
                        severityStyles[issue.severity] || "border-border"
                      )}
                    >
                      {issue.severity === "critical" ? (
                        <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-destructive" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">
                          {issue.element_label} — {issue.route}
                        </p>
                        <p className="text-muted-foreground mt-0.5 line-clamp-2">
                          {issue.description}
                        </p>
                        {issue.is_critical_path && (
                          <Badge variant="outline" className="text-[8px] mt-1 bg-destructive/10 text-destructive border-destructive/30">
                            Critical Path
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[9px]"
                        onClick={() => resolveIssue.mutate(issue.id)}
                      >
                        ✓
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
