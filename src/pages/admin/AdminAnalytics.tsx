import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DashboardSidebar } from "@/components/admin/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Menu,
  Search,
  Bell,
  Settings,
  DollarSign,
  ShoppingCart,
  Users,
  Target,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Eye
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";

const AdminAnalytics = () => {
  const [dateRange, setDateRange] = useState("30d");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

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

  // Calculate previous period for comparison
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const recentOrders = orders?.filter(o => new Date(o.created_at) >= thirtyDaysAgo) || [];
  const previousOrders = orders?.filter(o => {
    const date = new Date(o.created_at);
    return date >= sixtyDaysAgo && date < thirtyDaysAgo;
  }) || [];

  const currentRevenue = recentOrders.reduce((acc, o) => acc + (o.total || 0), 0);
  const previousRevenue = previousOrders.reduce((acc, o) => acc + (o.total || 0), 0);
  const revenueChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1) : "0";
  const orderChange = previousOrders.length > 0 ? ((recentOrders.length - previousOrders.length) / previousOrders.length * 100).toFixed(1) : "0";

  const stats = [
    {
      title: "הכנסות",
      value: `₪${totalRevenue.toLocaleString()}`,
      change: `${Number(revenueChange) >= 0 ? '+' : ''}${revenueChange}%`,
      isPositive: Number(revenueChange) >= 0,
      icon: DollarSign,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      title: "הזמנות",
      value: totalOrders.toLocaleString(),
      change: `${Number(orderChange) >= 0 ? '+' : ''}${orderChange}%`,
      isPositive: Number(orderChange) >= 0,
      icon: ShoppingCart,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
    },
    {
      title: "משתמשים",
      value: totalUsers.toLocaleString(),
      change: "+0%",
      isPositive: true,
      icon: Users,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "ממוצע הזמנה",
      value: `₪${avgOrderValue.toFixed(0)}`,
      change: "0%",
      isPositive: true,
      icon: Target,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
  ];

  // Generate revenue data from real orders grouped by month
  const revenueData = (() => {
    const months = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יוני', 'יולי', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];
    const currentYear = new Date().getFullYear();
    const monthlyData: { name: string; revenue: number; orders: number }[] = [];

    for (let i = 0; i < 6; i++) {
      const monthIndex = new Date().getMonth() - 5 + i;
      const adjustedMonth = monthIndex < 0 ? monthIndex + 12 : monthIndex;
      const monthOrders = orders?.filter(o => {
        const date = new Date(o.created_at);
        return date.getMonth() === adjustedMonth && date.getFullYear() === (monthIndex < 0 ? currentYear - 1 : currentYear);
      }) || [];

      monthlyData.push({
        name: months[adjustedMonth],
        revenue: monthOrders.reduce((acc, o) => acc + (o.total || 0), 0),
        orders: monthOrders.length,
      });
    }
    return monthlyData;
  })();

  // Calculate category data from real orders
  const categoryData = (() => {
    const categories: Record<string, number> = {};
    orders?.forEach(o => {
      const category = (o as any).category || 'אחר';
      categories[category] = (categories[category] || 0) + (o.total || 0);
    });

    const colors = ["#8B5CF6", "#10B981", "#F59E0B", "#3B82F6", "#6B7280"];
    const total = Object.values(categories).reduce((a, b) => a + b, 0) || 1;

    return Object.entries(categories).slice(0, 5).map(([name, value], i) => ({
      name,
      value: Math.round((value / total) * 100),
      color: colors[i % colors.length],
    }));
  })();

  // Traffic data
  const trafficData = (() => {
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    return days.map((name, i) => {
      const dayOrders = orders?.filter(o => new Date(o.created_at).getDay() === i) || [];
      return {
        name,
        visits: dayOrders.length * 10,
        conversions: dayOrders.length,
      };
    });
  })();

  const SidebarContent = () => (
    <div className="w-64 h-full">
      <DashboardSidebar />
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="hidden lg:block w-64 fixed inset-y-0 right-0 z-30">
          <DashboardSidebar />
        </aside>
      )}

      {/* Mobile Sidebar */}
      {isMobile && (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="right" className="p-0 w-64">
            <DashboardSidebar />
          </SheetContent>
        </Sheet>
      )}

      {/* Main Content */}
      <div className={`flex-1 ${!isMobile ? 'lg:mr-64' : ''}`}>
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isMobile && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              )}
              <div>
                <h1 className="text-xl font-bold text-slate-900">אנליטיקות</h1>
                <p className="text-sm text-slate-500">מעקב ביצועים ותובנות</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:block relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="חיפוש..." 
                  className="w-48 pr-9 h-9 bg-slate-50 border-slate-200"
                />
              </div>
              
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32 h-9 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 ימים</SelectItem>
                  <SelectItem value="30d">30 ימים</SelectItem>
                  <SelectItem value="90d">90 ימים</SelectItem>
                  <SelectItem value="1y">שנה</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5 text-slate-500" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                  3
                </span>
              </Button>
              
              <Avatar className="w-9 h-9 border-2 border-slate-200">
                <AvatarFallback className="bg-slate-100 text-slate-600 text-sm font-medium">
                  JD
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 sm:p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <Card key={index} className="bg-white border-slate-200 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                      <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                      stat.isPositive 
                        ? "bg-emerald-50 text-emerald-600" 
                        : "bg-red-50 text-red-600"
                    }`}>
                      {stat.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {stat.change}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue Chart */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  הכנסות לפי חודש
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: '#64748B', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: '#64748B', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "#fff", 
                        border: "1px solid #E2E8F0", 
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Categories Pie Chart */}
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Package className="w-4 h-4 text-violet-600" />
                  </div>
                  מכירות לפי קטגוריה
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <ResponsiveContainer width="60%" height={200}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "#fff", 
                          border: "1px solid #E2E8F0", 
                          borderRadius: "8px"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="w-[40%] space-y-2">
                    {categoryData.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: item.color }} 
                        />
                        <span className="text-xs text-slate-600 truncate">{item.name}</span>
                        <span className="text-xs font-medium text-slate-900 mr-auto">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Traffic Chart */}
            <Card className="lg:col-span-2 bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Eye className="w-4 h-4 text-blue-600" />
                  </div>
                  תנועה והמרות
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={trafficData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: '#64748B', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: '#64748B', fontSize: 12 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "#fff", 
                        border: "1px solid #E2E8F0", 
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                      }}
                    />
                    <Bar dataKey="visits" fill="#3B82F6" radius={[4, 4, 0, 0]} name="ביקורים" />
                    <Bar dataKey="conversions" fill="#10B981" radius={[4, 4, 0, 0]} name="המרות" />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm text-slate-600">ביקורים</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-sm text-slate-600">המרות</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminAnalytics;
