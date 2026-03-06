import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Package, ShoppingCart, DollarSign, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  supplierId: string;
}

export const FactoryAnalytics = ({ supplierId }: Props) => {
  const [data, setData] = useState<{
    totalProducts: number;
    approvedProducts: number;
    totalOrders: number;
    totalRevenue: number;
    recentActivity: any[];
  }>({ totalProducts: 0, approvedProducts: 0, totalOrders: 0, totalRevenue: 0, recentActivity: [] });
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
        recentActivity: [],
      });
      setLoading(false);
    })();
  }, [supplierId]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>;

  const approvalRate = data.totalProducts > 0 ? Math.round((data.approvedProducts / data.totalProducts) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Products", value: data.totalProducts, icon: Package, color: "text-blue-400" },
          { label: "Approval Rate", value: `${approvalRate}%`, icon: TrendingUp, color: "text-emerald-400" },
          { label: "Total Orders", value: data.totalOrders, icon: ShoppingCart, color: "text-violet-400" },
          { label: "Total Revenue", value: `$${data.totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-amber-400" },
        ].map((kpi) => (
          <Card key={kpi.label} className="bg-slate-800/60 border-slate-700/50">
            <CardContent className="p-4">
              <kpi.icon className={`w-5 h-5 ${kpi.color} mb-2`} />
              <p className="text-xl font-bold text-white">{kpi.value}</p>
              <p className="text-xs text-slate-400">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Welcome / Getting Started */}
      <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Welcome to PetID Factory Portal</h3>
          <p className="text-sm text-slate-300 mb-4">
            Upload your products for review. Once approved by our team, they'll be available to thousands of pet owners through the PetID platform.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="bg-slate-800/40 rounded-lg p-3">
              <span className="text-emerald-400 font-medium">Step 1</span>
              <p className="text-slate-300 text-xs mt-1">Submit products with full details</p>
            </div>
            <div className="bg-slate-800/40 rounded-lg p-3">
              <span className="text-emerald-400 font-medium">Step 2</span>
              <p className="text-slate-300 text-xs mt-1">Admin reviews for safety & quality</p>
            </div>
            <div className="bg-slate-800/40 rounded-lg p-3">
              <span className="text-emerald-400 font-medium">Step 3</span>
              <p className="text-slate-300 text-xs mt-1">Approved products go live on PetID</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
