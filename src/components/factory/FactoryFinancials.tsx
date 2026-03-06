import { useState, useEffect } from "react";
import { DollarSign, Clock, CheckCircle2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface Props { supplierId: string; }

export const FactoryFinancials = ({ supplierId }: Props) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supplierId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("factory_payments").select("*")
        .eq("supplier_id", supplierId).order("created_at", { ascending: false });
      setPayments(data || []);
      setLoading(false);
    })();
  }, [supplierId]);

  const totalPaid = payments.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);

  if (loading) return <div className="space-y-4"><div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" strokeWidth={1.5} />
              <span className="text-xs text-muted-foreground">Total Paid</span>
            </div>
            <p className="text-2xl font-bold text-[hsl(var(--success))]">${totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[hsl(var(--warning))]" strokeWidth={1.5} />
              <span className="text-xs text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl font-bold text-[hsl(var(--warning))]">${totalPending.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" strokeWidth={1.5} />
              <span className="text-xs text-muted-foreground">Total Transactions</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{payments.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-foreground">
            <DollarSign className="w-4 h-4 text-primary" strokeWidth={1.5} /> Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="py-8 text-center">
              <DollarSign className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-muted-foreground">No payment records yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="bg-muted/50 rounded-lg p-3 flex items-center justify-between border border-border/50">
                  <div>
                    <p className="text-sm text-foreground">${Number(p.amount).toLocaleString()} {p.currency}</p>
                    <p className="text-xs text-muted-foreground">{p.payment_method || "Wire Transfer"} • {new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs font-medium ${p.status === "paid" ? "text-[hsl(var(--success))]" : "text-[hsl(var(--warning))]"}`}>
                    {p.status === "paid" ? "✓ Paid" : "⏳ Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
