import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowRight, Package, Plane, Truck, MapPin,
  CheckCircle2, Clock, ShoppingBag, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ShipmentTracker } from '@/components/shipping/ShipmentTracker';
import { useEffect, useState } from 'react';

const milestoneSteps = [
  { key: 'label_created', label: 'ההזמנה התקבלה', sublabel: 'Order Placed', icon: ShoppingBag },
  { key: 'in_transit_origin', label: 'מחסן גלובלי', sublabel: 'Global Warehouse', icon: Package },
  { key: 'in_transit', label: 'משלוח בינלאומי', sublabel: 'International Transit', icon: Plane },
  { key: 'arrived_destination', label: 'הגיע לישראל', sublabel: 'Arrived in Israel', icon: MapPin },
  { key: 'delivered', label: 'נמסר', sublabel: 'Delivered', icon: CheckCircle2 },
];

const statusOrder = [
  'label_created', 'picked_up', 'in_transit_origin', 'departed_origin',
  'in_transit', 'arrived_destination', 'customs', 'out_for_delivery', 'delivered',
];

function getStepIndex(status: string): number {
  const idx = statusOrder.indexOf(status);
  if (idx <= 1) return 0; // label_created / picked_up → step 0
  if (idx <= 3) return 1; // in_transit_origin / departed_origin → step 1
  if (idx === 4) return 2; // in_transit → step 2
  if (idx <= 6) return 3; // arrived_destination / customs → step 3
  return 4; // out_for_delivery / delivered → step 4
}

const OrderTrackingPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  const { data: tracking } = useQuery({
    queryKey: ['shipment-tracking-page', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipment_tracking' as any)
        .select('*')
        .eq('order_id', orderId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!orderId,
  });

  // Realtime subscription
  const [realtimeStatus, setRealtimeStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`tracking-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shipment_tracking',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          setRealtimeStatus((payload.new as any).current_status);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  const currentStatus = realtimeStatus || tracking?.current_status || order?.shipping_status || 'label_created';
  const activeStep = getStepIndex(currentStatus);
  const isFailed = currentStatus === 'delivery_failed';

  if (orderLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-5 py-20">
          <div className="space-y-4">
            <div className="h-6 w-40 rounded-lg bg-muted animate-pulse" />
            <div className="h-32 rounded-[20px] bg-muted animate-pulse" />
            <div className="h-64 rounded-[20px] bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between px-5 h-14 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <span className="text-[15px] font-semibold tracking-tight">מעקב הזמנה</span>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 py-6 space-y-8">

        {/* ─── Order Summary Card ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[20px] bg-card border border-border/50 p-6 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Package className="w-6 h-6 text-muted-foreground/40" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold leading-snug truncate">
                {(order as any)?.special_instructions || order?.order_number || 'הזמנה'}
              </h2>
              {(order as any)?.pet_name && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  🐾 עבור {(order as any).pet_name}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                #{order?.order_number || orderId?.slice(0, 8)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* ─── Delivery Failed Banner ─── */}
        {isFailed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-[16px] bg-destructive/10 border border-destructive/20 p-4 flex items-center gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium text-destructive">ניסיון מסירה נכשל</p>
              <p className="text-xs text-muted-foreground mt-0.5">נא לתאם מסירה מחדש עם חברת השילוח</p>
            </div>
          </motion.div>
        )}

        {/* ─── Visual Timeline ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-5">
            DELIVERY PROGRESS
          </p>

          <div className="relative pr-8">
            {/* Vertical line */}
            <div className="absolute right-[15px] top-2 bottom-2 w-px bg-border" />
            {/* Filled progress */}
            <div
              className="absolute right-[15px] top-2 w-px bg-primary transition-all duration-700"
              style={{
                height: `${(activeStep / (milestoneSteps.length - 1)) * 100}%`,
              }}
            />

            <div className="space-y-8">
              {milestoneSteps.map((step, i) => {
                const isCompleted = i <= activeStep;
                const isCurrent = i === activeStep && !isFailed;
                const Icon = step.icon;

                return (
                  <motion.div
                    key={step.key}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.06 }}
                    className="relative flex items-start gap-5"
                  >
                    {/* Dot / icon */}
                    <div className="absolute right-[-32px]">
                      <div
                        className={`
                          w-[30px] h-[30px] rounded-full flex items-center justify-center
                          transition-all duration-500
                          ${isCurrent
                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-110'
                            : isCompleted
                              ? 'bg-primary/15 text-primary'
                              : 'bg-muted text-muted-foreground/40'
                          }
                        `}
                      >
                        <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </div>
                    </div>

                    {/* Text */}
                    <div className="pt-1">
                      <p className={`text-[15px] font-medium leading-snug ${
                        isCompleted ? 'text-foreground' : 'text-muted-foreground/50'
                      }`}>
                        {step.label}
                      </p>
                      <p className={`text-[11px] mt-0.5 ${
                        isCompleted ? 'text-muted-foreground' : 'text-muted-foreground/30'
                      }`}>
                        {step.sublabel}
                      </p>
                      {isCurrent && tracking?.estimated_delivery && (
                        <p className="text-xs text-primary mt-1.5 font-medium">
                          צפי הגעה: {new Date(tracking.estimated_delivery).toLocaleDateString('he-IL', {
                            day: 'numeric', month: 'long',
                          })}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* ─── Detailed Tracking (ShipmentTracker) ─── */}
        {tracking && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-[20px] bg-card border border-border/50 overflow-hidden shadow-sm"
          >
            <ShipmentTracker orderId={orderId!} />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default OrderTrackingPage;
