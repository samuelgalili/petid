import { useState, useEffect } from "react";
import { Package, Clock, CheckCircle2, XCircle, Eye, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending_review: { label: "Pending Review", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: Clock },
  approved: { label: "Approved", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle },
  published: { label: "Published", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Eye },
};

interface Props {
  supplierId: string;
}

export const FactoryProductList = ({ supplierId }: Props) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supplierId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("factory_product_submissions")
        .select("*")
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: false });
      setProducts(data || []);
      setLoading(false);
    })();
  }, [supplierId]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>;

  if (products.length === 0) {
    return (
      <Card className="bg-slate-800/60 border-slate-700/50">
        <CardContent className="py-12 text-center">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No products submitted yet</p>
          <p className="text-xs text-slate-500 mt-1">Click "Submit New Product" to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/60 border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Package className="w-4 h-4 text-emerald-400" /> My Products ({products.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {products.map((p) => {
          const status = STATUS_MAP[p.status] || STATUS_MAP.pending_review;
          const StatusIcon = status.icon;
          return (
            <div key={p.id} className="bg-slate-700/40 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-slate-600/50 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.category} • ${Number(p.price).toFixed(2)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={`${status.color} text-xs`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {status.label}
                </Badge>
                {p.admin_notes && (
                  <span className="text-xs text-slate-500 max-w-[150px] truncate" title={p.admin_notes}>
                    📝 {p.admin_notes}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
