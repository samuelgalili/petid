import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { haptic, successFeedback } from "@/lib/haptics";
import {
  Crown, Brain, Bot, Shield, Sparkles, Target, MessageCircle, Store,
  Headphones, Stethoscope, Scale, Eye, Megaphone, Cpu,
  CheckCircle2, XCircle, DollarSign, TrendingUp, Zap,
  ChevronRight, Activity, AlertTriangle, X,
} from "lucide-react";
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

// ─── Swipeable Decision Card ────────────────────────────────
const DecisionCard = ({
  item,
  onApprove,
  onReject,
}: {
  item: any;
  onApprove: () => void;
  onReject: () => void;
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-6, 6]);
  const approveOp = useTransform(x, [0, 100], [0, 1]);
  const rejectOp = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100) { successFeedback(); onApprove(); }
    else if (info.offset.x < -100) { haptic("error"); onReject(); }
  };

  const categoryIcon = item.category === "sales" ? DollarSign
    : item.category === "content" ? Sparkles
    : item.category === "ethics" ? Shield
    : item.category === "payment" ? Scale
    : Zap;
  const CatIcon = categoryIcon;

  return (
    <motion.div className="absolute inset-0" style={{ x, rotate }} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.7} onDragEnd={handleDragEnd} whileTap={{ scale: 0.98 }}>
      <motion.div className="absolute inset-0 rounded-[20px] border-2 border-emerald-500/40 bg-emerald-500/5 flex items-center justify-start pl-6 pointer-events-none" style={{ opacity: approveOp }}>
        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
      </motion.div>
      <motion.div className="absolute inset-0 rounded-[20px] border-2 border-red-500/40 bg-red-500/5 flex items-center justify-end pr-6 pointer-events-none" style={{ opacity: rejectOp }}>
        <XCircle className="w-10 h-10 text-red-400" />
      </motion.div>

      <div className="relative z-10 h-full rounded-[20px] p-5 border border-border/20 backdrop-blur-xl bg-card/90 cursor-grab active:cursor-grabbing"
        style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.04)" }}>
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <CatIcon className="w-5 h-5 text-primary" strokeWidth={1.5} />
          </div>
          <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-500 bg-amber-500/5">ממתין לאישור</Badge>
        </div>
        <h3 className="text-base font-bold text-foreground mb-1 line-clamp-2">{item.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{item.description}</p>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-[9px]">{item.category}</Badge>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="rounded-xl border-red-500/30 text-red-400 hover:bg-red-500/10 h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); haptic("error"); onReject(); }}>
              <XCircle className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); successFeedback(); onApprove(); }}>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <p className="text-[9px] text-muted-foreground/50 text-center mt-3">← דחה · גרור · אשר →</p>
      </div>
    </motion.div>
  );
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

// ─── Main Sovereign Dashboard ───────────────────────────────
const SovereignDashboard = () => {
  const queryClient = useQueryClient();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [currentCard, setCurrentCard] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);

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

  const handleApprove = async () => {
    const item = approvals[currentCard];
    if (item) {
      await supabase.from("admin_approval_queue").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", item.id);
      queryClient.invalidateQueries({ queryKey: ["sovereign-approvals"] });
    }
    setCurrentCard(c => c + 1);
  };

  const handleReject = async () => {
    const item = approvals[currentCard];
    if (item) {
      await supabase.from("admin_approval_queue").update({ status: "rejected", reviewed_at: new Date().toISOString() }).eq("id", item.id);
      queryClient.invalidateQueries({ queryKey: ["sovereign-approvals"] });
    }
    setCurrentCard(c => c + 1);
  };

  const visibleApprovals = approvals.slice(currentCard);
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
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">14 סוכנים</h2>
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

            {/* ─── Decision Cards (Tinder-style) ──────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
                  תור החלטות CEO
                </h2>
                <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-500">
                  {Math.max(0, approvals.length - currentCard)} ממתינים
                </Badge>
              </div>
              <div className="relative h-[200px]">
                <AnimatePresence>
                  {visibleApprovals.slice(0, 3).map((item, idx) => (
                    <motion.div
                      key={item.id}
                      className="absolute inset-0"
                      style={{
                        zIndex: 3 - idx,
                        transform: `scale(${1 - idx * 0.04}) translateY(${idx * 8}px)`,
                      }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1 - idx * 0.2, scale: 1 - idx * 0.04, y: idx * 8 }}
                      exit={{ opacity: 0, x: 300 }}
                    >
                      {idx === 0 ? (
                        <DecisionCard item={item} onApprove={handleApprove} onReject={handleReject} />
                      ) : (
                        <div className="h-full rounded-[20px] border border-border/10 bg-card/40 backdrop-blur-sm" />
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {visibleApprovals.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500/30" />
                      <p className="text-xs text-muted-foreground">כל ההחלטות טופלו ✓</p>
                    </div>
                  </div>
                )}
              </div>
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
