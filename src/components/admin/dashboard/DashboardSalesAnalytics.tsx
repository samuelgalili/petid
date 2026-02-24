/**
 * DashboardSalesAnalytics — Real-time sales analytics with revenue chart, AOV, and top products.
 * Fetches live data from orders + order_items tables.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  DollarSign,
  BarChart3,
  Crown,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface DailyRevenue {
  date: string;
  revenue: number;
  orders: number;
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface SalesMetrics {
  totalRevenue: number;
  totalOrders: number;
  aov: number;
  revenueChange: number;
  ordersChange: number;
  aovChange: number;
  dailyData: DailyRevenue[];
  topProducts: TopProduct[];
}

export const DashboardSalesAnalytics = () => {
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    fetchSalesData();
  }, [period]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const prevStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);

      // Fetch current period orders
      const { data: currentOrders } = await supabase
        .from("orders")
        .select("id, total, order_date, status")
        .gte("order_date", startDate.toISOString())
        .order("order_date", { ascending: true });

      // Fetch previous period orders for comparison
      const { data: prevOrders } = await supabase
        .from("orders")
        .select("id, total")
        .gte("order_date", prevStartDate.toISOString())
        .lt("order_date", startDate.toISOString());

      // Fetch top products from order_items in current period
      const orderIds = (currentOrders || []).map((o) => o.id);
      let topProducts: TopProduct[] = [];

      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from("order_items")
          .select("product_name, quantity, price")
          .in("order_id", orderIds.slice(0, 100));

        if (items && items.length > 0) {
          const productMap = new Map<string, { quantity: number; revenue: number }>();
          items.forEach((item) => {
            const existing = productMap.get(item.product_name) || { quantity: 0, revenue: 0 };
            existing.quantity += item.quantity;
            existing.revenue += item.price * item.quantity;
            productMap.set(item.product_name, existing);
          });

          topProducts = Array.from(productMap.entries())
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
        }
      }

      // Build daily revenue data
      const dailyMap = new Map<string, { revenue: number; orders: number }>();
      (currentOrders || []).forEach((order) => {
        const day = new Date(order.order_date).toLocaleDateString("he-IL", {
          day: "2-digit",
          month: "2-digit",
        });
        const existing = dailyMap.get(day) || { revenue: 0, orders: 0 };
        existing.revenue += parseFloat(order.total?.toString() || "0");
        existing.orders += 1;
        dailyMap.set(day, existing);
      });

      const dailyData = Array.from(dailyMap.entries()).map(([date, data]) => ({
        date,
        ...data,
      }));

      // Calculate metrics
      const totalRevenue = (currentOrders || []).reduce(
        (sum, o) => sum + parseFloat(o.total?.toString() || "0"),
        0
      );
      const totalOrders = (currentOrders || []).length;
      const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      const prevRevenue = (prevOrders || []).reduce(
        (sum, o) => sum + parseFloat(o.total?.toString() || "0"),
        0
      );
      const prevTotalOrders = (prevOrders || []).length;
      const prevAov = prevTotalOrders > 0 ? prevRevenue / prevTotalOrders : 0;

      const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
      const ordersChange = prevTotalOrders > 0 ? ((totalOrders - prevTotalOrders) / prevTotalOrders) * 100 : 0;
      const aovChange = prevAov > 0 ? ((aov - prevAov) / prevAov) * 100 : 0;

      setMetrics({
        totalRevenue,
        totalOrders,
        aov,
        revenueChange,
        ordersChange,
        aovChange,
        dailyData,
        topProducts,
      });
    } catch (err) {
      console.error("Sales analytics error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const TrendBadge = ({ value }: { value: number }) => {
    const isUp = value >= 0;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 text-xs font-semibold",
          isUp ? "text-emerald-600" : "text-red-500"
        )}
      >
        {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {isUp ? "+" : ""}
        {value.toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Period Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-sky-500" />
          Sales Analytics
        </h2>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(["7d", "30d", "90d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                period === p
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "90 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-slate-500">Revenue</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">
              ₪{metrics.totalRevenue.toLocaleString("he-IL", { maximumFractionDigits: 0 })}
            </p>
            <TrendBadge value={metrics.revenueChange} />
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="w-4 h-4 text-sky-500" />
              <span className="text-xs text-slate-500">Orders</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{metrics.totalOrders}</p>
            <TrendBadge value={metrics.ordersChange} />
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-violet-500" />
              <span className="text-xs text-slate-500">AOV</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">
              ₪{metrics.aov.toFixed(0)}
            </p>
            <TrendBadge value={metrics.aovChange} />
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      {metrics.dailyData.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={metrics.dailyData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#94A3B8" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#94A3B8" }}
                  tickFormatter={(v) => `₪${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`₪${value.toLocaleString()}`, "Revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Products */}
      {metrics.topProducts.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" />
              Top Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {metrics.topProducts.map((product, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                        idx === 0
                          ? "bg-amber-100 text-amber-700"
                          : idx === 1
                          ? "bg-slate-200 text-slate-600"
                          : "bg-orange-100 text-orange-600"
                      )}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-sm text-slate-700 truncate">{product.name}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge variant="secondary" className="text-[10px] bg-slate-100">
                      {product.quantity} sold
                    </Badge>
                    <span className="text-sm font-semibold text-slate-800 w-16 text-right">
                      ₪{product.revenue.toLocaleString("he-IL", { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
