import { motion } from "framer-motion";
import { Star, Clock, ShoppingBag, Camera, MessageSquare, Users, Gift } from "lucide-react";
import { useLoyalty } from "@/hooks/useLoyalty";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

interface LoyaltyHistoryCardProps {
  className?: string;
  limit?: number;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  first_purchase: <ShoppingBag className="w-4 h-4" />,
  purchase: <ShoppingBag className="w-4 h-4" />,
  repeat_purchase: <ShoppingBag className="w-4 h-4" />,
  purchase_after_reminder: <ShoppingBag className="w-4 h-4" />,
  write_review: <MessageSquare className="w-4 h-4" />,
  upload_photo: <Camera className="w-4 h-4" />,
  rate_product: <Star className="w-4 h-4" />,
  share_product: <Gift className="w-4 h-4" />,
  create_pet_profile: <Star className="w-4 h-4" />,
  complete_pet_details: <Star className="w-4 h-4" />,
  use_bag_reminder: <Clock className="w-4 h-4" />,
  invite_friend: <Users className="w-4 h-4" />,
  friend_first_purchase: <Users className="w-4 h-4" />,
  monthly_active_bonus: <Gift className="w-4 h-4" />,
  veteran_bonus: <Gift className="w-4 h-4" />
};

export const LoyaltyHistoryCard = ({ className, limit = 5 }: LoyaltyHistoryCardProps) => {
  const { events, rules, loading } = useLoyalty();

  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const displayEvents = events.slice(0, limit);

  if (displayEvents.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>עדיין אין פעילות</p>
        <p className="text-sm">התחל לצבור נקודות!</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {displayEvents.map((event, index) => {
        const rule = rules.find(r => r.actionType === event.actionType);
        const icon = ACTION_ICONS[event.actionType] || <Star className="w-4 h-4" />;
        
        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border/50"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {rule?.actionNameHe || event.actionType}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(event.createdAt), { 
                  addSuffix: true, 
                  locale: he 
                })}
              </p>
            </div>
            <div className="text-primary font-bold text-sm">
              +{event.pointsEarned}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
