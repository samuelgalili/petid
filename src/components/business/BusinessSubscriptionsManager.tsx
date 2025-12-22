import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Crown, Calendar, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface BusinessSubscriptionsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
}

export const BusinessSubscriptionsManager = ({ open, onOpenChange, businessId }: BusinessSubscriptionsManagerProps) => {
  const { data: subscribers = [], isLoading } = useQuery({
    queryKey: ['business-subscribers', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_subscriptions')
        .select(`
          *,
          profiles:subscriber_id(id, full_name, avatar_url)
        `)
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('started_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!businessId && open,
  });

  const totalRevenue = subscribers.reduce((sum, sub) => sum + (sub.price || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            מנויים
            {subscribers.length > 0 && (
              <Badge variant="secondary" className="mr-2">
                {subscribers.length}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Stats */}
        {subscribers.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-muted/50 rounded-xl text-center">
              <div className="flex items-center justify-center gap-1 text-lg font-bold">
                <Users className="w-4 h-4 text-primary" />
                {subscribers.length}
              </div>
              <span className="text-[10px] text-muted-foreground">מנויים פעילים</span>
            </div>
            <div className="p-3 bg-muted/50 rounded-xl text-center">
              <div className="flex items-center justify-center gap-1 text-lg font-bold">
                <span>₪{totalRevenue.toFixed(0)}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">הכנסה חודשית</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">טוען...</div>
          ) : subscribers.length === 0 ? (
            <div className="text-center py-12">
              <Crown className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">אין מנויים עדיין</p>
              <p className="text-xs text-muted-foreground mt-1">
                הפעל מנויים כדי להציע תוכן בלעדי
              </p>
            </div>
          ) : (
            subscribers.map((sub: any) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 bg-card border rounded-xl"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={sub.profiles?.avatar_url} />
                  <AvatarFallback>
                    {sub.profiles?.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {sub.profiles?.full_name || 'משתמש'}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {sub.tier}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(sub.started_at), 'dd/MM/yy', { locale: he })}
                    </span>
                    {sub.price && (
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        ₪{sub.price}/חודש
                      </span>
                    )}
                  </div>
                </div>

                {sub.expires_at && new Date(sub.expires_at) < new Date() && (
                  <Badge variant="destructive" className="text-[10px]">
                    פג תוקף
                  </Badge>
                )}
              </motion.div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
