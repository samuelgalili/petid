import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { haptic, successFeedback } from "@/lib/haptics";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  Crown, Brain, Bot, Shield, Sparkles, Target, MessageCircle, Store,
  Headphones, Stethoscope, Scale, Eye, Megaphone, Cpu, Search,
  CheckCircle2, XCircle, DollarSign, TrendingUp, Zap, Truck,
  ChevronRight, ChevronDown, Activity, AlertTriangle, X, Send, RefreshCw,
  Pencil, FileText,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Agent Config ───────────────────────────────────────────
const AGENT_DEFS = [
  { slug: "brain", name: "Brain", icon: Brain, color: "from-violet-500 to-violet-600" },
  { slug: "sales", name: "Danny", icon: DollarSign, color: "from-amber-500 to-amber-600" },
  { slug: "nrc", name: "Dr. NRC", icon: Stethoscope, color: "from-emerald-500 to-emerald-600" },
  { slug: "support", name: "Sarah", icon: Headphones, color: "from-blue-500 to-blue-600" },
  { slug: "content", name: "Lumi", icon: Sparkles, color: "from-pink-500 to-pink-600" },
  { slug: "system-architect", name: "Ido", icon: Cpu, color: "from-slate-600 to-slate-800" },
  { slug: "ui-health", name: "Ofek", icon: Eye, color: "from-cyan-500 to-cyan-600" },
  { slug: "crm", name: "CRM", icon: MessageCircle, color: "from-indigo-500 to-indigo-600" },
  { slug: "inventory", name: "Roni", icon: Store, color: "from-orange-500 to-orange-600" },
  { slug: "market-intelligence", name: "Beni", icon: Target, color: "from-cyan-500 to-cyan-700" },
  { slug: "cashflow-guardian", name: "Golan", icon: Scale, color: "from-green-500 to-green-700" },
  { slug: "vip-experience", name: "Siggy", icon: Sparkles, color: "from-pink-400 to-rose-600" },
  { slug: "crisis-pr", name: "Menachem", icon: Megaphone, color: "from-orange-500 to-red-600" },
  { slug: "ethics-safety", name: "Ethi", icon: Shield, color: "from-indigo-500 to-purple-600" },
  { slug: "health-prediction", name: "Einstein", icon: Brain, color: "from-teal-500 to-emerald-600" },
  { slug: "financial-algo", name: "Quant", icon: Cpu, color: "from-blue-600 to-indigo-700" },
  { slug: "fraud-detection", name: "Sherlock", icon: Search, color: "from-red-500 to-rose-700" },
  { slug: "supply-chain", name: "Walt", icon: Truck, color: "from-amber-500 to-orange-600" },
  { slug: "onboarding-guide", name: "Ori", icon: Sparkles, color: "from-violet-400 to-purple-600" },
];

// ─── Agent Sidebar Item ─────────────────────────────────────
const AgentPill = ({
  agent,
  botData,
  isSelected,
  onClick,
}: {
  agent: typeof AGENT_DEFS[0];
  botData: any;
  isSelected: boolean;
  onClick: () => void;
}) => {
  const Icon = agent.icon;
  const isActive = botData?.is_active;
  const health = botData?.health_status;

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl transition-all text-right",
        "backdrop-blur-xl border",
        isSelected
          ? "bg-card/90 border-primary/30 shadow-lg shadow-primary/5"
          : "bg-card/40 border-border/10 hover:bg-card/70 hover:border-border/30"
      )}
    >
      <div className={cn(
        "w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 relative",
        agent.color
      )}>
        <Icon className="w-4 h-4 text-white" strokeWidth={1.5} />
        {/* Live status pulse */}
        <span className={cn(
          "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card",
          isActive
            ? health === "warning" ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
            : "bg-muted-foreground/40"
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-xs font-semibold truncate", isSelected ? "text-foreground" : "text-foreground/80")}>{agent.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">{agent.slug}</p>
      </div>
      {isSelected && <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0" />}
    </motion.button>
  );
};

// ─── Agent Sub-Logs Panel ───────────────────────────────────
const AgentLogsPanel = ({ agentSlug, onClose }: { agentSlug: string; onClose: () => void }) => {
  const agent = AGENT_DEFS.find(a => a.slug === agentSlug);
  const { data: logs = [] } = useQuery({
    queryKey: ["agent-logs", agentSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("agent_action_logs")
        .select("*")
        .or(`action_type.ilike.%${agentSlug}%,metadata->>agent_slug.eq.${agentSlug}`)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="rounded-2xl border border-border/20 bg-card/80 backdrop-blur-xl overflow-hidden"
    >
      <div className="flex items-center justify-between p-4 border-b border-border/10">
        <div className="flex items-center gap-2">
          {agent && <agent.icon className="w-4 h-4 text-primary" strokeWidth={1.5} />}
          <h3 className="text-sm font-bold text-foreground">{agent?.name} — לוגים</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      <ScrollArea className="max-h-[300px]">
        <div className="p-3 space-y-2">
          {logs.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">אין לוגים עדיין</p>
          )}
          {logs.map((log: any) => (
            <div key={log.id} className="p-3 rounded-xl bg-muted/30 border border-border/10">
              <div className="flex items-center justify-between mb-1">
                <Badge variant="outline" className="text-[9px]">{log.action_type}</Badge>
                <span className="text-[9px] text-muted-foreground">
                  {new Date(log.created_at).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-xs text-foreground/80">{log.description}</p>
            </div>
          ))}
        </div>
      </ScrollArea>
    </motion.div>
  );
};

// ─── Category Icon Helper ───────────────────────────────────
const getCategoryIcon = (category: string) => {
  if (category === "sales") return DollarSign;
  if (category === "content") return Sparkles;
  if (category === "ethics") return Shield;
  if (category === "payment") return Scale;
  return Zap;
};

// ─── Prometheus Brain Module ────────────────────────────────
const PrometheusBrainModule = () => {
  const { data: improvements = [] } = useQuery({
    queryKey: ["sovereign-prometheus"],
    queryFn: async () => {
      const { data } = await supabase
        .from("prometheus_intelligence_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const isOptimizing = improvements.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className={cn(
            "w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center",
            isOptimizing && "shadow-lg shadow-violet-500/30"
          )}>
            <Brain className="w-6 h-6 text-white" strokeWidth={1.5} />
          </div>
          {isOptimizing && (
            <motion.div
              className="absolute inset-0 rounded-2xl border-2 border-violet-400/50"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Prometheus</h3>
          <p className="text-[10px] text-muted-foreground">
            {isOptimizing ? "מבצע אופטימיזציה עצמית..." : "במצב המתנה"}
          </p>
        </div>
        {isOptimizing && (
          <Badge className="text-[9px] bg-violet-500/10 text-violet-500 border-violet-500/20 mr-auto">
            <Activity className="w-2.5 h-2.5 mr-1" />
            פעיל
          </Badge>
        )}
      </div>

      {improvements.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Before → After</p>
          {improvements.map((imp: any) => (
            <motion.div
              key={imp.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground font-medium">{imp.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{imp.agent_slug}</p>
                </div>
                {imp.improvement_pct && (
                  <Badge className="text-[9px] bg-emerald-500/10 text-emerald-500 shrink-0">
                    +{Math.round(imp.improvement_pct)}%
                  </Badge>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Financial Heartbeat (Golan) ────────────────────────────
const FinancialHeartbeat = () => {
  const { data: fin } = useQuery({
    queryKey: ["sovereign-financial"],
    queryFn: async () => {
      const [ordersRes, invoicesRes, leadsRes] = await Promise.all([
        supabase.from("orders").select("total, status"),
        supabase.from("supplier_invoices").select("amount, status"),
        supabase.from("insurance_leads").select("status, quality_tier"),
      ]);
      const orders = ordersRes.data || [];
      const invoices = invoicesRes.data || [];
      const leads = leadsRes.data || [];
      const revenue = orders.reduce((s, o) => s + parseFloat(o.total?.toString() || "0"), 0);
      const costs = invoices.reduce((s, i) => s + parseFloat(i.amount?.toString() || "0"), 0);
      const pendingPayouts = leads.filter((l: any) => l.status === "converted").length * 100; // ₪100 per lead
      return { revenue, costs, net: revenue - costs, pendingPayouts, totalLeads: leads.length };
    },
  });

  const fmt = (n: number) => `₪${n.toLocaleString("he-IL", { maximumFractionDigits: 0 })}`;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="p-4 rounded-2xl border border-border/10 bg-card/60 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.5} />
            <span className="text-[10px] text-muted-foreground font-medium">רווח נקי</span>
          </div>
          <p className="text-xl font-black text-foreground">{fmt(fin?.net || 0)}</p>
        </div>
      </div>
      <div className="p-4 rounded-2xl border border-border/10 bg-card/60 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-1.5 mb-2">
            <Scale className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.5} />
            <span className="text-[10px] text-muted-foreground font-medium">תשלומי שותפים</span>
          </div>
          <p className="text-xl font-black text-foreground">{fmt(fin?.pendingPayouts || 0)}</p>
          <p className="text-[9px] text-amber-500 mt-0.5">Golan מנטר</p>
        </div>
      </div>
    </div>
  );
};

// ─── Brain Command Prompt ────────────────────────────────────
interface ChatMsg { id: string; role: "user" | "assistant"; content: string; }

const BrainCommandPrompt = () => {
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendCommand = async () => {
    if (!input.trim() || isStreaming) return;
    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", content: input };
    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, userMsg, { id: assistantId, role: "assistant", content: "" }]);
    setInput("");
    setIsStreaming(true);
    setIsExpanded(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("נדרשת התחברות"); return; }

      const allMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/orchestrator-chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ messages: allMessages }),
        }
      );

      if (!resp.ok) {
        if (resp.status === 429) { toast.error("יותר מדי בקשות"); return; }
        if (resp.status === 402) { toast.error("נדרש תשלום — הוסף קרדיטים"); return; }
        throw new Error("Failed");
      }

      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ") || trimmed === "data: [DONE]") continue;
          try {
            const jsonStr = trimmed.slice(6);
            if (!jsonStr.startsWith("{")) continue;
            const data = JSON.parse(jsonStr);
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              const display = fullContent
                .replace(/<task>[\s\S]*?<\/task>/g, "")
                .replace(/<action>[\s\S]*?<\/action>/g, "")
                .trim();
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: display || "מעבד..." } : m));
            }
          } catch { /* skip */ }
        }
      }

      // Count created actions/tasks
      const taskCount = (fullContent.match(/<task>/g) || []).length;
      const actionCount = (fullContent.match(/<action>/g) || []).length;
      const total = taskCount + actionCount;
      if (total > 0) {
        toast.success(`✅ ${total} פעולות נוצרו ונשלחו לאישור`);
      }

      queryClient.invalidateQueries({ queryKey: ["sovereign-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["sovereign-agents"] });
    } catch (error) {
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: "שגיאה בתקשורת. נסה שוב." } : m));
      toast.error("שגיאה בשליחה ל-Brain Bot");
    } finally {
      setIsStreaming(false);
    }
  };

  const quickPrompts = [
    "בדוק סטטוס כל הרובוטים",
    "תקן באגים באתר",
    "עדכן תוכן דף הבית",
    "שפר עיצוב מובייל",
    "דוח מלאי קריטי",
    "בדוק רישיונות שפגו",
  ];

  return (
    <Card className="border-violet-500/20 bg-card/80 backdrop-blur-xl relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Brain className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Brain Command</h3>
              <p className="text-[10px] text-muted-foreground">כתוב פקודה → המוח ידאג לכל השאר</p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" className="text-[10px] h-7" onClick={() => { setMessages([]); setIsExpanded(false); }}>
              שיחה חדשה
            </Button>
          )}
        </div>

        {/* Chat history */}
        <AnimatePresence>
          {isExpanded && messages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div ref={scrollRef} className="max-h-[300px] overflow-y-auto mb-3 space-y-2.5 scrollbar-hide">
                {messages.map((msg) => (
                  <div key={msg.id} className={cn("flex gap-2", msg.role === "user" ? "flex-row-reverse" : "")}>
                    {msg.role === "assistant" && (
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Brain className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className={cn(
                      "rounded-2xl px-3 py-2 max-w-[85%] text-sm",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/40"
                    )}>
                      {msg.role === "assistant" && msg.content ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed" dir="rtl">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : msg.role === "assistant" ? (
                        <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <RefreshCw className="w-3 h-3 animate-spin" /> חושב...
                        </span>
                      ) : (
                        <p className="whitespace-pre-wrap" dir="rtl">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendCommand(); }
            }}
            placeholder="תאר מה לעשות... (תיקון באג, עדכון תוכן, שינוי עיצוב, הגדרות...)"
            className="flex-1 min-h-[44px] max-h-[100px] resize-none bg-muted/30 border-border/30 text-sm"
            disabled={isStreaming}
            dir="rtl"
          />
          <Button
            onClick={sendCommand}
            disabled={isStreaming || !input.trim()}
            size="icon"
            className="shrink-0 h-11 w-11 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700"
          >
            {isStreaming ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>

        {/* Quick prompts */}
        <div className="flex gap-1.5 mt-2.5 flex-wrap">
          {quickPrompts.map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="text-[10px] px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 transition-colors"
              disabled={isStreaming}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
};

// ─── Main Sovereign Dashboard ───────────────────────────────
const SovereignDashboard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("sovereign-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "automation_bots" }, () => {
        queryClient.invalidateQueries({ queryKey: ["sovereign-agents"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_approval_queue" }, () => {
        queryClient.invalidateQueries({ queryKey: ["sovereign-approvals"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // All agents
  const { data: bots = [] } = useQuery({
    queryKey: ["sovereign-agents"],
    queryFn: async () => {
      const { data } = await supabase.from("automation_bots").select("*").order("created_at");
      return data || [];
    },
  });

  // Approval queue
  const { data: approvals = [] } = useQuery({
    queryKey: ["sovereign-approvals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_approval_queue")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const handleApprove = async (id: string) => {
    await supabase.from("admin_approval_queue").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["sovereign-approvals"] });
    successFeedback();
    toast.success("✅ אושר");
  };

  const handleReject = async (id: string) => {
    await supabase.from("admin_approval_queue").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["sovereign-approvals"] });
    haptic("error");
    toast.success("נדחה");
  };

  const activeBots = bots.filter((b: any) => b.is_active).length;
  const getBotData = (slug: string) => bots.find((b: any) => b.slug === slug);

  return (
    <AdminLayout title="Sovereign Dashboard" icon={Crown} breadcrumbs={[{ label: "CEO Sovereign" }]}>
      <div className="max-w-7xl mx-auto" dir="rtl">
        {/* ─── Mobile: Top Agent Scroll Strip ─────────────── */}
        <div className="lg:hidden mb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {AGENT_DEFS.map(agent => {
              const bot = getBotData(agent.slug);
              const Icon = agent.icon;
              const isActive = bot?.is_active;
              return (
                <button
                  key={agent.slug}
                  onClick={() => setSelectedAgent(selectedAgent === agent.slug ? null : agent.slug)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-2xl shrink-0 transition-all border backdrop-blur-xl",
                    selectedAgent === agent.slug
                      ? "bg-card/90 border-primary/30 shadow-md"
                      : "bg-card/40 border-border/10"
                  )}
                >
                  <div className={cn("w-7 h-7 rounded-lg bg-gradient-to-br flex items-center justify-center relative", agent.color)}>
                    <Icon className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
                    <span className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-card",
                      isActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"
                    )} />
                  </div>
                  <span className="text-[11px] font-medium text-foreground">{agent.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-6">
          {/* ─── Desktop: Agent Sidebar ──────────────────── */}
          <div className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">19 סוכנים</h2>
                <Badge variant="outline" className="text-[9px]">{activeBots} פעילים</Badge>
              </div>
              <div className="space-y-1.5">
                {AGENT_DEFS.map(agent => (
                  <AgentPill
                    key={agent.slug}
                    agent={agent}
                    botData={getBotData(agent.slug)}
                    isSelected={selectedAgent === agent.slug}
                    onClick={() => setSelectedAgent(selectedAgent === agent.slug ? null : agent.slug)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ─── Main Content ───────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Agent Logs Panel (when selected) */}
            <AnimatePresence>
              {selectedAgent && (
                <AgentLogsPanel agentSlug={selectedAgent} onClose={() => setSelectedAgent(null)} />
              )}
            </AnimatePresence>

            {/* ─── Brain Command Prompt ─────────────────── */}
            <BrainCommandPrompt />

            {/* ─── Decision Queue (Uniform List) ──────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
                  תור החלטות CEO
                </h2>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-500">
                    {approvals.length} ממתינים
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[10px] h-7 text-muted-foreground gap-1"
                    onClick={() => navigate("/admin/approval-queue")}
                  >
                    רשימה מלאה
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {approvals.length === 0 ? (
                <div className="flex items-center justify-center py-10 rounded-2xl border border-border/10 bg-card/40">
                  <div className="text-center">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500/30" />
                    <p className="text-xs text-muted-foreground">כל ההחלטות טופלו ✓</p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {approvals.map((item: any, idx: number) => {
                        const CatIcon = getCategoryIcon(item.category);
                        return (
                          <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -60 }}
                            transition={{ delay: idx * 0.03 }}
                            className="rounded-2xl p-4 border border-border/20 bg-card/70 backdrop-blur-xl transition-all hover:bg-card/90"
                          >
                            <div className="flex items-start gap-3">
                              {/* Icon */}
                              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <CatIcon className="w-4 h-4 text-primary" strokeWidth={1.5} />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-500 bg-amber-500/5 shrink-0">
                                    ממתין
                                  </Badge>
                                  {item.category && (
                                    <Badge variant="outline" className="text-[9px] shrink-0">{item.category}</Badge>
                                  )}
                                  <span className="text-[9px] text-muted-foreground/50 mr-auto">
                                    {new Date(item.created_at).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </div>
                                <h4 className="text-sm font-bold text-foreground mb-0.5 line-clamp-1">{item.title}</h4>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-2 justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-xl border-red-500/30 text-red-400 hover:bg-red-500/10 h-7 text-[10px] px-3 gap-1"
                                    onClick={() => handleReject(item.id)}
                                  >
                                    <XCircle className="w-3 h-3" />
                                    דחה
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white h-7 text-[10px] px-3 gap-1"
                                    onClick={() => handleApprove(item.id)}
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    אשר
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* ─── Financial Heartbeat ─────────────────── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
                <h2 className="text-sm font-bold text-foreground">Financial Heartbeat</h2>
              </div>
              <FinancialHeartbeat />
            </div>

            {/* ─── Prometheus Module ──────────────────── */}
            <div className="p-5 rounded-2xl border border-violet-500/10 bg-card/60 backdrop-blur-xl relative overflow-hidden"
              style={{ boxShadow: "0 4px 30px rgba(139,92,246,0.06)" }}>
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/3 to-transparent pointer-events-none" />
              <div className="relative">
                <PrometheusBrainModule />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SovereignDashboard;
