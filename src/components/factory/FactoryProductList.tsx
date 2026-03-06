import { useState, useEffect } from "react";
import { Package, Clock, CheckCircle2, XCircle, Eye, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending_review: { label: "Pending Review", color: "border-[hsl(var(--warning))]/30 text-[hsl(var(--warning))]", icon: Clock },
  approved: { label: "Approved", color: "border-[hsl(var(--success))]/30 text-[hsl(var(--success))]", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "border-destructive/30 text-destructive", icon: XCircle },
  published: { label: "Published", color: "border-primary/30 text-primary", icon: Eye },
};

interface Props { supplierId: string; }

export const FactoryProductList = ({ supplierId }: Props) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supplierId) { setLoading(false); return; }
    (async () => {
      const { data } = await (supabase as any)
        .from("factory_product_submissions").select("*")
        .eq("supplier_id", supplierId).order("created_at", { ascending: false });
      setProducts(data || []);
      setLoading(false);
    })();
  }, [supplierId]);

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  if (products.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="py-12 text-center">
          <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-muted-foreground">No products submitted yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Click "Submit New Product" to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2 text-foreground">
          <Package className="w-4 h-4 text-primary" strokeWidth={1.5} /> My Products ({products.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {products.map((p) => {
          const status = STATUS_MAP[p.status] || STATUS_MAP.pending_review;
          const StatusIcon = status.icon;
          return (
            <div key={p.id} className="bg-muted/50 rounded-xl p-4 flex items-center justify-between border border-border/50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-primary/60" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.category} • ${Number(p.price).toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={`${status.color} text-xs`}>
                  <StatusIcon className="w-3 h-3 mr-1" strokeWidth={1.5} />
                  {status.label}
                </Badge>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
