import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Brain, Megaphone, Target, MessageCircle, Store,
  Headphones, Stethoscope, Scale, Sparkles, FlaskConical,
  Cpu, ShieldAlert, Clock, ChevronDown, ChevronUp, Eye,
  Play, Loader2, Zap, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SystemArchitectPanel } from "@/components/admin/SystemArchitectPanel";
import { ReadinessDrillPanel } from "@/components/admin/ReadinessDrillPanel";
import { UIHealthPanel } from "@/components/admin/UIHealthPanel";
import { HappinessMeterPanel } from "@/components/admin/HappinessMeterPanel";

const iconMap: Record<string, React.ComponentType<any>> = {
  brain: Brain, megaphone: Megaphone, target: Target,
  "message-circle": MessageCircle, store: Store,
  headphones: Headphones, stethoscope: Stethoscope, scale: Scale,
  bot: FlaskConical, sparkles: Sparkles, cpu: Cpu, eye: Eye,
};

const colorMap: Record<string, string> = {
  purple: "from-purple-500 to-purple-600", pink: "from-pink-500 to-pink-600",
  cyan: "from-cyan-500 to-cyan-600", orange: "from-orange-500 to-orange-600",
  green: "from-green-500 to-green-600", blue: "from-blue-500 to-blue-600",
  amber: "from-amber-500 to-amber-600", emerald: "from-emerald-500 to-emerald-600",
  indigo: "from-indigo-500 to-indigo-600", violet: "from-violet-500 to-violet-600",
  slate: "from-slate-600 to-slate-800", red: "from-red-500 to-red-600",
};

const glowMap: Record<string, string> = {
  purple: "shadow-purple-500/20", pink: "shadow-pink-500/20",
  cyan: "shadow-cyan-500/20", orange: "shadow-orange-500/20",
  green: "shadow-green-500/20", blue: "shadow-blue-500/20",
  amber: "shadow-amber-500/20", emerald: "shadow-emerald-500/20",
  indigo: "shadow-indigo-500/20", violet: "shadow-violet-500/20",
  slate: "shadow-slate-500/20", red: "shadow-red-500/20",
};

const AdminRobotFleet = () => {
  const [architectExpanded, setArchitectExpanded] = useState(false);
  const queryClient = useQueryClient();

  const { data: bots = [], isLoading } = useQuery({
    queryKey: ["automation-bots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_bots")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const toggleBot = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("automation_bots")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-bots"] });
      toast.success("סטטוס הבוט עודכן");
    },
  });

  const killAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("automation_bots")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-bots"] });
      toast.error("🛑 כל הבוטים הושבתו");
    },
  });

  const runBots = useMutation({
    mutationFn: async (botId?: string) => {
      const { data, error } = await supabase.functions.invoke("petid-agent-runner", {
        body: botId ? { bot_id: botId } : {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["automation-bots"] });
      toast.success(data?.message || "הבוטים הופעלו בהצלחה");
    },
    onError: (err: any) => {
      toast.error(`שגיאה בהפעלה: ${err.message}`);
    },
  });

  const activeBots = bots.filter((b: any) => b.is_active).length;
  const healthyBots = bots.filter((b: any) => b.health_status === "healthy").length;

  return (
    <AdminLayout title="Robot Fleet — מרכז הפיקוד" icon={Cpu}>
      <div className="space-y-8">
        {/* Fleet Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3"
        >
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10">
                <Activity className="w-5 h-5 text-emerald-500" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{activeBots}</p>
                <p className="text-[11px] text-muted-foreground">בוטים פעילים</p>
              </div>
            </div>
            <div className="absolute -bottom-2 -left-2 w-16 h-16 rounded-full bg-emerald-500/5" />
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Bot className="w-5 h-5 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{bots.length}</p>
                <p className="text-[11px] text-muted-foreground">סה״כ בוטים</p>
              </div>
            </div>
            <div className="absolute -bottom-2 -left-2 w-16 h-16 rounded-full bg-primary/5" />
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/10">
                <Zap className="w-5 h-5 text-cyan-500" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{healthyBots}</p>
                <p className="text-[11px] text-muted-foreground">תקינים</p>
              </div>
            </div>
            <div className="absolute -bottom-2 -left-2 w-16 h-16 rounded-full bg-cyan-500/5" />
          </div>
        </motion.div>

        {/* Kill Switch Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="p-4 border-destructive/20 bg-destructive/5 backdrop-blur-sm">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-destructive/10">
                  <ShieldAlert className="w-5 h-5 text-destructive" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">Kill Switch</p>
                  <p className="text-xs text-muted-foreground">
                    {activeBots}/{bots.length} בוטים פעילים
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => runBots.mutate(undefined)}
                  disabled={runBots.isPending || activeBots === 0}
                  size="sm"
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                >
                  {runBots.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  הפעל את כולם
                </Button>
                <Button
                  onClick={() => killAll.mutate()}
                  disabled={killAll.isPending || activeBots === 0}
                  variant="destructive"
                  size="sm"
                  className="gap-1.5 shadow-lg shadow-destructive/20"
                >
                  🛑 השבת הכל
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Bot Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bots.map((bot: any, i: number) => {
            const Icon = iconMap[bot.icon] || Bot;
            const glow = glowMap[bot.color] || "shadow-muted/20";
            return (
              <motion.div
                key={bot.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className={cn(
                  "group relative overflow-hidden p-5 transition-all duration-300",
                  "hover:shadow-xl border-border/40",
                  bot.is_active && `hover:${glow}`,
                  !bot.is_active && "opacity-60"
                )}>
                  {/* Subtle gradient overlay for active bots */}
                  {bot.is_active && (
                    <div className={cn(
                      "absolute inset-0 opacity-[0.03] bg-gradient-to-br pointer-events-none",
                      colorMap[bot.color] || "from-muted to-muted"
                    )} />
                  )}

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className={cn(
                        "w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105",
                        colorMap[bot.color] || "from-muted to-muted",
                        bot.is_active ? "shadow-lg" : "shadow-sm grayscale"
                      )}>
                        <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => runBots.mutate(bot.id)}
                          disabled={!bot.is_active || runBots.isPending}
                          className="p-1.5 rounded-lg hover:bg-accent/10 disabled:opacity-30 transition-all active:scale-90"
                          title="הפעל בוט"
                        >
                          {runBots.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          ) : (
                            <Play className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
                          )}
                        </button>
                        <Switch
                          checked={bot.is_active}
                          onCheckedChange={(checked) =>
                            toggleBot.mutate({ id: bot.id, is_active: checked })
                          }
                        />
                      </div>
                    </div>

                    <h3 className="font-semibold text-sm text-foreground">{bot.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                      {bot.description}
                    </p>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                      <Badge
                        variant={bot.is_active ? "default" : "secondary"}
                        className={cn(
                          "text-[10px] font-medium",
                          bot.is_active
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full mr-1.5",
                          bot.is_active ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                        )} />
                        {bot.is_active ? "פעיל" : "מושבת"}
                      </Badge>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" strokeWidth={1.5} />
                        {bot.last_run_at
                          ? new Date(bot.last_run_at).toLocaleString("he-IL", {
                              day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                            })
                          : "טרם הופעל"}
                      </div>
                    </div>

                    {bot.last_output && (
                      <p className="text-[10px] text-muted-foreground mt-3 line-clamp-2 bg-muted/30 rounded-lg p-2 leading-relaxed border border-border/20">
                        {bot.last_output}
                      </p>
                    )}

                    {(bot.capabilities as string[] || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {(bot.capabilities as string[]).slice(0, 3).map((cap: string) => (
                          <span key={cap} className="text-[9px] px-2 py-0.5 rounded-full bg-accent/10 text-muted-foreground border border-border/20">
                            {cap}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* System Architect Expandable Section */}
        {bots.some((b: any) => b.slug === "system-architect") && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="overflow-hidden border-border/40">
              <button
                onClick={() => setArchitectExpanded(!architectExpanded)}
                className="w-full p-5 flex items-center justify-between hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-lg">
                    <Cpu className="w-5 h-5 text-white" strokeWidth={1.5} />
                  </div>
                  <div className="text-right">
                    <h3 className="font-semibold text-sm text-foreground">The System Architect — מוניטור שגיאות</h3>
                    <p className="text-[10px] text-muted-foreground">מעקב אחר שגיאות Client, Edge Functions ומסד נתונים</p>
                  </div>
                </div>
                <div className={cn(
                  "p-1.5 rounded-lg bg-muted/50 transition-transform duration-200",
                  architectExpanded && "rotate-180"
                )}>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                </div>
              </button>
              <AnimatePresence>
                {architectExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border/30"
                  >
                    <div className="p-4">
                      <SystemArchitectPanel />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}

        {/* 3 AM Readiness Drill Section */}
        <ReadinessDrillPanel />

        {/* Ofek — UI Health Monitor */}
        <UIHealthPanel />

        {/* Happiness Meter — Sentiment Dashboard */}
        <HappinessMeterPanel />
      </div>
    </AdminLayout>
  );
};

export default AdminRobotFleet;
