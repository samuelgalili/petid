import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart3, 
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  DollarSign,
  Package,
  Eye,
  Target,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const AdminAnalytics = () => {
  const [dateRange, setDateRange] = useState("30d");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: orders } = useQuery({
    queryKey: ["analytics-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["analytics-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, created_at");
      if (error) throw error;
      return data || [];
    },
  });

  const totalRevenue = orders?.reduce((acc, o) => acc + (o.total || 0), 0) || 0;
  const totalOrders = orders?.length || 0;
  const totalUsers = profiles?.length || 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const stats = [
    {
      title: "הכנסות",
      value: `₪${totalRevenue.toLocaleString()}`,
      change: "+12.5%",
      isPositive: true,
      icon: DollarSign,
      gradient: "from-emerald-500 to-green-600",
    },
    {
      title: "הזמנות",
      value: totalOrders.toLocaleString(),
      change: "+8.2%",
      isPositive: true,
      icon: ShoppingCart,
      gradient: "from-violet-500 to-purple-600",
    },
    {
      title: "משתמשים",
      value: totalUsers.toLocaleString(),
      change: "+15.3%",
      isPositive: true,
      icon: Users,
      gradient: "from-blue-500 to-cyan-600",
    },
    {
      title: "ממוצע הזמנה",
      value: `₪${avgOrderValue.toFixed(0)}`,
      change: "-2.1%",
      isPositive: false,
      icon: Target,
      gradient: "from-amber-500 to-orange-600",
    },
  ];

  // Mock data for charts
  const revenueData = [
    { name: "ינו", revenue: 4000, orders: 24 },
    { name: "פבר", revenue: 3000, orders: 18 },
    { name: "מרץ", revenue: 5000, orders: 35 },
    { name: "אפר", revenue: 4500, orders: 28 },
    { name: "מאי", revenue: 6000, orders: 42 },
    { name: "יוני", revenue: 5500, orders: 38 },
  ];

  const categoryData = [
    { name: "מזון", value: 35, color: "#8B5CF6" },
    { name: "צעצועים", value: 25, color: "#10B981" },
    { name: "אביזרים", value: 20, color: "#F59E0B" },
    { name: "בריאות", value: 15, color: "#3B82F6" },
    { name: "אחר", value: 5, color: "#6B7280" },
  ];

  const trafficData = [
    { name: "ראשון", visits: 1200, conversions: 45 },
    { name: "שני", visits: 1800, conversions: 67 },
    { name: "שלישי", visits: 1600, conversions: 58 },
    { name: "רביעי", visits: 2100, conversions: 82 },
    { name: "חמישי", visits: 1900, conversions: 71 },
    { name: "שישי", visits: 800, conversions: 28 },
    { name: "שבת", visits: 600, conversions: 22 },
  ];

  return (
    <AdminLayout title="אנליטיקות" icon={BarChart3}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">דשבורד אנליטי</h1>
            <p className="text-muted-foreground">מעקב ביצועים ותובנות עסקיות</p>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 ימים אחרונים</SelectItem>
              <SelectItem value="30d">30 ימים אחרונים</SelectItem>
              <SelectItem value="90d">90 ימים אחרונים</SelectItem>
              <SelectItem value="1y">שנה אחרונה</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-10`} />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${stat.isPositive ? "text-emerald-600" : "text-red-600"}`}>
                    {stat.isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {stat.change}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                הכנסות לפי חודש
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-muted-foreground" />
                  <YAxis className="text-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Categories Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                מכירות לפי קטגוריה
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {categoryData.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-muted-foreground">{item.name} ({item.value}%)</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Traffic Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-500" />
                תנועה והמרות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trafficData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-muted-foreground" />
                  <YAxis className="text-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                  />
                  <Bar dataKey="visits" fill="#3B82F6" radius={[4, 4, 0, 0]} name="ביקורים" />
                  <Bar dataKey="conversions" fill="#10B981" radius={[4, 4, 0, 0]} name="המרות" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;