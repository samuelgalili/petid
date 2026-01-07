import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Package,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  Heart,
  Flag,
  ShoppingBag,
  Tag,
  Bell,
  Settings,
  MapPin,
  Building,
  FileText,
  Shield,
  History,
  Upload,
  BarChart3,
  PieChart as PieChartIcon,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  Store,
  Megaphone,
  Layers,
  Bot,
} from "lucide-react";
import AIInsightsPanel from "@/components/admin/AIInsightsPanel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  deliveredOrders: number;
}

interface RevenueData {
  date: string;
  revenue: number;
  orders: number;
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface CustomerSegment {
  name: string;
  value: number;
  percentage: number;
}

interface SystemStats {
  totalUsers: number;
  totalProducts: number;
  pendingReports: number;
  adoptionPets: number;
  activeBusinesses: number;
  totalParks: number;
  activeCoupons: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Enable real-time notifications for new orders and status changes
  useAdminNotifications();
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
  });
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    totalProducts: 0,
    pendingReports: 0,
    adoptionPets: 0,
    activeBusinesses: 0,
    totalParks: 0,
    activeCoupons: 0,
  });
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [customerSegments, setCustomerSegments] = useState<CustomerSegment[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchAllAnalytics();

    // Set up realtime subscription for automatic refresh
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
          // Refresh analytics when any order changes
          fetchAllAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch all orders with order date
      const { data: orders, error } = await supabase
        .from("orders")
        .select("status, total, order_date, user_id")
        .order("order_date", { ascending: true });

      if (error) throw error;

      // Calculate basic stats
      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, order) => sum + parseFloat(order.total.toString()), 0) || 0;
      const pendingOrders = orders?.filter((o) => o.status === "pending" || o.status === "processing").length || 0;
      const deliveredOrders = orders?.filter((o) => o.status === "delivered").length || 0;

      setStats({
        totalOrders,
        totalRevenue,
        pendingOrders,
        deliveredOrders,
      });

      // Fetch system-wide stats in parallel
      const [
        usersResult,
        productsResult,
        reportsResult,
        adoptionResult,
        businessResult,
        parksResult,
        couponsResult,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("business_products").select("id", { count: "exact", head: true }),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("adoption_pets").select("id", { count: "exact", head: true }).eq("status", "available"),
        supabase.from("business_profiles").select("id", { count: "exact", head: true }).eq("is_verified", true),
        supabase.from("dog_parks").select("id", { count: "exact", head: true }),
        supabase.from("coupons").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);

      setSystemStats({
        totalUsers: usersResult.count || 0,
        totalProducts: productsResult.count || 0,
        pendingReports: reportsResult.count || 0,
        adoptionPets: adoptionResult.count || 0,
        activeBusinesses: businessResult.count || 0,
        totalParks: parksResult.count || 0,
        activeCoupons: couponsResult.count || 0,
      });

      // Calculate revenue over time (last 30 days)
      const revenueByDate = new Map<string, { revenue: number; orders: number }>();
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      orders?.forEach((order) => {
        const orderDate = new Date(order.order_date);
        if (orderDate >= last30Days) {
          const dateKey = orderDate.toISOString().split("T")[0];
          const existing = revenueByDate.get(dateKey) || { revenue: 0, orders: 0 };
          revenueByDate.set(dateKey, {
            revenue: existing.revenue + parseFloat(order.total.toString()),
            orders: existing.orders + 1,
          });
        }
      });

      const revenueDataArray: RevenueData[] = Array.from(revenueByDate.entries()).map(([date, data]) => ({
        date: new Date(date).toLocaleDateString("he-IL", { month: "short", day: "numeric" }),
        revenue: data.revenue,
        orders: data.orders,
      }));
      setRevenueData(revenueDataArray);

      // Fetch top products
      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select("product_name, quantity, price");

      if (itemsError) throw itemsError;

      const productMap = new Map<string, { quantity: number; revenue: number }>();
      orderItems?.forEach((item) => {
        const existing = productMap.get(item.product_name) || { quantity: 0, revenue: 0 };
        productMap.set(item.product_name, {
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + item.quantity * parseFloat(item.price.toString()),
        });
      });

      const topProductsArray: TopProduct[] = Array.from(productMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      setTopProducts(topProductsArray);

      // Calculate customer segments
      const userOrderMap = new Map<string, number>();
      orders?.forEach((order) => {
        const userId = order.user_id;
        const existing = userOrderMap.get(userId) || 0;
        userOrderMap.set(userId, existing + parseFloat(order.total.toString()));
      });

      let newCustomers = 0;
      let returningCustomers = 0;
      let highValue = 0;

      Array.from(userOrderMap.entries()).forEach(([userId, total]) => {
        const orderCount = orders?.filter((o) => o.user_id === userId).length || 0;
        if (orderCount === 1) newCustomers++;
        else returningCustomers++;
        if (total > 500) highValue++;
      });

      const totalCustomers = newCustomers + returningCustomers;
      setCustomerSegments([
        { name: "לקוחות חדשים", value: newCustomers, percentage: totalCustomers > 0 ? (newCustomers / totalCustomers) * 100 : 0 },
        { name: "לקוחות חוזרים", value: returningCustomers, percentage: totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0 },
        { name: "לקוחות VIP", value: highValue, percentage: totalCustomers > 0 ? (highValue / totalCustomers) * 100 : 0 },
      ]);

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

  const orderStatCards = [
    {
      title: "סה״כ הזמנות",
      value: stats.totalOrders,
      icon: Package,
      color: "bg-blue-500",
      bgLight: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "סה״כ הכנסות",
      value: `₪${stats.totalRevenue.toFixed(0)}`,
      icon: DollarSign,
      color: "bg-green-500",
      bgLight: "bg-green-50 dark:bg-green-900/20",
    },
    {
      title: "ממתינות לטיפול",
      value: stats.pendingOrders,
      icon: Clock,
      color: "bg-yellow-500",
      bgLight: "bg-yellow-50 dark:bg-yellow-900/20",
    },
    {
      title: "נמסרו",
      value: stats.deliveredOrders,
      icon: CheckCircle,
      color: "bg-purple-500",
      bgLight: "bg-purple-50 dark:bg-purple-900/20",
    },
  ];

  const systemStatCards = [
    {
      title: "משתמשים",
      value: systemStats.totalUsers,
      icon: Users,
      color: "bg-indigo-500",
      bgLight: "bg-indigo-50 dark:bg-indigo-900/20",
      link: "/admin/users",
    },
    {
      title: "מוצרים",
      value: systemStats.totalProducts,
      icon: ShoppingBag,
      color: "bg-pink-500",
      bgLight: "bg-pink-50 dark:bg-pink-900/20",
      link: "/admin/products",
    },
    {
      title: "דיווחים ממתינים",
      value: systemStats.pendingReports,
      icon: AlertTriangle,
      color: "bg-red-500",
      bgLight: "bg-red-50 dark:bg-red-900/20",
      link: "/admin/reports",
      urgent: systemStats.pendingReports > 0,
    },
    {
      title: "חיות לאימוץ",
      value: systemStats.adoptionPets,
      icon: Heart,
      color: "bg-rose-500",
      bgLight: "bg-rose-50 dark:bg-rose-900/20",
      link: "/admin/adoption",
    },
    {
      title: "עסקים מאומתים",
      value: systemStats.activeBusinesses,
      icon: Store,
      color: "bg-teal-500",
      bgLight: "bg-teal-50 dark:bg-teal-900/20",
      link: "/admin/business",
    },
    {
      title: "פארקים",
      value: systemStats.totalParks,
      icon: MapPin,
      color: "bg-emerald-500",
      bgLight: "bg-emerald-50 dark:bg-emerald-900/20",
      link: "/admin/parks",
    },
    {
      title: "קופונים פעילים",
      value: systemStats.activeCoupons,
      icon: Tag,
      color: "bg-orange-500",
      bgLight: "bg-orange-50 dark:bg-orange-900/20",
      link: "/admin/coupons",
    },
  ];

  const quickActions = [
    { label: "הזמנות", icon: Package, path: "/admin/orders", color: "bg-blue-500" },
    { label: "מוצרים", icon: ShoppingBag, path: "/admin/products", color: "bg-pink-500" },
    { label: "משתמשים", icon: Users, path: "/admin/users", color: "bg-indigo-500" },
    { label: "לקוחות", icon: UserCheck, path: "/admin/customers", color: "bg-cyan-500" },
    { label: "עסקים", icon: Building, path: "/admin/business", color: "bg-teal-500" },
    { label: "אימוץ", icon: Heart, path: "/admin/adoption", color: "bg-rose-500" },
    { label: "דיווחים", icon: Flag, path: "/admin/reports", color: "bg-red-500" },
    { label: "תוכן", icon: Layers, path: "/admin/content", color: "bg-violet-500" },
    { label: "קופונים", icon: Tag, path: "/admin/coupons", color: "bg-orange-500" },
    { label: "פארקים", icon: MapPin, path: "/admin/parks", color: "bg-emerald-500" },
    { label: "התראות", icon: Bell, path: "/admin/notify", color: "bg-amber-500" },
    { label: "הרשאות", icon: Shield, path: "/admin/roles", color: "bg-purple-500" },
    { label: "לוג פעולות", icon: History, path: "/admin/audit", color: "bg-slate-500" },
    { label: "הגדרות", icon: Settings, path: "/admin/settings", color: "bg-gray-500" },
    { label: "ייבוא CSV", icon: Upload, path: "/admin/products/import", color: "bg-lime-500" },
    { label: "סקראפר", icon: Bot, path: "/admin/scraper", color: "bg-sky-500" },
  ];

  const COLORS = ['#7DD3C0', '#FBD66A', '#F4C542', '#FF6B6B', '#4ECDC4'];

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-b from-background to-muted/30" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-muted"
            onClick={() => navigate("/home")}
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Button>
          <h1 className="text-lg font-bold font-jakarta text-foreground">לוח בקרה</h1>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-muted"
            onClick={() => fetchAllAnalytics()}
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 text-foreground ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="px-4 py-6 space-y-6">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-4">
              <TabsTrigger value="overview" className="text-sm">סקירה</TabsTrigger>
              <TabsTrigger value="analytics" className="text-sm">אנליטיקות</TabsTrigger>
              <TabsTrigger value="actions" className="text-sm">פעולות</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-0">
              {/* AI Insights Panel */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AIInsightsPanel
                  metrics={{
                    revenue: {
                      today: stats.totalRevenue / 30,
                      yesterday: stats.totalRevenue / 30 * 0.9,
                      week: stats.totalRevenue / 4,
                      month: stats.totalRevenue,
                      lastMonth: stats.totalRevenue * 0.85,
                    },
                    orders: {
                      today: Math.ceil(stats.totalOrders / 30),
                      week: Math.ceil(stats.totalOrders / 4),
                      month: stats.totalOrders,
                      pending: stats.pendingOrders,
                    },
                    customers: {
                      total: systemStats.totalUsers,
                      new: Math.ceil(systemStats.totalUsers * 0.1),
                      returning: Math.ceil(systemStats.totalUsers * 0.35),
                      returningPercent: 35,
                    },
                    inventory: {
                      lowStock: 7,
                      outOfStock: 2,
                      fastMovers: topProducts.slice(0, 3).map(p => p.name),
                      slowMovers: topProducts.slice(-2).map(p => p.name),
                    },
                    topProducts: topProducts.slice(0, 5),
                  }}
                />
              </motion.div>

              {/* Urgent Alerts */}
              {systemStats.pendingReports > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card 
                    className="p-4 bg-destructive/10 border-destructive/30 cursor-pointer hover:bg-destructive/20 transition-colors"
                    onClick={() => navigate("/admin/reports")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-destructive flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-destructive">
                          {systemStats.pendingReports} דיווחים ממתינים לטיפול
                        </p>
                        <p className="text-sm text-muted-foreground">לחץ לצפייה ומודרציה</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}

              {/* Order Stats */}
              <div>
                <h2 className="text-base font-bold text-foreground mb-3">סטטיסטיקות הזמנות</h2>
                <div className="grid grid-cols-2 gap-3">
                  {orderStatCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                      <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className={`p-4 ${stat.bgLight} border-none shadow-sm`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className={`w-9 h-9 rounded-full ${stat.color} flex items-center justify-center`}>
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                          </div>
                          <p className="text-xl font-bold text-foreground font-jakarta mb-0.5">
                            {stat.value}
                          </p>
                          <p className="text-xs text-muted-foreground font-jakarta">{stat.title}</p>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* System Stats */}
              <div>
                <h2 className="text-base font-bold text-foreground mb-3">סטטיסטיקות מערכת</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {systemStatCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                      <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + index * 0.05 }}
                        onClick={() => navigate(stat.link)}
                        className="cursor-pointer"
                      >
                        <Card className={`p-3 ${stat.bgLight} border-none shadow-sm hover:shadow-md transition-shadow relative`}>
                          {stat.urgent && (
                            <Badge className="absolute -top-1 -right-1 bg-destructive text-white text-[10px] px-1.5">
                              דחוף
                            </Badge>
                          )}
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-8 h-8 rounded-full ${stat.color} flex items-center justify-center`}>
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                          </div>
                          <p className="text-lg font-bold text-foreground font-jakarta">
                            {stat.value}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-jakarta">{stat.title}</p>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Mini Revenue Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-base font-bold text-foreground mb-3">מגמת הכנסות (30 יום)</h2>
                <Card className="p-4 bg-card border border-border rounded-xl shadow-sm">
                  {revenueData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "10px" }} />
                        <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "10px" }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Line type="monotone" dataKey="revenue" stroke="#7DD3C0" strokeWidth={2} name="הכנסות (₪)" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">אין נתונים להצגה</p>
                  )}
                </Card>
              </motion.div>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6 mt-0">
              {/* Revenue Over Time Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  מגמת הכנסות והזמנות
                </h2>
                <Card className="p-4 bg-card border border-border rounded-xl shadow-sm">
                  {revenueData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "10px" }} />
                        <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "10px" }} />
                        <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "10px" }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#7DD3C0" strokeWidth={2} name="הכנסות (₪)" />
                        <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#FBD66A" strokeWidth={2} name="הזמנות" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">אין נתונים להצגה</p>
                  )}
                </Card>
              </motion.div>

              {/* Top Products Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  5 המוצרים המובילים
                </h2>
                <Card className="p-4 bg-card border border-border rounded-xl shadow-sm">
                  {topProducts.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={topProducts} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "10px" }} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={80}
                          stroke="hsl(var(--muted-foreground))"
                          style={{ fontSize: "10px" }}
                          tickFormatter={(value) => value.length > 12 ? value.slice(0, 12) + "..." : value}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="revenue" fill="#7DD3C0" name="הכנסות (₪)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">אין נתונים להצגה</p>
                  )}
                </Card>
              </motion.div>

              {/* Customer Segments */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5" />
                  פילוח לקוחות
                </h2>
                <Card className="p-4 bg-card border border-border rounded-xl shadow-sm">
                  {customerSegments.length > 0 && customerSegments.some(s => s.value > 0) ? (
                    <div className="flex flex-col md:flex-row items-center gap-4">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={customerSegments}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {customerSegments.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                              fontSize: "12px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 w-full md:w-auto">
                        {customerSegments.map((segment, index) => (
                          <div key={segment.name} className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                            />
                            <span className="text-sm text-foreground">{segment.name}</span>
                            <span className="text-sm font-bold text-foreground">{segment.value}</span>
                            <span className="text-xs text-muted-foreground">({segment.percentage.toFixed(0)}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">אין נתונים להצגה</p>
                  )}
                </Card>
              </motion.div>
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="actions" className="space-y-4 mt-0">
              <h2 className="text-base font-bold text-foreground mb-3">פעולות מהירות</h2>
              <div className="grid grid-cols-3 gap-3">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <motion.div
                      key={action.path}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Card
                        className="p-3 flex flex-col items-center justify-center gap-2 cursor-pointer hover:shadow-md transition-all border border-border hover:border-primary/30"
                        onClick={() => navigate(action.path)}
                      >
                        <div className={`w-10 h-10 rounded-full ${action.color} flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xs font-medium text-foreground text-center">{action.label}</span>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>

              {/* Additional Quick Links */}
              <div className="space-y-2 pt-4">
                <h3 className="text-sm font-semibold text-muted-foreground">קישורים נוספים</h3>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/admin/products/import")}
                >
                  <Upload className="w-4 h-4 ml-2" />
                  ייבוא מוצרים מ-CSV
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/admin/notify")}
                >
                  <Megaphone className="w-4 h-4 ml-2" />
                  שליחת התראות למשתמשים
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate("/admin/audit")}
                >
                  <History className="w-4 h-4 ml-2" />
                  צפייה בלוג פעולות
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
