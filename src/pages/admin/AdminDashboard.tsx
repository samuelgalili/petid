import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  Heart,
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
  RefreshCw,
  AlertTriangle,
  UserCheck,
  Store,
  Bot,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Flag,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import AIInsightsPanel from "@/components/admin/AIInsightsPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Area,
  AreaChart,
} from "recharts";
import { cn } from "@/lib/utils";

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

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true);

      const { data: orders, error } = await supabase
        .from("orders")
        .select("status, total, order_date, user_id")
        .order("order_date", { ascending: true });

      if (error) throw error;

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

  const kpiCards = [
    {
      title: "סה״כ הכנסות",
      value: `₪${stats.totalRevenue.toLocaleString()}`,
      change: "+12.5%",
      trend: "up",
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "הזמנות",
      value: stats.totalOrders,
      change: "+8.2%",
      trend: "up",
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "משתמשים פעילים",
      value: systemStats.totalUsers,
      change: "+5.1%",
      trend: "up",
      icon: Users,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "ממתינות לטיפול",
      value: stats.pendingOrders,
      change: "-2.3%",
      trend: "down",
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  const systemStatCards = [
    { title: "מוצרים", value: systemStats.totalProducts, icon: ShoppingBag, href: "/admin/products" },
    { title: "עסקים מאומתים", value: systemStats.activeBusinesses, icon: Store, href: "/admin/business" },
    { title: "חיות לאימוץ", value: systemStats.adoptionPets, icon: Heart, href: "/admin/adoption" },
    { title: "פארקים", value: systemStats.totalParks, icon: MapPin, href: "/admin/parks" },
    { title: "קופונים פעילים", value: systemStats.activeCoupons, icon: Tag, href: "/admin/coupons" },
    { title: "דיווחים ממתינים", value: systemStats.pendingReports, icon: Flag, href: "/admin/reports", urgent: systemStats.pendingReports > 0 },
  ];

  const quickActions = [
    { label: "הזמנות", icon: Package, path: "/admin/orders" },
    { label: "מוצרים", icon: ShoppingBag, path: "/admin/products" },
    { label: "משתמשים", icon: Users, path: "/admin/users" },
    { label: "עסקים", icon: Building, path: "/admin/business" },
    { label: "אימוץ", icon: Heart, path: "/admin/adoption" },
    { label: "דיווחים", icon: Flag, path: "/admin/reports" },
    { label: "תוכן", icon: Layers, path: "/admin/content" },
    { label: "הגדרות", icon: Settings, path: "/admin/settings" },
  ];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))'];

  return (
    <AdminLayout 
      title="דשבורד" 
      icon={TrendingUp}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Refresh Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAllAnalytics()}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              רענן נתונים
            </Button>
          </div>

          {/* Urgent Alert */}
          {systemStats.pendingReports > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card 
                className="border-destructive/50 bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors"
                onClick={() => navigate("/admin/reports")}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="w-12 h-12 rounded-full bg-destructive flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-destructive text-lg">
                      {systemStats.pendingReports} דיווחים ממתינים לטיפול
                    </p>
                    <p className="text-sm text-muted-foreground">לחץ לצפייה ומודרציה</p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-destructive" />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* AI Insights */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
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

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="relative overflow-hidden">
                  <CardContent className="p-4 lg:p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">{card.title}</p>
                        <p className="text-2xl lg:text-3xl font-bold">{card.value}</p>
                        <div className={cn(
                          "flex items-center gap-1 text-sm font-medium",
                          card.trend === "up" ? "text-success" : "text-destructive"
                        )}>
                          {card.trend === "up" ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                          {card.change}
                        </div>
                      </div>
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", card.bgColor)}>
                        <card.icon className={cn("w-6 h-6", card.color)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">פעולות מהירות</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 lg:grid-cols-8 gap-3">
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-primary/5 hover:border-primary/30"
                    onClick={() => navigate(action.path)}
                  >
                    <action.icon className="w-5 h-5 text-primary" />
                    <span className="text-xs">{action.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Charts Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  מגמת הכנסות
                </CardTitle>
              </CardHeader>
              <CardContent>
                {revenueData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          direction: 'rtl'
                        }} 
                        formatter={(value: number) => [`₪${value.toFixed(0)}`, 'הכנסה']}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                    אין נתונים להצגה
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Segments */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-accent" />
                  פילוח לקוחות
                </CardTitle>
              </CardHeader>
              <CardContent>
                {customerSegments.length > 0 && customerSegments.some(s => s.value > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={customerSegments}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percentage }) => `${name} (${percentage.toFixed(0)}%)`}
                      >
                        {customerSegments.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          direction: 'rtl'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                    אין נתונים להצגה
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* System Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">סטטיסטיקות מערכת</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {systemStatCards.map((stat) => (
                  <Card
                    key={stat.title}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-md hover:border-primary/30",
                      stat.urgent && "border-destructive/50 bg-destructive/5"
                    )}
                    onClick={() => navigate(stat.href)}
                  >
                    <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        stat.urgent ? "bg-destructive" : "bg-muted"
                      )}>
                        <stat.icon className={cn(
                          "w-5 h-5",
                          stat.urgent ? "text-white" : "text-muted-foreground"
                        )} />
                      </div>
                      <p className={cn(
                        "text-2xl font-bold",
                        stat.urgent && "text-destructive"
                      )}>
                        {stat.value}
                      </p>
                      <p className="text-xs text-muted-foreground">{stat.title}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          {topProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  מוצרים מובילים
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topProducts.map((product, index) => (
                    <div key={product.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="font-medium truncate max-w-[200px]">{product.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">{product.quantity} יחידות</span>
                        <Badge variant="secondary">₪{product.revenue.toFixed(0)}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
