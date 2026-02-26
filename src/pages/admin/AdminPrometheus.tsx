import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, Brain, Zap, FlaskConical, TrendingUp, TrendingDown,
  BarChart3, GitBranch, Sparkles, Shield, Activity, Clock,
  CheckCircle2, AlertTriangle, Play, RotateCcw, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { he } from "date-fns/locale";

const agentNames: Record<string, string> = {
  brain: "Brain — המתזמר",
  crm: "CRM — שלמות נתונים",
  inventory: "Inventory — חיזוי מלאי",
  marketing: "Marketing — סגמנטציה",
  sales: "Sales — לידים",
  support: "Sarah — תמיכה",
  medical: "Medical — וטרינר",
  compliance: "Compliance — חוק",
  nrc: "Dr. NRC — מדע",
  content: "Lumi — תוכן",
  architect: "Ido — ארכיטקט",
  all: "כל הסוכנים",
};

const AdminPrometheus = () => {
  const [selectedAgent, setSelectedAgent] = useState("all");
  const queryClient = useQueryClient();

  // ─── Queries ─────────────────────────────────────────────
  const { data: performanceScores = [] } = useQuery({
    queryKey: ["prometheus-scores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_performance_scores")
        .select("*")
        .order("score_date", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: promptVersions = [] } = useQuery({
    queryKey: ["prompt-versions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_prompt_versions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  const { data: abTests = [] } = useQuery({
    queryKey: ["ab-tests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prometheus_ab_tests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const { data: intelligenceLog = [] } = useQuery({
    queryKey: ["intelligence-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prometheus_intelligence_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  // ─── Mutations ───────────────────────────────────────────
  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("prometheus-optimize", {
        body: { action: "analyze", agent_slug: selectedAgent },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["prometheus-scores"] });
      queryClient.invalidateQueries({ queryKey: ["intelligence-log"] });
      toast.success("ניתוח הושלם — תוצאות עודכנו");
    },
    onError: () => toast.error("שגיאה בניתוח"),
  });

  const rewriteMutation = useMutation({
    mutationFn: async (agentSlug: string) => {
      const { data, error } = await supabase.functions.invoke("prometheus-optimize", {
        body: { action: "rewrite", agent_slug: agentSlug },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prompt-versions"] });
      toast.success("פרומפט חדש נוצר — ממתין ל-A/B Test");
    },
    onError: () => toast.error("שגיאה בכתיבת פרומפט"),
  });

  const shadowTestMutation = useMutation({
    mutationFn: async (agentSlug: string) => {
      const { data, error } = await supabase.functions.invoke("prometheus-optimize", {
        body: { action: "shadow-test", agent_slug: agentSlug },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["ab-tests"] });
      queryClient.invalidateQueries({ queryKey: ["intelligence-log"] });
      if (data?.auto_deployed) {
        toast.success(`🚀 גרסה חדשה נפרסה אוטומטית — שיפור של ${data.improvement_pct}%`);
      } else {
        toast.info(`A/B Test הושלם — מנצח: ${data?.winner === "variant_a" ? "גרסה נוכחית" : "גרסה חדשה"}`);
      }
    },
    onError: () => toast.error("שגיאה ב-Shadow Test"),
  });

  // ─── Derived Data ────────────────────────────────────────
  const todayScores = performanceScores.filter(
    (s: any) => s.score_date === new Date().toISOString().split("T")[0]
  );
  const overallScore = todayScores.length > 0
    ? Math.round(todayScores.reduce((acc: number, s: any) => acc + Number(s.response_quality), 0) / todayScores.length)
    : 0;

  const totalImprovements = intelligenceLog.filter((l: any) => l.auto_applied).length;
  const activeTests = abTests.filter((t: any) => t.status === "running").length;

  return (
    <AdminLayout title="Prometheus — מאמן הסוכנים" icon={Eye}>
      <div className="space-y-6">

        {/* ─── KPI Bar ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "ציון כולל", value: `${overallScore}%`, icon: Target, color: "text-primary" },
            { label: "שיפורים אוטו'", value: totalImprovements, icon: Sparkles, color: "text-emerald-500" },
            { label: "A/B פעילים", value: activeTests, icon: GitBranch, color: "text-amber-500" },
            { label: "גרסאות פרומפט", value: promptVersions.length, icon: FlaskConical, color: "text-violet-500" },
          ].map((kpi, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <kpi.icon className={cn("w-4 h-4", kpi.color)} />
                  <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
                </div>
                <p className="text-2xl font-bold">{kpi.value}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ─── Action Bar ──────────────────────────────────── */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="text-sm border rounded-lg px-3 py-2 bg-background"
            >
              {Object.entries(agentNames).map(([slug, name]) => (
                <option key={slug} value={slug}>{name}</option>
              ))}
            </select>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => analyzeMutation.mutate()} disabled={analyzeMutation.isPending}>
                <BarChart3 className="w-3.5 h-3.5 mr-1" />
                {analyzeMutation.isPending ? "מנתח..." : "Logic Mining"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => rewriteMutation.mutate(selectedAgent)} disabled={rewriteMutation.isPending || selectedAgent === "all"}>
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                {rewriteMutation.isPending ? "כותב..." : "שכתוב פרומפט"}
              </Button>
              <Button size="sm" onClick={() => shadowTestMutation.mutate(selectedAgent)} disabled={shadowTestMutation.isPending || selectedAgent === "all"}>
                <Play className="w-3.5 h-3.5 mr-1" />
                {shadowTestMutation.isPending ? "בודק..." : "Shadow Test"}
              </Button>
            </div>
          </div>
        </Card>

        {/* ─── Tabs ────────────────────────────────────────── */}
        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="performance" className="text-xs">ביצועים</TabsTrigger>
            <TabsTrigger value="prompts" className="text-xs">פרומפטים</TabsTrigger>
            <TabsTrigger value="ab-tests" className="text-xs">A/B Tests</TabsTrigger>
            <TabsTrigger value="intelligence" className="text-xs">Intelligence Growth</TabsTrigger>
          </TabsList>

          {/* Performance Tab */}
          <TabsContent value="performance">
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 p-1">
                {performanceScores.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">אין נתוני ביצועים עדיין — לחץ "Logic Mining"</p>
                  </Card>
                ) : (
                  performanceScores.map((score: any, i: number) => (
                    <motion.div key={score.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                      <Card className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-sm">{agentNames[score.agent_slug] || score.agent_slug}</h4>
                            <span className="text-[10px] text-muted-foreground">{score.score_date}</span>
                          </div>
                          <Badge variant={Number(score.response_quality) > 70 ? "default" : "destructive"} className="text-xs">
                            {Math.round(score.response_quality)}%
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-center">
                          {[
                            { label: "אמפתיה", value: score.empathy_score },
                            { label: "דיוק", value: score.accuracy_score },
                            { label: "המרה", value: score.conversion_rate },
                            { label: "פערים", value: score.logic_gaps_found, isCount: true },
                          ].map((metric: any) => (
                            <div key={metric.label}>
                              <p className="text-[10px] text-muted-foreground">{metric.label}</p>
                              {metric.isCount ? (
                                <p className="text-sm font-bold">{metric.value}</p>
                              ) : (
                                <Progress value={Number(metric.value)} className="h-1.5 mt-1" />
                              )}
                            </div>
                          ))}
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Prompts Tab */}
          <TabsContent value="prompts">
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 p-1">
                {promptVersions.length === 0 ? (
                  <Card className="p-8 text-center">
                    <FlaskConical className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">אין גרסאות פרומפט — בחר סוכן ולחץ "שכתוב פרומפט"</p>
                  </Card>
                ) : (
                  promptVersions.map((pv: any, i: number) => (
                    <motion.div key={pv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                      <Card className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{agentNames[pv.agent_slug] || pv.agent_slug}</span>
                            <Badge variant="outline" className="text-[10px]">v{pv.version}</Badge>
                            {pv.is_active && (
                              <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600">פעיל</Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {pv.created_by === "prometheus" ? "🤖 Prometheus" : "👤 ידני"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-3 bg-muted/30 rounded p-2 font-mono">
                          {pv.system_prompt?.slice(0, 200)}...
                        </p>
                        {pv.deployed_at && (
                          <p className="text-[10px] text-emerald-500 mt-2">
                            נפרס: {format(new Date(pv.deployed_at), "dd/MM HH:mm", { locale: he })}
                          </p>
                        )}
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* A/B Tests Tab */}
          <TabsContent value="ab-tests">
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 p-1">
                {abTests.length === 0 ? (
                  <Card className="p-8 text-center">
                    <GitBranch className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">אין A/B Tests — בחר סוכן ולחץ "Shadow Test"</p>
                  </Card>
                ) : (
                  abTests.map((test: any, i: number) => {
                    const aWins = test.winner === "variant_a";
                    const improvement = test.variant_a_score > 0
                      ? Math.round(((test.variant_b_score - test.variant_a_score) / test.variant_a_score) * 100)
                      : 0;
                    return (
                      <motion.div key={test.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
                        <Card className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-sm">{test.test_name}</h4>
                            <Badge variant={test.status === "running" ? "default" : "secondary"} className="text-[10px]">
                              {test.status === "running" ? "⏳ רץ" : test.status === "completed" ? "✅ הושלם" : "❌ בוטל"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className={cn("p-3 rounded-lg border", !aWins && "opacity-50")}>
                              <p className="text-[10px] text-muted-foreground mb-1">Variant A (נוכחי)</p>
                              <p className="text-lg font-bold">{Math.round(test.variant_a_score)}</p>
                              <p className="text-[10px]">{test.variant_a_samples} דגימות</p>
                            </div>
                            <div className={cn("p-3 rounded-lg border", aWins && "opacity-50")}>
                              <p className="text-[10px] text-muted-foreground mb-1">Variant B (חדש)</p>
                              <p className="text-lg font-bold">{Math.round(test.variant_b_score)}</p>
                              <p className="text-[10px]">{test.variant_b_samples} דגימות</p>
                            </div>
                          </div>
                          {test.status === "completed" && (
                            <div className="flex items-center gap-2 mt-3">
                              {improvement > 0 ? (
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-destructive" />
                              )}
                              <span className={cn("text-xs font-medium", improvement > 0 ? "text-emerald-500" : "text-destructive")}>
                                {improvement > 0 ? "+" : ""}{improvement}% {aWins ? "(הנוכחי נשאר)" : "(החדש מנצח)"}
                              </span>
                            </div>
                          )}
                        </Card>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Intelligence Growth Tab */}
          <TabsContent value="intelligence">
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 p-1">
                {intelligenceLog.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Brain className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">אין לוג שיפורים — הרץ ניתוח ו-Shadow Test</p>
                  </Card>
                ) : (
                  intelligenceLog.map((log: any, i: number) => (
                    <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                      <Card className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            log.auto_applied ? "bg-emerald-500/10" : "bg-amber-500/10"
                          )}>
                            {log.auto_applied ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-bold">{agentNames[log.agent_slug] || log.agent_slug}</span>
                              <Badge variant="outline" className="text-[9px]">{log.improvement_type}</Badge>
                              {log.auto_applied && (
                                <Badge className="text-[9px] bg-emerald-500/10 text-emerald-600">auto</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{log.description}</p>
                            {log.improvement_pct && (
                              <div className="flex items-center gap-1 mt-1">
                                <TrendingUp className="w-3 h-3 text-emerald-500" />
                                <span className="text-[10px] text-emerald-500 font-medium">+{Math.round(log.improvement_pct)}%</span>
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {format(new Date(log.created_at), "dd/MM HH:mm", { locale: he })}
                          </span>
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminPrometheus;
