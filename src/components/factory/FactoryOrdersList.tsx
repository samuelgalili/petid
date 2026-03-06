import { useState, useEffect } from "react";
import { ShoppingCart, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface Props { supplierId: string; }

export const FactoryOrdersList = ({ supplierId }: Props) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supplierId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("factory_orders").select("*")
        .eq("supplier_id", supplierId).order("created_at", { ascending: false });
      setOrders(data || []);
      setLoading(false);
    })();
  }, [supplierId]);

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  if (orders.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="py-12 text-center">
          <ShoppingCart className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-muted-foreground">No orders yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Orders will appear here when PetID places them</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-foreground">
          <ShoppingCart className="w-4 h-4 text-primary" strokeWidth={1.5} /> Orders ({orders.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {orders.map((order) => (
          <div key={order.id} className="bg-muted/50 rounded-xl p-4 border border-border/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">#{order.order_number}</span>
              <Badge variant="outline" className="text-xs">{order.status}</Badge>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>${Number(order.total_amount).toLocaleString()} {order.currency}</span>
              <span>{new Date(order.created_at).toLocaleDateString()}</span>
            </div>
            {order.tracking_number && (
              <p className="text-xs text-primary mt-2">📦 {order.tracking_number}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
