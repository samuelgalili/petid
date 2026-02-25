import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowRight, Package, Truck, FileText, RefreshCw,
  Hash, MapPin, RotateCcw, ChevronDown, ChevronUp,
  Download, AlertTriangle, CheckCircle2, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const AdminVendorDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});

  // ─── Paid Orders ───
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['vendor-paid-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['pending', 'processing', 'shipped'] as any)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // ─── Returns ───
  const { data: returns = [] } = useQuery({
    queryKey: ['vendor-returns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_returns' as any)
        .select('*, order:order_id(order_number, customer_name, destination_country)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // ─── Generate Labels ───
  const labelMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.functions.invoke('shipping-service', {
        body: { action: 'create_shipment', order_id: orderId },
      });
      if (error) throw error;

      const { data: labels, error: labelsErr } = await supabase.functions.invoke('shipping-service', {
        body: { action: 'generate_labels', order_id: orderId },
      });
      if (labelsErr) throw labelsErr;
      return labels;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-paid-orders'] });
      toast.success('תוויות נוצרו בהצלחה');
    },
    onError: (err: any) => toast.error(err.message || 'שגיאה ביצירת תוויות'),
  });

  // ─── Generate All Labels ───
  const generateAllMutation = useMutation({
    mutationFn: async () => {
      const paidOrders = orders.filter(o => (o.status as string) === 'paid' && !o.tracking_number);
      for (const order of paidOrders) {
        await supabase.functions.invoke('shipping-service', {
          body: { action: 'create_shipment', order_id: order.id },
        });
        await supabase.functions.invoke('shipping-service', {
          body: { action: 'generate_labels', order_id: order.id },
        });
      }
      return paidOrders.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-paid-orders'] });
      toast.success(`${count} תוויות נוצרו בהצלחה`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ─── Update Tracking ───
  const trackingMutation = useMutation({
    mutationFn: async ({ orderId, trackingNumber }: { orderId: string; trackingNumber: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({
          tracking_number: trackingNumber,
          shipping_status: 'in_transit',
          status: 'shipped',
        })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-paid-orders'] });
      toast.success('מספר מעקב עודכן');
    },
  });

  // ─── Redirect Return ───
  const redirectMutation = useMutation({
    mutationFn: async ({ returnId, address }: { returnId: string; address: string }) => {
      const { error } = await supabase
        .from('order_returns' as any)
        .update({
          status: 'redirected',
          redirect_address: address,
          redirect_country: 'IL',
          updated_at: new Date().toISOString(),
        })
        .eq('id', returnId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-returns'] });
      toast.success('החזרה הופנתה לכתובת בישראל');
    },
  });

  const filteredOrders = orders.filter(o =>
    !searchQuery ||
    o.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paidCount = orders.filter(o => (o.status as string) === 'paid').length;
  const shippedCount = orders.filter(o => (o.status as string) === 'shipped').length;
  const pendingLabels = orders.filter(o => (o.status as string) === 'paid' && !o.tracking_number).length;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between px-5 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-lg font-bold tracking-tight">ניהול ספקים</span>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="ממתינות לשליחה" value={paidCount} icon={<Package className="w-4 h-4 text-primary" strokeWidth={1.5} />} />
          <StatCard label="נשלחו" value={shippedCount} icon={<Truck className="w-4 h-4 text-primary" strokeWidth={1.5} />} />
          <StatCard label="ממתינות לתוויות" value={pendingLabels} icon={<FileText className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />} />
        </div>

        <Tabs defaultValue="orders" className="space-y-4">
          <TabsList className="grid grid-cols-3 rounded-2xl h-11 bg-muted/50">
            <TabsTrigger value="orders" className="rounded-xl text-xs">הזמנות</TabsTrigger>
            <TabsTrigger value="tracking" className="rounded-xl text-xs">עדכון מעקב</TabsTrigger>
            <TabsTrigger value="returns" className="rounded-xl text-xs">החזרות</TabsTrigger>
          </TabsList>

          {/* ═══ ORDERS TAB ═══ */}
          <TabsContent value="orders" className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="חיפוש הזמנה..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 h-10 rounded-xl bg-muted/30 border-border/50"
                />
              </div>
              <Button
                onClick={() => generateAllMutation.mutate()}
                disabled={generateAllMutation.isPending || pendingLabels === 0}
                className="rounded-xl h-10 gap-2 text-xs"
              >
                <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                {generateAllMutation.isPending ? 'מייצר...' : `ייצר תוויות (${pendingLabels})`}
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-[20px] bg-muted animate-pulse" />)}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">אין הזמנות</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order, i) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card className="rounded-[20px] border-border/50 overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center">
                              <Hash className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{order.order_number || order.id.slice(0, 8)}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {order.customer_name || 'לקוח'} · {order.destination_country || 'IL'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <OrderStatusBadge status={order.status} />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                            >
                              {expandedOrder === order.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {expandedOrder === order.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-3 pt-3 border-t border-border/50 space-y-3"
                          >
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-muted-foreground">סכום:</span>
                                <span className="font-medium mr-1">₪{(order as any).total_price || 0}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">יעד:</span>
                                <span className="font-medium mr-1">{order.destination_country || 'IL'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">תאריך:</span>
                                <span className="font-medium mr-1">
                                  {new Date(order.created_at).toLocaleDateString('he-IL')}
                                </span>
                              </div>
                              {order.tracking_number && (
                                <div>
                                  <span className="text-muted-foreground">מעקב:</span>
                                  <span className="font-mono font-medium mr-1 text-[11px]">{order.tracking_number}</span>
                                </div>
                              )}
                            </div>

                            {!order.tracking_number && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full rounded-xl text-xs gap-1.5"
                                onClick={() => labelMutation.mutate(order.id)}
                                disabled={labelMutation.isPending}
                              >
                                <FileText className="w-3 h-3" strokeWidth={1.5} />
                                {labelMutation.isPending ? 'מייצר...' : 'ייצר תוויות'}
                              </Button>
                            )}
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ═══ TRACKING TAB ═══ */}
          <TabsContent value="tracking" className="space-y-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">
              UPDATE TRACKING NUMBERS
            </p>

            {orders.filter(o => (o.status as string) === 'paid' || (o.status as string) === 'processing').length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">כל ההזמנות עודכנו עם מספר מעקב</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders
                  .filter(o => !o.tracking_number)
                  .map((order, i) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <Card className="rounded-[20px] border-border/50">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold">{order.order_number || order.id.slice(0, 8)}</p>
                              <p className="text-[11px] text-muted-foreground">{order.customer_name} → {order.destination_country || 'IL'}</p>
                            </div>
                            <OrderStatusBadge status={order.status} />
                          </div>

                          <div className="flex gap-2">
                            <Input
                              placeholder="מספר מעקב..."
                              value={trackingInputs[order.id] || ''}
                              onChange={(e) => setTrackingInputs({ ...trackingInputs, [order.id]: e.target.value })}
                              className="h-9 rounded-xl text-xs flex-1"
                              dir="ltr"
                            />
                            <Button
                              size="sm"
                              className="rounded-xl h-9 text-xs gap-1"
                              disabled={!trackingInputs[order.id] || trackingMutation.isPending}
                              onClick={() => {
                                trackingMutation.mutate({
                                  orderId: order.id,
                                  trackingNumber: trackingInputs[order.id],
                                });
                                setTrackingInputs({ ...trackingInputs, [order.id]: '' });
                              }}
                            >
                              <RefreshCw className="w-3 h-3" strokeWidth={1.5} />
                              עדכן
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
              </div>
            )}
          </TabsContent>

          {/* ═══ RETURNS TAB ═══ */}
          <TabsContent value="returns" className="space-y-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">
              FLAGGED RETURNS
            </p>

            {returns.length === 0 ? (
              <div className="text-center py-12">
                <RotateCcw className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground">אין החזרות ממתינות</p>
              </div>
            ) : (
              <div className="space-y-3">
                {returns.map((ret: any, i: number) => (
                  <motion.div
                    key={ret.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card className="rounded-[20px] border-border/50">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-destructive/10 flex items-center justify-center">
                              <AlertTriangle className="w-4 h-4 text-destructive" strokeWidth={1.5} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">
                                הזמנה #{ret.order?.order_number || ret.order_id?.slice(0, 8)}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {ret.order?.customer_name || 'לקוח'} · {ret.reason}
                              </p>
                            </div>
                          </div>
                          <ReturnStatusBadge status={ret.status} />
                        </div>

                        {ret.status === 'pending' && (
                          <ReturnRedirectForm
                            returnId={ret.id}
                            onRedirect={(address) => redirectMutation.mutate({ returnId: ret.id, address })}
                            isLoading={redirectMutation.isPending}
                          />
                        )}

                        {ret.status === 'redirected' && ret.redirect_address && (
                          <div className="rounded-xl bg-muted/30 p-3">
                            <p className="text-xs text-muted-foreground">הופנה לכתובת בישראל:</p>
                            <p className="text-xs font-medium mt-0.5">{ret.redirect_address}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// ─── Sub-components ───

const StatCard = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
  <div className="rounded-[20px] bg-card border border-border/50 p-4 text-center shadow-sm">
    <div className="flex items-center justify-center mb-2">{icon}</div>
    <p className="text-xl font-bold">{value}</p>
    <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
  </div>
);

const OrderStatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    paid: { label: 'שולם', variant: 'default' },
    processing: { label: 'בהכנה', variant: 'secondary' },
    shipped: { label: 'נשלח', variant: 'outline' },
    delivered: { label: 'נמסר', variant: 'secondary' },
  };
  const c = config[status] || { label: status, variant: 'outline' as const };
  return <Badge variant={c.variant} className="text-[10px] border-0 rounded-lg">{c.label}</Badge>;
};

const ReturnStatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending: { label: 'ממתין', variant: 'destructive' },
    redirected: { label: 'הופנה לישראל', variant: 'default' },
    completed: { label: 'הושלם', variant: 'secondary' },
    approved: { label: 'אושר', variant: 'outline' },
    rejected: { label: 'נדחה', variant: 'outline' },
  };
  const c = config[status] || { label: status, variant: 'outline' as const };
  return <Badge variant={c.variant} className="text-[10px] border-0 rounded-lg">{c.label}</Badge>;
};

const ReturnRedirectForm = ({
  returnId,
  onRedirect,
  isLoading,
}: {
  returnId: string;
  onRedirect: (address: string) => void;
  isLoading: boolean;
}) => {
  const [address, setAddress] = useState('');

  return (
    <div className="space-y-2 border-t border-border/50 pt-3">
      <p className="text-[11px] text-muted-foreground font-medium">הפניה לכתובת בישראל (במקום חזרה לסין):</p>
      <Textarea
        placeholder="רחוב, עיר, מיקוד..."
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="rounded-xl text-xs min-h-[60px] resize-none"
      />
      <Button
        size="sm"
        className="w-full rounded-xl text-xs gap-1.5"
        disabled={!address.trim() || isLoading}
        onClick={() => onRedirect(address)}
      >
        <MapPin className="w-3 h-3" strokeWidth={1.5} />
        {isLoading ? 'שומר...' : 'הפנה לישראל'}
      </Button>
    </div>
  );
};

export default AdminVendorDashboard;
