import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, Bug, CheckCircle, Clock, Database,
  Globe, Server, X, ChevronDown, ChevronUp, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

const severityConfig: Record<string, { icon: typeof Bug; color: string; bg: string; label: string }> = {
  critical: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", label: "קריטי" },
  error: { icon: Bug, color: "text-amber-500", bg: "bg-amber-500/10", label: "שגיאה" },
  warning: { icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "אזהרה" },
};

const sourceConfig: Record<string, { icon: typeof Globe; label: string }> = {
  client: { icon: Globe, label: "Client" },
  edge_function: { icon: Server, label: "Edge Function" },
  database: { icon: Database, label: "Database" },
};

const statusColors: Record<string, string> = {
  open: "bg-red-500/10 text-red-600",
  triaging: "bg-amber-500/10 text-amber-600",
  resolved: "bg-emerald-500/10 text-emerald-600",
  dismissed: "bg-muted text-muted-foreground",
};

export const SystemArchitectPanel = () => {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [triageNotes, setTriageNotes] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("open");

  const { data: errors = [], isLoading } = useQuery({
    queryKey: ["system-error-logs", filterSeverity, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from("system_error_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (filterStatus !== "all") query = query.eq("status", filterStatus);
      if (filterSeverity !== "all") query = query.eq("severity", filterSeverity);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 15_000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const update: any = {
        status,
        ...(notes && { triage_notes: notes }),
        ...(status === "resolved" && { resolved_at: new Date().toISOString() }),
      };
      const { error } = await supabase
        .from("system_error_logs" as any)
        .update(update)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-error-logs"] });
      toast.success("סטטוס עודכן");
      setExpandedId(null);
      setTriageNotes("");
    },
  });

  const openCount = (errors as any[]).filter((e: any) => e.status === "open").length;
  const criticalCount = (errors as any[]).filter((e: any) => e.severity === "critical" && e.status === "open").length;

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold">{openCount}</p>
          <p className="text-[10px] text-muted-foreground">שגיאות פתוחות</p>
        </Card>
        <Card className={cn("p-3 text-center", criticalCount > 0 && "border-red-500/30 bg-red-500/5")}>
          <p className={cn("text-2xl font-bold", criticalCount > 0 && "text-red-500")}>{criticalCount}</p>
          <p className="text-[10px] text-muted-foreground">קריטיות</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-2xl font-bold">{(errors as any[]).length}</p>
          <p className="text-[10px] text-muted-foreground">סה״כ מוצג</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        {["all", "open", "triaging", "resolved", "dismissed"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={cn(
              "text-[10px] px-2.5 py-1 rounded-full border transition-colors",
              filterStatus === s
                ? "bg-primary/10 text-primary border-primary/30"
                : "text-muted-foreground border-border hover:bg-muted/50"
            )}
          >
            {s === "all" ? "הכל" : s === "open" ? "פתוח" : s === "triaging" ? "בטיפול" : s === "resolved" ? "נפתר" : "נדחה"}
          </button>
        ))}
        <span className="text-muted-foreground text-[10px]">|</span>
        {["all", "critical", "error", "warning"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterSeverity(s)}
            className={cn(
              "text-[10px] px-2.5 py-1 rounded-full border transition-colors",
              filterSeverity === s
                ? "bg-primary/10 text-primary border-primary/30"
                : "text-muted-foreground border-border hover:bg-muted/50"
            )}
          >
            {s === "all" ? "כל הרמות" : severityConfig[s]?.label || s}
          </button>
        ))}
      </div>

      {/* Error List */}
      {isLoading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">טוען שגיאות...</div>
      ) : (errors as any[]).length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
          <p className="text-sm font-medium">אין שגיאות פתוחות 🎉</p>
          <p className="text-xs text-muted-foreground mt-1">המערכת פועלת תקין</p>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {(errors as any[]).map((err: any) => {
              const sev = severityConfig[err.severity] || severityConfig.error;
              const src = sourceConfig[err.error_source] || sourceConfig.client;
              const SevIcon = sev.icon;
              const SrcIcon = src.icon;
              const isExpanded = expandedId === err.id;

              return (
                <motion.div
                  key={err.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                >
                  <Card className={cn(
                    "p-3 cursor-pointer hover:shadow-sm transition-all",
                    err.severity === "critical" && err.status === "open" && "border-red-500/30"
                  )}>
                    {/* Header Row */}
                    <div
                      className="flex items-start gap-3"
                      onClick={() => setExpandedId(isExpanded ? null : err.id)}
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", sev.bg)}>
                        <SevIcon className={cn("w-4 h-4", sev.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{err.message}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className={cn("text-[9px]", statusColors[err.status])}>
                            {err.status}
                          </Badge>
                          <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                            <SrcIcon className="w-2.5 h-2.5" /> {src.label}
                          </span>
                          {err.component && (
                            <span className="text-[9px] text-muted-foreground font-mono bg-muted px-1 rounded">
                              {err.component}
                            </span>
                          )}
                          {err.route && (
                            <span className="text-[9px] text-muted-foreground">{err.route}</span>
                          )}
                          <span className="text-[9px] text-muted-foreground">
                            ×{err.occurrence_count}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                          {new Date(err.last_seen_at).toLocaleString("he-IL", {
                            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="mt-3 pt-3 border-t space-y-3"
                      >
                        {err.stack_trace && (
                          <pre className="text-[9px] bg-muted/50 p-2 rounded-lg overflow-x-auto max-h-32 font-mono">
                            {err.stack_trace}
                          </pre>
                        )}

                        {err.triage_notes && (
                          <div className="text-xs bg-amber-500/5 border border-amber-500/20 rounded-lg p-2">
                            <span className="font-semibold text-amber-600">הערות טיפול: </span>
                            {err.triage_notes}
                          </div>
                        )}

                        <Textarea
                          value={triageNotes}
                          onChange={(e) => setTriageNotes(e.target.value)}
                          placeholder="הערות טיפול..."
                          className="text-xs min-h-[60px]"
                        />

                        <div className="flex gap-2 flex-wrap">
                          {err.status === "open" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[10px] h-7 border-amber-500/30 text-amber-600"
                              onClick={() => updateStatus.mutate({ id: err.id, status: "triaging", notes: triageNotes || undefined })}
                            >
                              📋 התחל טיפול
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-7 border-emerald-500/30 text-emerald-600"
                            onClick={() => updateStatus.mutate({ id: err.id, status: "resolved", notes: triageNotes || undefined })}
                          >
                            ✅ סמן כנפתר
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[10px] h-7 text-muted-foreground"
                            onClick={() => updateStatus.mutate({ id: err.id, status: "dismissed", notes: triageNotes || undefined })}
                          >
                            <X className="w-3 h-3 mr-1" /> דחה
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default SystemArchitectPanel;
