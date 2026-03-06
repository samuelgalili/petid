import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Package, ShoppingCart, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface Props { supplierId: string; }

export const FactoryAnalytics = ({ supplierId }: Props) => {
  const [data, setData] = useState({ totalProducts: 0, approvedProducts: 0, totalOrders: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supplierId) return;
    (async () => {
      const [products, approved, orders, payments] = await Promise.all([
        (supabase as any).from("factory_product_submissions").select("id", { count: "exact", head: true }).eq("supplier_id", supplierId),
        (supabase as any).from("factory_product_submissions").select("id", { count: "exact", head: true }).eq("supplier_id", supplierId).eq("status", "approved"),
        (supabase as any).from("factory_orders").select("id", { count: "exact", head: true }).eq("supplier_id", supplierId),
        (supabase as any).from("factory_payments").select("amount").eq("supplier_id", supplierId).eq("status", "paid"),
      ]);
      setData({
        totalProducts: products.count || 0,
        approvedProducts: approved.count || 0,
        totalOrders: orders.count || 0,
        totalRevenue: (payments.data || []).reduce((s: number, p: any) => s + Number(p.amount), 0),
      });
      setLoading(false);
    })();
  }, [supplierId]);

  if (loading) return <div className="space-y-4"><div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div><Skeleton className="h-48 rounded-xl" /></div>;

  const approvalRate = data.totalProducts > 0 ? Math.round((data.approvedProducts / data.totalProducts) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Products", value: data.totalProducts, icon: Package, color: "text-primary" },
          { label: "Approval Rate", value: `${approvalRate}%`, icon: TrendingUp, color: "text-[hsl(var(--success))]" },
          { label: "Total Orders", value: data.totalOrders, icon: ShoppingCart, color: "text-[hsl(var(--accent))]" },
          { label: "Total Revenue", value: `$${data.totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-[hsl(var(--warning))]" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-border">
            <CardContent className="p-4">
              <kpi.icon className={`w-5 h-5 ${kpi.color} mb-2`} strokeWidth={1.5} />
              <p className="text-xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Getting Started */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Welcome to Pet<span className="text-primary">ID</span> Factory Portal
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload your products for review. Once approved by our team, they'll be available to thousands of pet owners through the PetID platform.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            {[
              { step: "Step 1", text: "Submit products with full details" },
              { step: "Step 2", text: "Admin reviews for safety & quality" },
              { step: "Step 3", text: "Approved products go live on PetID" },
            ].map((s) => (
              <div key={s.step} className="bg-card rounded-lg p-3 border border-border">
                <span className="text-primary font-medium text-xs">{s.step}</span>
                <p className="text-muted-foreground text-xs mt-1">{s.text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
