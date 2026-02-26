import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign, TrendingDown, ArrowDownRight, Percent, BarChart3,
  Package, AlertTriangle, CheckCircle2, Sparkles,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

interface QuoteComparison {
  supplierName: string;
  supplierId: string | null;
  quoteTotal: number;
  quoteCount: number;
  avgPerItem: number;
}

const AdminSupplierNegotiation = () => {
  // Fetch all quotes grouped by supplier
  const { data: comparisons, isLoading } = useQuery({
    queryKey: ["supplier-negotiation-quotes"],
    queryFn: async () => {
      const { data: quotes } = await supabase
        .from("vendor_quotes")
        .select("id, supplier_name, supplier_id, total, subtotal, shipping_cost");

      if (!quotes || quotes.length === 0) return { comparisons: [], savings: 0, chartData: [] };

      // Group by supplier
      const bySupplier = new Map<string, QuoteComparison>();
      for (const q of quotes) {
        const key = q.supplier_name || q.supplier_id || "Unknown";
        const existing = bySupplier.get(key) || {
          supplierName: q.supplier_name || "ספק לא ידוע",
          supplierId: q.supplier_id,
          quoteTotal: 0,
          quoteCount: 0,
          avgPerItem: 0,
        };
        existing.quoteTotal += parseFloat(q.total?.toString() || "0");
        existing.quoteCount += 1;
        bySupplier.set(key, existing);
      }

      const comparisonsArr = Array.from(bySupplier.values()).map(c => ({
        ...c,
        avgPerItem: c.quoteCount > 0 ? c.quoteTotal / c.quoteCount : 0,
      }));

      // Sort by total cost ascending = cheapest first
      comparisonsArr.sort((a, b) => a.avgPerItem - b.avgPerItem);

      // Calculate potential savings: difference between most expensive and cheapest
      const cheapest = comparisonsArr[0]?.avgPerItem || 0;
      const mostExpensive = comparisonsArr[comparisonsArr.length - 1]?.avgPerItem || 0;
      const savings = mostExpensive > 0 ? Math.round(((mostExpensive - cheapest) / mostExpensive) * 100) : 0;

      const chartData = comparisonsArr.map(c => ({
        name: c.supplierName.length > 15 ? c.supplierName.slice(0, 15) + "…" : c.supplierName,
        cost: Math.round(c.avgPerItem),
        total: Math.round(c.quoteTotal),
      }));

      return { comparisons: comparisonsArr, savings, chartData };
    },
  });

  // Fetch actual invoices for comparison
  const { data: invoiceData } = useQuery({
    queryKey: ["supplier-negotiation-invoices"],
    queryFn: async () => {
      const { data } = await supabase
        .from("supplier_invoices")
        .select("amount, supplier_id, invoice_date")
        .order("invoice_date", { ascending: false })
        .limit(50);

      const totalInvoiced = (data || []).reduce((s, i) => s + parseFloat(i.amount?.toString() || "0"), 0);
      return { totalInvoiced, count: data?.length || 0 };
    },
  });

  const potentialSavingsPercent = comparisons?.savings || 0;
  const totalQuoted = comparisons?.comparisons.reduce((s, c) => s + c.quoteTotal, 0) || 0;
  const potentialSavingsAmount = Math.round(totalQuoted * (potentialSavingsPercent / 100));

  return (
    <AdminLayout title="משא״מ ספקים AI" icon={Sparkles} breadcrumbs={[{ label: "משא״מ ספקים" }]}>
      <div className="space-y-6">

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="rounded-[20px] shadow-sm border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">ספקים נסרקו</span>
                <Package className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <p className="text-2xl font-bold text-foreground">{comparisons?.comparisons.length || 0}</p>
            </CardContent>
          </Card>

          <Card className="rounded-[20px] shadow-sm border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">סה״כ הצעות</span>
                <DollarSign className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <p className="text-2xl font-bold text-foreground">₪{totalQuoted.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card className="rounded-[20px] shadow-sm border-border bg-emerald-50 dark:bg-emerald-950/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">חיסכון פוטנציאלי</span>
                <TrendingDown className="w-4 h-4 text-emerald-600" strokeWidth={1.5} />
              </div>
              <p className="text-2xl font-bold text-emerald-600">₪{potentialSavingsAmount.toLocaleString()}</p>
              <Badge variant="outline" className="text-[10px] rounded-full border-emerald-300 text-emerald-600 mt-1">
                עד {potentialSavingsPercent}% חיסכון
              </Badge>
            </CardContent>
          </Card>

          <Card className="rounded-[20px] shadow-sm border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">חשבוניות בפועל</span>
                <BarChart3 className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <p className="text-2xl font-bold text-foreground">₪{(invoiceData?.totalInvoiced || 0).toLocaleString()}</p>
              <span className="text-xs text-muted-foreground">{invoiceData?.count || 0} חשבוניות</span>
            </CardContent>
          </Card>
        </div>

        {/* Chart: Cost per supplier */}
        <Card className="rounded-[20px] shadow-sm border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">עלות ממוצעת להזמנה לפי ספק</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {(comparisons?.chartData?.length || 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisons?.chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    formatter={(v: number) => `₪${v.toLocaleString()}`}
                  />
                  <Bar dataKey="cost" radius={[0, 8, 8, 0]} name="עלות ממוצעת">
                    {(comparisons?.chartData || []).map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={idx === 0 ? "hsl(142, 76%, 36%)" : "hsl(var(--primary))"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                אין הצעות מחיר לניתוח. סרוק הצעות דרך עמוד ביקורת ספקים.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supplier Table */}
        <Card className="rounded-[20px] shadow-sm border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">השוואת ספקים מפורטת</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-right py-2.5 px-3 text-xs font-semibold text-muted-foreground">ספק</th>
                    <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground">הצעות</th>
                    <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground">סה״כ</th>
                    <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground">ממוצע/הזמנה</th>
                    <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground">דירוג</th>
                  </tr>
                </thead>
                <tbody>
                  {(comparisons?.comparisons || []).map((c, idx) => {
                    const isCheapest = idx === 0 && (comparisons?.comparisons?.length || 0) > 1;
                    const isMostExpensive = idx === (comparisons?.comparisons?.length || 0) - 1 && (comparisons?.comparisons?.length || 0) > 1;
                    return (
                      <tr key={c.supplierName} className={`border-b border-border/50 ${isCheapest ? "bg-emerald-50/50 dark:bg-emerald-950/10" : isMostExpensive ? "bg-destructive/5" : ""}`}>
                        <td className="py-3 px-3 font-medium text-foreground">{c.supplierName}</td>
                        <td className="py-3 px-3 text-center text-muted-foreground">{c.quoteCount}</td>
                        <td className="py-3 px-3 text-center">₪{Math.round(c.quoteTotal).toLocaleString()}</td>
                        <td className="py-3 px-3 text-center font-semibold">₪{Math.round(c.avgPerItem).toLocaleString()}</td>
                        <td className="py-3 px-3 text-center">
                          {isCheapest ? (
                            <Badge variant="outline" className="rounded-full text-[10px] border-emerald-300 text-emerald-600">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> הזול ביותר
                            </Badge>
                          ) : isMostExpensive ? (
                            <Badge variant="outline" className="rounded-full text-[10px] border-destructive text-destructive">
                              <AlertTriangle className="w-3 h-3 mr-1" /> היקר ביותר
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {(!comparisons?.comparisons || comparisons.comparisons.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                        אין נתוני הצעות מחיר. ייבא הצעות דרך עמוד ביקורת ספקים.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSupplierNegotiation;
