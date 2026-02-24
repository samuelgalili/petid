/**
 * DashboardShopInsights — Conversion funnel, flagged products summary, profit margins.
 * Items 3-5 of admin enhancement plan.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Filter,
  Eye,
  ShoppingCart,
  CreditCard,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface FunnelStep {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

interface MarginProduct {
  name: string;
  price: number;
  cost: number;
  margin: number;
}

export const DashboardShopInsights = () => {
  const [loading, setLoading] = useState(true);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [margins, setMargins] = useState<MarginProduct[]>([]);
  const [flaggedCount, setFlaggedCount] = useState(0);
  const [avgMargin, setAvgMargin] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [ordersRes, productsRes, cartsRes] = await Promise.all([
        supabase.from("orders").select("id, status, total").order("created_at", { ascending: false }),
        supabase.from("business_products").select("name, price, cost_price, is_flagged, sale_price"),
        supabase.from("orders").select("id").eq("status", "pending"),
      ]);

      const orders = ordersRes.data || [];
      const products = productsRes.data || [];

      // Conversion Funnel
      const totalProducts = products.length;
      const pendingOrders = orders.filter((o) => o.status === "pending").length;
      const processingOrders = orders.filter((o) => o.status === "processing").length;
      const deliveredOrders = orders.filter((o) => o.status === "delivered").length;

      setFunnel([
        { label: "Products Listed", value: totalProducts, icon: <Eye className="w-4 h-4" />, color: "text-slate-500" },
        { label: "In Cart / Pending", value: pendingOrders, icon: <ShoppingCart className="w-4 h-4" />, color: "text-sky-500" },
        { label: "Processing", value: processingOrders, icon: <CreditCard className="w-4 h-4" />, color: "text-amber-500" },
        { label: "Completed", value: deliveredOrders, icon: <CheckCircle className="w-4 h-4" />, color: "text-emerald-500" },
      ]);

      // Flagged
      setFlaggedCount(products.filter((p) => p.is_flagged).length);

      // Profit Margins
      const withCost = products.filter((p) => p.cost_price && p.cost_price > 0);
      const marginProducts = withCost
        .map((p) => {
          const sellPrice = p.sale_price || p.price;
          const margin = ((sellPrice - p.cost_price!) / sellPrice) * 100;
          return { name: p.name, price: sellPrice, cost: p.cost_price!, margin };
        })
        .sort((a, b) => a.margin - b.margin)
        .slice(0, 5);

      setMargins(marginProducts);
      setAvgMargin(
        withCost.length > 0
          ? withCost.reduce((sum, p) => {
              const sell = p.sale_price || p.price;
              return sum + ((sell - p.cost_price!) / sell) * 100;
            }, 0) / withCost.length
          : 0
      );
    } catch (err) {
      console.error("Shop insights error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-slate-200">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <Filter className="w-5 h-5 text-sky-500" />
        Shop Insights
      </h2>

      {/* Conversion Funnel */}
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-slate-700">Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2">
            {funnel.map((step, idx) => {
              const rate = idx > 0 && funnel[idx - 1].value > 0
                ? ((step.value / funnel[idx - 1].value) * 100).toFixed(0)
                : null;
              return (
                <div key={step.label} className="flex-1 text-center relative">
                  <div className={cn("flex flex-col items-center gap-1", step.color)}>
                    {step.icon}
                    <p className="text-xl font-bold text-slate-800">{step.value}</p>
                    <p className="text-[10px] text-slate-500">{step.label}</p>
                  </div>
                  {rate && (
                    <Badge variant="outline" className="absolute -top-1 -right-1 text-[9px] px-1">
                      {rate}%
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
          {/* Funnel bars */}
          <div className="mt-3 space-y-1">
            {funnel.map((step, idx) => {
              const maxVal = Math.max(...funnel.map((f) => f.value), 1);
              const width = (step.value / maxVal) * 100;
              return (
                <div key={idx} className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      idx === 0 ? "bg-slate-300" : idx === 1 ? "bg-sky-400" : idx === 2 ? "bg-amber-400" : "bg-emerald-400"
                    )}
                    style={{ width: `${width}%` }}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Flagged Summary */}
        <Card className={cn("border-slate-200", flaggedCount > 0 && "border-amber-200")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={cn("w-4 h-4", flaggedCount > 0 ? "text-amber-500" : "text-emerald-500")} />
              <span className="text-sm font-semibold text-slate-700">Flagged Products</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{flaggedCount}</p>
            <p className="text-xs text-slate-500 mt-1">
              {flaggedCount === 0 ? "All products are clean ✓" : "Products need review"}
            </p>
          </CardContent>
        </Card>

        {/* Average Margin */}
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold text-slate-700">Avg Profit Margin</span>
            </div>
            <p className="text-3xl font-bold text-slate-800">{avgMargin.toFixed(1)}%</p>
            <p className="text-xs text-slate-500 mt-1">
              {margins.length > 0 ? `Based on ${margins.length}+ products with cost data` : "Add cost prices to track"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lowest Margin Products */}
      {margins.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Lowest Margin Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {margins.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 truncate flex-1">{p.name}</span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-slate-400">₪{p.cost} → ₪{p.price}</span>
                  <Badge
                    className={cn(
                      "text-[10px] border-0",
                      p.margin < 15 ? "bg-red-50 text-red-600" : p.margin < 30 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                    )}
                  >
                    {p.margin.toFixed(0)}%
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
