/**
 * Reminder Flow - תזכורת עדינה להזמנה חוזרת
 * UX עדין - לא דוחף, השליטה אצל המשתמש
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Bell, Package, Clock, X, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { REMINDERS, ACTIONS } from "@/lib/brandVoice";

interface ReminderFlowProps {
  petName: string;
  daysLeft: number;
  productName?: string;
  onDismiss: () => void;
  onRemindLater: () => void;
  onOrder: () => void;
}

export const ReminderFlow = ({
  petName,
  daysLeft,
  productName = "מזון",
  onDismiss,
  onRemindLater,
  onOrder,
}: ReminderFlowProps) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  const handleRemindLater = () => {
    setIsVisible(false);
    setTimeout(onRemindLater, 300);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", damping: 25 }}
        >
          <Card className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200/50 dark:border-amber-800/50 relative overflow-hidden" dir="rtl">
            {/* Dismiss button */}
            <button 
              onClick={handleDismiss}
              className="absolute top-3 left-3 w-7 h-7 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Icon */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                <Bell className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              
              <div className="flex-1 pt-1">
                <p className="font-medium text-foreground mb-2">
                  {REMINDERS.gentleReminder}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {REMINDERS.lowStock(daysLeft)}
                </p>
              </div>
            </div>

            {/* Actions - User has control */}
            <div className="space-y-2">
              <Button 
                onClick={onOrder}
                className="w-full gap-2 bg-primary hover:bg-primary/90"
              >
                <Package className="w-4 h-4" />
                {ACTIONS.orderNow}
              </Button>
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleRemindLater}
                  className="flex-1 gap-2 text-sm"
                >
                  <Clock className="w-4 h-4" />
                  {ACTIONS.remindLater}
                </Button>
                
                <Button 
                  variant="ghost" 
                  onClick={handleDismiss}
                  className="flex-1 text-sm text-muted-foreground"
                >
                  {ACTIONS.notNow}
                </Button>
              </div>
            </div>

            {/* Subtle brand message */}
            <div className="mt-4 pt-3 border-t border-amber-200/50 dark:border-amber-800/50">
              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                <Heart className="w-3 h-3 text-primary" />
                בשביל מי שתלוי בכם 💛
              </p>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Mini reminder banner (less intrusive)
export const ReminderBanner = ({
  daysLeft,
  onOrder,
}: {
  daysLeft: number;
  onOrder: () => void;
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || daysLeft > 7) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200/50 dark:border-amber-800/50"
    >
      <div className="px-4 py-3 flex items-center justify-between" dir="rtl">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm text-foreground">
            נשארו כ-{daysLeft} ימים למלאי 🐾
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant="ghost"
            onClick={onOrder}
            className="text-primary text-xs h-7"
          >
            להזמנה
          </Button>
          <button 
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
