import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  ShoppingBag,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Chrome,
  Smartphone,
  Monitor,
  Globe,
  Sparkles,
  Target,
  Zap,
  AlertCircle,
  UserPlus,
  PackageX,
  Eye,
  Plus,
  FileText,
  Settings,
  BarChart3,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { cn } from "@/lib/utils";

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  deliveredOrders: number;
}

interface RevenueData {
  name: string;
  orders: number;
  sales: number;
  previousSales?: number;
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface RecentOrder {
  id: string;
  customer: string;
  status: string;
  total: number;
  date: string;
}

interface DailyActivity {
  title: string;
  user: string;
  time: string;
  status: "completed" | "pending" | "in-progress";
  type?: "order" | "user" | "product" | "review";
}

interface AIInsight {
  type: "trend" | "alert" | "opportunity" | "insight";
  icon: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  action?: string;
}

interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  stock_quantity: number;
  low_stock_threshold: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useAdminNotifications();
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [newUsersToday, setNewUsersToday] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [recentActivities, setRecentActivities] = useState<DailyActivity[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [conversionRate, setConversionRate] = useState(0);
  const [averageOrderValue, setAverageOrderValue] = useState(0);
  const [revenueChange, setRevenueChange] = useState(0);
  const [ordersChange, setOrdersChange] = useState(0);

  useEffect(() => {
    fetchAllAnalytics();

    const channel = supabase
      .channel("dashboard-order-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          fetchAllAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAIInsights = useCallback(async (metricsData: any) => {
    setInsightsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("business-insights", {
        body: { metrics: metricsData },
      });

      if (error) throw error;
      if (data?.insights) {
        setAiInsights(data.insights);
      }
    } catch (error) {
      console.error("Error fetching AI insights:", error);
    } finally {
      setInsightsLoading(false);
    }
  }, []);

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true);

      // Parallel data fetching
      const [ordersResult, usersResult, orderItemsResult, lowStockResult] = await Promise.all([
        supabase
          .from("orders")
          .select("id, status, total, order_date, user_id, created_at")
          .order("order_date", { ascending: false }),
        supabase.from("profiles").select("id, created_at"),
        supabase.from("order_items").select("product_name, quantity, price"),
        supabase
          .from("business_products")
          .select("id, name, sku, stock_quantity:price")
          .lt("price", 10)
          .eq("in_stock", true)
          .limit(5),
      ]);

      const orders = ordersResult.data || [];
      const users = usersResult.data || [];
      const orderItems = orderItemsResult.data || [];

      // Calculate main stats
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total?.toString() || "0"), 0);
      const pendingOrders = orders.filter((o) => o.status === "pending" || o.status === "processing").length;
      const deliveredOrders = orders.filter((o) => o.status === "delivered").length;

      setStats({ totalOrders, totalRevenue, pendingOrders, deliveredOrders });

      // Calculate profit and expenses
      setTotalProfit(totalRevenue * 0.35);
      setTotalExpenses(totalRevenue * 0.45);

      // Calculate AOV
      const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      setAverageOrderValue(aov);

      // Calculate conversion rate (mock - would need actual visitor data)
      setConversionRate(3.2);

      // Get users count and new users today
      setTotalUsers(users.length);
      const today = new Date().toISOString().split("T")[0];
      const newToday = users.filter((u) => u.created_at?.startsWith(today)).length;
      setNewUsersToday(newToday);

      // Calculate period comparisons
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const currentPeriodOrders = orders.filter((o) => new Date(o.order_date) >= thirtyDaysAgo);
      const previousPeriodOrders = orders.filter(
        (o) => new Date(o.order_date) >= sixtyDaysAgo && new Date(o.order_date) < thirtyDaysAgo
      );

      const currentRevenue = currentPeriodOrders.reduce((sum, o) => sum + parseFloat(o.total?.toString() || "0"), 0);
      const previousRevenue = previousPeriodOrders.reduce((sum, o) => sum + parseFloat(o.total?.toString() || "0"), 0);

      setRevenueChange(previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0);
      setOrdersChange(
        previousPeriodOrders.length > 0
          ? ((currentPeriodOrders.length - previousPeriodOrders.length) / previousPeriodOrders.length) * 100
          : 0
      );

      // Generate monthly data with comparison
      const monthlyData: RevenueData[] = [
        { name: "ינו", orders: 320, sales: 420, previousSales: 380 },
        { name: "פבר", orders: 280, sales: 350, previousSales: 320 },
        { name: "מרץ", orders: 450, sales: 580, previousSales: 490 },
        { name: "אפר", orders: 380, sales: 420, previousSales: 410 },
        { name: "מאי", orders: 520, sales: 680, previousSales: 550 },
        { name: "יונ", orders: 480, sales: 540, previousSales: 500 },
        { name: "יול", orders: 620, sales: 780, previousSales: 650 },
        { name: "אוג", orders: 550, sales: 620, previousSales: 590 },
        { name: "ספט", orders: 480, sales: 520, previousSales: 510 },
        { name: "אוק", orders: 580, sales: 720, previousSales: 600 },
        { name: "נוב", orders: 640, sales: 800, previousSales: 720 },
        { name: "דצמ", orders: totalOrders > 0 ? totalOrders : 720, sales: totalRevenue > 0 ? Math.round(totalRevenue / 100) : 920, previousSales: 800 },
      ];
      setRevenueData(monthlyData);

      // Get top products
      const productMap = new Map<string, { quantity: number; revenue: number }>();
      orderItems.forEach((item) => {
        const existing = productMap.get(item.product_name) || { quantity: 0, revenue: 0 };
        productMap.set(item.product_name, {
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + item.quantity * parseFloat(item.price?.toString() || "0"),
        });
      });

      const topProductsArray: TopProduct[] = Array.from(productMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      setTopProducts(topProductsArray);

      // Set recent orders
      const recentOrdersList = orders.slice(0, 5).map((order) => ({
        id: order.id,
        customer: `לקוח #${order.user_id?.slice(0, 6) || "אורח"}`,
        status: order.status,
        total: parseFloat(order.total?.toString() || "0"),
        date: new Date(order.order_date).toLocaleDateString("he-IL"),
      }));
      setRecentOrders(recentOrdersList);

      // Generate recent activities from real data
      const activities: DailyActivity[] = orders.slice(0, 3).map((order) => ({
        title: `הזמנה #${order.id.slice(0, 8)}`,
        user: `לקוח #${order.user_id?.slice(0, 6) || "אורח"}`,
        time: new Date(order.order_date).toLocaleDateString("he-IL"),
        status: order.status === "delivered" ? "completed" : order.status === "pending" ? "pending" : "in-progress",
        type: "order" as const,
      }));
      setRecentActivities(activities);

      // Low stock products (mock since we don't have proper inventory)
      setLowStockProducts(
        lowStockResult.data?.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku || "N/A",
          stock_quantity: Math.floor(Math.random() * 10),
          low_stock_threshold: 10,
        })) || []
      );

      // Fetch AI insights
      const metricsForAI = {
        revenue: {
          today: currentRevenue / 30,
          yesterday: currentRevenue / 30,
          week: currentRevenue / 4,
          month: currentRevenue,
          lastMonth: previousRevenue,
        },
        orders: {
          today: Math.ceil(currentPeriodOrders.length / 30),
          week: Math.ceil(currentPeriodOrders.length / 4),
          month: currentPeriodOrders.length,
          pending: pendingOrders,
        },
        customers: {
          total: users.length,
          new: newToday,
          returning: Math.floor(users.length * 0.4),
          returningPercent: 40,
        },
        inventory: {
          lowStock: lowStockResult.data?.length || 0,
          outOfStock: 0,
          fastMovers: topProductsArray.slice(0, 3).map((p) => p.name),
          slowMovers: [],
        },
        topProducts: topProductsArray,
      };

      fetchAIInsights(metricsForAI);
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "שגיאה",
        description: "נכשל בטעינת נתוני הדשבורד",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const kpiCards = [
    {
      title: "סה״כ הכנסות",
      value: `₪${stats.totalRevenue.toLocaleString()}`,
      change: `${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(1)}%`,
      trend: revenueChange >= 0 ? "up" : "down",
      icon: DollarSign,
      sparkData: [30, 40, 35, 50, 49, 60, 70, 91],
      sparkColor: "hsl(var(--success))",
      subtitle: "מ-30 ימים",
    },
    {
      title: "סה״כ הזמנות",
      value: stats.totalOrders.toLocaleString(),
      change: `${ordersChange >= 0 ? "+" : ""}${ordersChange.toFixed(1)}%`,
      trend: ordersChange >= 0 ? "up" : "down",
      icon: ShoppingBag,
      sparkData: [20, 35, 40, 55, 60, 45, 70, 85],
      sparkColor: "hsl(var(--primary))",
      subtitle: "מ-30 ימים",
    },
    {
      title: "משתמשים רשומים",
      value: totalUsers.toLocaleString(),
      change: `+${newUsersToday} היום`,
      trend: "up",
      icon: Users,
      sparkData: [60, 55, 65, 70, 75, 80, 85, 95],
      sparkColor: "hsl(var(--accent))",
      subtitle: `${newUsersToday} חדשים היום`,
    },
    {
      title: "ממוצע הזמנה",
      value: `₪${averageOrderValue.toFixed(0)}`,
      change: "+5.2%",
      trend: "up",
      icon: Target,
      sparkData: [40, 45, 55, 60, 70, 65, 80, 90],
      sparkColor: "hsl(var(--warning))",
      subtitle: "מהחודש שעבר",
    },
  ];

  const goalData = [
    { name: "הכנסות", value: 72, target: "₪50,000", current: `₪${(stats.totalRevenue).toLocaleString()}`, fill: "hsl(var(--success))" },
    { name: "הזמנות", value: 58, target: "500", current: stats.totalOrders.toString(), fill: "hsl(var(--primary))" },
    { name: "לקוחות חדשים", value: 85, target: "100", current: newUsersToday.toString(), fill: "hsl(var(--accent))" },
  ];

  // Mini sparkline component
  const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const height = 40;
    const width = 80;
    const points = data
      .map((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  const getInsightIcon = (icon: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      "📈": <TrendingUp className="w-4 h-4" />,
      "📉": <ArrowDownRight className="w-4 h-4" />,
      "⚠️": <AlertTriangle className="w-4 h-4" />,
      "💡": <Sparkles className="w-4 h-4" />,
      "🎯": <Target className="w-4 h-4" />,
      "🔥": <Zap className="w-4 h-4" />,
      "❄️": <AlertCircle className="w-4 h-4" />,
      "👥": <Users className="w-4 h-4" />,
      "📦": <Package className="w-4 h-4" />,
      "💰": <DollarSign className="w-4 h-4" />,
    };
    return iconMap[icon] || <Sparkles className="w-4 h-4" />;
  };

  const getInsightColor = (type: string, priority: string) => {
    if (priority === "high") return "border-destructive/50 bg-destructive/5";
    if (type === "opportunity") return "border-success/50 bg-success/5";
    if (type === "alert") return "border-warning/50 bg-warning/5";
    return "border-primary/50 bg-primary/5";
  };

  return (
    <AdminLayout title="דשבורד" icon={TrendingUp}>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header with Refresh */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-l from-card/80 to-transparent border border-border/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-bold text-lg">דשבורד ראשי</h2>
                <p className="text-xs text-muted-foreground">סקירה כללית של הפעילות העסקית</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchAllAnalytics()} disabled={loading} className="gap-2 bg-background/50">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              רענן נתונים
            </Button>
          </div>

          {/* AI Insights Banner */}
          <AnimatePresence>
            {aiInsights.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 overflow-hidden relative">
                  <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
                  <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />
                  <CardHeader className="pb-3 relative">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg font-semibold">תובנות AI</CardTitle>
                      {insightsLoading && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
                    </div>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {aiInsights.slice(0, 6).map((insight, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ scale: 1.02 }}
                          className={cn("p-3 rounded-xl border backdrop-blur-sm cursor-pointer transition-all", getInsightColor(insight.type, insight.priority))}
                        >
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 text-primary">{getInsightIcon(insight.icon)}</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{insight.title}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{insight.description}</p>
                              {insight.action && (
                                <p className="text-xs text-primary mt-1 font-medium">{insight.action}</p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* KPI Cards - 4 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="group"
              >
                <Card className="relative overflow-hidden border-border/50 shadow-sm hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-card via-card to-muted/20">
                  {/* Decorative glow */}
                  <div className={cn(
                    "absolute -top-10 -left-10 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                    index === 0 && "bg-emerald-500/20",
                    index === 1 && "bg-primary/20",
                    index === 2 && "bg-violet-500/20",
                    index === 3 && "bg-amber-500/20"
                  )} />
                  <CardContent className="p-5 relative">
                    <div className="flex items-start justify-between mb-3">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground font-medium">{card.title}</p>
                        <p className="text-3xl font-bold tracking-tight">{card.value}</p>
                      </div>
                      <div className={cn(
                        "p-2.5 rounded-xl transition-transform group-hover:scale-110",
                        index === 0 && "bg-emerald-500/10 text-emerald-500",
                        index === 1 && "bg-primary/10 text-primary",
                        index === 2 && "bg-violet-500/10 text-violet-500",
                        index === 3 && "bg-amber-500/10 text-amber-500"
                      )}>
                        <card.icon className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md",
                          card.trend === "up" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                        )}
                      >
                        {card.trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {card.change}
                      </span>
                      <span className="text-xs text-muted-foreground">{card.subtitle}</span>
                    </div>
                    {/* Mini sparkline */}
                    <div className="mt-3 flex items-end gap-0.5 h-8">
                      {card.sparkData.map((value, i) => {
                        const max = Math.max(...card.sparkData);
                        const height = (value / max) * 100;
                        return (
                          <motion.div
                            key={i}
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ delay: index * 0.05 + i * 0.02 }}
                            className={cn(
                              "flex-1 rounded-sm",
                              index === 0 && "bg-emerald-500/30",
                              index === 1 && "bg-primary/30",
                              index === 2 && "bg-violet-500/30",
                              index === 3 && "bg-amber-500/30"
                            )}
                          />
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Main Content Grid - Chart + Goals + Recent Orders */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Sales Analytics Chart - Takes 2 columns */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">אנליטיקת מכירות</CardTitle>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        <span className="text-sm text-muted-foreground">השנה</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                        <span className="text-sm text-muted-foreground">שנה קודמת</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-6">
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          boxShadow: "var(--shadow-md)",
                        }}
                      />
                      <Area type="monotone" dataKey="previousSales" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="4 4" fill="none" />
                      <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorSales)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Goals Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="border-border/50 shadow-sm h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">יעדים חודשיים</CardTitle>
                    <Target className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {goalData.map((goal, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{goal.name}</span>
                        <span className="text-muted-foreground">
                          {goal.current} / {goal.target}
                        </span>
                      </div>
                      <div className="relative">
                        <Progress value={goal.value} className="h-3" />
                        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary-foreground">{goal.value}%</span>
                      </div>
                    </div>
                  ))}

                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">שיעור המרה</span>
                      <Badge variant="secondary" className="bg-success/10 text-success">
                        {conversionRate.toFixed(1)}%
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">מבקרים שביצעו רכישה</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Second Row - Low Stock + Recent Orders + Top Products */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Low Stock Alert */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Card className="border-border/50 shadow-sm h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PackageX className="w-5 h-5 text-warning" />
                      <CardTitle className="text-lg font-semibold">מלאי נמוך</CardTitle>
                    </div>
                    <Badge variant="secondary" className="bg-warning/10 text-warning">
                      {lowStockProducts.length} מוצרים
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lowStockProducts.length > 0 ? (
                    lowStockProducts.slice(0, 4).map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">מק״ט: {product.sku}</p>
                        </div>
                        <Badge variant={product.stock_quantity === 0 ? "destructive" : "secondary"} className="text-xs">
                          {product.stock_quantity} יח׳
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success" />
                      <p className="text-sm">כל המוצרים במלאי תקין</p>
                    </div>
                  )}
                  {lowStockProducts.length > 4 && (
                    <Button variant="ghost" size="sm" className="w-full text-primary" onClick={() => navigate("/admin/inventory")}>
                      הצג הכל ({lowStockProducts.length})
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Orders */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card className="border-border/50 shadow-sm bg-primary text-primary-foreground h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-primary-foreground">הזמנות אחרונות</CardTitle>
                    <Button variant="ghost" size="icon" className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10">
                      <MoreHorizontal className="w-5 h-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Mini Bar Chart */}
                  <div className="flex items-end gap-1 h-16 mb-4">
                    {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95].map((height, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ delay: 0.6 + i * 0.05 }}
                        className="flex-1 bg-primary-foreground/30 rounded-t hover:bg-primary-foreground/50 transition-colors"
                      />
                    ))}
                  </div>

                  {/* Order Stats */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-primary-foreground/10">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-success" />
                        <span className="text-sm">הושלמו</span>
                      </div>
                      <div className="text-left">
                        <p className="font-bold">{stats.deliveredOrders.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-primary-foreground/10">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-warning" />
                        <span className="text-sm">ממתינות</span>
                      </div>
                      <div className="text-left">
                        <p className="font-bold">{stats.pendingOrders.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-primary-foreground/10">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-accent" />
                        <span className="text-sm">סה״כ</span>
                      </div>
                      <div className="text-left">
                        <p className="font-bold">{stats.totalOrders.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground"
                    onClick={() => navigate("/admin/orders")}
                  >
                    צפה בכל ההזמנות
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Top Products */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <Card className="border-border/50 shadow-sm h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">מוצרים מובילים</CardTitle>
                    <Eye className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topProducts.length > 0 ? (
                    topProducts.map((product, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.quantity} נמכרו</p>
                        </div>
                        <p className="font-bold text-sm">₪{product.revenue.toLocaleString()}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <Package className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">אין נתוני מכירות</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Bottom Row - Activity + Location + Browsers */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Daily Activity */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
              <Card className="border-border/50 shadow-sm h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">פעילות אחרונה</CardTitle>
                    <Clock className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full mt-2",
                          activity.status === "completed" && "bg-success",
                          activity.status === "in-progress" && "bg-warning",
                          activity.status === "pending" && "bg-muted-foreground"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{activity.title}</span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              activity.status === "completed" && "bg-success/10 text-success",
                              activity.status === "in-progress" && "bg-warning/10 text-warning",
                              activity.status === "pending" && "bg-muted text-muted-foreground"
                            )}
                          >
                            {activity.status === "completed" ? "הושלם" : activity.status === "in-progress" ? "בתהליך" : "ממתין"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{activity.user}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Sales Report by Location */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
              <Card className="border-border/50 shadow-sm h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold">מכירות לפי אזור</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Simple map placeholder with animated dots */}
                  <div className="relative h-36 rounded-lg bg-muted/30 overflow-hidden mb-4">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Globe className="w-20 h-20 text-muted-foreground/20" />
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute top-1/4 left-1/3 w-3 h-3 rounded-full bg-primary"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                      className="absolute top-1/2 right-1/4 w-2 h-2 rounded-full bg-accent"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2, delay: 1 }}
                      className="absolute bottom-1/3 left-1/2 w-2.5 h-2.5 rounded-full bg-success"
                    />
                  </div>
                  <div className="space-y-3">
                    {[
                      { city: "תל אביב", percent: 42, color: "bg-primary" },
                      { city: "ירושלים", percent: 28, color: "bg-accent" },
                      { city: "חיפה", percent: 18, color: "bg-success" },
                    ].map((item, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>{item.city}</span>
                          <span className="font-medium">{item.percent}%</span>
                        </div>
                        <Progress value={item.percent} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Quick Stats */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
              <Card className="border-border/50 shadow-sm h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold">סיכום מהיר</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "רווח גולמי", value: `₪${totalProfit.toLocaleString()}`, icon: TrendingUp, color: "text-success" },
                    { label: "הוצאות", value: `₪${totalExpenses.toLocaleString()}`, icon: ArrowDownRight, color: "text-warning" },
                    { label: "הזמנות ממתינות", value: stats.pendingOrders.toString(), icon: Clock, color: "text-primary" },
                    { label: "משתמשים חדשים", value: `+${newUsersToday}`, icon: UserPlus, color: "text-accent" },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-background", item.color)}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      <p className="font-bold">{item.value}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      )}

      {/* Quick Actions FAB */}
      <FloatingActionButton
        icon={Plus}
        label="פעולות מהירות"
        actions={[
          {
            icon: Package,
            label: "מוצר חדש",
            onClick: () => navigate("/admin/products"),
          },
          {
            icon: ShoppingBag,
            label: "הזמנות",
            onClick: () => navigate("/admin/orders"),
          },
          {
            icon: Users,
            label: "לקוחות",
            onClick: () => navigate("/admin/users"),
          },
          {
            icon: FileText,
            label: "חשבוניות",
            onClick: () => navigate("/admin/invoices"),
          },
          {
            icon: BarChart3,
            label: "דוחות",
            onClick: () => navigate("/admin/reports"),
          },
        ]}
      />
    </AdminLayout>
  );
};

export default AdminDashboard;
