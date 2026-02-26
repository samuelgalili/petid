import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AdminStatsCard } from "@/components/admin/AdminStatsCard";
import {
  Search, FileCheck, AlertTriangle, CheckCircle2, Mail, DollarSign,
  ArrowLeftRight, TrendingDown, Loader2, X, Send, Eye
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Discrepancy {
  field: string;
  quoteValue: number;
  invoiceValue: number;
  delta: number;
  deltaPercent: number;
  itemName?: string;
}

interface AuditResult {
  id: string;
  order_id: string;
  quote_id: string | null;
  invoice_id: string | null;
  validation_status: string;
  discrepancies: Discrepancy[];
  total_delta: number;
  email_draft: string | null;
  email_sent: boolean;
  created_at: string;
}

const TOLERANCE = 0.005; // 0.5%

const AdminVendorAudit = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAudit, setSelectedAudit] = useState<AuditResult | null>(null);
  const [emailDraft, setEmailDraft] = useState("");
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch quotes
  const { data: quotes = [] } = useQuery({
    queryKey: ["vendor-quotes"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vendor_quotes")
        .select("*, vendor_quote_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ["vendor-invoices-for-audit"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("supplier_invoices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch audit results
  const { data: audits = [], isLoading } = useQuery({
    queryKey: ["vendor-audit-results"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vendor_audit_results")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as AuditResult[];
    },
  });

  // Fetch savings
  const { data: savings = [] } = useQuery({
    queryKey: ["vendor-cost-savings"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("vendor_cost_savings")
        .select("*")
        .order("month", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Run comparison for a specific order
  const runAudit = useMutation({
    mutationFn: async (orderId: string) => {
      const quote = quotes.find((q: any) => q.order_id === orderId);
      const invoice = invoices.find((inv: any) => 
        inv.invoice_number === orderId || inv.notes?.includes(orderId)
      );

      if (!quote || !invoice) {
        throw new Error("לא נמצאו הצעת מחיר וחשבונית תואמות עבור הזמנה זו");
      }

      const discrepancies: Discrepancy[] = [];
      
      // Compare shipping
      const quoteShipping = Number(quote.shipping_cost) || 0;
      const invoiceShipping = Number(invoice.shipping_cost) || 0;
      if (quoteShipping > 0 || invoiceShipping > 0) {
        const delta = invoiceShipping - quoteShipping;
        const pct = quoteShipping > 0 ? Math.abs(delta / quoteShipping) : (delta !== 0 ? 1 : 0);
        if (pct > TOLERANCE) {
          discrepancies.push({
            field: "shipping",
            quoteValue: quoteShipping,
            invoiceValue: invoiceShipping,
            delta,
            deltaPercent: pct * 100,
            itemName: "עלות משלוח",
          });
        }
      }

      // Compare totals
      const quoteTotal = Number(quote.total) || 0;
      const invoiceTotal = Number(invoice.amount) || 0;
      if (quoteTotal > 0 || invoiceTotal > 0) {
        const delta = invoiceTotal - quoteTotal;
        const pct = quoteTotal > 0 ? Math.abs(delta / quoteTotal) : (delta !== 0 ? 1 : 0);
        if (pct > TOLERANCE) {
          discrepancies.push({
            field: "total",
            quoteValue: quoteTotal,
            invoiceValue: invoiceTotal,
            delta,
            deltaPercent: pct * 100,
            itemName: "סה״כ",
          });
        }
      }

      // Compare line items by SKU
      const quoteItems = (quote as any).vendor_quote_items || [];
      for (const qi of quoteItems) {
        // Simple comparison — in production, match against invoice line items
        if (qi.unit_price && qi.quantity) {
          // placeholder for item-level matching
        }
      }

      const totalDelta = discrepancies.reduce((sum, d) => sum + d.delta, 0);
      const status = discrepancies.length === 0 ? "verified" : "discrepancy";

      const { data, error } = await (supabase as any)
        .from("vendor_audit_results")
        .insert({
          order_id: orderId,
          quote_id: quote.id,
          invoice_id: invoice.id,
          validation_status: status,
          discrepancies: discrepancies,
          total_delta: totalDelta,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-audit-results"] });
      toast.success("הביקורת הושלמה בהצלחה");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Generate email draft via AI
  const generateEmail = useMutation({
    mutationFn: async (audit: AuditResult) => {
      const { data, error } = await supabase.functions.invoke("generate-vendor-email", {
        body: { audit },
      });
      if (error) throw error;
      return data.draft as string;
    },
    onSuccess: (draft) => {
      setEmailDraft(draft);
      setEmailDialogOpen(true);
    },
    onError: () => {
      // Fallback draft
      if (selectedAudit) {
        const lines = (selectedAudit.discrepancies || []).map(
          (d: Discrepancy) => `• ${d.itemName || d.field}: הצעת מחיר ₪${d.quoteValue.toFixed(2)} → חשבונית ₪${d.invoiceValue.toFixed(2)} (הפרש: ₪${d.delta.toFixed(2)})`
        );
        setEmailDraft(
          `שלום רב,\n\nבמהלך ביקורת שגרתית של הזמנה ${selectedAudit.order_id}, זיהינו את הפערים הבאים בין הצעת המחיר לחשבונית:\n\n${lines.join("\n")}\n\nסה״כ הפרש: ₪${selectedAudit.total_delta.toFixed(2)}\n\nנודה לבדיקתכם ולתיקון בהקדם.\n\nבברכה,\nצוות PetID`
        );
        setEmailDialogOpen(true);
      }
    },
  });

  // Save email draft
  const saveEmailDraft = useMutation({
    mutationFn: async () => {
      if (!selectedAudit) return;
      const { error } = await (supabase as any)
        .from("vendor_audit_results")
        .update({ email_draft: emailDraft })
        .eq("id", selectedAudit.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-audit-results"] });
      setEmailDialogOpen(false);
      toast.success("טיוטת האימייל נשמרה");
    },
  });

  // Stats
  const totalAudits = audits.length;
  const verifiedCount = audits.filter(a => a.validation_status === "verified").length;
  const discrepancyCount = audits.filter(a => a.validation_status === "discrepancy").length;
  const totalSaved = savings.reduce((sum: number, s: any) => sum + Number(s.total_saved || 0), 0);

  const filteredAudits = audits.filter(a =>
    a.order_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get unique order IDs from quotes for running new audits
  const availableOrders = quotes
    .map((q: any) => q.order_id)
    .filter((oid: string) => !audits.some(a => a.order_id === oid));

  return (
    <AdminLayout title="ביקורת ספקים" icon={FileCheck}>
      <div className="space-y-6" dir="rtl">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatsCard title="סה״כ ביקורות" value={totalAudits} icon={FileCheck} gradient="from-blue-500 to-blue-600" index={0} />
          <AdminStatsCard title="מאומתות" value={verifiedCount} icon={CheckCircle2} gradient="from-emerald-500 to-emerald-600" index={1} />
          <AdminStatsCard title="פערים" value={discrepancyCount} icon={AlertTriangle} gradient="from-amber-500 to-amber-600" index={2} />
          <AdminStatsCard title="חסכון שנתי" value={`₪${totalSaved.toLocaleString()}`} icon={TrendingDown} gradient="from-violet-500 to-violet-600" index={3} />
        </div>

        {/* Actions Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="חיפוש לפי מספר הזמנה..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              {availableOrders.length > 0 && (
                <Button
                  onClick={() => runAudit.mutate(availableOrders[0])}
                  disabled={runAudit.isPending}
                  className="gap-2"
                >
                  {runAudit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
                  הרץ ביקורת חדשה
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Audit Results List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileCheck className="w-5 h-5" />
              תוצאות ביקורת
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredAudits.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>אין ביקורות עדיין</p>
                <p className="text-sm mt-1">צור הצעת מחיר וחשבונית עם אותו מספר הזמנה כדי להתחיל</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredAudits.map((audit, i) => (
                    <motion.div
                      key={audit.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div
                        className={cn(
                          "border rounded-2xl p-4 transition-all hover:shadow-md cursor-pointer",
                          audit.validation_status === "verified"
                            ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/20"
                            : "border-destructive/30 bg-destructive/5"
                        )}
                        onClick={() => { setSelectedAudit(audit); setDetailOpen(true); }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {audit.validation_status === "verified" ? (
                              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-destructive" />
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-foreground">הזמנה #{audit.order_id}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(audit.created_at).toLocaleDateString("he-IL")}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {audit.validation_status === "verified" ? (
                              <Badge variant="success">מאומת ✓</Badge>
                            ) : (
                              <Badge variant="destructive">
                                {(audit.discrepancies as any[])?.length || 0} פערים
                              </Badge>
                            )}
                            {audit.total_delta !== 0 && (
                              <span className={cn(
                                "text-sm font-bold",
                                audit.total_delta > 0 ? "text-destructive" : "text-emerald-600"
                              )}>
                                {audit.total_delta > 0 ? "+" : ""}₪{audit.total_delta.toFixed(2)}
                              </span>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Health Widget */}
        {savings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                בריאות פיננסית — חסכון חודשי
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {savings.map((s: any, i: number) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.08 }}
                    className="text-center p-4 rounded-2xl bg-muted/30 border border-border/50"
                  >
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.month).toLocaleDateString("he-IL", { month: "short", year: "numeric" })}
                    </p>
                    <p className="text-xl font-bold text-emerald-600 mt-1">
                      ₪{Number(s.total_saved || 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {s.discrepancies_found} פערים ב-{s.audits_count} ביקורות
                    </p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detail Dialog — Split Screen Comparison */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5" />
                השוואה — הזמנה #{selectedAudit?.order_id}
              </DialogTitle>
            </DialogHeader>

            {selectedAudit && (
              <div className="space-y-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  {selectedAudit.validation_status === "verified" ? (
                    <Badge variant="success" className="text-sm px-4 py-1">מאומת — התאמה מלאה ✓</Badge>
                  ) : (
                    <Badge variant="destructive" className="text-sm px-4 py-1">
                      נמצאו {(selectedAudit.discrepancies as Discrepancy[])?.length} פערים
                    </Badge>
                  )}
                  {selectedAudit.validation_status === "discrepancy" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        setSelectedAudit(selectedAudit);
                        generateEmail.mutate(selectedAudit);
                      }}
                      disabled={generateEmail.isPending}
                    >
                      {generateEmail.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      צור טיוטת מייל לספק
                    </Button>
                  )}
                </div>

                {/* Split Screen Table */}
                {(selectedAudit.discrepancies as Discrepancy[])?.length > 0 && (
                  <div className="border rounded-2xl overflow-hidden">
                    <div className="grid grid-cols-5 bg-muted/50 px-4 py-3 text-xs font-semibold text-muted-foreground border-b">
                      <div>שדה</div>
                      <div className="text-center">הצעת מחיר</div>
                      <div className="text-center">חשבונית</div>
                      <div className="text-center">הפרש</div>
                      <div className="text-center">%</div>
                    </div>
                    {(selectedAudit.discrepancies as Discrepancy[]).map((d, i) => (
                      <div
                        key={i}
                        className={cn(
                          "grid grid-cols-5 px-4 py-3 text-sm border-b last:border-0 transition-colors",
                          Math.abs(d.deltaPercent) > 5
                            ? "bg-destructive/10"
                            : "bg-amber-50/50 dark:bg-amber-950/10"
                        )}
                      >
                        <div className="font-medium text-foreground">{d.itemName || d.field}</div>
                        <div className="text-center text-muted-foreground">₪{d.quoteValue.toFixed(2)}</div>
                        <div className="text-center font-medium text-foreground">₪{d.invoiceValue.toFixed(2)}</div>
                        <div className={cn(
                          "text-center font-bold",
                          d.delta > 0 ? "text-destructive" : "text-emerald-600"
                        )}>
                          {d.delta > 0 ? "+" : ""}₪{d.delta.toFixed(2)}
                        </div>
                        <div className={cn(
                          "text-center text-xs font-semibold",
                          d.deltaPercent > 5 ? "text-destructive" : "text-amber-600"
                        )}>
                          {d.deltaPercent.toFixed(1)}%
                        </div>
                      </div>
                    ))}
                    {/* Footer total */}
                    <div className="grid grid-cols-5 px-4 py-3 bg-muted/30 text-sm font-bold">
                      <div>סה״כ הפרש</div>
                      <div />
                      <div />
                      <div className={cn(
                        "text-center",
                        selectedAudit.total_delta > 0 ? "text-destructive" : "text-emerald-600"
                      )}>
                        {selectedAudit.total_delta > 0 ? "+" : ""}₪{selectedAudit.total_delta.toFixed(2)}
                      </div>
                      <div />
                    </div>
                  </div>
                )}

                {selectedAudit.validation_status === "verified" && (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-500 mb-3" />
                    <p className="text-lg font-semibold text-foreground">התאמה מלאה</p>
                    <p className="text-sm text-muted-foreground">
                      הצעת המחיר והחשבונית תואמות בטווח סטייה של 0.5%
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Email Draft Dialog */}
        <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                טיוטת מייל לספק — שרה (Support Bot)
              </DialogTitle>
            </DialogHeader>
            <Textarea
              value={emailDraft}
              onChange={e => setEmailDraft(e.target.value)}
              rows={12}
              className="text-sm leading-relaxed"
              dir="rtl"
            />
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
                <X className="w-4 h-4 ml-1" />
                ביטול
              </Button>
              <Button onClick={() => saveEmailDraft.mutate()} disabled={saveEmailDraft.isPending}>
                <Send className="w-4 h-4 ml-1" />
                שמור טיוטה
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminVendorAudit;
