import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu, Sparkles, GitPullRequest, Eye, EyeOff, CheckCircle,
  XCircle, RefreshCw, Shield, Activity, Zap, Code2,
  ChevronDown, ChevronUp, ExternalLink, Undo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Category Config ─────────────────────────────────────────
const categoryConfig: Record<string, { label: string; emoji: string; glow: string }> = {
  ui: { label: "UI", emoji: "🎨", glow: "shadow-[0_0_15px_rgba(34,197,94,0.2)]" },
  performance: { label: "ביצועים", emoji: "⚡", glow: "shadow-[0_0_15px_rgba(234,179,8,0.2)]" },
  security: { label: "אבטחה", emoji: "🔒", glow: "shadow-[0_0_15px_rgba(239,68,68,0.2)]" },
  ux: { label: "UX", emoji: "🧠", glow: "shadow-[0_0_15px_rgba(99,102,241,0.2)]" },
  data: { label: "Data", emoji: "📊", glow: "shadow-[0_0_15px_rgba(6,182,212,0.2)]" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "טיוטה", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  approved: { label: "מאושר", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  deployed: { label: "נפרס", color: "bg-green-500/15 text-green-400 border-green-500/30" },
  rolled_back: { label: "Rollback", color: "bg-red-500/15 text-red-400 border-red-500/30" },
  dismissed: { label: "נדחה", color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
};

const AdminArchitectConsole = () => {
  const queryClient = useQueryClient();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showCode, setShowCode] = useState<Record<string, boolean>>({});
  const [filterStatus, setFilterStatus] = useState("draft");

  // ─── Fetch Evolution Cards ──────────────────────────────────
  const { data: cards = [], isLoading: cardsLoading } = useQuery({
    queryKey: ["evolution-cards", filterStatus],
    queryFn: async () => {
      let query = supabase
        .from("architect_evolution_cards" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (filterStatus !== "all") query = query.eq("status", filterStatus);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // ─── Fetch System Stability ─────────────────────────────────
  const { data: stability } = useQuery({
    queryKey: ["system-stability"],
    queryFn: async () => {
      const now = new Date();
      const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const h1 = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

      const [{ count: total24h }, { count: critical24h }, { count: lastHour }] = await Promise.all([
        supabase.from("system_error_logs" as any).select("*", { count: "exact", head: true }).gte("created_at", h24),
        supabase.from("system_error_logs" as any).select("*", { count: "exact", head: true }).gte("created_at", h24).eq("severity", "critical"),
        supabase.from("system_error_logs" as any).select("*", { count: "exact", head: true }).gte("created_at", h1),
      ]);

      const t = total24h || 0;
      const c = critical24h || 0;
      const h = lastHour || 0;
      // Score: 100 = perfect, deduct for errors
      const score = Math.max(0, Math.min(100, 100 - (t * 2) - (c * 10) - (h * 5)));
      return { score, total24h: t, critical24h: c, lastHour: h };
    },
    refetchInterval: 30_000,
  });

  // ─── AI Scan Mutation ───────────────────────────────────────
  const scanMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("architect-analyze");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["evolution-cards"] });
      toast.success(`Ido סיים ניתוח — ${data?.count || 0} כרטיסים חדשים`);
    },
    onError: (err: any) => toast.error(err.message || "שגיאה בניתוח"),
  });

  // ─── Deploy Mutation ────────────────────────────────────────
  const deployMutation = useMutation({
    mutationFn: async (cardId: string) => {
      const { data, error } = await supabase.functions.invoke("architect-deploy", {
        body: { card_id: cardId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["evolution-cards"] });
      if (data?.pr_url) {
        toast.success("PR נוצר בהצלחה!", {
          action: { label: "פתח PR", onClick: () => window.open(data.pr_url, "_blank") },
        });
      } else {
        toast.success("נפרס בהצלחה");
      }
    },
    onError: (err: any) => toast.error(err.message || "שגיאה בפריסה"),
  });

  // ─── Dismiss / Approve Mutation ─────────────────────────────
  const updateCardStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("architect_evolution_cards" as any)
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["evolution-cards"] }),
  });

  const stabilityScore = stability?.score ?? 100;
  const stabilityColor = stabilityScore >= 80 ? "text-emerald-400" : stabilityScore >= 50 ? "text-amber-400" : "text-red-400";
  const stabilityBarColor = stabilityScore >= 80 ? "bg-emerald-500" : stabilityScore >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <AdminLayout title="Architect Console — Ido" icon={Cpu}>
      <div className="space-y-6">

        {/* ═══ HEADER: Stability + Scan ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* System Stability Meter */}
          <Card className="col-span-2 p-5 bg-zinc-950 border-zinc-800 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold">System Stability</h3>
                </div>
                <span className={cn("text-3xl font-black tabular-nums", stabilityColor)}>
                  {stabilityScore}%
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
                <motion.div
                  className={cn("h-full rounded-full", stabilityBarColor)}
                  initial={{ width: 0 }}
                  animate={{ width: `${stabilityScore}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold text-zinc-200">{stability?.total24h ?? 0}</p>
                  <p className="text-[9px] text-zinc-500">שגיאות 24 ש׳</p>
                </div>
                <div>
                  <p className={cn("text-lg font-bold", (stability?.critical24h ?? 0) > 0 ? "text-red-400" : "text-zinc-200")}>
                    {stability?.critical24h ?? 0}
                  </p>
                  <p className="text-[9px] text-zinc-500">קריטיות</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-zinc-200">{stability?.lastHour ?? 0}</p>
                  <p className="text-[9px] text-zinc-500">שעה אחרונה</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Ido Scan Button */}
          <Card className="p-5 bg-zinc-950 border-zinc-800 text-white flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center">
              <Cpu className="w-7 h-7 text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold">Ido — Architect</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">סריקה וניתוח שגיאות</p>
            </div>
            <Button
              onClick={() => scanMutation.mutate()}
              disabled={scanMutation.isPending}
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              size="sm"
            >
              {scanMutation.isPending ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              {scanMutation.isPending ? "מנתח..." : "הפעל סריקה"}
            </Button>
          </Card>
        </div>

        {/* ═══ FILTERS ═══ */}
        <div className="flex items-center gap-2 flex-wrap">
          {["all", "draft", "approved", "deployed", "rolled_back", "dismissed"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "text-[10px] px-3 py-1.5 rounded-full border transition-all",
                filterStatus === s
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "text-zinc-500 border-zinc-700 hover:border-zinc-600 hover:text-zinc-400"
              )}
            >
              {s === "all" ? "הכל" : statusConfig[s]?.label || s}
            </button>
          ))}
          <span className="text-zinc-600 text-[10px] mr-auto">
            {(cards as any[]).length} כרטיסים
          </span>
        </div>

        {/* ═══ EVOLUTION CARDS ═══ */}
        {cardsLoading ? (
          <div className="text-center py-12 text-sm text-zinc-500">טוען Evolution Cards...</div>
        ) : (cards as any[]).length === 0 ? (
          <Card className="p-12 text-center bg-zinc-950 border-zinc-800">
            <Activity className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm font-medium text-zinc-400">אין כרטיסים ב-{statusConfig[filterStatus]?.label || filterStatus}</p>
            <p className="text-xs text-zinc-600 mt-1">הפעל סריקה כדי לגלות הזדמנויות שיפור</p>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {(cards as any[]).map((card: any, i: number) => {
                const cat = categoryConfig[card.category] || categoryConfig.ui;
                const st = statusConfig[card.status] || statusConfig.draft;
                const isExpanded = expandedCard === card.id;
                const codeVisible = showCode[card.id];

                return (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card className={cn(
                      "bg-zinc-950 border-zinc-800 overflow-hidden transition-all hover:border-zinc-700",
                      card.status === "draft" && cat.glow
                    )}>
                      {/* Green accent top */}
                      <div className="h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

                      <div className="p-4">
                        {/* Header */}
                        <div
                          className="flex items-start gap-3 cursor-pointer"
                          onClick={() => setExpandedCard(isExpanded ? null : card.id)}
                        >
                          <span className="text-lg">{cat.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-zinc-200 leading-relaxed">
                              💡 {card.insight}
                            </p>
                            <p className="text-[11px] text-emerald-400/80 mt-1 leading-relaxed">
                              🛠️ {card.solution}
                            </p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant="outline" className={cn("text-[9px] border", st.color)}>
                                {st.label}
                              </Badge>
                              <Badge variant="outline" className="text-[9px] text-zinc-500 border-zinc-700">
                                {cat.label}
                              </Badge>
                              {card.file_path && (
                                <span className="text-[9px] text-zinc-600 font-mono truncate max-w-40">
                                  {card.file_path}
                                </span>
                              )}
                              <span className="text-[9px] text-zinc-600">
                                {(card.confidence * 100).toFixed(0)}% ביטחון
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-zinc-600" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-zinc-600" />
                            )}
                          </div>
                        </div>

                        {/* Expanded */}
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            className="mt-4 pt-4 border-t border-zinc-800 space-y-4"
                          >
                            {/* Code Toggle */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-2 text-[10px] text-zinc-400 hover:text-emerald-400"
                              onClick={() => setShowCode(prev => ({ ...prev, [card.id]: !prev[card.id] }))}
                            >
                              {codeVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              {codeVisible ? "הסתר קוד" : "הצג קוד Before / After"}
                            </Button>

                            {/* Code Diff */}
                            {codeVisible && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <p className="text-[9px] font-bold text-red-400 mb-1 flex items-center gap-1">
                                    <Code2 className="w-3 h-3" /> BEFORE
                                  </p>
                                  <pre className="text-[10px] bg-red-950/20 border border-red-900/30 text-red-300 p-3 rounded-lg overflow-x-auto max-h-48 font-mono leading-relaxed">
                                    {card.code_before || "// No code available"}
                                  </pre>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold text-emerald-400 mb-1 flex items-center gap-1">
                                    <Code2 className="w-3 h-3" /> AFTER
                                  </p>
                                  <pre className="text-[10px] bg-emerald-950/20 border border-emerald-900/30 text-emerald-300 p-3 rounded-lg overflow-x-auto max-h-48 font-mono leading-relaxed">
                                    {card.code_after || "// No code available"}
                                  </pre>
                                </div>
                              </div>
                            )}

                            {/* PR Link */}
                            {card.deploy_pr_url && (
                              <a
                                href={card.deploy_pr_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-[10px] text-emerald-400 hover:underline"
                              >
                                <GitPullRequest className="w-3 h-3" />
                                צפה ב-Pull Request
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}

                            {/* Actions */}
                            {card.status === "draft" && (
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  size="sm"
                                  className="gap-1.5 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => deployMutation.mutate(card.id)}
                                  disabled={deployMutation.isPending}
                                >
                                  {deployMutation.isPending ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <GitPullRequest className="w-3 h-3" />
                                  )}
                                  Deploy → GitHub PR
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="gap-1 text-[10px] text-zinc-500 hover:text-red-400"
                                  onClick={() => updateCardStatus.mutate({ id: card.id, status: "dismissed" })}
                                >
                                  <XCircle className="w-3 h-3" /> דחה
                                </Button>
                              </div>
                            )}

                            {card.status === "deployed" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-1.5 text-[10px] text-red-400 hover:bg-red-500/10"
                                onClick={() => updateCardStatus.mutate({ id: card.id, status: "rolled_back" })}
                              >
                                <Undo2 className="w-3 h-3" /> Rollback
                              </Button>
                            )}
                          </motion.div>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminArchitectConsole;
