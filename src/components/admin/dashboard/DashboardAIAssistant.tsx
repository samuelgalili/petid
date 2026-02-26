import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Bot, 
  Send, 
  X, 
  MoreHorizontal,
  Search,
  AlertCircle,
  GitCompare,
  FileText,
  ThumbsUp,
  MessageCircle,
  Smile,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Circle,
  Wrench,
  HeartPulse,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  user?: {
    name: string;
    avatar?: string;
  };
}

interface QuickAction {
  icon: React.ElementType;
  label: string;
  action: string;
}

interface BotStatus {
  id: string;
  name: string;
  slug: string;
  health_status: string | null;
  is_active: boolean;
  last_run_at: string | null;
  color: string | null;
  icon: string | null;
}

const HEALTH_CONFIG: Record<string, { color: string; icon: typeof CheckCircle2; label: string }> = {
  healthy: { color: "text-emerald-500", icon: CheckCircle2, label: "תקין" },
  healed: { color: "text-sky-500", icon: Wrench, label: "תוקן" },
  error: { color: "text-destructive", icon: AlertTriangle, label: "שגיאה" },
  critical: { color: "text-destructive", icon: AlertCircle, label: "קריטי" },
};

export const DashboardAIAssistant = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! How can I assist you today?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [bots, setBots] = useState<BotStatus[]>([]);

  useEffect(() => {
    fetchBotStatuses();
    const interval = setInterval(fetchBotStatuses, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchBotStatuses = async () => {
    const { data } = await supabase
      .from("automation_bots" as any)
      .select("id, name, slug, health_status, is_active, last_run_at, color, icon")
      .order("name");
    if (data) setBots(data as any);
  };

  const quickActions: QuickAction[] = [
    { icon: Search, label: 'Analyze Sales', action: 'analyze sales data and provide insights' },
    { icon: AlertCircle, label: 'Fix Price Errors', action: 'identify and fix pricing errors in products' },
    { icon: GitCompare, label: 'Compare Competitors', action: 'compare our prices with competitors' },
    { icon: FileText, label: 'Generate Report', action: 'generate a comprehensive sales report' },
  ];

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
      user: { name: 'Jonathan Doe' }
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('orchestrator-chat', {
        body: { message: content, context: 'admin_dashboard' },
      });

      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: data?.response || 'I\'ve processed your request. Let me know if there\'s anything else you need!',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (!isOpen) {
    return (
      <Button 
        onClick={() => setIsOpen(true)}
        className="w-full justify-start gap-2"
        variant="outline"
      >
        <Bot className="w-4 h-4" />
        Open AI Assistant
      </Button>
    );
  }

  const healthyCt = bots.filter(b => b.is_active && b.health_status === "healthy").length;
  const errorCt = bots.filter(b => b.health_status === "error" || b.health_status === "critical").length;
  const activeCt = bots.filter(b => b.is_active).length;

  return (
    <Card className="bg-card border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <span className="font-semibold text-foreground text-sm">AI Assistant</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground">{activeCt} פעילים</span>
              {errorCt > 0 && (
                <span className="text-[10px] text-destructive font-medium">{errorCt} שגיאות</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-8 h-8 text-muted-foreground hover:text-foreground"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Bot Status Strip */}
      {bots.length > 0 && (
        <div className="px-4 py-2.5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-1.5 mb-2">
            <HeartPulse className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Fleet Status</span>
          </div>
          <TooltipProvider delayDuration={200}>
            <div className="flex flex-wrap gap-1">
              {bots.map((bot) => {
                const health = HEALTH_CONFIG[bot.health_status || ""] || {
                  color: bot.is_active ? "text-muted-foreground" : "text-muted-foreground/40",
                  icon: Circle,
                  label: bot.is_active ? "לא נבדק" : "כבוי",
                };
                const HealthIcon = health.icon;
                const initials = bot.name.slice(0, 2);
                const lastRun = bot.last_run_at 
                  ? new Date(bot.last_run_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
                  : "—";

                return (
                  <Tooltip key={bot.id}>
                    <TooltipTrigger asChild>
                      <div className={cn(
                        "relative flex items-center justify-center w-7 h-7 rounded-md text-[9px] font-bold cursor-default transition-all",
                        bot.is_active ? "bg-card border border-border shadow-sm" : "bg-muted/50 border border-transparent",
                        bot.health_status === "error" || bot.health_status === "critical" 
                          ? "ring-1 ring-destructive/40" 
                          : "",
                      )}>
                        <span className={cn(
                          "leading-none",
                          bot.is_active ? "text-foreground" : "text-muted-foreground/50"
                        )}>
                          {initials}
                        </span>
                        {/* Status dot */}
                        <div className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card",
                        bot.health_status === "healthy" ? "bg-primary" :
                        bot.health_status === "healed" ? "bg-accent-foreground" :
                        bot.health_status === "error" || bot.health_status === "critical" ? "bg-destructive" :
                        bot.is_active ? "bg-muted-foreground/40" : "bg-muted-foreground/20"
                        )} />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      <div className="flex items-center gap-1.5 font-medium">
                        <HealthIcon className={cn("w-3 h-3", health.color)} strokeWidth={2} />
                        {bot.name}
                      </div>
                      <div className="text-muted-foreground mt-0.5">
                        {health.label} · ריצה אחרונה: {lastRun}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="h-[240px]">
        <div className="p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="space-y-2">
              {message.role === 'assistant' ? (
                <div className="bg-muted/50 rounded-2xl p-4">
                  <p className="text-sm text-foreground">{message.content}</p>
                  {message.id === '1' && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {quickActions.map((action, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="justify-start gap-2 text-xs h-9"
                          onClick={() => sendMessage(action.action)}
                        >
                          <action.icon className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-muted text-xs text-foreground">JD</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{message.user?.name}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground hover:text-foreground">
                          <ChevronUp className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground hover:text-foreground">
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{message.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground hover:text-foreground">
                        <ThumbsUp className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground hover:text-foreground">
                        <MessageCircle className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground hover:text-foreground">
                        <Smile className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Thinking...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a command..."
            className="bg-muted/40 border-border text-foreground placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
          />
          <Button 
            size="sm"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
          >
            <Send className="w-4 h-4" strokeWidth={1.5} />
          </Button>
        </div>
      </div>
    </Card>
  );
};
