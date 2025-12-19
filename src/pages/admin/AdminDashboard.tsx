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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [customerSegments, setCustomerSegments] = useState<CustomerSegment[]>([]);

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
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
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

      setCustomerSegments([
        { name: "New Customers", value: newCustomers, percentage: (newCustomers / (newCustomers + returningCustomers)) * 100 },
        { name: "Returning", value: returningCustomers, percentage: (returningCustomers / (newCustomers + returningCustomers)) * 100 },
        { name: "High Value", value: highValue, percentage: (highValue / (newCustomers + returningCustomers)) * 100 },
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

  const statCards = [
    {
      title: "סה״כ הזמנות",
      value: stats.totalOrders,
      icon: Package,
      color: "bg-blue-500",
      bgLight: "bg-blue-50",
    },
    {
      title: "סה״כ הכנסות",
      value: `₪${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: "bg-green-500",
      bgLight: "bg-green-50",
    },
    {
      title: "הזמנות ממתינות",
      value: stats.pendingOrders,
      icon: Clock,
      color: "bg-yellow-500",
      bgLight: "bg-yellow-50",
    },
    {
      title: "נמסרו",
      value: stats.deliveredOrders,
      icon: CheckCircle,
      color: "bg-purple-500",
      bgLight: "bg-purple-50",
    },
  ];

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-gray-100"
            onClick={() => navigate("/home")}
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Button>
          <h1 className="text-base font-bold font-jakarta text-foreground">דשבורד ניהול</h1>
          <div className="w-10" />
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7DD3C0]"></div>
        </div>
      ) : (
        <div className="px-4 py-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`p-4 ${stat.bgLight} border-none shadow-sm`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className={`w-10 h-10 rounded-full ${stat.color} flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 font-jakarta mb-1">
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-600 font-jakarta">{stat.title}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-lg font-bold text-gray-900 font-jakarta mb-3">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-3">
              <Button
                size="lg"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl font-bold font-jakarta justify-start"
                onClick={() => navigate("/admin/orders")}
              >
                <Package className="w-5 h-5 mr-3" />
                Manage Orders
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full border-2 border-border text-foreground hover:bg-muted rounded-xl font-bold font-jakarta justify-start"
                onClick={() => navigate("/admin/customers")}
              >
                <Users className="w-5 h-5 mr-3" />
                View Customers
              </Button>
              <Button
                size="lg"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold font-jakarta justify-start"
                onClick={() => navigate("/admin/adoption")}
              >
                <Heart className="w-5 h-5 mr-3" />
                ניהול חיות לאימוץ
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full border-2 border-destructive text-destructive hover:bg-destructive/10 rounded-xl font-bold font-jakarta justify-start"
                onClick={() => navigate("/admin/reports")}
              >
                <Flag className="w-5 h-5 mr-3" />
                דיווחים ומודרציה
              </Button>
            </div>
          </motion.div>

          {/* Revenue Over Time Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-lg font-bold text-gray-900 font-jakarta mb-3">Revenue Trend (Last 30 Days)</h2>
            <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: "12px", fontFamily: "Plus Jakarta Sans" }} />
                    <YAxis stroke="#6b7280" style={{ fontSize: "12px", fontFamily: "Plus Jakarta Sans" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontFamily: "Plus Jakarta Sans",
                      }}
                    />
                    <Legend wrapperStyle={{ fontFamily: "Plus Jakarta Sans", fontSize: "12px" }} />
                    <Line type="monotone" dataKey="revenue" stroke="#FBD66A" strokeWidth={3} name="Revenue (₪)" />
                    <Line type="monotone" dataKey="orders" stroke="#7DD3C0" strokeWidth={2} name="Orders" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-600 font-jakarta text-center py-4">No revenue data available</p>
              )}
            </Card>
          </motion.div>

          {/* Top Products Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h2 className="text-lg font-bold text-gray-900 font-jakarta mb-3">Top 5 Products</h2>
            <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
              {topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" stroke="#6b7280" style={{ fontSize: "12px", fontFamily: "Plus Jakarta Sans" }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      stroke="#6b7280"
                      style={{ fontSize: "11px", fontFamily: "Plus Jakarta Sans" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontFamily: "Plus Jakarta Sans",
                      }}
                    />
                    <Bar dataKey="revenue" fill="#FBD66A" name="Revenue (₪)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-gray-600 font-jakarta text-center py-4">No product data available</p>
              )}
            </Card>
          </motion.div>

          {/* Customer Segments Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <h2 className="text-lg font-bold text-gray-900 font-jakarta mb-3">Customer Segments</h2>
            <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
              {customerSegments.length > 0 ? (
                <div className="space-y-3">
                  {customerSegments.map((segment, index) => (
                    <div key={segment.name}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700 font-jakarta">{segment.name}</span>
                        <span className="text-sm font-bold text-gray-900 font-jakarta">
                          {segment.value} ({segment.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                          className="h-2.5 rounded-full"
                          style={{
                            width: `${segment.percentage}%`,
                            backgroundColor: index === 0 ? "#7DD3C0" : index === 1 ? "#FBD66A" : "#F4C542",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600 font-jakarta text-center py-4">No customer data available</p>
              )}
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
