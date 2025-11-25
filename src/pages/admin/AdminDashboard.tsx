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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  deliveredOrders: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch all orders
      const { data: orders, error } = await supabase
        .from("orders")
        .select("status, total");

      if (error) throw error;

      // Calculate stats
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
    } catch (error: any) {
      console.error("Error fetching stats:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Orders",
      value: stats.totalOrders,
      icon: Package,
      color: "bg-blue-500",
      bgLight: "bg-blue-50",
    },
    {
      title: "Total Revenue",
      value: `₪${stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: "bg-green-500",
      bgLight: "bg-green-50",
    },
    {
      title: "Pending Orders",
      value: stats.pendingOrders,
      icon: Clock,
      color: "bg-yellow-500",
      bgLight: "bg-yellow-50",
    },
    {
      title: "Delivered",
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
          <h1 className="text-base font-bold font-jakarta text-gray-900">Admin Dashboard</h1>
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
                className="w-full bg-[#7DD3C0] hover:bg-[#6BC4AD] text-gray-900 rounded-xl font-bold font-jakarta justify-start"
                onClick={() => navigate("/admin/orders")}
              >
                <Package className="w-5 h-5 mr-3" />
                Manage Orders
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="w-full border-2 border-gray-300 text-gray-900 hover:bg-gray-100 rounded-xl font-bold font-jakarta justify-start"
                onClick={() => navigate("/admin/customers")}
              >
                <Users className="w-5 h-5 mr-3" />
                View Customers
              </Button>
            </div>
          </motion.div>

          {/* Recent Activity Placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-lg font-bold text-gray-900 font-jakarta mb-3">Recent Activity</h2>
            <Card className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
              <p className="text-sm text-gray-600 font-jakarta text-center py-4">
                Activity feed coming soon
              </p>
            </Card>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
