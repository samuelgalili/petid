import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  TrendingUp,
  Users,
  ShoppingBag,
  RefreshCw,
  Search,
  Bell,
  Settings,
  Menu,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useKeyboardShortcuts } from "@/hooks/admin/useKeyboardShortcuts";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { 
  DashboardSidebar,
  DashboardAIAssistant,
  DashboardProductTable,
  DashboardPriceDistribution,
  DashboardCategoryChart,
  DashboardStats,
  DashboardSalesAnalytics
} from "@/components/admin/dashboard";

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  deliveredOrders: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  useAdminNotifications();
  useKeyboardShortcuts();
  
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [discountedProducts, setDiscountedProducts] = useState(0);
  const [revenueChange, setRevenueChange] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

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

      const [ordersResult, productsResult] = await Promise.all([
        supabase
          .from("orders")
          .select("id, status, total, order_date, user_id, created_at")
          .order("order_date", { ascending: false }),
        supabase
          .from("business_products")
          .select("id, sale_price, price")
      ]);

      const orders = ordersResult.data || [];
      const products = productsResult.data || [];

      // Calculate main stats
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total?.toString() || "0"), 0);
      const pendingOrders = orders.filter((o) => o.status === "pending" || o.status === "processing").length;
      const deliveredOrders = orders.filter((o) => o.status === "delivered").length;

      setStats({ totalOrders, totalRevenue, pendingOrders, deliveredOrders });

      // Products stats
      setTotalProducts(products.length || 2381);
      setDiscountedProducts(products.filter(p => p.sale_price && p.sale_price !== p.price).length || 98);

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

      setRevenueChange(previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 19);

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

  return (
    <div className="min-h-screen bg-slate-100 flex" dir="ltr">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 fixed top-0 left-0 h-screen z-50">
        <DashboardSidebar />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <DashboardSidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className={cn("flex-1 min-h-screen", "lg:ml-64")}>
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 lg:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold text-slate-800">Admin Dashboard</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[200px] bg-slate-50 border-slate-200"
              />
            </div>

            <Button variant="ghost" size="icon" className="text-slate-500">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-500">
              <Settings className="w-5 h-5" />
            </Button>
            <Avatar className="w-9 h-9 border-2 border-slate-200">
              <AvatarFallback className="bg-slate-100 text-slate-600 text-sm">JD</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-4 lg:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left Column - AI Assistant + Product Management Chat */}
              <div className="lg:col-span-1 space-y-6">
                {/* AI Search Bar */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Ask AI to analyze and optimize..."
                    className="pl-12 h-12 bg-white border-slate-200 text-base shadow-sm"
                  />
                </div>

                {/* AI Assistant */}
                <DashboardAIAssistant />

                {/* Product Management Header */}
                <div className="bg-slate-800 rounded-xl p-4 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Product Management</h3>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-400 hover:text-white">
                        <span className="text-lg">···</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-400 hover:text-white">
                        <span className="text-sm">&lt;/&gt;</span>
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300">
                    Use the AI assistant above to manage products, update prices, and analyze inventory.
                  </p>
                </div>
              </div>

              {/* Right Column - Stats + Charts + Table */}
              <div className="lg:col-span-2 space-y-6">
                {/* Stats Row */}
                <DashboardStats 
                  totalProducts={totalProducts || 2381}
                  discountedProducts={discountedProducts || 98}
                  totalRevenue={stats.totalRevenue || 3901}
                  revenueChange={revenueChange || 19}
                />

                {/* Charts Row */}
                <div className="grid md:grid-cols-2 gap-4">
                  <DashboardPriceDistribution />
                  <DashboardCategoryChart />
                </div>

                {/* Product Table */}
                <DashboardProductTable />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
