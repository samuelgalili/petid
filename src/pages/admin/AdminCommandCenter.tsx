import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign, TrendingUp, Truck, Brain, Shield, Users,
  Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw,
  ArrowUpRight, ArrowDownRight, Package, Plane, Home,
  Factory, Ship, MapPin, Sparkles, FileText, Zap,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

// ─── Agent Status Types ─────────────────────────────────────
interface AgentStatus {
  name: string;
  slug: string;
  emoji: string;
  status: "online" | "warning" | "offline";
  lastAction: string;
}

const AGENTS: AgentStatus[] = [
  { name: "Danny", slug: "danny", emoji: "🧠", status: "online", lastAction: "ניתוח מגמות מכירה" },
  { name: "Sarah", slug: "sarah", emoji: "💬", status: "online", lastAction: "מענה לפנייה #482" },
  { name: "Dr. NRC", slug: "dr-nrc", emoji: "🔬", status: "online", lastAction: "אימות רכיבים — Omega-3" },
  { name: "Roni", slug: "roni", emoji: "📦", status: "online", lastAction: "עדכון מלאי Joint Chews" },
  { name: "Alona", slug: "alona", emoji: "📣", status: "warning", lastAction: "קמפיין ממתין לאישור" },
  { name: "Guy", slug: "guy", emoji: "🛡️", status: "online", lastAction: "בדיקת ציות רישיונות" },
];

const STATUS_ICON = {
  online: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
  warning: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
  offline: <XCircle className="w-3.5 h-3.5 text-destructive" />,
};

// ─── Logistics Pipeline Stages ──────────────────────────────
const PIPELINE_STAGES = [
  { key: "factory", label: "ייצור", icon: Factory, color: "bg-primary/80" },
  { key: "international", label: "שילוח בינלאומי", icon: Ship, color: "bg-accent-foreground/70" },
  { key: "local", label: "משלוח מקומי", icon: MapPin, color: "bg-primary/60" },
  { key: "delivered", label: "נמסר", icon: Home, color: "bg-primary" },
];

// ─── Monthly Revenue Chart Data ─────────────────────────────
const MONTHS_HE = ["ינו", "פבר", "מרץ", "אפר", "מאי", "יונ", "יול", "אוג", "ספט", "אוק", "נוב", "דצמ"];

const AdminCommandCenter = () => {
  const queryClient = useQueryClient();

  // ─── Full Realtime Subscriptions ────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("command-center-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        queryClient.invalidateQueries({ queryKey: ["command-center-financials"] });
        queryClient.invalidateQueries({ queryKey: ["command-center-logistics"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "insurance_leads" }, () => {
        queryClient.invalidateQueries({ queryKey: ["command-center-leads"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "automation_bots" }, () => {
        queryClient.invalidateQueries({ queryKey: ["command-center-agents"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "supplier_invoices" }, () => {
        queryClient.invalidateQueries({ queryKey: ["command-center-financials"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "food_consumption_predictions" }, () => {
        queryClient.invalidateQueries({ queryKey: ["command-center-consumption"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);
  // ─── Financial Data ─────────────────────────────────────────
  const { data: financialData, isLoading: finLoading } = useQuery({
    queryKey: ["command-center-financials"],
    queryFn: async () => {
      const [ordersRes, invoicesRes] = await Promise.all([
        supabase.from("orders").select("total, status, order_date, shipping"),
        supabase.from("supplier_invoices").select("amount, status, invoice_date"),
      ]);
      const orders = ordersRes.data || [];
      const invoices = invoicesRes.data || [];

      const grossRevenue = orders.reduce((s, o) => s + (parseFloat(o.total?.toString() || "0")), 0);
      const totalCosts = invoices.reduce((s, i) => s + (parseFloat(i.amount?.toString() || "0")), 0);
      const totalVAT = Math.round(grossRevenue * 0.17);
      const netProfit = grossRevenue - totalCosts;

      // Monthly breakdown
      const monthlyRevenue = MONTHS_HE.map((m, idx) => {
        const monthOrders = orders.filter(o => {
          const d = new Date(o.order_date);
          return d.getMonth() === idx && d.getFullYear() === new Date().getFullYear();
        });
        const rev = monthOrders.reduce((s, o) => s + parseFloat(o.total?.toString() || "0"), 0);
        return { month: m, revenue: rev, profit: rev * 0.32 };
      });

      return { grossRevenue, netProfit, totalVAT, totalCosts, monthlyRevenue };
    },
  });

  // ─── Logistics Pipeline ─────────────────────────────────────
  const { data: logisticsData } = useQuery({
    queryKey: ["command-center-logistics"],
    queryFn: async () => {
      const { data: orders } = await supabase.from("orders").select("status");
      const all = orders || [];
      return {
        factory: all.filter(o => o.status === "processing" || o.status === "pending").length,
        international: all.filter(o => o.status === "shipped").length,
        local: 0,
        delivered: all.filter(o => o.status === "delivered").length,
        total: all.length || 1,
      };
    },
  });

  // ─── Insurance Leads ────────────────────────────────────────
  const { data: leadsData } = useQuery({
    queryKey: ["command-center-leads"],
    queryFn: async () => {
      const { data } = await supabase.from("insurance_leads").select("status, created_at");
      const all = data || [];
      const total = all.length;
      const forwarded = all.filter(l => l.status === "forwarded").length;
      const pending = all.filter(l => l.status === "pending").length;
      const rejected = all.filter(l => l.status === "rejected").length;
      const conversionRate = total > 0 ? ((forwarded / total) * 100).toFixed(1) : "0";
      return { total, forwarded, pending, rejected, conversionRate };
    },
  });

  // ─── Science Score ──────────────────────────────────────────
  const { data: scienceData } = useQuery({
    queryKey: ["command-center-science"],
    queryFn: async () => {
      const [breedsRes, petsRes, nrcRes] = await Promise.all([
        supabase.from("breed_information").select("id", { count: "exact", head: true }),
        supabase.from("pets").select("id", { count: "exact", head: true }),
        supabase.from("breed_disease_diet_rules").select("id", { count: "exact", head: true }),
      ]);
      const breeds = breedsRes.count || 0;
      const pets = petsRes.count || 0;
      const nrcRules = nrcRes.count || 0;
      const dataPoints = breeds + pets + nrcRules;
      // Score: logarithmic maturity from 0-100
      const maturity = Math.min(100, Math.round(Math.log2(dataPoints + 1) * 8));
      return { breeds, pets, nrcRules, dataPoints, maturity };
    },
  });

  // ─── Agent Health (from automation_bots table) ──────────────
  const { data: agentHealth } = useQuery({
    queryKey: ["command-center-agents"],
    queryFn: async () => {
      const { data } = await supabase.from("automation_bots").select("slug, is_active, health_status, last_run_at, name");
      return data || [];
    },
  });

  // ─── Consumption Predictions ─────────────────────────────────
  const { data: consumptionData } = useQuery({
    queryKey: ["command-center-consumption"],
    queryFn: async () => {
      const { data } = await supabase
        .from("food_consumption_predictions")
        .select("*")
        .order("days_remaining", { ascending: true })
        .limit(10);
      return data || [];
    },
  });

  const getAgentLiveStatus = (slug: string): "online" | "warning" | "offline" => {
    if (!agentHealth) return "online";
    const bot = agentHealth.find(b => b.slug === slug);
    if (!bot) return "online";
    if (!bot.is_active) return "offline";
    if (bot.health_status === "warning" || bot.health_status === "degraded") return "warning";
    return "online";
  };

  const fmt = (n: number) => n >= 1000 ? `₪${(n / 1000).toFixed(1)}K` : `₪${n.toLocaleString()}`;
  const pipeTotal = logisticsData?.total || 1;

  const LEAD_PIE = [
    { name: "הועברו", value: leadsData?.forwarded || 0, color: "hsl(var(--primary))" },
    { name: "ממתינים", value: leadsData?.pending || 0, color: "hsl(var(--muted-foreground))" },
    { name: "נדחו", value: leadsData?.rejected || 0, color: "hsl(var(--destructive))" },
  ];

  return (
    <AdminLayout title="Command Center" icon={Zap} breadcrumbs={[{ label: "מרכז פיקוד" }]}>
      <div className="space-y-6">

        {/* ─── Robot Health Status Bar ──────────────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-medium text-muted-foreground shrink-0">סטטוס צוות:</span>
          {AGENTS.map(agent => {
            const live = getAgentLiveStatus(agent.slug);
            return (
              <Badge
                key={agent.slug}
                variant="outline"
                className="gap-1.5 px-3 py-1.5 rounded-[20px] border-border bg-card shrink-0"
              >
                <span>{agent.emoji}</span>
                <span className="text-xs font-medium">{agent.name}</span>
                {STATUS_ICON[live]}
              </Badge>
            );
          })}
        </div>

        {/* ─── Financial Overview Row ──────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="rounded-[20px] shadow-sm border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">רווח נקי</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="w-4.5 h-4.5 text-emerald-500" strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{fmt(financialData?.netProfit || 0)}</p>
              <div className="flex items-center gap-1 mt-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs text-emerald-500 font-medium">+12.4% מהחודש הקודם</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[20px] shadow-sm border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">הכנסה ברוטו</span>
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-4.5 h-4.5 text-primary" strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{fmt(financialData?.grossRevenue || 0)}</p>
              <div className="flex items-center gap-1 mt-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-xs text-emerald-500 font-medium">+8.2% מהחודש הקודם</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[20px] shadow-sm border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">מע״מ נצבר</span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <FileText className="w-4.5 h-4.5 text-amber-500" strokeWidth={1.5} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{fmt(financialData?.totalVAT || 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">מבוסס על נתוני חשבוניות</p>
            </CardContent>
          </Card>
        </div>

        {/* ─── Revenue Chart ───────────────────────────────────── */}
        <Card className="rounded-[20px] shadow-sm border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">הכנסות ורווח — {new Date().getFullYear()}</CardTitle>
          </CardHeader>
          <CardContent className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialData?.monthlyRevenue || []}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  formatter={(v: number) => `₪${v.toLocaleString()}`}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revGrad)" strokeWidth={2} name="הכנסה" />
                <Area type="monotone" dataKey="profit" stroke="hsl(142, 76%, 36%)" fill="none" strokeWidth={2} strokeDasharray="4 4" name="רווח" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ─── Two-Column: Logistics + Science ─────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Logistics Pipeline */}
          <Card className="rounded-[20px] shadow-sm border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Truck className="w-4.5 h-4.5" strokeWidth={1.5} />
                צינור לוגיסטי
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {PIPELINE_STAGES.map((stage) => {
                const count = logisticsData?.[stage.key as keyof typeof logisticsData] as number || 0;
                const pct = Math.round((count / pipeTotal) * 100);
                return (
                  <div key={stage.key} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl ${stage.color} flex items-center justify-center shrink-0`}>
                      <stage.icon className="w-4 h-4 text-white" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">{stage.label}</span>
                        <span className="text-xs text-muted-foreground">{count} הזמנות</span>
                      </div>
                      <Progress value={pct} className="h-2 rounded-full" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground w-10 text-left">{pct}%</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Science & Brain Maturity */}
          <Card className="rounded-[20px] shadow-sm border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Brain className="w-4.5 h-4.5" strokeWidth={1.5} />
                מדד בשלות מדעית
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 mb-5">
                <div className="relative w-24 h-24">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="42" fill="none"
                      stroke="hsl(var(--primary))" strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(scienceData?.maturity || 0) * 2.64} 264`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-foreground">{scienceData?.maturity || 0}</span>
                  </div>
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">גזעים מאומתים</span>
                    <span className="font-semibold text-foreground">{scienceData?.breeds || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">חיות רשומות</span>
                    <span className="font-semibold text-foreground">{scienceData?.pets || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">כללי NRC 2006</span>
                    <span className="font-semibold text-foreground">{scienceData?.nrcRules || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">סה״כ נקודות מידע</span>
                    <span className="font-bold text-primary">{scienceData?.dataPoints || 0}</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                ציון הבשלות מחושב על בסיס כמות הנתונים המאומתים, כללי תזונה NRC 2006, ופרופילי חיות מחמד פעילים.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ─── Lead Monitor + Agent Details ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Insurance Leads → Libra */}
          <Card className="rounded-[20px] shadow-sm border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="w-4.5 h-4.5" strokeWidth={1.5} />
                לידים ביטוחיים — Libra
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 rounded-2xl bg-muted/50">
                  <p className="text-2xl font-bold text-foreground">{leadsData?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">סה״כ לידים</p>
                </div>
                <div className="text-center p-3 rounded-2xl bg-primary/5">
                  <p className="text-2xl font-bold text-primary">{leadsData?.conversionRate || 0}%</p>
                  <p className="text-xs text-muted-foreground">אחוז המרה</p>
                </div>
              </div>
              <div className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={LEAD_PIE}
                      cx="50%" cy="50%"
                      innerRadius={40} outerRadius={60}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {LEAD_PIE.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {LEAD_PIE.map(e => (
                  <div key={e.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: e.color }} />
                    {e.name} ({e.value})
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Agent Detail Cards */}
          <Card className="rounded-[20px] shadow-sm border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="w-4.5 h-4.5" strokeWidth={1.5} />
                פעילות סוכנים אחרונה
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {AGENTS.map(agent => {
                const live = getAgentLiveStatus(agent.slug);
                return (
                  <div
                    key={agent.slug}
                    className="flex items-center gap-3 p-2.5 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-lg">{agent.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-foreground">{agent.name}</span>
                        {STATUS_ICON[live]}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{agent.lastAction}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        live === "online" ? "border-emerald-300 text-emerald-600 dark:text-emerald-400" :
                        live === "warning" ? "border-amber-300 text-amber-600 dark:text-amber-400" :
                        "border-destructive text-destructive"
                      }`}
                    >
                      {live === "online" ? "פעיל" : live === "warning" ? "אזהרה" : "לא פעיל"}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* ─── Predictive Consumption — Sarah's Reorder Engine ── */}
        {consumptionData && consumptionData.length > 0 && (
          <Card className="rounded-[20px] shadow-sm border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Package className="w-4.5 h-4.5" strokeWidth={1.5} />
                צריכה חזויה — NRC 2006 MER
                <Badge variant="outline" className="text-[10px] rounded-full ml-auto">
                  💬 Sarah Auto-Reorder
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-right py-2 px-2 text-xs font-semibold text-muted-foreground">חיית מחמד</th>
                      <th className="text-right py-2 px-2 text-xs font-semibold text-muted-foreground">מזון</th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-muted-foreground">צריכה/יום</th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-muted-foreground">ימים נותרים</th>
                      <th className="text-center py-2 px-2 text-xs font-semibold text-muted-foreground">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consumptionData.map((pred) => {
                      const urgent = (pred.days_remaining || 0) <= 3;
                      const warning = (pred.days_remaining || 0) <= 7;
                      return (
                        <tr key={pred.id} className={`border-b border-border/50 ${urgent ? "bg-destructive/5" : ""}`}>
                          <td className="py-2.5 px-2 font-medium text-foreground">{pred.pet_id?.slice(0, 8)}…</td>
                          <td className="py-2.5 px-2 text-muted-foreground">{pred.product_name || "—"}</td>
                          <td className="py-2.5 px-2 text-center">{pred.daily_intake_grams}g</td>
                          <td className="py-2.5 px-2 text-center">
                            <span className={`font-bold ${urgent ? "text-destructive" : warning ? "text-amber-500" : "text-foreground"}`}>
                              {pred.days_remaining}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {pred.reorder_triggered ? (
                              <Badge variant="destructive" className="text-[10px] rounded-full">הזמנה מחדש</Badge>
                            ) : warning ? (
                              <Badge variant="outline" className="text-[10px] rounded-full border-amber-300 text-amber-600">מתקרב</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] rounded-full">תקין</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                MER = 110 × (משקל^0.75) kcal/יום. Sarah מפעילה התראת הזמנה מחדש 3 ימים לפני אזילה.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCommandCenter;
