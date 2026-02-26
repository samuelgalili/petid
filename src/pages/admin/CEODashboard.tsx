import { useState, useEffect, useRef } from "react";
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
  TrendingUp, DollarSign, Brain, Shield, Sparkles,
  CheckCircle2, AlertTriangle, XCircle, Package,
  Truck, Globe, ArrowUpRight, Zap, Crown,
  ChevronLeft, ChevronRight, FileWarning, Send,
  Activity, Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────
interface ActionCard {
  id: string;
  type: "inventory" | "insurance" | "audit";
  title: string;
  subtitle: string;
  metric: string;
  metricLabel: string;
  icon: React.ComponentType<any>;
  accentColor: string;
  glowColor: string;
}

interface BrainUpdate {
  id: string;
  agent: string;
  emoji: string;
  message: string;
  time: string;
  type: "learning" | "action" | "alert";
}

// ─── Swipeable Action Card ──────────────────────────────────
const SwipeableCard = ({
  card,
  onApprove,
  onReject,
}: {
  card: ActionCard;
  onApprove: () => void;
  onReject: () => void;
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-8, 8]);
  const approveOpacity = useTransform(x, [0, 100], [0, 1]);
  const rejectOpacity = useTransform(x, [-100, 0], [1, 0]);
  const Icon = card.icon;

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 120) {
      successFeedback();
      onApprove();
    } else if (info.offset.x < -120) {
      haptic("error");
      onReject();
    }
  };

  return (
    <motion.div
      className="absolute inset-0"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.98 }}
    >
      {/* Swipe indicators */}
      <motion.div
        className="absolute inset-0 rounded-[20px] border-2 border-emerald-500/50 bg-emerald-500/5 flex items-center justify-start pl-6 pointer-events-none z-0"
        style={{ opacity: approveOpacity }}
      >
        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
      </motion.div>
      <motion.div
        className="absolute inset-0 rounded-[20px] border-2 border-red-500/50 bg-red-500/5 flex items-center justify-end pr-6 pointer-events-none z-0"
        style={{ opacity: rejectOpacity }}
      >
        <XCircle className="w-10 h-10 text-red-400" />
      </motion.div>

      {/* Card content */}
      <div
        className={cn(
          "relative z-10 h-full rounded-[20px] p-6 border border-border/30 backdrop-blur-xl cursor-grab active:cursor-grabbing",
          "bg-gradient-to-br from-card/95 to-card/80"
        )}
        style={{
          boxShadow: `0 8px 32px ${card.glowColor}, 0 0 0 1px rgba(255,255,255,0.05)`,
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div
            className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center",
              card.accentColor
            )}
          >
            <Icon className="w-6 h-6 text-white" strokeWidth={1.5} />
          </div>
          <Badge
            variant="outline"
            className="text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/10"
          >
            ממתין לאישור
          </Badge>
        </div>

        <h3 className="text-lg font-bold text-foreground mb-1">{card.title}</h3>
        <p className="text-sm text-muted-foreground mb-5">{card.subtitle}</p>

        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-black text-foreground">{card.metric}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.metricLabel}</p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl border-red-500/30 text-red-400 hover:bg-red-500/10 h-9 w-9 p-0"
              onClick={(e) => { e.stopPropagation(); haptic("error"); onReject(); }}
            >
              <XCircle className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white h-9 w-9 p-0"
              onClick={(e) => { e.stopPropagation(); successFeedback(); onApprove(); }}
            >
              <CheckCircle2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground/60 text-center mt-4">
          ← דחה · גרור · אשר →
        </p>
      </div>
    </motion.div>
  );
};

// ─── Main Dashboard ─────────────────────────────────────────
const CEODashboard = () => {
  const queryClient = useQueryClient();
  const [currentCard, setCurrentCard] = useState(0);

  // ─── Realtime ───────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("ceo-dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        queryClient.invalidateQueries({ queryKey: ["ceo-financials"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "supplier_invoices" }, () => {
        queryClient.invalidateQueries({ queryKey: ["ceo-financials"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "insurance_leads" }, () => {
        queryClient.invalidateQueries({ queryKey: ["ceo-leads"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "automation_bots" }, () => {
        queryClient.invalidateQueries({ queryKey: ["ceo-agents"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // ─── Financial Data ─────────────────────────────────────────
  const { data: fin } = useQuery({
    queryKey: ["ceo-financials"],
    queryFn: async () => {
      const [ordersRes, invoicesRes] = await Promise.all([
        supabase.from("orders").select("total, status, shipping"),
        supabase.from("supplier_invoices").select("amount, status"),
      ]);
      const orders = ordersRes.data || [];
      const invoices = invoicesRes.data || [];
      const grossRevenue = orders.reduce((s, o) => s + parseFloat(o.total?.toString() || "0"), 0);
      const totalCosts = invoices.reduce((s, i) => s + parseFloat(i.amount?.toString() || "0"), 0);
      const netProfit = grossRevenue - totalCosts;
      // Simulated AI savings based on cost optimization
      const aiSavings = Math.round(totalCosts * 0.18);
      return { grossRevenue, netProfit, totalCosts, aiSavings };
    },
  });

  // ─── Leads Data ─────────────────────────────────────────────
  const { data: leads } = useQuery({
    queryKey: ["ceo-leads"],
    queryFn: async () => {
      const { data } = await supabase.from("insurance_leads").select("status, quality_tier");
      const all = data || [];
      const elite = all.filter((l: any) => l.quality_tier === "elite").length;
      const pending = all.filter((l: any) => l.status === "pending").length;
      return { total: all.length, elite, pending };
    },
  });

  // ─── Agent Status ───────────────────────────────────────────
  const { data: agents } = useQuery({
    queryKey: ["ceo-agents"],
    queryFn: async () => {
      const { data } = await supabase.from("automation_bots").select("name, slug, is_active, health_status, last_run_at");
      return data || [];
    },
  });

  // ─── Logistics ──────────────────────────────────────────────
  const { data: logistics } = useQuery({
    queryKey: ["ceo-logistics"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("status, total, shipping");
      const all = data || [];
      const inTransit = all.filter(o => o.status === "shipped");
      const totalValue = inTransit.reduce((s, o) => s + parseFloat(o.total?.toString() || "0"), 0);
      return {
        inTransit: inTransit.length,
        totalValue,
        processing: all.filter(o => o.status === "processing" || o.status === "pending").length,
        delivered: all.filter(o => o.status === "delivered").length,
      };
    },
  });

  // ─── Science ────────────────────────────────────────────────
  const { data: science } = useQuery({
    queryKey: ["ceo-science"],
    queryFn: async () => {
      const [breedsRes, nrcRes] = await Promise.all([
        supabase.from("breed_information").select("id", { count: "exact", head: true }),
        supabase.from("breed_disease_diet_rules").select("id", { count: "exact", head: true }),
      ]);
      return { breeds: breedsRes.count || 0, nrcRules: nrcRes.count || 0 };
    },
  });

  const fmt = (n: number) => n >= 1000 ? `₪${(n / 1000).toFixed(1)}K` : `₪${n.toLocaleString()}`;

  // ─── Action Cards ───────────────────────────────────────────
  const actionCards: ActionCard[] = [
    {
      id: "inventory",
      type: "inventory",
      title: "הזמנה מחדש מסין",
      subtitle: "Sarah זיהתה ירידת מלאי ב-Joint Chews Pro",
      metric: "65%",
      metricLabel: "שולי רווח צפויים",
      icon: Package,
      accentColor: "bg-gradient-to-br from-blue-500 to-blue-600",
      glowColor: "rgba(59, 130, 246, 0.15)",
    },
    {
      id: "insurance",
      type: "insurance",
      title: "Push לידים ל-Libra",
      subtitle: `${leads?.elite || 12} לידים מאומתים Elite — שבב + היסטוריה רפואית מלאה`,
      metric: String(leads?.elite || 12),
      metricLabel: "לידים Elite מאומתים",
      icon: Shield,
      accentColor: "bg-gradient-to-br from-amber-500 to-amber-600",
      glowColor: "rgba(245, 158, 11, 0.15)",
    },
    {
      id: "audit",
      type: "audit",
      title: "אי-התאמה בחשבונית #445",
      subtitle: "Sarah מצאה פער של ₪340 — טיוטת מייל מוכנה",
      metric: "₪340",
      metricLabel: "פער שזוהה",
      icon: FileWarning,
      accentColor: "bg-gradient-to-br from-red-500 to-red-600",
      glowColor: "rgba(239, 68, 68, 0.15)",
    },
  ];

  const visibleCards = actionCards.slice(currentCard);

  // ─── Brain Feed ─────────────────────────────────────────────
  const brainUpdates: BrainUpdate[] = [
    { id: "1", agent: "Dr. NRC", emoji: "🔬", message: `למד ${science?.nrcRules || 3} מחקרים קליניים חדשים היום`, time: "לפני 12 דק׳", type: "learning" },
    { id: "2", agent: "Sarah", emoji: "💬", message: "שלחה 8 תשובות אוטומטיות ללקוחות VIP", time: "לפני 25 דק׳", type: "action" },
    { id: "3", agent: "Danny", emoji: "🧠", message: "זיהה מגמת עלייה של 23% בביקוש ל-Grain-Free", time: "לפני 1 שעה", type: "learning" },
    { id: "4", agent: "Roni", emoji: "📦", message: "עדכן 47 פריטי מלאי אוטומטית מסריקת OCR", time: "לפני 2 שעות", type: "action" },
    { id: "5", agent: "Alona", emoji: "📣", message: "קמפיין IG מוכן — ממתין לאישורך", time: "לפני 3 שעות", type: "alert" },
    { id: "6", agent: "Guy", emoji: "🛡️", message: "ביצע בדיקת ציות חודשית — 100% תקין", time: "לפני 4 שעות", type: "action" },
  ];

  const handleApprove = () => {
    if (currentCard < actionCards.length - 1) setCurrentCard(c => c + 1);
  };
  const handleReject = () => {
    if (currentCard < actionCards.length - 1) setCurrentCard(c => c + 1);
  };

  const agentStatusIcon = (bot: any) => {
    if (!bot.is_active) return <XCircle className="w-2.5 h-2.5 text-red-500" />;
    if (bot.health_status === "warning" || bot.health_status === "degraded") return <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />;
    return <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />;
  };

  return (
    <AdminLayout title="CEO Dashboard" icon={Crown} breadcrumbs={[{ label: "דשבורד מנכ״ל" }]}>
      <div className="space-y-6 max-w-2xl mx-auto" dir="rtl">

        {/* ─── Agent Status Strip ────────────────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {(agents || []).slice(0, 6).map((bot: any) => (
            <div
              key={bot.slug}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border/30 shrink-0"
            >
              {agentStatusIcon(bot)}
              <span className="text-[11px] font-medium text-foreground">{bot.name}</span>
            </div>
          ))}
        </div>

        {/* ─── Primary Metrics ───────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Live Net Profit */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="rounded-[20px] border-border/30 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
              <div className="relative p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">רווח נקי חי</span>
                </div>
                <p className="text-2xl font-black text-foreground tracking-tight">
                  {fmt(fin?.netProfit || 0)}
                </p>
                <div className="flex items-center gap-1 mt-1.5">
                  <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] text-emerald-500 font-semibold">+12.4%</span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* AI Cost Savings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="rounded-[20px] border-border/30 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
              <div className="relative p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">חיסכון AI</span>
                </div>
                <p className="text-2xl font-black text-foreground tracking-tight">
                  {fmt(fin?.aiSavings || 0)}
                </p>
                <div className="flex items-center gap-1 mt-1.5">
                  <Bot className="w-3 h-3 text-amber-500" />
                  <span className="text-[10px] text-amber-500 font-semibold">18% מהעלויות</span>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* ─── Action Queue (Swipeable) ──────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              תור פעולות
            </h2>
            <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
              {actionCards.length - currentCard} ממתינים
            </Badge>
          </div>
          <div className="relative h-[220px]">
            <AnimatePresence>
              {visibleCards.map((card, idx) => (
                <motion.div
                  key={card.id}
                  className="absolute inset-0"
                  style={{
                    zIndex: visibleCards.length - idx,
                    transform: `scale(${1 - idx * 0.04}) translateY(${idx * 8}px)`,
                    opacity: idx > 2 ? 0 : 1 - idx * 0.2,
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1 - idx * 0.2, scale: 1 - idx * 0.04, y: idx * 8 }}
                  exit={{ opacity: 0, x: 300 }}
                >
                  {idx === 0 ? (
                    <SwipeableCard card={card} onApprove={handleApprove} onReject={handleReject} />
                  ) : (
                    <div
                      className="h-full rounded-[20px] p-6 border border-border/20 bg-card/60 backdrop-blur-sm"
                      style={{ boxShadow: `0 4px 16px ${card.glowColor}` }}
                    />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            {currentCard >= actionCards.length && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-emerald-500/40" />
                  <p className="text-sm font-medium text-muted-foreground">כל הפעולות טופלו ✓</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ─── Global Logistics Map ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="rounded-[20px] border-border/30 overflow-hidden">
            <div className="relative">
              {/* Minimalist dark map placeholder */}
              <div className="h-[180px] bg-gradient-to-br from-muted/80 to-muted relative overflow-hidden">
                {/* Stylized globe lines */}
                <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 180">
                  <ellipse cx="200" cy="90" rx="150" ry="70" fill="none" stroke="hsl(var(--foreground))" strokeWidth="0.5" />
                  <ellipse cx="200" cy="90" rx="100" ry="70" fill="none" stroke="hsl(var(--foreground))" strokeWidth="0.5" />
                  <ellipse cx="200" cy="90" rx="50" ry="70" fill="none" stroke="hsl(var(--foreground))" strokeWidth="0.5" />
                  <line x1="50" y1="90" x2="350" y2="90" stroke="hsl(var(--foreground))" strokeWidth="0.5" />
                  <line x1="200" y1="20" x2="200" y2="160" stroke="hsl(var(--foreground))" strokeWidth="0.5" />
                </svg>
                {/* Shipment dots */}
                <motion.div
                  className="absolute w-3 h-3 rounded-full bg-primary shadow-[0_0_12px_rgba(0,153,230,0.6)]"
                  style={{ top: "40%", left: "25%" }}
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  className="absolute w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
                  style={{ top: "55%", left: "60%" }}
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                />
                <motion.div
                  className="absolute w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]"
                  style={{ top: "35%", left: "78%" }}
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                />
                {/* Connecting lines */}
                <svg className="absolute inset-0 w-full h-full">
                  <line x1="25%" y1="40%" x2="60%" y2="55%" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                  <line x1="60%" y1="55%" x2="78%" y2="35%" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
                </svg>
              </div>

              {/* Stats overlay */}
              <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-card via-card/90 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                      <span className="text-xs font-bold text-foreground">{logistics?.inTransit || 0}</span>
                      <span className="text-[10px] text-muted-foreground">בדרך</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.5} />
                      <span className="text-xs font-bold text-foreground">{fmt(logistics?.totalValue || 0)}</span>
                      <span className="text-[10px] text-muted-foreground">שווי פעיל</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500">
                    {logistics?.delivered || 0} נמסרו
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ─── Brain Feed ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-primary" strokeWidth={1.5} />
            <h2 className="text-sm font-bold text-foreground">Brain Feed</h2>
          </div>
          <div className="space-y-2">
            {brainUpdates.map((update, idx) => (
              <motion.div
                key={update.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + idx * 0.05 }}
              >
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-card border border-border/20 hover:border-border/40 transition-colors">
                  <span className="text-lg shrink-0 mt-0.5">{update.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-foreground">{update.agent}</span>
                      <div
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          update.type === "learning" && "bg-primary",
                          update.type === "action" && "bg-emerald-500",
                          update.type === "alert" && "bg-amber-500"
                        )}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{update.message}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground/50 shrink-0">{update.time}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default CEODashboard;
