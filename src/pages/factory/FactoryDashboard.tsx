import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Factory, Package, ShoppingCart, Truck, DollarSign, BarChart3,
  Plus, LogOut, Loader2, Eye, Clock, CheckCircle2, XCircle,
  Upload, FileText, Bell, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FactoryProductUpload } from "@/components/factory/FactoryProductUpload";
import { FactoryProductList } from "@/components/factory/FactoryProductList";
import { FactoryOrdersList } from "@/components/factory/FactoryOrdersList";
import { FactoryShipments } from "@/components/factory/FactoryShipments";
import { FactoryFinancials } from "@/components/factory/FactoryFinancials";
import { FactoryAnalytics } from "@/components/factory/FactoryAnalytics";

const FactoryDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [supplier, setSupplier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({ products: 0, orders: 0, pending: 0, revenue: 0 });

  useEffect(() => {
    loadSupplierProfile();
  }, []);

  const loadSupplierProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/factory/auth");
        return;
      }

      const { data, error } = await (supabase as any)
        .from("suppliers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !data) {
        navigate("/factory/auth");
        return;
      }

      setSupplier(data);

      // Load stats
      const [productsRes, ordersRes, pendingRes, paymentsRes] = await Promise.all([
        (supabase as any).from("factory_product_submissions").select("id", { count: "exact", head: true }).eq("supplier_id", data.id),
        (supabase as any).from("factory_orders").select("id", { count: "exact", head: true }).eq("supplier_id", data.id),
        (supabase as any).from("factory_product_submissions").select("id", { count: "exact", head: true }).eq("supplier_id", data.id).eq("status", "pending_review"),
        (supabase as any).from("factory_payments").select("amount").eq("supplier_id", data.id).eq("status", "paid"),
      ]);

      setStats({
        products: productsRes.count || 0,
        orders: ordersRes.count || 0,
        pending: pendingRes.count || 0,
        revenue: (paymentsRes.data || []).reduce((s: number, p: any) => s + Number(p.amount), 0),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/factory/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const statusColor = supplier?.verification_status === "verified" ? "bg-emerald-500" : supplier?.verification_status === "rejected" ? "bg-red-500" : "bg-amber-500";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Top Bar */}
      <header className="bg-slate-800/80 backdrop-blur border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Factory className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-semibold text-sm">{supplier?.name}</h1>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                <span className="text-xs text-slate-400 capitalize">{supplier?.verification_status || "pending"}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <Bell className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400 hover:text-white gap-1.5">
              <LogOut className="w-4 h-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Products", value: stats.products, icon: Package, color: "from-blue-500 to-blue-600" },
            { label: "Orders", value: stats.orders, icon: ShoppingCart, color: "from-violet-500 to-violet-600" },
            { label: "Pending Review", value: stats.pending, icon: Clock, color: "from-amber-500 to-amber-600" },
            { label: "Revenue", value: `$${stats.revenue.toLocaleString()}`, icon: DollarSign, color: "from-emerald-500 to-emerald-600" },
          ].map((stat) => (
            <Card key={stat.label} className="bg-slate-800/60 border-slate-700/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-400">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800/60 border border-slate-700/50 mb-6">
            <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400">
              <BarChart3 className="w-4 h-4 mr-1.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400">
              <Package className="w-4 h-4 mr-1.5" /> Products
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400">
              <ShoppingCart className="w-4 h-4 mr-1.5" /> Orders
            </TabsTrigger>
            <TabsTrigger value="shipments" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400">
              <Truck className="w-4 h-4 mr-1.5" /> Shipments
            </TabsTrigger>
            <TabsTrigger value="financials" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-slate-400">
              <DollarSign className="w-4 h-4 mr-1.5" /> Financials
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <FactoryAnalytics supplierId={supplier?.id} />
          </TabsContent>

          <TabsContent value="products">
            <div className="space-y-6">
              <FactoryProductUpload supplierId={supplier?.id} onSubmitted={loadSupplierProfile} />
              <FactoryProductList supplierId={supplier?.id} />
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <FactoryOrdersList supplierId={supplier?.id} />
          </TabsContent>

          <TabsContent value="shipments">
            <FactoryShipments supplierId={supplier?.id} />
          </TabsContent>

          <TabsContent value="financials">
            <FactoryFinancials supplierId={supplier?.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default FactoryDashboard;
