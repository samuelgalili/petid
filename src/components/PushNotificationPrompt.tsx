import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export const PushNotificationPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const { isSupported, permission, isSubscribed, subscribe } = usePushNotifications();

  useEffect(() => {
    // Show prompt only if:
    // 1. Push is supported
    // 2. Permission is default (not granted or denied)
    // 3. User is not already subscribed
    // 4. User hasn't dismissed the prompt in this session
    const dismissed = sessionStorage.getItem('push-prompt-dismissed');
    
    if (isSupported && permission === 'default' && !isSubscribed && !dismissed) {
      // Show prompt after 5 seconds
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isSupported, permission, isSubscribed]);

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('push-prompt-dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        transition={{ duration: 0.3 }}
        className="fixed bottom-24 left-4 right-4 z-50 max-w-md mx-auto"
        dir="rtl"
      >
        <Card className="p-5 shadow-2xl border-2 border-primary bg-card">
          <button
            onClick={handleDismiss}
            className="absolute top-2 left-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="סגור"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
              className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg"
            >
              <Bell className="w-6 h-6 text-primary-foreground" />
            </motion.div>

            <div className="flex-1">
              <h3 className="font-bold text-foreground text-lg mb-2 font-jakarta">
                קבלו עדכונים על הפעילות
              </h3>
              <p className="text-sm text-muted-foreground mb-4 font-jakarta">
                הפעילו התראות כדי לקבל עדכונים על לייקים, תגובות ופעילויות חדשות של חיות המחמד שלכם
              </p>

              <div className="flex gap-3">
                <Button
                  onClick={handleSubscribe}
                  className="flex-1 bg-primary hover:bg-primary-dark text-primary-foreground font-bold shadow-lg font-jakarta"
                >
                  <Bell className="w-4 h-4 ml-2" />
                  הפעילו התראות
                </Button>
                <Button
                  onClick={handleDismiss}
                  variant="outline"
                  className="font-jakarta"
                >
                  אולי אחר כך
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
