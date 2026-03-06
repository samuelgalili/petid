import { useState, useEffect } from "react";
import { DollarSign, Loader2, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  supplierId: string;
}

export const FactoryFinancials = ({ supplierId }: Props) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supplierId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("factory_payments")
        .select("*")
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: false });
      setPayments(data || []);
      setLoading(false);
    })();
  }, [supplierId]);

  const totalPaid = payments.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-400">Total Paid</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400">${totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-400">Pending</span>
            </div>
            <p className="text-2xl font-bold text-amber-400">${totalPending.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/60 border-slate-700/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-400">Total Transactions</span>
            </div>
            <p className="text-2xl font-bold text-white">{payments.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card className="bg-slate-800/60 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" /> Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="py-8 text-center">
              <DollarSign className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No payment records yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="bg-slate-700/40 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white">${Number(p.amount).toLocaleString()} {p.currency}</p>
                    <p className="text-xs text-slate-400">{p.payment_method || "Wire Transfer"} • {new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs font-medium ${p.status === "paid" ? "text-emerald-400" : "text-amber-400"}`}>
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
