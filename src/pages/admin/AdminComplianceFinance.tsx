import { motion } from 'framer-motion';
import {
  Wallet, FileText, ShieldCheck, AlertTriangle, CheckCircle2,
  Download, Edit, Receipt, Scale, TrendingUp,
  FileWarning, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type ComplianceStatus = 'safe' | 'warning' | 'action_required';

const statusBadge: Record<ComplianceStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  safe: { label: 'Safe', variant: 'default' },
  warning: { label: 'Warning', variant: 'secondary' },
  action_required: { label: 'Action Required', variant: 'destructive' },
};

const invoiceStatusConfig: Record<string, { label: string; class: string }> = {
  paid: { label: 'שולם', class: 'bg-emerald-500/10 text-emerald-600' },
  pending: { label: 'ממתין', class: 'bg-yellow-500/10 text-yellow-600' },
  overdue: { label: 'באיחור', class: 'bg-red-500/10 text-red-500' },
};

export default function AdminComplianceFinance() {
  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*").order("issued_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });

  const { data: complianceItems = [], isLoading: loadingCompliance } = useQuery({
    queryKey: ["compliance-checks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("compliance_checks").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: flaggedContent = [], isLoading: loadingFlagged } = useQuery({
    queryKey: ["flagged-content"],
    queryFn: async () => {
      const { data, error } = await supabase.from("flagged_content").select("*").eq("status", "pending").order("flagged_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const totalRevenue = invoices.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
  const pendingVat = invoices.filter((i: any) => i.status === 'pending').reduce((s: number, i: any) => s + Number(i.vat_amount || 0), 0);

  const financeMetrics = [
    { label: 'רווח נקי', value: `₪${totalRevenue.toLocaleString()}`, icon: TrendingUp, change: null },
    { label: 'מע"מ ממתין', value: `₪${pendingVat.toLocaleString()}`, icon: Receipt, change: null },
    { label: 'חשבוניות', value: String(invoices.length), icon: FileText, change: null },
  ];

  const handleExportTax = () => toast.success('דוח מס חודשי מיוצא...');

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Scale className="w-6 h-6 text-primary" strokeWidth={1.5} />
          Compliance & Finance Center
        </h1>
        <p className="text-muted-foreground text-sm mt-1">מצב פיננסי, ציות רגולטורי ותוכן מסומן</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {financeMetrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="border border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold tracking-tight text-foreground">{m.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{m.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="rounded-2xl h-10 text-xs gap-2 flex-1" onClick={handleExportTax}>
          <Download className="w-4 h-4" strokeWidth={1.5} />ייצוא דוח מס חודשי
        </Button>
      </div>

      <Tabs defaultValue="compliance" dir="rtl">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="compliance">ציות</TabsTrigger>
          <TabsTrigger value="invoices">חשבוניות</TabsTrigger>
          <TabsTrigger value="flagged">תוכן מסומן</TabsTrigger>
        </TabsList>

        <TabsContent value="compliance">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" strokeWidth={1.5} />
                <CardTitle className="text-sm font-semibold">מצב ציות רגולטורי</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingCompliance ? (
                <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : complianceItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">אין בדיקות ציות מוגדרות</p>
              ) : complianceItems.map((item: any, i: number) => {
                const badge = statusBadge[item.status as ComplianceStatus] || statusBadge.safe;
                return (
                  <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-border/40 bg-muted/20">
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center",
                      item.status === 'safe' ? 'bg-emerald-500/10' : item.status === 'warning' ? 'bg-yellow-500/10' : 'bg-red-500/10')}>
                      {item.status === 'safe' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : item.status === 'warning' ? <AlertTriangle className="w-4 h-4 text-yellow-500" /> : <FileWarning className="w-4 h-4 text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">{item.detail}</p>
                    </div>
                    <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" strokeWidth={1.5} />
                <CardTitle className="text-sm font-semibold">חשבוניות אחרונות</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingInvoices ? (
                <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">אין חשבוניות</p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="divide-y divide-border/30">
                    {invoices.map((inv: any, i: number) => {
                      const s = invoiceStatusConfig[inv.status] || invoiceStatusConfig.pending;
                      return (
                        <motion.div key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="p-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-muted/40 flex items-center justify-center">
                            <Receipt className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-foreground">{inv.invoice_number}</p>
                              <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", s.class)}>{s.label}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">{inv.customer_name} · {new Date(inv.issued_at).toLocaleDateString("he-IL")}</p>
                          </div>
                          <p className="text-sm font-bold text-foreground">₪{Number(inv.amount).toLocaleString()}</p>
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flagged">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" strokeWidth={1.5} />
                <CardTitle className="text-sm font-semibold">תוכן מסומן לבדיקה</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingFlagged ? (
                <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : flaggedContent.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">אין תוכן מסומן 🎉</p>
              ) : flaggedContent.map((item: any, i: number) => (
                <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-border/40">
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", item.risk_level === 'high' ? 'bg-red-500/10' : 'bg-yellow-500/10')}>
                    <FileWarning className={cn("w-4 h-4", item.risk_level === 'high' ? 'text-red-500' : 'text-yellow-500')} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground">{item.content_type} · {item.user_identifier} · {new Date(item.flagged_at).toLocaleDateString("he-IL")}</p>
                  </div>
                  <Badge variant={item.risk_level === 'high' ? 'destructive' : 'secondary'} className="text-[10px]">
                    {item.risk_level === 'high' ? 'סיכון גבוה' : 'בינוני'}
                  </Badge>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
