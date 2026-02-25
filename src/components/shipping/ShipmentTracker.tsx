import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import {
  Package, Truck, CheckCircle2, Clock, MapPin,
  Plane, Ship, ExternalLink, RefreshCw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ShipmentTrackerProps {
  orderId: string;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  label_created: { label: 'תווית נוצרה', icon: <Package className="w-4 h-4" />, color: 'text-muted-foreground' },
  picked_up: { label: 'נאסף', icon: <Truck className="w-4 h-4" />, color: 'text-muted-foreground' },
  in_transit_origin: { label: 'במעבר — מדינת מוצא', icon: <Truck className="w-4 h-4" />, color: 'text-primary' },
  departed_origin: { label: 'יצא ממדינת המוצא', icon: <Plane className="w-4 h-4" />, color: 'text-primary' },
  in_transit: { label: 'במשלוח בינלאומי', icon: <Ship className="w-4 h-4" />, color: 'text-primary' },
  arrived_destination: { label: 'הגיע ליעד', icon: <MapPin className="w-4 h-4" />, color: 'text-primary' },
  customs: { label: 'במכס', icon: <Clock className="w-4 h-4" />, color: 'text-amber-600' },
  out_for_delivery: { label: 'יצא לחלוקה', icon: <Truck className="w-4 h-4" />, color: 'text-primary' },
  delivered: { label: 'נמסר', icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-primary' },
};

export const ShipmentTracker = ({ orderId }: ShipmentTrackerProps) => {
  const { data: tracking, isLoading, refetch } = useQuery({
    queryKey: ['shipment-tracking', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipment_tracking' as any)
        .select('*, provider:provider_id(name, slug, tracking_url_template)')
        .eq('order_id', orderId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!tracking) {
    return (
      <div className="text-center py-8 px-4">
        <Truck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">אין מידע מעקב עדיין</p>
      </div>
    );
  }

  const milestones = (tracking.milestones || []) as any[];
  const currentStatus = statusConfig[tracking.current_status] || statusConfig.label_created;

  // Build tracking URL
  let trackingUrl: string | null = null;
  if (tracking.provider?.tracking_url_template && tracking.tracking_number) {
    trackingUrl = tracking.provider.tracking_url_template.replace(
      '{{tracking_number}}',
      tracking.tracking_number
    );
  }

  return (
    <div className="space-y-4 p-4" dir="rtl">
      {/* Status Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[20px] bg-card border border-border/50 p-5 shadow-sm"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center ${currentStatus.color}`}>
              {currentStatus.icon}
            </div>
            <div>
              <p className="font-semibold text-sm">{currentStatus.label}</p>
              <p className="text-[11px] text-muted-foreground">
                {tracking.carrier_name} · {tracking.tracking_number}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => refetch()}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Route */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-[10px] border-0">
            {tracking.origin_country}
          </Badge>
          <div className="flex-1 h-px bg-border relative">
            <div
              className="absolute inset-y-0 right-0 bg-primary h-full transition-all"
              style={{ width: getProgressWidth(tracking.current_status) }}
            />
          </div>
          <Badge variant="secondary" className="text-[10px] border-0">
            {tracking.destination_country}
          </Badge>
        </div>

        {tracking.estimated_delivery && (
          <p className="text-xs text-muted-foreground mt-3">
            📅 משלוח צפוי: {new Date(tracking.estimated_delivery).toLocaleDateString('he-IL')}
          </p>
        )}

        {trackingUrl && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3 rounded-xl text-xs gap-1.5"
            asChild
          >
            <a href={trackingUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3 h-3" />
              מעקב באתר {tracking.carrier_name}
            </a>
          </Button>
        )}
      </motion.div>

      {/* Timeline */}
      {milestones.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-3">
            TRACKING HISTORY
          </p>
          <div className="space-y-0">
            {milestones.slice().reverse().map((milestone: any, i: number) => {
              const isFirst = i === 0;
              const config = statusConfig[milestone.status] || { label: milestone.status, icon: <Package className="w-3 h-3" />, color: 'text-muted-foreground' };
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex gap-3"
                >
                  {/* Timeline line */}
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full border-2 mt-1 ${isFirst ? 'bg-primary border-primary' : 'bg-background border-border'}`} />
                    {i < milestones.length - 1 && <div className="w-px flex-1 bg-border" />}
                  </div>

                  {/* Content */}
                  <div className="pb-4 flex-1">
                    <p className={`text-sm font-medium ${isFirst ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {milestone.description || config.label}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {milestone.location && (
                        <span className="text-[10px] text-muted-foreground">📍 {milestone.location}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(milestone.timestamp).toLocaleString('he-IL', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

function getProgressWidth(status: string): string {
  const progressMap: Record<string, string> = {
    label_created: '5%',
    picked_up: '15%',
    in_transit_origin: '25%',
    departed_origin: '40%',
    in_transit: '55%',
    arrived_destination: '70%',
    customs: '80%',
    out_for_delivery: '90%',
    delivered: '100%',
  };
  return progressMap[status] || '5%';
}
