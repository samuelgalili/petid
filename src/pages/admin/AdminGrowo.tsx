import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  RefreshCcw,
  Package,
  AlertTriangle,
  Zap,
  Target,
  Brain,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  UserPlus,
  Repeat,
  Clock,
  Sparkles,
  PackageX,
  TrendingUp as FastMover,
  Calendar,
  ChevronRight,
  Eye,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { PetOMeter } from "@/components/admin/PetOMeter";
import { DashboardFleetCommand } from "@/components/admin/dashboard/DashboardFleetCommand";
import { format, subDays, startOfDay, endOfDay, parseISO, differenceInDays } from "date-fns";
import { he } from "date-fns/locale";

interface DashboardMetrics {
  overview: {
    revenue: { total: number; change: number; trend: string };
    orders: { total: number; change: number; pending: number };
    customers: { new: number; returning: number; returningPercent: number };
    profit: { gross: number; margin: number };
    averageOrderValue: number;
  };
  charts: {
    revenueByDay: { date: string; revenue: number; orders: number }[];
    customersByDay: { date: string; new: number; returning: number }[];
  };
  topProducts: { name: string; quantity: number; revenue: number }[];
  inventory: {
    lowStock: { id: string; name: string; sku: string; stock_quantity: number }[];
    outOfStock: number;
  };
  recentTransactions: any[];
  period: { start: string; end: string; days: number };
}

interface AIInsight {
  type: "trend" | "alert" | "opportunity" | "insight";
  icon: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  action?: string;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--accent))", "#8884d8"];

const MOCK_METRICS: DashboardMetrics = {
  overview: {
    revenue: { total: 0, change: 0, trend: "up" },
    orders: { total: 0, change: 0, pending: 0 },
    customers: { new: 0, returning: 0, returningPercent: 0 },
    profit: { gross: 0, margin: 0 },
    averageOrderValue: 0,
  },
  charts: {
    revenueByDay: Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return { date: d.toISOString().split("T")[0], revenue: 0, orders: 0 };
    }),
    customersByDay: Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return { date: d.toISOString().split("T")[0], new: 0, returning: 0 };
    }),
  },
  topProducts: [],
  inventory: { lowStock: [], outOfStock: 0 },
  recentTransactions: [],
  period: { start: "", end: "", days: 30 },
};

const AdminGrowo = () => {
  const { toast } = useToast();
  const [period, setPeriod] = useState("30");
  const [activeTab, setActiveTab] = useState("overview");
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Fetch dashboard metrics from edge function
  const { data: rawMetrics, isLoading, refetch, error } = useQuery<DashboardMetrics>({
    queryKey: ["growo-dashboard", period],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-dashboard-metrics", {
        body: { period },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  // Always have metrics - use mock fallback
  const metrics = rawMetrics || (error ? MOCK_METRICS : undefined);

  // Fetch customer retention data
  const { data: customerStats } = useQuery({
    queryKey: ["customer-retention", period],
    queryFn: async () => {
      const days = parseInt(period);
      const startDate = subDays(new Date(), days).toISOString().split("T")[0];
      
      const { data: transactions, error } = await supabase
        .from("normalized_transactions")
        .select("customer_id, customer_email, total, transaction_date")
        .gte("transaction_date", startDate);
      
      if (error) throw error;
      
      // Calculate customer metrics
      const customerMap = new Map<string, { orders: number; total: number; firstOrder: string; lastOrder: string }>();
      
      transactions?.forEach(tx => {
        const customerId = tx.customer_id || tx.customer_email;
        if (!customerId) return;
        
        const existing = customerMap.get(customerId);
        const txTotal = parseFloat(String(tx.total || "0"));
        if (existing) {
          existing.orders++;
          existing.total += txTotal;
          if (tx.transaction_date < existing.firstOrder) existing.firstOrder = tx.transaction_date;
          if (tx.transaction_date > existing.lastOrder) existing.lastOrder = tx.transaction_date;
        } else {
          customerMap.set(customerId, {
            orders: 1,
            total: txTotal,
            firstOrder: tx.transaction_date,
            lastOrder: tx.transaction_date,
          });
        }
      });
      
      const customers = Array.from(customerMap.entries()).map(([id, data]) => ({
        id,
        ...data,
        isReturning: data.orders > 1,
      }));
      
      const returningCustomers = customers.filter(c => c.isReturning);
      const topCustomers = customers.sort((a, b) => b.total - a.total).slice(0, 10);
      const avgLTV = customers.length > 0 ? customers.reduce((sum, c) => sum + c.total, 0) / customers.length : 0;
      
      return {
        totalCustomers: customers.length,
        returningCustomers: returningCustomers.length,
        returningPercent: customers.length > 0 ? (returningCustomers.length / customers.length) * 100 : 0,
        topCustomers,
        avgLTV,
        avgOrdersPerCustomer: customers.length > 0 ? customers.reduce((sum, c) => sum + c.orders, 0) / customers.length : 0,
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch inventory signals
  const { data: inventorySignals } = useQuery({
    queryKey: ["inventory-signals", period],
    queryFn: async () => {
      // Get products with recent sales data
      const { data: products, error } = await supabase
        .from("business_products")
        .select("id, name, sku, in_stock, price, category, created_at");
      
      if (error) throw error;
      
      // Get recent order items to analyze velocity - use product_name since product_id doesn't exist
      const days = parseInt(period);
      const startDate = subDays(new Date(), days).toISOString().split("T")[0];
      
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("product_name, quantity, created_at")
        .gte("created_at", startDate);
      
      // Calculate sales velocity per product by name
      const salesVelocity = new Map<string, number>();
      orderItems?.forEach(item => {
        const productName = item.product_name;
        if (!productName) return;
        const current = salesVelocity.get(productName) || 0;
        salesVelocity.set(productName, current + (item.quantity || 0));
      });
      
      // Categorize products - match by name
      const fastMovers = products
        ?.map(p => ({ ...p, soldQty: salesVelocity.get(p.name) || 0 }))
        .filter(p => p.soldQty > 5)
        .sort((a, b) => b.soldQty - a.soldQty)
        .slice(0, 10) || [];
      
      const slowSellers = products
        ?.map(p => ({ ...p, soldQty: salesVelocity.get(p.name) || 0 }))
        .filter(p => p.soldQty === 0)
        .slice(0, 10) || [];
      
      const lowStock = products?.filter(p => !p.in_stock).slice(0, 10) || [];
      
      return {
        fastMovers,
        slowSellers,
        lowStock,
        totalProducts: products?.length || 0,
        outOfStock: lowStock.length,
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch AI insights
  const fetchAIInsights = async () => {
    if (!metrics) return;
    
    setLoadingInsights(true);
    try {
      const businessMetrics = {
        revenue: {
          today: metrics.overview.revenue.total / parseInt(period),
          yesterday: metrics.overview.revenue.total / parseInt(period),
          week: metrics.overview.revenue.total * (7 / parseInt(period)),
          month: metrics.overview.revenue.total,
          lastMonth: metrics.overview.revenue.total * (1 - metrics.overview.revenue.change / 100),
        },
        orders: {
          today: Math.floor(metrics.overview.orders.total / parseInt(period)),
          week: Math.floor(metrics.overview.orders.total * (7 / parseInt(period))),
          month: metrics.overview.orders.total,
          pending: metrics.overview.orders.pending,
          avgValue: metrics.overview.averageOrderValue,
        },
        customers: {
          new: metrics.overview.customers.new,
          returning: metrics.overview.customers.returning,
          returningPercent: metrics.overview.customers.returningPercent,
        },
        inventory: {
          lowStock: inventorySignals?.lowStock?.length || 0,
          outOfStock: inventorySignals?.outOfStock || 0,
          fastMovers: inventorySignals?.fastMovers?.length || 0,
        },
        topProducts: metrics.topProducts?.slice(0, 5) || [],
      };

      const { data, error } = await supabase.functions.invoke("business-insights", {
        body: { metrics: businessMetrics },
      });

      if (error) throw error;
      
      if (data?.insights) {
        setAiInsights(data.insights);
      }
    } catch (error) {
      console.error("Error fetching AI insights:", error);
      // Fallback insights
      setAiInsights([
        {
          type: "insight",
          icon: "📊",
          title: "סיכום תקופה",
          description: `ב-${period} ימים האחרונים נרשמו ${metrics?.overview.orders.total || 0} הזמנות בשווי ₪${(metrics?.overview.revenue.total || 0).toLocaleString()}`,
          priority: "medium",
        },
      ]);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    if (metrics) {
      fetchAIInsights();
    }
  }, [metrics]);

  const KPICard = ({ title, value, change, trend, icon: Icon, subtitle, color }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-none bg-gradient-to-br from-card to-card/80">
        <div className={cn("absolute top-0 left-0 right-0 h-1", color)} />
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground font-medium">{title}</p>
              <p className="text-3xl font-bold tracking-tight">{value}</p>
              <div className="flex items-center gap-2">
                {change !== undefined && (
                  <Badge variant={trend === "up" ? "default" : "destructive"} className="text-xs">
                    {trend === "up" ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                    {Math.abs(change).toFixed(1)}%
                  </Badge>
                )}
                {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
              </div>
            </div>
            <div className={cn("p-4 rounded-2xl", color, "bg-opacity-10")}>
              <Icon className="w-8 h-8 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const InsightCard = ({ insight, index }: { insight: AIInsight; index: number }) => {
    const priorityColors = {
      high: "border-red-500/30 bg-red-500/5",
      medium: "border-yellow-500/30 bg-yellow-500/5",
      low: "border-green-500/30 bg-green-500/5",
    };

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1 }}
        className={cn("p-4 rounded-xl border-2", priorityColors[insight.priority])}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">{insight.icon}</span>
          <div className="flex-1">
            <h4 className="font-semibold text-sm">{insight.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
            {insight.action && (
              <Button variant="link" className="p-0 h-auto text-xs mt-2">
                {insight.action} <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            )}
          </div>
          <Badge variant="outline" className="text-xs">
            {insight.priority === "high" ? "דחוף" : insight.priority === "medium" ? "חשוב" : "מידע"}
          </Badge>
        </div>
      </motion.div>
    );
  };

  // Show error toast but don't block UI - fallback to mock data
  useEffect(() => {
    if (error) {
      toast({
        title: "שגיאה בטעינת נתונים",
        description: "מוצגים נתוני דמו. נסה לרענן.",
        variant: "destructive",
      });
    }
  }, [error]);

  return (
    <AdminLayout title="Growo Dashboard" icon={Brain}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              מצב העסק
            </h1>
            <p className="text-muted-foreground mt-1">
              תובנות ו-KPIs בזמן אמת
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ימים</SelectItem>
                <SelectItem value="14">14 ימים</SelectItem>
                <SelectItem value="30">30 ימים</SelectItem>
                <SelectItem value="60">60 ימים</SelectItem>
                <SelectItem value="90">90 ימים</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCcw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* AI Insights Strip */}
        <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">תובנות AI</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchAIInsights}
                disabled={loadingInsights}
              >
                <RefreshCcw className={cn("w-4 h-4", loadingInsights && "animate-spin")} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingInsights ? (
              <div className="flex items-center justify-center py-8">
                <Brain className="w-8 h-8 text-primary animate-pulse" />
                <span className="mr-3 text-muted-foreground">מנתח נתונים...</span>
              </div>
            ) : aiInsights.length > 0 ? (
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-3">
                  {aiInsights.slice(0, 4).map((insight, i) => (
                    <InsightCard key={i} insight={insight} index={i} />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-muted-foreground text-center py-4">אין תובנות זמינות כרגע</p>
            )}
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="overview" className="rounded-lg">
              <BarChart3 className="w-4 h-4 mr-2" />
              סקירה כללית
            </TabsTrigger>
            <TabsTrigger value="sales" className="rounded-lg">
              <DollarSign className="w-4 h-4 mr-2" />
              מכירות
            </TabsTrigger>
            <TabsTrigger value="customers" className="rounded-lg">
              <Users className="w-4 h-4 mr-2" />
              לקוחות
            </TabsTrigger>
            <TabsTrigger value="inventory" className="rounded-lg">
              <Package className="w-4 h-4 mr-2" />
              מלאי
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="p-6">
                    <Skeleton className="h-4 w-20 mb-4" />
                    <Skeleton className="h-8 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </Card>
                ))
              ) : (
                <>
                  <KPICard
                    title="הכנסות"
                    value={`₪${(metrics?.overview.revenue.total || 0).toLocaleString()}`}
                    change={metrics?.overview.revenue.change}
                    trend={metrics?.overview.revenue.trend}
                    icon={DollarSign}
                    subtitle={`${period} ימים`}
                    color="bg-emerald-500"
                  />
                  <KPICard
                    title="הזמנות"
                    value={metrics?.overview.orders.total.toLocaleString() || "0"}
                    change={metrics?.overview.orders.change}
                    trend={(metrics?.overview.orders.change || 0) >= 0 ? "up" : "down"}
                    icon={ShoppingBag}
                    subtitle={`${metrics?.overview.orders.pending || 0} ממתינות`}
                    color="bg-blue-500"
                  />
                  <KPICard
                    title="לקוחות חוזרים"
                    value={`${(customerStats?.returningPercent || 0).toFixed(1)}%`}
                    icon={Repeat}
                    subtitle={`${customerStats?.returningCustomers || 0} לקוחות`}
                    color="bg-purple-500"
                  />
                  <KPICard
                    title="ממוצע הזמנה"
                    value={`₪${(metrics?.overview.averageOrderValue || 0).toLocaleString()}`}
                    icon={Target}
                    subtitle="AOV"
                    color="bg-orange-500"
                  />
                </>
              )}
            </div>

            {/* Pet-O-Meter */}
            <PetOMeter />

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    מגמת הכנסות
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={metrics?.charts.revenueByDay || []}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(val) => format(parseISO(val), "dd/MM", { locale: he })}
                          className="text-xs"
                        />
                        <YAxis 
                          tickFormatter={(val) => `₪${val.toLocaleString()}`}
                          className="text-xs"
                        />
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                          formatter={(val: number) => [`₪${val.toLocaleString()}`, "הכנסות"]}
                          labelFormatter={(label) => format(parseISO(label), "dd/MM/yyyy", { locale: he })}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="hsl(var(--primary))"
                          fill="url(#colorRevenue)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Orders Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-blue-500" />
                    הזמנות לפי יום
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={metrics?.charts.revenueByDay || []}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(val) => format(parseISO(val), "dd/MM", { locale: he })}
                          className="text-xs"
                        />
                        <YAxis className="text-xs" />
                        <Tooltip
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                          formatter={(val: number) => [val, "הזמנות"]}
                          labelFormatter={(label) => format(parseISO(label), "dd/MM/yyyy", { locale: he })}
                        />
                        <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Products & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Products */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    מוצרים מובילים
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 py-3 border-b last:border-0">
                          <Skeleton className="h-10 w-10 rounded" />
                          <div className="flex-1">
                            <Skeleton className="h-4 w-32 mb-1" />
                            <Skeleton className="h-3 w-20" />
                          </div>
                          <Skeleton className="h-4 w-16" />
                        </div>
                      ))
                    ) : metrics?.topProducts?.length ? (
                      metrics.topProducts.map((product, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center gap-3 py-3 border-b last:border-0"
                        >
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary">
                            #{i + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.quantity} יחידות</p>
                          </div>
                          <p className="font-semibold text-sm">₪{product.revenue.toLocaleString()}</p>
                        </motion.div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-8">אין נתונים זמינים</p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    סטטיסטיקות מהירות
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">לקוחות חדשים</p>
                      <p className="text-2xl font-bold">{metrics?.overview.customers.new || 0}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">לקוחות חוזרים</p>
                      <p className="text-2xl font-bold">{metrics?.overview.customers.returning || 0}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">רווח גולמי</p>
                      <p className="text-2xl font-bold">₪{(metrics?.overview.profit.gross || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">מרווח רווחיות</p>
                      <p className="text-2xl font-bold">{(metrics?.overview.profit.margin || 0).toFixed(1)}%</p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">חוסרי מלאי</span>
                      <Badge variant="destructive">{inventorySignals?.outOfStock || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">מוצרים נמכרים מהר</span>
                      <Badge variant="default">{inventorySignals?.fastMovers?.length || 0}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Sales Tab */}
          <TabsContent value="sales" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KPICard
                title="הכנסות היום"
                value={`₪${((metrics?.overview.revenue.total || 0) / parseInt(period)).toLocaleString()}`}
                icon={DollarSign}
                subtitle="ממוצע יומי"
                color="bg-emerald-500"
              />
              <KPICard
                title="הכנסות השבוע"
                value={`₪${((metrics?.overview.revenue.total || 0) * (7 / parseInt(period))).toLocaleString()}`}
                icon={TrendingUp}
                subtitle="אומדן"
                color="bg-blue-500"
              />
              <KPICard
                title="הכנסות החודש"
                value={`₪${(metrics?.overview.revenue.total || 0).toLocaleString()}`}
                change={metrics?.overview.revenue.change}
                trend={metrics?.overview.revenue.trend}
                icon={Target}
                color="bg-purple-500"
              />
            </div>

            {/* Revenue by Day Chart */}
            <Card>
              <CardHeader>
                <CardTitle>מגמת הכנסות</CardTitle>
                <CardDescription>הכנסות יומיות לאורך התקופה</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={metrics?.charts.revenueByDay || []}>
                    <defs>
                      <linearGradient id="colorRevenue2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => format(parseISO(val), "dd/MM", { locale: he })}
                    />
                    <YAxis tickFormatter={(val) => `₪${val.toLocaleString()}`} />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                      formatter={(val: number) => [`₪${val.toLocaleString()}`, "הכנסות"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      fill="url(#colorRevenue2)"
                      strokeWidth={3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Products Table */}
            <Card>
              <CardHeader>
                <CardTitle>מוצרים מובילים לפי הכנסה</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right p-3 text-muted-foreground font-medium">#</th>
                        <th className="text-right p-3 text-muted-foreground font-medium">מוצר</th>
                        <th className="text-right p-3 text-muted-foreground font-medium">כמות</th>
                        <th className="text-right p-3 text-muted-foreground font-medium">הכנסה</th>
                        <th className="text-right p-3 text-muted-foreground font-medium">% מהכנסות</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics?.topProducts?.map((product, i) => {
                        const percentage = metrics.overview.revenue.total > 0 
                          ? (product.revenue / metrics.overview.revenue.total) * 100 
                          : 0;
                        return (
                          <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="p-3 font-medium">{i + 1}</td>
                            <td className="p-3">{product.name}</td>
                            <td className="p-3">{product.quantity}</td>
                            <td className="p-3 font-semibold">₪{product.revenue.toLocaleString()}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Progress value={percentage} className="h-2 w-20" />
                                <span className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <KPICard
                title="סה״כ לקוחות"
                value={customerStats?.totalCustomers || 0}
                icon={Users}
                color="bg-blue-500"
              />
              <KPICard
                title="לקוחות חוזרים"
                value={`${(customerStats?.returningPercent || 0).toFixed(1)}%`}
                icon={Repeat}
                subtitle={`${customerStats?.returningCustomers || 0} לקוחות`}
                color="bg-green-500"
              />
              <KPICard
                title="LTV ממוצע"
                value={`₪${(customerStats?.avgLTV || 0).toLocaleString()}`}
                icon={Target}
                subtitle="ערך לקוח"
                color="bg-purple-500"
              />
              <KPICard
                title="הזמנות ללקוח"
                value={(customerStats?.avgOrdersPerCustomer || 0).toFixed(1)}
                icon={ShoppingBag}
                subtitle="ממוצע"
                color="bg-orange-500"
              />
            </div>

            {/* Customer Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* New vs Returning */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5" />
                    התפלגות לקוחות
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "חדשים", value: metrics?.overview.customers.new || 0 },
                          { name: "חוזרים", value: metrics?.overview.customers.returning || 0 },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill="hsl(var(--primary))" />
                        <Cell fill="hsl(var(--success))" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="text-sm">לקוחות חדשים</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm">לקוחות חוזרים</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top Customers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-primary" />
                    Top 10 לקוחות
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {customerStats?.topCustomers?.length ? (
                      customerStats.topCustomers.map((customer, i) => (
                        <div key={customer.id} className="flex items-center gap-3 py-3 border-b last:border-0">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                            #{i + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm truncate">{customer.id}</p>
                            <p className="text-xs text-muted-foreground">{customer.orders} הזמנות</p>
                          </div>
                          <p className="font-semibold">₪{customer.total.toLocaleString()}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-8">אין נתונים זמינים</p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KPICard
                title="סה״כ מוצרים"
                value={inventorySignals?.totalProducts || 0}
                icon={Package}
                color="bg-blue-500"
              />
              <KPICard
                title="חוסרי מלאי"
                value={inventorySignals?.outOfStock || 0}
                icon={PackageX}
                color="bg-red-500"
              />
              <KPICard
                title="נמכרים מהר"
                value={inventorySignals?.fastMovers?.length || 0}
                icon={Zap}
                color="bg-green-500"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Fast Movers */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-green-500" />
                    <CardTitle>נמכרים מהר</CardTitle>
                  </div>
                  <CardDescription>מוצרים בעלי מכירות גבוהות</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {inventorySignals?.fastMovers?.length ? (
                      inventorySignals.fastMovers.map((product, i) => (
                        <div key={product.id} className="flex items-center gap-3 py-3 border-b last:border-0">
                          <Badge variant="default" className="bg-green-500">{product.soldQty}</Badge>
                          <div className="flex-1">
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.category}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-8">אין נתונים</p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Slow Sellers */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-500" />
                    <CardTitle>מוצרים תקועים</CardTitle>
                  </div>
                  <CardDescription>מוצרים ללא מכירות</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {inventorySignals?.slowSellers?.length ? (
                      inventorySignals.slowSellers.map((product, i) => (
                        <div key={product.id} className="flex items-center gap-3 py-3 border-b last:border-0">
                          <Badge variant="outline" className="text-yellow-600">0</Badge>
                          <div className="flex-1">
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.category}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-8">אין נתונים</p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Low Stock */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <CardTitle>חוסרי מלאי</CardTitle>
                  </div>
                  <CardDescription>מוצרים שאזלו</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {inventorySignals?.lowStock?.length ? (
                      inventorySignals.lowStock.map((product, i) => (
                        <div key={product.id} className="flex items-center gap-3 py-3 border-b last:border-0">
                          <Badge variant="destructive">אזל</Badge>
                          <div className="flex-1">
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.sku}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-8">אין חוסרים</p>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminGrowo;
