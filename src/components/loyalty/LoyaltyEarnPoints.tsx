import { motion } from "framer-motion";
import { Star, ShoppingBag, Camera, MessageSquare, Users, Gift, PawPrint } from "lucide-react";
import { useLoyalty } from "@/hooks/useLoyalty";
import { cn } from "@/lib/utils";

interface LoyaltyEarnPointsProps {
  className?: string;
}

const EARN_CATEGORIES = [
  {
    title: "רכישות",
    icon: <ShoppingBag className="w-5 h-5" />,
    color: "from-blue-400 to-blue-600",
    actions: ['first_purchase', 'purchase', 'repeat_purchase', 'purchase_after_reminder']
  },
  {
    title: "קהילה",
    icon: <MessageSquare className="w-5 h-5" />,
    color: "from-green-400 to-green-600",
    actions: ['write_review', 'upload_photo', 'rate_product', 'share_product']
  },
  {
    title: "חיית מחמד",
    icon: <PawPrint className="w-5 h-5" />,
    color: "from-amber-400 to-amber-600",
    actions: ['create_pet_profile', 'complete_pet_details', 'use_bag_reminder']
  },
  {
    title: "חברים",
    icon: <Users className="w-5 h-5" />,
    color: "from-purple-400 to-purple-600",
    actions: ['invite_friend', 'friend_first_purchase']
  },
  {
    title: "בונוסים",
    icon: <Gift className="w-5 h-5" />,
    color: "from-pink-400 to-pink-600",
    actions: ['monthly_active_bonus', 'veteran_bonus']
  }
];

export const LoyaltyEarnPoints = ({ className }: LoyaltyEarnPointsProps) => {
  const { rules } = useLoyalty();

  return (
    <div className={cn("space-y-4", className)}>
      {EARN_CATEGORIES.map((category, categoryIndex) => {
        const categoryRules = rules.filter(r => category.actions.includes(r.actionType));
        if (categoryRules.length === 0) return null;

        return (
          <motion.div
            key={category.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: categoryIndex * 0.1 }}
            className="bg-card rounded-xl border border-border overflow-hidden"
          >
            {/* Category header */}
            <div className={cn(
              "flex items-center gap-3 p-3 bg-gradient-to-r text-white",
              category.color
            )}>
              {category.icon}
              <h4 className="font-bold">{category.title}</h4>
            </div>

            {/* Actions */}
            <div className="divide-y divide-border">
              {categoryRules.map((rule) => (
                <div 
                  key={rule.actionType}
                  className="flex items-center justify-between p-3"
                >
                  <div>
                    <p className="font-medium text-sm">{rule.actionNameHe}</p>
                    {rule.requiresTenureDays > 0 && (
                      <p className="text-xs text-muted-foreground">
                        נדרש ותק של {rule.requiresTenureDays} ימים
                      </p>
                    )}
                    {rule.dailyLimit && (
                      <p className="text-xs text-muted-foreground">
                        עד {rule.dailyLimit} פעמים ביום
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-primary font-bold">
                    <Star className="w-4 h-4 fill-primary" />
                    <span>+{rule.points}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
