/**
 * DashboardInventoryIntel — Smart inventory alerts: out-of-stock, flagged, price review, demand signals.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  PackageX,
  Tag,
  Flag,
  RefreshCw,
  Loader2,
  ExternalLink,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface InventoryAlert {
  id: string;
  name: string;
  image_url: string;
  type: "out_of_stock" | "flagged" | "price_review" | "no_image";
}

interface InventoryStats {
  total: number;
  outOfStock: number;
  flagged: number;
  needsPriceReview: number;
  needsImageReview: number;
  autoRestock: number;
  topDemand: { name: string; orders: number }[];
  alerts: InventoryAlert[];
}

export const DashboardInventoryIntel = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);

      // Fetch product stats
      const { data: products } = await supabase
        .from("business_products")
        .select("id, name, image_url, in_stock, is_flagged, needs_price_review, needs_image_review, auto_restock, flagged_reason");

      const all = products || [];
      const outOfStock = all.filter((p) => p.in_stock === false);
      const flagged = all.filter((p) => p.is_flagged === true);
      const needsPriceReview = all.filter((p) => p.needs_price_review === true);
      const needsImageReview = all.filter((p) => p.needs_image_review === true);
      const autoRestock = all.filter((p) => p.auto_restock === true);

      // Build alerts list (max 8)
      const alerts: InventoryAlert[] = [
        ...outOfStock.slice(0, 3).map((p) => ({
          id: p.id,
          name: p.name,
          image_url: p.image_url,
          type: "out_of_stock" as const,
        })),
        ...flagged.slice(0, 2).map((p) => ({
          id: p.id,
          name: p.name,
          image_url: p.image_url,
          type: "flagged" as const,
        })),
        ...needsPriceReview.slice(0, 2).map((p) => ({
          id: p.id,
          name: p.name,
          image_url: p.image_url,
          type: "price_review" as const,
        })),
        ...needsImageReview.slice(0, 1).map((p) => ({
          id: p.id,
          name: p.name,
          image_url: p.image_url,
          type: "no_image" as const,
        })),
      ].slice(0, 8);

      // Top demand: most ordered products in last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentOrders } = await supabase
        .from("orders")
        .select("id")
        .gte("order_date", thirtyDaysAgo);

      let topDemand: { name: string; orders: number }[] = [];
      if (recentOrders && recentOrders.length > 0) {
        const orderIds = recentOrders.map((o) => o.id).slice(0, 200);
        const { data: items } = await supabase
          .from("order_items")
          .select("product_name, quantity")
          .in("order_id", orderIds);

        if (items) {
          const demandMap = new Map<string, number>();
          items.forEach((i) => {
            demandMap.set(i.product_name, (demandMap.get(i.product_name) || 0) + i.quantity);
          });
          topDemand = Array.from(demandMap.entries())
            .map(([name, orders]) => ({ name, orders }))
            .sort((a, b) => b.orders - a.orders)
            .slice(0, 5);
        }
      }

      setStats({
        total: all.length,
        outOfStock: outOfStock.length,
        flagged: flagged.length,
        needsPriceReview: needsPriceReview.length,
        needsImageReview: needsImageReview.length,
        autoRestock: autoRestock.length,
        topDemand,
        alerts,
      });
    } catch (err) {
      console.error("Inventory intel error:", err);
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

  if (!stats) return null;

  const alertConfig = {
    out_of_stock: { icon: PackageX, label: "Out of Stock", color: "text-red-600 bg-red-50" },
    flagged: { icon: Flag, label: "Flagged", color: "text-amber-600 bg-amber-50" },
    price_review: { icon: Tag, label: "Price Review", color: "text-violet-600 bg-violet-50" },
    no_image: { icon: ShieldAlert, label: "Image Review", color: "text-orange-600 bg-orange-50" },
  };

  const hasIssues = stats.outOfStock > 0 || stats.flagged > 0 || stats.needsPriceReview > 0;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <AlertTriangle className={cn("w-5 h-5", hasIssues ? "text-amber-500" : "text-emerald-500")} />
        Inventory Intelligence
        {hasIssues && (
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-[10px]">
            {stats.outOfStock + stats.flagged + stats.needsPriceReview} issues
          </Badge>
        )}
      </h2>

      {/* Summary Pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "Total Products", value: stats.total, icon: "📦" },
          { label: "Out of Stock", value: stats.outOfStock, icon: "🚫", warn: stats.outOfStock > 0 },
          { label: "Flagged", value: stats.flagged, icon: "🚩", warn: stats.flagged > 0 },
          { label: "Auto Restock", value: stats.autoRestock, icon: "🔄" },
        ].map((pill) => (
          <Card
            key={pill.label}
            className={cn(
              "border-slate-200",
              pill.warn && "border-amber-200 bg-amber-50/50"
            )}
          >
            <CardContent className="p-3 text-center">
              <span className="text-lg">{pill.icon}</span>
              <p className="text-xl font-bold text-slate-800 mt-1">{pill.value}</p>
              <p className="text-[10px] text-slate-500">{pill.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alert Items */}
      {stats.alerts.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Action Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.alerts.map((alert) => {
              const config = alertConfig[alert.type];
              const Icon = config.icon;
              return (
                <div
                  key={alert.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => navigate("/admin/products")}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                    <img src={alert.image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-sm text-slate-700 truncate flex-1">{alert.name}</span>
                  <Badge className={cn("text-[10px] border-0", config.color)}>
                    <Icon className="w-3 h-3 mr-1" />
                    {config.label}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Top Demand */}
      {stats.topDemand.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Highest Demand (30d)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.topDemand.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 truncate flex-1">{item.name}</span>
                <Badge variant="outline" className="text-[10px] ml-2">
                  {item.orders} units
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => navigate("/admin/products")}
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          Manage Products
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={fetchInventory}
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Refresh
        </Button>
      </div>
    </div>
  );
};
