import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Package, Truck, Home, CheckCircle, Clock, MapPin, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

interface OrderTrackingProps {
  orderId: string;
}

const statusSteps = [
  { key: 'pending', label: 'הזמנה התקבלה', icon: Clock },
  { key: 'processing', label: 'בהכנה', icon: Package },
  { key: 'shipped', label: 'נשלח', icon: Truck },
  { key: 'out_for_delivery', label: 'בדרך אליך', icon: MapPin },
  { key: 'delivered', label: 'נמסר', icon: Home },
];

export const OrderTracking = ({ orderId }: OrderTrackingProps) => {
  const { data: trackingHistory = [], isLoading } = useQuery({
    queryKey: ['order-tracking', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_tracking')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: order } = useQuery({
    queryKey: ['order-status', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const currentStatus = order?.status || 'pending';
  const currentStepIndex = statusSteps.findIndex(s => s.key === currentStatus);
  const latestTracking = trackingHistory[trackingHistory.length - 1];

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-muted rounded w-1/3" />
        <div className="h-20 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Progress */}
      <div className="relative">
        <div className="flex justify-between">
          {statusSteps.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const Icon = step.icon;

            return (
              <div key={step.key} className="flex flex-col items-center relative z-10">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: isCurrent ? 1.1 : 1 }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                >
                  {isCompleted && index < currentStepIndex ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </motion.div>
                <span className={`text-[10px] mt-2 text-center max-w-16 ${
                  isCompleted ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted -z-0 mx-8">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: '0%' }}
            animate={{ width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Tracking Info */}
      {latestTracking && (
        <div className="bg-muted/30 rounded-xl p-4 space-y-3">
          {latestTracking.tracking_number && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">מספר מעקב:</span>
              <span className="font-mono text-sm">{latestTracking.tracking_number}</span>
            </div>
          )}

          {latestTracking.carrier && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">חברת משלוחים:</span>
              <span className="text-sm">{latestTracking.carrier}</span>
            </div>
          )}

          {latestTracking.estimated_delivery && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">משלוח משוער:</span>
              <span className="text-sm font-medium">
                {format(new Date(latestTracking.estimated_delivery), 'EEEE, d בMMMM', { locale: he })}
              </span>
            </div>
          )}

          {latestTracking.location && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">מיקום נוכחי:</span>
              <span className="text-sm flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {latestTracking.location}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tracking History */}
      {trackingHistory.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm">היסטוריית מעקב</h4>
          <div className="space-y-3">
            {trackingHistory.slice().reverse().map((event: any, index: number) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-3"
              >
                <div className="flex flex-col items-center">
                  <div className={`w-2 h-2 rounded-full ${
                    index === 0 ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`} />
                  {index < trackingHistory.length - 1 && (
                    <div className="w-0.5 flex-1 bg-muted" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <p className="text-sm font-medium">{event.status}</p>
                  {event.description && (
                    <p className="text-xs text-muted-foreground">{event.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(event.created_at), 'dd/MM HH:mm', { locale: he })}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Track Externally Button */}
      {latestTracking?.tracking_number && latestTracking?.carrier && (
        <Button variant="outline" className="w-full" asChild>
          <a
            href={getCarrierTrackingUrl(latestTracking.carrier, latestTracking.tracking_number)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="w-4 h-4 ml-2" />
            עקוב באתר חברת המשלוחים
          </a>
        </Button>
      )}
    </div>
  );
};

function getCarrierTrackingUrl(carrier: string, trackingNumber: string): string {
  const carriers: Record<string, string> = {
    'israel_post': `https://www.israelpost.co.il/itemtrace.nsf/trackandtracebynumber?openform&itemcode=${trackingNumber}`,
    'dhl': `https://www.dhl.com/il-he/home/tracking.html?tracking-id=${trackingNumber}`,
    'fedex': `https://www.fedex.com/fedextrack/?tracknumbers=${trackingNumber}`,
    'ups': `https://www.ups.com/track?tracknum=${trackingNumber}`,
  };
  return carriers[carrier.toLowerCase()] || '#';
}
