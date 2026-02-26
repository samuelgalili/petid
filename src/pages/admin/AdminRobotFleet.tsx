import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Brain, Megaphone, Target, MessageCircle, Store,
  Headphones, Stethoscope, Scale, Sparkles, FlaskConical,
  Cpu, ShieldAlert, Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SystemArchitectPanel } from "@/components/admin/SystemArchitectPanel";
import { ReadinessDrillPanel } from "@/components/admin/ReadinessDrillPanel";

const iconMap: Record<string, React.ComponentType<any>> = {
  brain: Brain, megaphone: Megaphone, target: Target,
  "message-circle": MessageCircle, store: Store,
  headphones: Headphones, stethoscope: Stethoscope, scale: Scale,
  bot: FlaskConical, sparkles: Sparkles, cpu: Cpu,
};

const colorMap: Record<string, string> = {
  purple: "from-purple-500 to-purple-600", pink: "from-pink-500 to-pink-600",
  cyan: "from-cyan-500 to-cyan-600", orange: "from-orange-500 to-orange-600",
  green: "from-green-500 to-green-600", blue: "from-blue-500 to-blue-600",
  amber: "from-amber-500 to-amber-600", emerald: "from-emerald-500 to-emerald-600",
  indigo: "from-indigo-500 to-indigo-600", violet: "from-violet-500 to-violet-600",
  slate: "from-slate-600 to-slate-800",
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

  const activeBots = bots.filter((b: any) => b.is_active).length;

  return (
    <AdminLayout title="Robot Fleet — מרכז הפיקוד" icon={Cpu}>
      <div className="space-y-6">
        {/* Kill Switch Header */}
        <Card className="p-4 border-destructive/30 bg-destructive/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-6 h-6 text-destructive" />
              <div>
                <p className="font-bold text-sm">Kill Switch — השבתת כל הבוטים</p>
                <p className="text-xs text-muted-foreground">
                  {activeBots}/{bots.length} בוטים פעילים
                </p>
              </div>
            </div>
            <button
              onClick={() => killAll.mutate()}
              disabled={killAll.isPending || activeBots === 0}
              className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 disabled:opacity-50 transition-colors"
            >
              🛑 השבת הכל
            </button>
          </div>
        </Card>

        {/* Bot Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bots.map((bot: any, i: number) => {
            const Icon = iconMap[bot.icon] || Bot;
            return (
              <motion.div
                key={bot.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn(
                      "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center",
                      colorMap[bot.color] || "from-gray-500 to-gray-600"
                    )}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <Switch
                      checked={bot.is_active}
                      onCheckedChange={(checked) =>
                        toggleBot.mutate({ id: bot.id, is_active: checked })
                      }
                    />
                  </div>
                  <h3 className="font-semibold text-sm">{bot.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {bot.description}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <Badge
                      variant={bot.is_active ? "default" : "secondary"}
                      className={cn(
                        "text-[10px]",
                        bot.is_active
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {bot.is_active ? "פעיל" : "מושבת"}
                    </Badge>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {bot.last_run_at
                        ? new Date(bot.last_run_at).toLocaleString("he-IL", {
                            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                          })
                        : "טרם הופעל"}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(bot.capabilities as string[] || []).slice(0, 3).map((cap: string) => (
                      <span key={cap} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {cap}
                      </span>
                    ))}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* System Architect Expandable Section */}
        {bots.some((b: any) => b.slug === "system-architect") && (
          <Card className="overflow-hidden">
            <button
              onClick={() => setArchitectExpanded(!architectExpanded)}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-white" />
                </div>
                <div className="text-right">
                  <h3 className="font-semibold text-sm">The System Architect — מוניטור שגיאות</h3>
                  <p className="text-[10px] text-muted-foreground">מעקב אחר שגיאות Client, Edge Functions ומסד נתונים</p>
                </div>
              </div>
              {architectExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <AnimatePresence>
              {architectExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t"
                >
                  <div className="p-4">
                    <SystemArchitectPanel />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        )}

        {/* 3 AM Readiness Drill Section */}
        <ReadinessDrillPanel />
      </div>
    </AdminLayout>
  );
};

export default AdminRobotFleet;
