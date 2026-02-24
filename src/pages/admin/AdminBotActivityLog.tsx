import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Bot, Brain, Megaphone, Target, MessageCircle,
  Store, Truck, Headphones, Stethoscope, Scale, FlaskConical,
  Search, RefreshCw, CheckCircle2, XCircle, Clock, Zap, Filter
} from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<any>> = {
  brain: Brain, megaphone: Megaphone, target: Target,
  "message-circle": MessageCircle, store: Store, truck: Truck,
  headphones: Headphones, stethoscope: Stethoscope, scale: Scale,
  bot: FlaskConical,
};

const colorMap: Record<string, string> = {
  purple: "from-purple-500 to-purple-600", pink: "from-pink-500 to-pink-600",
  cyan: "from-cyan-500 to-cyan-600", orange: "from-orange-500 to-orange-600",
  green: "from-green-500 to-green-600", blue: "from-blue-500 to-blue-600",
  amber: "from-amber-500 to-amber-600", emerald: "from-emerald-500 to-emerald-600",
  indigo: "from-indigo-500 to-indigo-600", violet: "from-violet-500 to-violet-600",
};

const statusIcons: Record<string, { icon: React.ComponentType<any>; color: string }> = {
  success: { icon: CheckCircle2, color: "text-emerald-500" },
  completed: { icon: CheckCircle2, color: "text-emerald-500" },
  failed: { icon: XCircle, color: "text-red-500" },
  error: { icon: XCircle, color: "text-red-500" },
  pending: { icon: Clock, color: "text-amber-500" },
  running: { icon: Zap, color: "text-cyan-500" },
};

const AdminBotActivityLog = () => {
  const [search, setSearch] = useState("");
  const [botFilter, setBotFilter] = useState<string>("all");
  const [realtimeLogs, setRealtimeLogs] = useState<any[]>([]);

  const { data: bots = [] } = useQuery({
    queryKey: ["agent-bots"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agent_bots").select("*").order("created_at");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["bot-activity-logs", botFilter],
    queryFn: async () => {
      let query = supabase
        .from("agent_action_logs")
        .select("*, agent_bots(id, name, slug, icon, color)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (botFilter !== "all") {
        query = query.eq("bot_id", botFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("bot-activity-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "agent_action_logs",
      }, (payload) => {
        setRealtimeLogs((prev) => [payload.new, ...prev.slice(0, 9)]);
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  const allLogs = [...realtimeLogs.filter((rl) => !logs.some((l: any) => l.id === rl.id)), ...logs];

  const filtered = allLogs.filter((log: any) => {
    if (search && !log.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getStatus = (log: any): string => {
    return log.actual_outcome?.toLowerCase()?.includes("error") || log.actual_outcome?.toLowerCase()?.includes("fail")
      ? "failed"
      : log.actual_outcome ? "success" : "pending";
  };

  return (
    <AdminLayout title="Activity Log — Bot Decisions" icon={Activity}>
      <div className="space-y-6">
        {/* Live indicator */}
        <Card className="p-4 flex items-center gap-3 bg-emerald-500/5 border-emerald-500/20">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-medium">לוג חי — עדכונים בזמן אמת</span>
          <span className="text-xs text-muted-foreground mr-auto">{filtered.length} רשומות</span>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
          </Button>
        </Card>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש בלוג..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={botFilter} onValueChange={setBotFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="w-4 h-4 ml-2" />
                <SelectValue placeholder="כל הבוטים" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הבוטים</SelectItem>
                {bots.map((bot: any) => (
                  <SelectItem key={bot.id} value={bot.id}>{bot.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Log Table */}
        <Card>
          {/* Header */}
          <div className="grid grid-cols-[60px_1fr_140px_100px_80px] gap-3 p-3 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
            <span>שעה</span>
            <span>פעולה</span>
            <span>בוט</span>
            <span>סוג</span>
            <span>סטטוס</span>
          </div>

          <ScrollArea className="h-[calc(100vh-380px)]">
            <div className="divide-y">
              <AnimatePresence>
                {filtered.map((log: any, idx: number) => {
                  const botInfo = log.agent_bots || bots.find((b: any) => b.id === log.bot_id);
                  const Icon = botInfo ? iconMap[botInfo.icon] || Bot : Bot;
                  const status = getStatus(log);
                  const StatusConfig = statusIcons[status] || statusIcons.pending;
                  const StatusIcon = StatusConfig.icon;

                  return (
                    <motion.div
                      key={log.id || idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx < 5 ? idx * 0.05 : 0 }}
                      className="grid grid-cols-[60px_1fr_140px_100px_80px] gap-3 p-3 hover:bg-muted/30 transition-colors items-center"
                    >
                      {/* Timestamp */}
                      <span className="text-xs font-mono text-muted-foreground">
                        {new Date(log.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>

                      {/* Action */}
                      <div className="min-w-0">
                        <p className="text-sm truncate">{log.description}</p>
                        {log.reason && (
                          <p className="text-[10px] text-muted-foreground truncate">{log.reason}</p>
                        )}
                      </div>

                      {/* Bot */}
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-6 h-6 rounded-md bg-gradient-to-br flex items-center justify-center shrink-0",
                          botInfo ? colorMap[botInfo.color] : "from-gray-500 to-gray-600"
                        )}>
                          <Icon className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs truncate">{botInfo?.name || "—"}</span>
                      </div>

                      {/* Type */}
                      <Badge variant="outline" className="text-[10px] justify-center">
                        {log.action_type}
                      </Badge>

                      {/* Status */}
                      <div className="flex items-center gap-1">
                        <StatusIcon className={cn("w-4 h-4", StatusConfig.color)} />
                        <span className={cn("text-[10px]", StatusConfig.color)}>
                          {status === "success" ? "הצלחה" : status === "failed" ? "כשלון" : status === "running" ? "פעיל" : "ממתין"}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {filtered.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p>אין רשומות בלוג</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminBotActivityLog;
