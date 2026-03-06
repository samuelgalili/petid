import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Factory, Package, ShoppingCart, Truck, DollarSign, BarChart3,
  Plus, LogOut, Loader2, Clock, Bell, Settings, Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FactoryProductUpload } from "@/components/factory/FactoryProductUpload";
import { FactoryProductList } from "@/components/factory/FactoryProductList";
import { FactoryOrdersList } from "@/components/factory/FactoryOrdersList";
import { FactoryShipments } from "@/components/factory/FactoryShipments";
import { FactoryFinancials } from "@/components/factory/FactoryFinancials";
import { FactoryAnalytics } from "@/components/factory/FactoryAnalytics";
import { FactoryApiSettings } from "@/components/factory/FactoryApiSettings";

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
      if (!user) { navigate("/factory/auth"); return; }

      const { data: adminRole } = await (supabase as any)
        .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();

      const { data } = await (supabase as any)
        .from("suppliers").select("*").eq("user_id", user.id).maybeSingle();

      if (data) {
        setSupplier(data);
      } else if (adminRole) {
        const { data: firstSupplier } = await (supabase as any)
          .from("suppliers").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
        setSupplier(firstSupplier || { id: null, name: "Admin View", verification_status: "verified" });
      } else {
        navigate("/factory/auth"); return;
      }

      const supplierId = data?.id || null;
      if (supplierId) {
        const [productsRes, ordersRes, pendingRes, paymentsRes] = await Promise.all([
          (supabase as any).from("factory_product_submissions").select("id", { count: "exact", head: true }).eq("supplier_id", supplierId),
          (supabase as any).from("factory_orders").select("id", { count: "exact", head: true }).eq("supplier_id", supplierId),
          (supabase as any).from("factory_product_submissions").select("id", { count: "exact", head: true }).eq("supplier_id", supplierId).eq("status", "pending_review"),
          (supabase as any).from("factory_payments").select("amount").eq("supplier_id", supplierId).eq("status", "paid"),
        ]);
        setStats({
          products: productsRes.count || 0,
          orders: ordersRes.count || 0,
          pending: pendingRes.count || 0,
          revenue: (paymentsRes.data || []).reduce((s: number, p: any) => s + Number(p.amount), 0),
        });
      }
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const verified = supplier?.verification_status === "verified";
  const rejected = supplier?.verification_status === "rejected";

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Factory className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-foreground font-semibold text-sm">
                Pet<span className="text-primary">ID</span> · {supplier?.name}
              </h1>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${verified ? "bg-[hsl(var(--success))]" : rejected ? "bg-destructive" : "bg-[hsl(var(--warning))]"}`} />
                <span className="text-xs text-muted-foreground capitalize">{supplier?.verification_status || "pending"}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8" onClick={() => navigate("/")}>
              <Home className="w-4 h-4" strokeWidth={1.5} />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8">
              <Bell className="w-4 h-4" strokeWidth={1.5} />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground gap-1.5 text-xs">
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Products", value: stats.products, icon: Package, color: "text-primary" },
            { label: "Orders", value: stats.orders, icon: ShoppingCart, color: "text-[hsl(var(--accent))]" },
            { label: "Pending Review", value: stats.pending, icon: Clock, color: "text-[hsl(var(--warning))]" },
            { label: "Revenue", value: `$${stats.revenue.toLocaleString()}`, icon: DollarSign, color: "text-[hsl(var(--success))]" },
          ].map((stat) => (
            <Card key={stat.label} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} strokeWidth={1.5} />
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted border border-border mb-6">
            <TabsTrigger value="overview">
              <BarChart3 className="w-4 h-4 mr-1.5" strokeWidth={1.5} /> Overview
            </TabsTrigger>
            <TabsTrigger value="products">
              <Package className="w-4 h-4 mr-1.5" strokeWidth={1.5} /> Products
            </TabsTrigger>
            <TabsTrigger value="orders">
              <ShoppingCart className="w-4 h-4 mr-1.5" strokeWidth={1.5} /> Orders
            </TabsTrigger>
            <TabsTrigger value="shipments">
              <Truck className="w-4 h-4 mr-1.5" strokeWidth={1.5} /> Shipments
            </TabsTrigger>
            <TabsTrigger value="financials">
              <DollarSign className="w-4 h-4 mr-1.5" strokeWidth={1.5} /> Financials
            </TabsTrigger>
            <TabsTrigger value="api">
              <Settings className="w-4 h-4 mr-1.5" strokeWidth={1.5} /> API
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
          <TabsContent value="api">
            <FactoryApiSettings supplierId={supplier?.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default FactoryDashboard;
