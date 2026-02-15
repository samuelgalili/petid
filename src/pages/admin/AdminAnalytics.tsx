import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  DollarSign, PawPrint, Heart, RefreshCw,
  TrendingUp, ArrowUpRight, ArrowDownRight,
  Brain, FileSearch, MessageCircle, MapPin,
  Stethoscope, BarChart3,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  Legend,
} from "recharts";

const CHART_COLORS = [
  "hsl(204, 100%, 48%)", // petid-blue
  "hsl(260, 75%, 55%)", // purple
  "hsl(42, 100%, 50%)",  // gold
  "hsl(12, 76%, 61%)",   // coral
  "hsl(160, 60%, 45%)",  // teal
  "hsl(330, 85%, 55%)",  // pink
  "hsl(210, 85%, 45%)",  // deep blue
  "hsl(200, 95%, 55%)",  // sky
];

const MEDICAL_COLORS = [
  "hsl(260, 75%, 55%)",
  "hsl(204, 100%, 48%)",
  "hsl(42, 100%, 50%)",
  "hsl(12, 76%, 61%)",
  "hsl(160, 60%, 45%)",
  "hsl(330, 85%, 55%)",
];

const AdminAnalytics = () => {
  const [dateRange, setDateRange] = useState("30d");

  const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : dateRange === "90d" ? 90 : 365;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const prevSince = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000).toISOString();

  // ─── Data Queries ───
  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["analytics-orders", days],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, total, status, created_at, user_id")
        .gte("created_at", prevSince)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: pets = [], isLoading: loadingPets } = useQuery({
    queryKey: ["analytics-pets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pets")
        .select("id, type, breed, birth_date, medical_conditions, is_lost, is_neutered, last_vet_visit, created_at");
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["analytics-profiles", days],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, created_at");
      return data || [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["analytics-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_products")
        .select("id, name, brand, category, medical_tags, price, sale_price");
      return data || [];
    },
  });

  const { data: petDocuments = [] } = useQuery({
    queryKey: ["analytics-ocr"],
    queryFn: async () => {
      const { data } = await supabase
        .from("pet_documents")
        .select("id, needs_review, created_at")
        .gte("created_at", since);
      return data || [];
    },
  });

  const { data: chatFeedback = [] } = useQuery({
    queryKey: ["analytics-chat"],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_message_feedback")
        .select("id, message_content, rating, created_at")
        .gte("created_at", since)
        .limit(500);
      return data || [];
    },
  });

  const { data: breeds = [] } = useQuery({
    queryKey: ["analytics-breeds"],
    queryFn: async () => {
      const { data } = await supabase
        .from("breed_information")
        .select("id, breed_name, breed_name_he, pet_type");
      return data || [];
    },
  });

  // ─── Derived Analytics ───

  // Big 4 KPIs
  const kpis = useMemo(() => {
    const currentOrders = orders.filter(o => new Date(o.created_at) >= new Date(since));
    const prevOrders = orders.filter(o => {
      const d = new Date(o.created_at);
      return d >= new Date(prevSince) && d < new Date(since);
    });

    const totalRevenue = currentOrders.reduce((s, o) => s + (parseFloat(o.total?.toString() || "0")), 0);
    const prevRevenue = prevOrders.reduce((s, o) => s + (parseFloat(o.total?.toString() || "0")), 0);
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    const dogCount = pets.filter(p => p.type === "dog").length;
    const catCount = pets.filter(p => p.type === "cat").length;
    const totalPets = pets.length;

    // Health index: average health score
    const healthScores = pets.map(p => {
      let score = 100;
      if (p.is_lost) score -= 30;
      if (p.medical_conditions?.length) score -= p.medical_conditions.length * 5;
      if (!p.is_neutered) score -= 5;
      if (p.last_vet_visit) {
        const daysSinceVet = (Date.now() - new Date(p.last_vet_visit).getTime()) / (24 * 60 * 60 * 1000);
        if (daysSinceVet > 365) score -= 15;
        else if (daysSinceVet > 180) score -= 5;
      } else {
        score -= 10;
      }
      return Math.max(0, Math.min(100, score));
    });
    const avgHealth = healthScores.length > 0 ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length) : 0;

    // Retention: users who signed up recently as proxy (no last_active column)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeRecent = profiles.filter(p => new Date(p.created_at) >= sevenDaysAgo).length;
    const retention = profiles.length > 0 ? Math.round((activeRecent / profiles.length) * 100) : 0;

    return {
      revenue: { value: totalRevenue, change: revenueChange },
      pets: { total: totalPets, dogs: dogCount, cats: catCount },
      health: { avg: avgHealth },
      retention: { rate: retention, active: activeRecent, total: profiles.length },
    };
  }, [orders, pets, profiles, since, prevSince]);

  // Revenue by day chart
  const revenueByDay = useMemo(() => {
    const currentOrders = orders.filter(o => new Date(o.created_at) >= new Date(since));
    const map: Record<string, number> = {};
    currentOrders.forEach(o => {
      const date = o.created_at.split("T")[0];
      map[date] = (map[date] || 0) + parseFloat(o.total?.toString() || "0");
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, revenue]) => ({
        date: new Date(date).toLocaleDateString("he-IL", { day: "numeric", month: "short" }),
        revenue: Math.round(revenue),
      }));
  }, [orders, since]);

  // Top brands
  const topBrands = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach(p => {
      const brand = p.brand || "אחר";
      map[brand] = (map[brand] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [products]);

  // Medical category sales
  const medicalCategories = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach(p => {
      const tags = p.medical_tags || [];
      tags.forEach((tag: string) => {
        map[tag] = (map[tag] || 0) + 1;
      });
    });
    if (Object.keys(map).length === 0) {
      // Provide common categories as placeholders
      return [
        { name: "Urinary", value: 0 },
        { name: "Gastro", value: 0 },
        { name: "Puppy Growth", value: 0 },
      ];
    }
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [products]);

  // Breed breakdown
  const breedBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    pets.forEach(p => {
      const breed = p.breed || "לא ידוע";
      map[breed] = (map[breed] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }, [pets]);

  // City distribution (placeholder - profiles doesn't have city yet)
  const cityDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    // No city column on profiles yet — show empty state
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [profiles]);

  // OCR accuracy
  const ocrMetrics = useMemo(() => {
    const total = petDocuments.length;
    const needsReview = petDocuments.filter((d: any) => d.needs_review).length;
    const accuracy = total > 0 ? Math.round(((total - needsReview) / total) * 100) : 100;
    return { total, needsReview, accuracy };
  }, [petDocuments]);

  // Chat topics
  const chatTopics = useMemo(() => {
    const keywords: Record<string, number> = {};
    const topicMap: Record<string, string[]> = {
      "תזונה": ["אוכל", "מזון", "תזונה", "diet", "food", "feeding"],
      "בריאות": ["חולה", "כאב", "בריאות", "health", "sick", "pain", "vet"],
      "גזע": ["גזע", "breed", "שיצו", "לברדור"],
      "ביטוח": ["ביטוח", "ליברה", "insurance", "libra", "כיסוי"],
      "חנות": ["מוצר", "הזמנה", "משלוח", "shop", "order", "delivery"],
      "אילוף": ["אילוף", "training", "התנהגות", "behavior"],
    };

    chatFeedback.forEach(msg => {
      const content = (msg.message_content || "").toLowerCase();
      Object.entries(topicMap).forEach(([topic, words]) => {
        if (words.some(w => content.includes(w))) {
          keywords[topic] = (keywords[topic] || 0) + 1;
        }
      });
    });

    return Object.entries(keywords)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([topic, count]) => ({ topic, count }));
  }, [chatFeedback]);

  const isLoading = loadingOrders || loadingPets;

  // ─── KPI Card Component ───
  const KPICard = ({ title, value, subtitle, change, icon: Icon, color, children }: {
    title: string;
    value: string;
    subtitle?: string;
    change?: number;
    icon: any;
    color: string;
    children?: React.ReactNode;
  }) => (
    <Card className="border-border/30">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color)}>
            <Icon className="w-5 h-5" strokeWidth={1.5} />
          </div>
          {change !== undefined && (
            <div className={cn(
              "flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full",
              change >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
            )}>
              {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mb-0.5">{title}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
        {children}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" strokeWidth={1.5} />
            אנליטיקות ותובנות
          </h1>
          <p className="text-sm text-muted-foreground">מעקב ביצועים, בריאות ו-AI</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 ימים</SelectItem>
            <SelectItem value="30d">30 ימים</SelectItem>
            <SelectItem value="90d">90 ימים</SelectItem>
            <SelectItem value="1y">שנה</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ─── Section 1: Big 4 KPIs ─── */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border/30">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="סה״כ הכנסות"
            value={`₪${kpis.revenue.value.toLocaleString()}`}
            subtitle="חנות + עמלת ליברה"
            change={kpis.revenue.change}
            icon={DollarSign}
            color="bg-emerald-500/10 text-emerald-600"
          />
          <KPICard
            title="חיות פעילות"
            value={kpis.pets.total.toLocaleString()}
            icon={PawPrint}
            color="bg-primary/10 text-primary"
          >
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-[9px] px-1.5 py-0">🐕 {kpis.pets.dogs}</Badge>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0">🐈 {kpis.pets.cats}</Badge>
            </div>
          </KPICard>
          <KPICard
            title="מדד בריאות"
            value={`${kpis.health.avg}%`}
            subtitle="ממוצע כל בעלי החיים"
            icon={Heart}
            color={cn(
              kpis.health.avg >= 80 ? "bg-emerald-500/10 text-emerald-600" :
              kpis.health.avg >= 50 ? "bg-amber-500/10 text-amber-600" :
              "bg-rose-500/10 text-rose-600"
            )}
          >
            <Progress value={kpis.health.avg} className="h-1.5 mt-2" />
          </KPICard>
          <KPICard
            title="שימור משתמשים"
            value={`${kpis.retention.rate}%`}
            subtitle={`${kpis.retention.active} מתוך ${kpis.retention.total} (7 ימים)`}
            icon={RefreshCw}
            color="bg-violet-500/10 text-violet-600"
          >
            <Progress value={kpis.retention.rate} className="h-1.5 mt-2" />
          </KPICard>
        </div>
      )}

      {/* ─── Section 2: Sales Distribution ─── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Trend */}
        <Card className="border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.5} />
              </div>
              מגמת הכנסות
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={revenueByDay}>
                  <defs>
                    <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(204,100%,48%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(204,100%,48%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(204,100%,48%)" strokeWidth={2} fill="url(#gRevenue)" name="הכנסות ₪" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                אין נתוני הכנסות לתקופה זו
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Brands Bar Chart */}
        <Card className="border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-violet-600" strokeWidth={1.5} />
              </div>
              מותגים מובילים
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topBrands.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topBrands} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                  <Bar dataKey="count" fill="hsl(260,75%,55%)" radius={[0, 4, 4, 0]} name="מוצרים" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                אין נתוני מותגים
              </div>
            )}
          </CardContent>
        </Card>

        {/* Medical Category Pie Chart */}
        <Card className="border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <Stethoscope className="w-3.5 h-3.5 text-rose-600" strokeWidth={1.5} />
              </div>
              מכירות לפי קטגוריה רפואית
            </CardTitle>
          </CardHeader>
          <CardContent>
            {medicalCategories.some(c => c.value > 0) ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="55%" height={220}>
                  <PieChart>
                    <Pie data={medicalCategories} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
                      {medicalCategories.map((_, i) => (
                        <Cell key={i} fill={MEDICAL_COLORS[i % MEDICAL_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-[45%] space-y-1.5">
                  {medicalCategories.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: MEDICAL_COLORS[i % MEDICAL_COLORS.length] }} />
                      <span className="text-[11px] text-muted-foreground truncate flex-1">{item.name}</span>
                      <span className="text-[11px] font-semibold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                אין נתוני קטגוריות רפואיות
              </div>
            )}
          </CardContent>
        </Card>

        {/* Breed Breakdown */}
        <Card className="border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <PawPrint className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
              </div>
              גזעים פופולריים
            </CardTitle>
          </CardHeader>
          <CardContent>
            {breedBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={breedBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} name="חיות">
                    {breedBreakdown.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
                אין נתוני גזעים
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Section 3: Geography ─── */}
      <Card className="border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <MapPin className="w-3.5 h-3.5 text-sky-600" strokeWidth={1.5} />
            </div>
            פריסה גיאוגרפית
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cityDistribution.length > 0 && cityDistribution[0].name !== "לא ידוע" ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {cityDistribution.map((city, i) => {
                const pct = profiles.length > 0 ? Math.round((city.count / profiles.length) * 100) : 0;
                return (
                  <div key={i} className="p-3 rounded-lg border border-border/30 bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-3.5 h-3.5 text-sky-500" strokeWidth={1.5} />
                      <span className="text-xs font-semibold text-foreground">{city.name}</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">{city.count}</p>
                    <Progress value={pct} className="h-1 mt-1.5" />
                    <p className="text-[9px] text-muted-foreground mt-1">{pct}% מהמשתמשים</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
              אין נתוני מיקום עדיין — יש להוסיף עמודת city לטבלת profiles
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Section 4: AI Performance ─── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* OCR Accuracy */}
        <Card className="border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <FileSearch className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.5} />
              </div>
              דיוק OCR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center border-4",
                ocrMetrics.accuracy >= 90 ? "border-emerald-500/30 bg-emerald-500/5" :
                ocrMetrics.accuracy >= 70 ? "border-amber-500/30 bg-amber-500/5" :
                "border-rose-500/30 bg-rose-500/5"
              )}>
                <span className={cn(
                  "text-xl font-bold",
                  ocrMetrics.accuracy >= 90 ? "text-emerald-600" :
                  ocrMetrics.accuracy >= 70 ? "text-amber-600" : "text-rose-600"
                )}>
                  {ocrMetrics.accuracy}%
                </span>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">סה״כ מסמכים</span>
                  <span className="font-semibold text-foreground">{ocrMetrics.total}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">ממתינים לבדיקה ידנית</span>
                  <span className="font-semibold text-rose-600">{ocrMetrics.needsReview}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">עברו אוטומטית</span>
                  <span className="font-semibold text-emerald-600">{ocrMetrics.total - ocrMetrics.needsReview}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chat Engagement */}
        <Card className="border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
              </div>
              נושאים נפוצים בצ׳אט AI
              <Badge variant="outline" className="text-[9px] mr-auto">{chatFeedback.length} הודעות</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chatTopics.length > 0 ? (
              <div className="space-y-2.5">
                {chatTopics.map((t, i) => {
                  const maxCount = chatTopics[0]?.count || 1;
                  const pct = Math.round((t.count / maxCount) * 100);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground">{t.topic}</span>
                        <span className="text-[10px] text-muted-foreground">{t.count} שאלות</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                <Brain className="w-8 h-8 text-muted-foreground/40" strokeWidth={1.5} />
                אין מספיק נתוני שיחות לניתוח
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminAnalytics;
