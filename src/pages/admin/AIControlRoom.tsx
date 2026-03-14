import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Crown, Send, Bot, CheckCircle2, Clock, AlertTriangle,
  Play, Pause, RefreshCw, ChevronRight, Sparkles, FileText,
  X, Check, Megaphone, PenTool, Target, MessageCircle,
  Store, Truck, Wallet, Headphones, BarChart3, Activity,
  Zap, TrendingUp, Shield, ShieldOff, Power, PowerOff,
  Brain, Stethoscope, Scale, FlaskConical
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AIInsightsPanel, AIContentGenerator } from "@/components/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface AgentBot {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  is_active: boolean;
  capabilities: string[];
}

interface AgentTask {
  id: string;
  bot_id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  task_type: string;
  requires_approval: boolean;
  reason: string;
  expected_outcome: string;
  created_at: string;
  agent_bots?: AgentBot;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  crown: Crown, brain: Brain, megaphone: Megaphone, 'pen-tool': PenTool,
  target: Target, 'message-circle': MessageCircle, store: Store,
  truck: Truck, wallet: Wallet, headphones: Headphones,
  'bar-chart-3': BarChart3, bot: FlaskConical, stethoscope: Stethoscope,
  scale: Scale,
};

const colorMap: Record<string, string> = {
  purple: "from-purple-500 to-purple-600", pink: "from-pink-500 to-pink-600",
  cyan: "from-cyan-500 to-cyan-600", orange: "from-orange-500 to-orange-600",
  green: "from-green-500 to-green-600", blue: "from-blue-500 to-blue-600",
  amber: "from-amber-500 to-amber-600", emerald: "from-emerald-500 to-emerald-600",
  indigo: "from-indigo-500 to-indigo-600", violet: "from-violet-500 to-violet-600",
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  draft: { label: "טיוטה", color: "bg-muted text-muted-foreground", icon: FileText },
  pending_approval: { label: "ממתין לאישור", color: "bg-amber-500/10 text-amber-600", icon: AlertTriangle },
  approved: { label: "מאושר", color: "bg-blue-500/10 text-blue-600", icon: CheckCircle2 },
  running: { label: "בביצוע", color: "bg-cyan-500/10 text-cyan-600", icon: Play },
  completed: { label: "הושלם", color: "bg-emerald-500/10 text-emerald-600", icon: CheckCircle2 },
  failed: { label: "נכשל", color: "bg-red-500/10 text-red-600", icon: X },
  cancelled: { label: "בוטל", color: "bg-muted text-muted-foreground", icon: X },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "נמוכה", color: "bg-muted text-muted-foreground" },
  medium: { label: "בינונית", color: "bg-blue-500/10 text-blue-600" },
  high: { label: "גבוהה", color: "bg-orange-500/10 text-orange-600" },
  urgent: { label: "דחוף", color: "bg-red-500/10 text-red-600" },
};

const AIControlRoom = () => {
  const [activeTab, setActiveTab] = useState("status");
  const [inputMessage, setInputMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "שלום! אני PetID Brain Bot 🧠\n\nאני מנהל את 9 הרובוטים האוטונומיים שלך (The Fleet).\n\n🤖 CRM · Inventory · Marketing · Sales · Support · Medical · Compliance · NRC Science\n\nמה צריך לעשות?",
      created_at: new Date().toISOString()
    }
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [globalKillSwitch, setGlobalKillSwitch] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: bots = [], refetch: refetchBots } = useQuery({
    queryKey: ['agent-bots'],
    queryFn: async () => {
      const { data, error } = await supabase.from('agent_bots').select('*').order('created_at');
      if (error) throw error;
      return data as AgentBot[];
    }
  });

  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['agent-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_tasks').select('*, agent_bots(*)').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data as AgentTask[];
    }
  });

  const { data: actionLogs = [] } = useQuery({
    queryKey: ['agent-action-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_action_logs').select('*, agent_bots(name, slug, icon, color)')
        .order('created_at', { ascending: false }).limit(30);
      if (error) throw error;
      return data;
    }
  });

  // Kill switch mutation
  const toggleBotMutation = useMutation({
    mutationFn: async ({ botId, isActive }: { botId: string; isActive: boolean }) => {
      const { error } = await supabase.from('agent_bots').update({ is_active: isActive }).eq('id', botId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-bots'] });
      toast.success("סטטוס הבוט עודכן");
    }
  });

  const globalKillSwitchMutation = useMutation({
    mutationFn: async (deactivate: boolean) => {
      const { error } = await supabase.from('agent_bots')
        .update({ is_active: !deactivate })
        .neq('slug', 'brain'); // Brain bot always stays active
      if (error) throw error;
    },
    onSuccess: (_, deactivate) => {
      setGlobalKillSwitch(deactivate);
      queryClient.invalidateQueries({ queryKey: ['agent-bots'] });
      toast.success(deactivate ? "⚠️ Kill Switch הופעל — כל הבוטים כובו" : "✅ כל הבוטים הופעלו מחדש");
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('agent_tasks')
        .update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['agent-tasks'] }); toast.success("משימה אושרה"); }
  });

  const rejectMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('agent_tasks').update({ status: 'cancelled' }).eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['agent-tasks'] }); toast.success("משימה נדחתה"); }
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendMessage = async (messageOverride?: string) => {
    const messageToSend = typeof messageOverride === 'string' ? messageOverride : inputMessage;
    if (!messageToSend.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(), role: 'user', content: messageToSend, created_at: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsStreaming(true);

    const assistantId = crypto.randomUUID();
    setChatMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', created_at: new Date().toISOString() }]);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/orchestrator-chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: JSON.stringify({ messages: chatMessages.concat(userMessage).map(m => ({ role: m.role, content: m.content })) })
        }
      );

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ') || trimmedLine === 'data: [DONE]') continue;
          try {
            const jsonStr = trimmedLine.slice(6);
            if (!jsonStr.startsWith('{')) continue;
            const data = JSON.parse(jsonStr);
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              const displayContent = fullContent.replace(/<task>[\s\S]*?<\/task>/g, '').trim();
              setChatMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: displayContent || 'מעבד...' } : m));
            }
          } catch (e) { /* skip parse errors */ }
        }
      }
      refetchTasks();
    } catch (error) {
      setChatMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: 'מצטער, אירעה שגיאה. נסה שוב.' } : m));
      toast.error("שגיאה בתקשורת");
    } finally {
      setIsStreaming(false);
    }
  };

  const pendingApprovalTasks = tasks.filter(t => t.status === 'pending_approval');
  const brainBot = bots.find(b => b.slug === 'brain');
  const fleetBots = bots.filter(b => b.slug !== 'brain');
  const activeBots = fleetBots.filter(b => b.is_active);
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const runningTasks = tasks.filter(t => t.status === 'running');

  return (
    <AdminLayout title="AI Control Room" icon={Crown}>
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_380px] gap-4 lg:gap-6 min-h-0" style={{ height: 'calc(100vh - 180px)', maxHeight: 'calc(100vh - 180px)' }}>
        {/* Main Column */}
        <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
          {/* Global Kill Switch Bar */}
          <Card className={cn(
            "p-3 lg:p-4 flex items-center justify-between border-2 transition-colors shrink-0",
            globalKillSwitch ? "border-red-500/50 bg-red-500/5" : "border-emerald-500/30 bg-emerald-500/5"
          )}>
            <div className="flex items-center gap-3">
              {globalKillSwitch ? (
                <ShieldOff className="w-6 h-6 text-red-500" />
              ) : (
                <Shield className="w-6 h-6 text-emerald-500" />
              )}
              <div>
                <p className="font-bold text-sm">
                  {globalKillSwitch ? "⚠️ Kill Switch פעיל — כל הבוטים מושבתים" : "✅ The Fleet פעיל — כל הבוטים עובדים"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activeBots.length}/{fleetBots.length} בוטים פעילים · {pendingApprovalTasks.length} ממתינים לאישור
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Kill Switch</span>
              <Switch
                checked={globalKillSwitch}
                onCheckedChange={(checked) => globalKillSwitchMutation.mutate(checked)}
                className="data-[state=checked]:bg-red-500"
              />
            </div>
          </Card>

          {/* AI Insights — hidden on mobile to save space */}
          <div className="hidden lg:block shrink-0 max-h-[160px] overflow-y-auto rounded-xl">
            <AIInsightsPanel />
          </div>
          
          {/* Chat — takes remaining space, never hidden */}
          <Card className="flex flex-col flex-1 min-h-0 overflow-hidden border-border/50">
            <CardHeader className="border-b border-border/50 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">PetID Ops Commander</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm text-muted-foreground">מנהל {fleetBots.length} רובוטים · The Fleet</span>
                  </div>
                </div>
              </div>
            </CardHeader>

            <ScrollArea className="flex-1 min-h-0 p-4">
              <div className="space-y-4">
                {chatMessages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("flex gap-3", message.role === 'user' ? "flex-row-reverse" : "")}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shrink-0">
                        <Brain className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={cn(
                      "rounded-2xl px-4 py-3 max-w-[80%]",
                      message.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted/50"
                    )}>
                      <p className="text-sm whitespace-pre-wrap">{message.content || (
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          חושב...
                        </span>
                      )}</p>
                    </div>
                  </motion.div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border/50 shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="דבר עם Brain Bot..."
                  className="flex-1 px-4 py-3 rounded-xl bg-muted/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  disabled={isStreaming}
                />
                <Button onClick={() => sendMessage()} disabled={isStreaming || !inputMessage.trim()} className="px-4">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {["סטטוס The Fleet", "בדוק מלאי NRC", "לידים חדשים", "רישיונות שפגו"].map((s) => (
                  <Button key={s} variant="outline" size="sm" className="text-xs" disabled={isStreaming} onClick={() => sendMessage(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="flex flex-col min-h-0 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="status" className="text-xs gap-1"><Activity className="w-3.5 h-3.5" />סטטוס</TabsTrigger>
              <TabsTrigger value="approvals" className="text-xs gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                אישורים
                {pendingApprovalTasks.length > 0 && (
                  <Badge className="w-5 h-5 p-0 justify-center text-[10px] bg-amber-500">{pendingApprovalTasks.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="logs" className="text-xs gap-1"><FileText className="w-3.5 h-3.5" />לוגים</TabsTrigger>
              <TabsTrigger value="queue" className="text-xs gap-1"><Clock className="w-3.5 h-3.5" />תור</TabsTrigger>
            </TabsList>

            {/* Status Tab — Bot Fleet Dashboard */}
            <TabsContent value="status" className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <Card className="p-3 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
                  <div className="flex items-center gap-1 mb-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[10px] text-muted-foreground">הושלמו</span></div>
                  <p className="text-xl font-bold">{completedTasks.length}</p>
                </Card>
                <Card className="p-3 bg-gradient-to-br from-cyan-500/10 to-transparent border-cyan-500/20">
                  <div className="flex items-center gap-1 mb-1"><Play className="w-3.5 h-3.5 text-cyan-500" /><span className="text-[10px] text-muted-foreground">בביצוע</span></div>
                  <p className="text-xl font-bold">{runningTasks.length}</p>
                </Card>
                <Card className="p-3 bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
                  <div className="flex items-center gap-1 mb-1"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /><span className="text-[10px] text-muted-foreground">ממתינים</span></div>
                  <p className="text-xl font-bold">{pendingApprovalTasks.length}</p>
                </Card>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2"><Bot className="w-4 h-4" />The Fleet — 9 רובוטים</h3>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {fleetBots.map((bot) => {
                      const Icon = iconMap[bot.icon] || Bot;
                      const botTasks = tasks.filter(t => t.bot_id === bot.id);
                      const completedCount = botTasks.filter(t => t.status === 'completed').length;
                      const totalCount = botTasks.length;
                      const successRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                      
                      return (
                        <motion.div
                          key={bot.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-xl transition-colors",
                            bot.is_active ? "bg-muted/30 hover:bg-muted/50" : "bg-red-500/5 border border-red-500/20"
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center",
                            bot.is_active ? colorMap[bot.color] || "from-gray-500 to-gray-600" : "from-gray-400 to-gray-500 opacity-50"
                          )}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{bot.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground">{totalCount} משימות</span>
                              {totalCount > 0 && (
                                <span className={cn("text-[10px] font-medium", successRate > 70 ? "text-emerald-500" : "text-amber-500")}>
                                  {successRate}% הצלחה
                                </span>
                              )}
                            </div>
                          </div>
                          <Switch
                            checked={bot.is_active}
                            onCheckedChange={(checked) => toggleBotMutation.mutate({ botId: bot.id, isActive: checked })}
                            className="data-[state=unchecked]:bg-red-500/30"
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            {/* Approvals Tab */}
            <TabsContent value="approvals" className="mt-4">
              <ScrollArea className="h-[500px]">
                {pendingApprovalTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                    <p className="text-muted-foreground">אין משימות ממתינות לאישור</p>
                    <p className="text-xs text-muted-foreground mt-1">Human-in-the-loop: רק פעולות קריטיות דורשות אישור</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingApprovalTasks.map((task) => {
                      const bot = bots.find(b => b.id === task.bot_id);
                      const Icon = bot ? iconMap[bot.icon] || Bot : Bot;
                      
                      return (
                        <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
                          <div className="flex items-start gap-3 mb-3">
                            <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0",
                              bot ? colorMap[bot.color] : "from-gray-500 to-gray-600")}>
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{task.title}</p>
                              <p className="text-xs text-muted-foreground">{bot?.name}</p>
                            </div>
                            <Badge className={priorityConfig[task.priority]?.color}>{priorityConfig[task.priority]?.label}</Badge>
                          </div>
                          {task.description && <p className="text-xs text-muted-foreground mb-2">{task.description}</p>}
                          {task.reason && <p className="text-xs mb-2"><span className="font-medium">סיבה: </span>{task.reason}</p>}
                          {task.expected_outcome && <p className="text-xs mb-3"><span className="font-medium">תוצאה צפויה: </span>{task.expected_outcome}</p>}
                          <div className="flex gap-2">
                            <Button size="sm" className="flex-1 gap-1.5" onClick={() => approveMutation.mutate(task.id)} disabled={approveMutation.isPending}>
                              <Check className="w-3.5 h-3.5" />אשר
                            </Button>
                            <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => rejectMutation.mutate(task.id)} disabled={rejectMutation.isPending}>
                              <X className="w-3.5 h-3.5" />דחה
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Logs Tab */}
            <TabsContent value="logs" className="mt-4">
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {actionLogs.map((log: any) => {
                    const botInfo = log.agent_bots;
                    const Icon = botInfo ? iconMap[botInfo.icon] || Bot : Bot;
                    return (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                        <div className={cn("w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0",
                          botInfo ? colorMap[botInfo.color] : "from-gray-500 to-gray-600")}>
                          <Icon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{log.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground">{botInfo?.name}</span>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(log.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0">{log.action_type}</Badge>
                      </div>
                    );
                  })}
                  {actionLogs.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground text-sm">אין לוגים עדיין</div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Queue Tab */}
            <TabsContent value="queue" className="mt-4">
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {tasks.slice(0, 20).map((task) => {
                    const bot = bots.find(b => b.id === task.bot_id);
                    const status = statusConfig[task.status];
                    const StatusIcon = status?.icon || Clock;
                    return (
                      <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", status?.color || "bg-muted")}>
                          <StatusIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <p className="text-xs text-muted-foreground">{bot?.name}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{status?.label}</Badge>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AIControlRoom;
