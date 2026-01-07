import { useState, useEffect } from "react";
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
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
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
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);

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
        .select("id, status, total, order_date, user_id")
        .order("order_date", { ascending: false });

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

      // Calculate profit and expenses (simulated)
      setTotalProfit(totalRevenue * 0.35);
      setTotalExpenses(totalRevenue * 0.45);

      // Get users count
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      setTotalUsers(usersCount || 0);

      // Generate monthly data for chart
      const monthlyData: RevenueData[] = [
        { name: "ינו", orders: 320, sales: 420 },
        { name: "פבר", orders: 280, sales: 350 },
        { name: "מרץ", orders: 450, sales: 580 },
        { name: "אפר", orders: 380, sales: 420 },
        { name: "מאי", orders: 520, sales: 680 },
        { name: "יונ", orders: 480, sales: 540 },
        { name: "יול", orders: 620, sales: 780 },
        { name: "אוג", orders: 550, sales: 620 },
        { name: "ספט", orders: 480, sales: 520 },
        { name: "אוק", orders: 580, sales: 720 },
        { name: "נוב", orders: 640, sales: 800 },
        { name: "דצמ", orders: 720, sales: 920 },
      ];
      setRevenueData(monthlyData);

      // Get top products
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("product_name, quantity, price");

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

      // Set recent orders
      const recentOrdersList = orders?.slice(0, 5).map(order => ({
        id: order.id,
        customer: `לקוח #${order.user_id?.slice(0, 6)}`,
        status: order.status,
        total: parseFloat(order.total.toString()),
        date: new Date(order.order_date).toLocaleDateString("he-IL"),
      })) || [];
      setRecentOrders(recentOrdersList);

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
      title: "סה״כ משתמשים",
      value: totalUsers.toLocaleString(),
      change: "+8%",
      trend: "up",
      icon: Users,
      sparkData: [30, 40, 35, 50, 49, 60, 70, 91],
      sparkColor: "hsl(var(--primary))",
      subtitle: "מהשבוע שעבר",
    },
    {
      title: "רווח נקי",
      value: `₪${totalProfit.toLocaleString()}`,
      change: "+6.7%",
      trend: "up",
      icon: TrendingUp,
      sparkData: [20, 35, 40, 55, 60, 45, 70, 85],
      sparkColor: "hsl(var(--success))",
      subtitle: "מ-6 ימים",
    },
    {
      title: "סה״כ הוצאות",
      value: `₪${totalExpenses.toLocaleString()}`,
      change: "-0.4%",
      trend: "down",
      icon: DollarSign,
      sparkData: [60, 55, 45, 50, 40, 45, 35, 30],
      sparkColor: "hsl(var(--accent))",
      subtitle: "מ-9 ימים",
    },
    {
      title: "עלות כוללת",
      value: `₪${stats.totalRevenue.toLocaleString()}`,
      change: "+0.4%",
      trend: "up",
      icon: ShoppingBag,
      sparkData: [40, 45, 55, 60, 70, 65, 80, 90],
      sparkColor: "hsl(var(--warning))",
      subtitle: "מהשנה שעברה",
    },
  ];

  const dailyActivities: DailyActivity[] = [
    { title: "משימה הושלמה", user: "משה כהן", time: "20/07/2023", status: "completed" },
    { title: "הזמנה חדשה", user: "יעל לוי", time: "19/07/2023", status: "in-progress" },
    { title: "בקשת אישור", user: "דני רון", time: "18/07/2023", status: "pending" },
  ];

  const browserUsage = [
    { name: "Chrome", value: 35502, change: "+11.5%", icon: Chrome, color: "hsl(var(--primary))" },
    { name: "Safari", value: 12450, change: "+8.2%", icon: Globe, color: "hsl(var(--accent))" },
    { name: "Mobile", value: 8320, change: "+5.1%", icon: Smartphone, color: "hsl(var(--success))" },
    { name: "Desktop", value: 6890, change: "+3.4%", icon: Monitor, color: "hsl(var(--warning))" },
  ];

  // Mini sparkline component
  const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const height = 40;
    const width = 80;
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }).join(" ");

    return (
      <svg width={width} height={height} className="overflow-visible">
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
          {/* Header with Refresh */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>בית</span>
              <span>/</span>
              <span className="text-primary font-medium">דשבורד 01</span>
            </div>
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

          {/* KPI Cards - 4 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpiCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="relative overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground font-medium">{card.title}</p>
                        <p className="text-3xl font-bold text-foreground">{card.value}</p>
                      </div>
                      <Sparkline data={card.sparkData} color={card.sparkColor} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-xs font-medium px-2 py-0.5",
                          card.trend === "up" 
                            ? "bg-success/10 text-success" 
                            : "bg-destructive/10 text-destructive"
                        )}
                      >
                        {card.trend === "up" ? (
                          <ArrowUpRight className="w-3 h-3 mr-1" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3 mr-1" />
                        )}
                        {card.change}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{card.subtitle}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Main Content Grid - Chart + Recent Orders */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Sales Analytics Chart - Takes 2 columns */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">אנליטיקת מכירות</CardTitle>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary" />
                        <span className="text-sm text-muted-foreground">סה״כ הזמנות</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-accent" />
                        <span className="text-sm text-muted-foreground">סה״כ מכירות</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-6">
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false}
                        tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: 'var(--shadow-md)',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="orders"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#colorOrders)"
                      />
                      <Area
                        type="monotone"
                        dataKey="sales"
                        stroke="hsl(var(--accent))"
                        strokeWidth={2}
                        fill="url(#colorSales)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Orders Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
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
                      <div
                        key={i}
                        className="flex-1 bg-primary-foreground/30 rounded-t"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>

                  {/* Order Stats */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-primary-foreground/10">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-success" />
                        <span className="text-sm">הזמנות שהושלמו</span>
                      </div>
                      <div className="text-left">
                        <p className="font-bold">{stats.deliveredOrders.toLocaleString()}</p>
                        <p className="text-xs text-primary-foreground/70">+3.5% מהחודש שעבר</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-primary-foreground/10">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-destructive" />
                        <span className="text-sm">הזמנות שבוטלו</span>
                      </div>
                      <div className="text-left">
                        <p className="font-bold">{Math.floor(stats.totalOrders * 0.05).toLocaleString()}</p>
                        <p className="text-xs text-primary-foreground/70">-1.2% מהחודש שעבר</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Bottom Row - Daily Activity + Sales Report + Browser Usage */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Daily Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-border/50 shadow-sm h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold">פעילות יומית</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dailyActivities.map((activity, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-2",
                        activity.status === "completed" && "bg-success",
                        activity.status === "in-progress" && "bg-warning",
                        activity.status === "pending" && "bg-muted-foreground"
                      )} />
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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="border-border/50 shadow-sm h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold">דוח מכירות לפי אזור</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Simple map placeholder */}
                  <div className="relative h-48 rounded-lg bg-muted/30 overflow-hidden mb-4">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Globe className="w-24 h-24 text-muted-foreground/20" />
                    </div>
                    {/* Location dots */}
                    <div className="absolute top-1/4 left-1/3 w-3 h-3 rounded-full bg-primary animate-pulse" />
                    <div className="absolute top-1/2 right-1/4 w-2 h-2 rounded-full bg-accent animate-pulse" />
                    <div className="absolute bottom-1/3 left-1/2 w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>תל אביב</span>
                      <span className="font-medium">42%</span>
                    </div>
                    <Progress value={42} className="h-2" />
                    <div className="flex items-center justify-between text-sm mt-3">
                      <span>ירושלים</span>
                      <span className="font-medium">28%</span>
                    </div>
                    <Progress value={28} className="h-2" />
                    <div className="flex items-center justify-between text-sm mt-3">
                      <span>חיפה</span>
                      <span className="font-medium">18%</span>
                    </div>
                    <Progress value={18} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Browser Usage */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="border-border/50 shadow-sm h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold">שימוש בדפדפנים</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {browserUsage.map((browser, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${browser.color}20` }}
                        >
                          <browser.icon 
                            className="w-4 h-4"
                            style={{ color: browser.color }}
                          />
                        </div>
                        <span className="text-sm font-medium">{browser.name}</span>
                      </div>
                      <div className="text-left">
                        <p className="font-bold">{browser.value.toLocaleString()}</p>
                        <p className="text-xs text-success">{browser.change}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
