import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Crown, 
  Send, 
  Bot, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  ChevronRight,
  Sparkles,
  FileText,
  X,
  Check,
  Megaphone,
  PenTool,
  Target,
  MessageCircle,
  Store,
  Truck,
  Wallet,
  Headphones,
  BarChart3,
  Activity,
  Zap,
  TrendingUp
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Types
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

// Icon mapping
const iconMap: Record<string, React.ComponentType<any>> = {
  crown: Crown,
  megaphone: Megaphone,
  'pen-tool': PenTool,
  target: Target,
  'message-circle': MessageCircle,
  store: Store,
  truck: Truck,
  wallet: Wallet,
  headphones: Headphones,
  'bar-chart-3': BarChart3,
  bot: Bot
};

const colorMap: Record<string, string> = {
  purple: "from-purple-500 to-purple-600",
  pink: "from-pink-500 to-pink-600",
  cyan: "from-cyan-500 to-cyan-600",
  orange: "from-orange-500 to-orange-600",
  green: "from-green-500 to-green-600",
  blue: "from-blue-500 to-blue-600",
  amber: "from-amber-500 to-amber-600",
  emerald: "from-emerald-500 to-emerald-600",
  indigo: "from-indigo-500 to-indigo-600",
  violet: "from-violet-500 to-violet-600"
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  draft: { label: "טיוטה", color: "bg-muted text-muted-foreground", icon: FileText },
  pending_approval: { label: "ממתין לאישור", color: "bg-amber-500/10 text-amber-600", icon: AlertTriangle },
  approved: { label: "מאושר", color: "bg-blue-500/10 text-blue-600", icon: CheckCircle2 },
  running: { label: "בביצוע", color: "bg-cyan-500/10 text-cyan-600", icon: Play },
  completed: { label: "הושלם", color: "bg-emerald-500/10 text-emerald-600", icon: CheckCircle2 },
  failed: { label: "נכשל", color: "bg-red-500/10 text-red-600", icon: X },
  cancelled: { label: "בוטל", color: "bg-muted text-muted-foreground", icon: X }
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "נמוכה", color: "bg-muted text-muted-foreground" },
  medium: { label: "בינונית", color: "bg-blue-500/10 text-blue-600" },
  high: { label: "גבוהה", color: "bg-orange-500/10 text-orange-600" },
  urgent: { label: "דחוף", color: "bg-red-500/10 text-red-600" }
};

const AIControlRoom = () => {
  const [activeTab, setActiveTab] = useState("chat");
  const [inputMessage, setInputMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "שלום! אני PetID Ops Commander 👑\n\nאני מנהל את צוות הבוטים שלך ומתאם את כל הפעילות העסקית. איך אוכל לעזור היום?\n\nאפשר לשאול אותי על:\n• סטטוס משימות ובוטים\n• יצירת קמפיינים שיווקיים\n• ניתוח מכירות ומלאי\n• או כל דבר אחר שקשור לעסק",
      created_at: new Date().toISOString()
    }
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch bots
  const { data: bots = [] } = useQuery({
    queryKey: ['agent-bots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_bots')
        .select('*')
        .order('created_at');
      if (error) throw error;
      return data as AgentBot[];
    }
  });

  // Fetch tasks
  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['agent-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_tasks')
        .select('*, agent_bots(*)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as AgentTask[];
    }
  });

  // Approve task mutation
  const approveMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('agent_tasks')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
      toast.success("משימה אושרה בהצלחה");
    }
  });

  // Reject task mutation
  const rejectMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('agent_tasks')
        .update({ status: 'cancelled' })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
      toast.success("משימה נדחתה");
    }
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Send message to orchestrator
  const sendMessage = async () => {
    if (!inputMessage.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputMessage,
      created_at: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsStreaming(true);

    // Add placeholder for assistant response
    const assistantId = crypto.randomUUID();
    setChatMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString()
    }]);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/orchestrator-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({
            messages: chatMessages.concat(userMessage).map(m => ({
              role: m.role,
              content: m.content
            }))
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      let buffer = '';
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ') && trimmedLine !== 'data: [DONE]') {
            try {
              const data = JSON.parse(trimmedLine.slice(6));
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
                setChatMessages(prev => prev.map(m => 
                  m.id === assistantId ? { ...m, content: fullContent.replace(/<task>[\s\S]*?<\/task>/g, '').trim() } : m
                ));
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      // Refetch tasks after response (bot may have created new tasks)
      refetchTasks();
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, content: 'מצטער, אירעה שגיאה. אנא נסה שוב.' }
          : m
      ));
      toast.error("שגיאה בתקשורת עם המערכת");
    } finally {
      setIsStreaming(false);
    }
  };

  const pendingApprovalTasks = tasks.filter(t => t.status === 'pending_approval');
  const runningTasks = tasks.filter(t => t.status === 'running');
  const draftTasks = tasks.filter(t => t.status === 'draft');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const orchestrator = bots.find(b => b.slug === 'orchestrator');
  const otherBots = bots.filter(b => b.slug !== 'orchestrator');

  return (
    <AdminLayout title="AI Control Room" icon={Crown}>
      <div className="grid lg:grid-cols-[1fr_380px] gap-6 h-[calc(100vh-180px)]">
        {/* Main Chat Area */}
        <Card className="flex flex-col overflow-hidden border-border/50">
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">PetID Ops Commander</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm text-muted-foreground">פעיל • מנהל {otherBots.length} בוטים</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <Zap className="w-3 h-3" />
                  {tasks.length} משימות
                </Badge>
                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/30 bg-amber-500/10">
                  <AlertTriangle className="w-3 h-3" />
                  {pendingApprovalTasks.length} ממתינות
                </Badge>
              </div>
            </div>
          </CardHeader>

          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {chatMessages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-3",
                    message.role === 'user' ? "flex-row-reverse" : ""
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shrink-0">
                      <Crown className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={cn(
                    "rounded-2xl px-4 py-3 max-w-[80%]",
                    message.role === 'user' 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted/50"
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

          {/* Input Area */}
          <div className="p-4 border-t border-border/50">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="שאל את המפקד..."
                className="flex-1 px-4 py-3 rounded-xl bg-muted/50 border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                disabled={isStreaming}
              />
              <Button 
                onClick={sendMessage} 
                disabled={isStreaming || !inputMessage.trim()}
                className="px-4"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2 mt-3">
              {["מה המצב היום?", "צור קמפיין חדש", "נתח מכירות"].map((suggestion) => (
                <Button 
                  key={suggestion}
                  variant="outline" 
                  size="sm"
                  className="text-xs"
                  onClick={() => setInputMessage(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Right Sidebar */}
        <div className="space-y-4 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="chat" className="gap-1.5 text-xs">
                <Activity className="w-3.5 h-3.5" />
                סטטוס
              </TabsTrigger>
              <TabsTrigger value="approvals" className="gap-1.5 text-xs">
                <AlertTriangle className="w-3.5 h-3.5" />
                אישורים
                {pendingApprovalTasks.length > 0 && (
                  <Badge className="w-5 h-5 p-0 justify-center text-[10px] bg-amber-500">
                    {pendingApprovalTasks.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="queue" className="gap-1.5 text-xs">
                <Clock className="w-3.5 h-3.5" />
                תור
              </TabsTrigger>
            </TabsList>

            {/* Status Tab */}
            <TabsContent value="chat" className="mt-4 space-y-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="p-3 bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs text-muted-foreground">הושלמו</span>
                  </div>
                  <p className="text-2xl font-bold">{completedTasks.length}</p>
                </Card>
                <Card className="p-3 bg-gradient-to-br from-cyan-500/10 to-transparent border-cyan-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Play className="w-4 h-4 text-cyan-500" />
                    <span className="text-xs text-muted-foreground">בביצוע</span>
                  </div>
                  <p className="text-2xl font-bold">{runningTasks.length}</p>
                </Card>
              </div>

              {/* Bot Status Cards */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  סטטוס בוטים
                </h3>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {otherBots.map((bot) => {
                      const Icon = iconMap[bot.icon] || Bot;
                      const botTasks = tasks.filter(t => t.bot_id === bot.id);
                      const runningCount = botTasks.filter(t => t.status === 'running').length;
                      
                      return (
                        <motion.div
                          key={bot.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center",
                            colorMap[bot.color] || "from-gray-500 to-gray-600"
                          )}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{bot.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{bot.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {runningCount > 0 && (
                              <Badge className="bg-cyan-500/10 text-cyan-600 border-cyan-500/30 text-xs">
                                {runningCount} פעיל
                              </Badge>
                            )}
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              bot.is_active ? "bg-emerald-500" : "bg-muted"
                            )} />
                          </div>
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
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingApprovalTasks.map((task) => {
                      const bot = bots.find(b => b.id === task.bot_id);
                      const Icon = bot ? iconMap[bot.icon] || Bot : Bot;
                      
                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5"
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className={cn(
                              "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0",
                              bot ? colorMap[bot.color] : "from-gray-500 to-gray-600"
                            )}>
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{task.title}</p>
                              <p className="text-xs text-muted-foreground">{bot?.name}</p>
                            </div>
                            <Badge className={priorityConfig[task.priority]?.color}>
                              {priorityConfig[task.priority]?.label}
                            </Badge>
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mb-2">{task.description}</p>
                          )}
                          {task.reason && (
                            <p className="text-xs mb-2">
                              <span className="font-medium">סיבה: </span>{task.reason}
                            </p>
                          )}
                          {task.expected_outcome && (
                            <p className="text-xs mb-3">
                              <span className="font-medium">תוצאה צפויה: </span>{task.expected_outcome}
                            </p>
                          )}
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              className="flex-1 gap-1.5"
                              onClick={() => approveMutation.mutate(task.id)}
                              disabled={approveMutation.isPending}
                            >
                              <Check className="w-3.5 h-3.5" />
                              אשר
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1 gap-1.5"
                              onClick={() => rejectMutation.mutate(task.id)}
                              disabled={rejectMutation.isPending}
                            >
                              <X className="w-3.5 h-3.5" />
                              דחה
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
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
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/30"
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          status?.color || "bg-muted"
                        )}>
                          <StatusIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{task.title}</p>
                          <p className="text-xs text-muted-foreground">{bot?.name}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {status?.label}
                        </Badge>
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
