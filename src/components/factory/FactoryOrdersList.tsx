import { useState, useEffect } from "react";
import { ShoppingCart, Loader2, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  supplierId: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  confirmed: "bg-blue-500/20 text-blue-400",
  production: "bg-violet-500/20 text-violet-400",
  shipped: "bg-emerald-500/20 text-emerald-400",
  completed: "bg-emerald-500/20 text-emerald-400",
  cancelled: "bg-red-500/20 text-red-400",
};

export const FactoryOrdersList = ({ supplierId }: Props) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supplierId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("factory_orders")
        .select("*")
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: false });
      setOrders(data || []);
      setLoading(false);
    })();
  }, [supplierId]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>;

  if (orders.length === 0) {
    return (
      <Card className="bg-slate-800/60 border-slate-700/50">
        <CardContent className="py-12 text-center">
          <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No orders yet</p>
          <p className="text-xs text-slate-500 mt-1">Orders will appear here when PetID places them</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/60 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-emerald-400" /> Orders ({orders.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="bg-slate-700/40 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">#{order.order_number}</span>
              <Badge variant="outline" className={statusColors[order.status] || "text-slate-400"}>
                {order.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>${Number(order.total_amount).toLocaleString()} {order.currency}</span>
              <span>{new Date(order.created_at).toLocaleDateString()}</span>
            </div>
            {order.tracking_number && (
              <p className="text-xs text-emerald-400 mt-2">📦 {order.tracking_number}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
