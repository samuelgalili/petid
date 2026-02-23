import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

export const OfflineBadge = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { language } = useLanguage();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const label = language === "he" ? "אין חיבור לאינטרנט" : "You're offline";

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed top-0 inset-x-0 z-[200] flex items-center justify-center gap-2 py-2 bg-destructive text-destructive-foreground text-xs font-medium"
          style={{ paddingTop: `calc(env(safe-area-inset-top) + 0.5rem)` }}
        >
          <WifiOff className="w-3.5 h-3.5" strokeWidth={2} />
          {label}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
