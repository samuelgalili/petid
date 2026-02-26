import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet, FileText, ShieldCheck, AlertTriangle, CheckCircle2,
  Download, Edit, Receipt, Scale, TrendingUp, Clock,
  CircleDollarSign, FileWarning, Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ─── Mock Data ───
const financeMetrics = [
  { label: 'רווח נקי', value: '₪24,680', icon: TrendingUp, change: '+14.2%' },
  { label: 'מע"מ ממתין', value: '₪4,322', icon: Receipt, change: null },
  { label: 'חשבוניות החודש', value: '47', icon: FileText, change: '+8' },
];

const invoices = [
  { id: 'INV-2026-0047', customer: 'דני כהן', amount: 378, date: '2026-02-24', status: 'paid' },
  { id: 'INV-2026-0046', customer: 'שרה לוי', amount: 1240, date: '2026-02-22', status: 'paid' },
  { id: 'INV-2026-0045', customer: 'יוסי אברהם', amount: 560, date: '2026-02-20', status: 'pending' },
  { id: 'INV-2026-0044', customer: 'מיכל רוזן', amount: 890, date: '2026-02-18', status: 'paid' },
  { id: 'INV-2026-0043', customer: 'רון גולדשטיין', amount: 2100, date: '2026-02-15', status: 'overdue' },
  { id: 'INV-2026-0042', customer: 'תמר שפירא', amount: 320, date: '2026-02-12', status: 'paid' },
];

type ComplianceStatus = 'safe' | 'warning' | 'action_required';
const complianceItems: { name: string; status: ComplianceStatus; detail: string }[] = [
  { name: 'GDPR Compliance', status: 'safe', detail: 'כל הנתונים מוצפנים, מדיניות פרטיות מעודכנת' },
  { name: 'תנאי שימוש — אחוז קבלה', status: 'safe', detail: '97.3% מהמשתמשים אישרו את התנאים העדכניים' },
  { name: 'תוכן מסומן לבדיקה', status: 'warning', detail: '3 פוסטים סומנו ע"י משתמשים — ממתינים לבדיקה' },
  { name: 'מדיניות החזרות', status: 'safe', detail: 'עדכון אחרון: 15/02/2026' },
  { name: 'הסכמי ספקים', status: 'action_required', detail: '2 הסכמים פגי תוקף — נדרש חידוש' },
  { name: 'דוח מס חודשי', status: 'warning', detail: 'דוח פברואר טרם הופק' },
];

const flaggedContent = [
  { id: '1', type: 'פוסט', title: 'מבצע חסר מידע רפואי', user: 'user_928', risk: 'medium', date: '2026-02-23' },
  { id: '2', type: 'מוצר', title: 'תיאור מטעה — "ריפוי מובטח"', user: 'shop_412', risk: 'high', date: '2026-02-22' },
  { id: '3', type: 'תגובה', title: 'תוכן פוגעני כלפי משתמש', user: 'user_115', risk: 'medium', date: '2026-02-21' },
];

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
  const handleExportTax = () => toast.success('דוח מס חודשי מיוצא...');
  const handleUpdateTerms = () => toast.info('מעבר לעורך תנאי שימוש');

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Scale className="w-6 h-6 text-primary" strokeWidth={1.5} />
          Compliance & Finance Center
        </h1>
        <p className="text-muted-foreground text-sm mt-1">מצב פיננסי, ציות רגולטורי ותוכן מסומן</p>
      </div>

      {/* ─── Finance Metric Cards ─── */}
      <div className="grid grid-cols-3 gap-4">
        {financeMetrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className="border border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    </div>
                    {m.change && (
                      <span className="text-[11px] font-medium text-emerald-600">{m.change}</span>
                    )}
                  </div>
                  <p className="text-2xl font-bold tracking-tight">{m.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{m.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* ─── Action Buttons ─── */}
      <div className="flex gap-3">
        <Button variant="outline" className="rounded-2xl h-10 text-xs gap-2 flex-1" onClick={handleExportTax}>
          <Download className="w-4 h-4" strokeWidth={1.5} />
          ייצוא דוח מס חודשי
        </Button>
        <Button variant="outline" className="rounded-2xl h-10 text-xs gap-2 flex-1" onClick={handleUpdateTerms}>
          <Edit className="w-4 h-4" strokeWidth={1.5} />
          עדכון תנאי שימוש
        </Button>
      </div>

      <Tabs defaultValue="compliance" dir="rtl">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="compliance">ציות</TabsTrigger>
          <TabsTrigger value="invoices">חשבוניות</TabsTrigger>
          <TabsTrigger value="flagged">תוכן מסומן</TabsTrigger>
        </TabsList>

        {/* ═══ COMPLIANCE CHECKLIST ═══ */}
        <TabsContent value="compliance">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" strokeWidth={1.5} />
                <CardTitle className="text-sm font-semibold">מצב ציות רגולטורי</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {complianceItems.map((item, i) => {
                const badge = statusBadge[item.status];
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-border/40 bg-muted/20"
                  >
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center",
                      item.status === 'safe' ? 'bg-emerald-500/10' : item.status === 'warning' ? 'bg-yellow-500/10' : 'bg-red-500/10'
                    )}>
                      {item.status === 'safe'
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
                        : item.status === 'warning'
                        ? <AlertTriangle className="w-4 h-4 text-yellow-500" strokeWidth={1.5} />
                        : <FileWarning className="w-4 h-4 text-red-500" strokeWidth={1.5} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">{item.detail}</p>
                    </div>
                    <Badge variant={badge.variant} className="text-[10px]">
                      {badge.label}
                    </Badge>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ INVOICES ═══ */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" strokeWidth={1.5} />
                <CardTitle className="text-sm font-semibold">חשבוניות אחרונות</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="divide-y divide-border/30">
                  {invoices.map((inv, i) => {
                    const s = invoiceStatusConfig[inv.status];
                    return (
                      <motion.div
                        key={inv.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.04 }}
                        className="p-4 flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-xl bg-muted/40 flex items-center justify-center">
                          <Receipt className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{inv.id}</p>
                            <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full", s.class)}>
                              {s.label}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{inv.customer} · {inv.date}</p>
                        </div>
                        <p className="text-sm font-bold">₪{inv.amount.toLocaleString()}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ FLAGGED CONTENT ═══ */}
        <TabsContent value="flagged">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500" strokeWidth={1.5} />
                <CardTitle className="text-sm font-semibold">תוכן מסומן לבדיקה</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {flaggedContent.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-border/40"
                >
                  <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center",
                    item.risk === 'high' ? 'bg-red-500/10' : 'bg-yellow-500/10'
                  )}>
                    <FileWarning className={cn("w-4 h-4", item.risk === 'high' ? 'text-red-500' : 'text-yellow-500')} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground">{item.type} · {item.user} · {item.date}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={item.risk === 'high' ? 'destructive' : 'secondary'} className="text-[10px]">
                      {item.risk === 'high' ? 'סיכון גבוה' : 'בינוני'}
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] rounded-xl">
                      בדוק
                    </Button>
                  </div>
                </motion.div>
              ))}
              {flaggedContent.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">אין תוכן מסומן</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
