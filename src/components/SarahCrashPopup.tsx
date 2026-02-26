import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, HeartHandshake } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SarahCrashPopup — Friendly popup from Sarah (Support Bot) 
 * when a JS error or crash is detected.
 * Shows once per session, auto-dismisses after 8s.
 */
export const SarahCrashPopup = () => {
  const [visible, setVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const shownRef = { current: false };

  const showPopup = useCallback((msg: string) => {
    if (shownRef.current) return;
    shownRef.current = true;
    setErrorMsg(msg);
    setVisible(true);
    setTimeout(() => setVisible(false), 8000);
  }, []);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Only show for real errors, not minor warnings
      if (event.message?.includes("ResizeObserver")) return;
      showPopup(event.message || "שגיאה לא צפויה");
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message || String(event.reason) || "שגיאה";
      if (msg.includes("AbortError") || msg.includes("cancel")) return;
      showPopup(msg);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, [showPopup]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: "spring", damping: 25 }}
          className={cn(
            "fixed bottom-36 right-4 z-[60] max-w-[280px]",
            "rounded-2xl overflow-hidden",
            "bg-background/75 backdrop-blur-2xl",
            "border border-border/40",
            "shadow-2xl",
          )}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <HeartHandshake className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">שרה כאן 💛</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  שמתי לב לתקלה קטנה. הצוות שלנו כבר מטפל בזה — הכל יחזור לפעול בקרוב!
                </p>
              </div>
              <button
                onClick={() => setVisible(false)}
                className="text-muted-foreground hover:text-foreground transition-colors mt-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            
            {/* Progress bar auto-dismiss */}
            <motion.div
              className="mt-3 h-0.5 bg-primary/20 rounded-full overflow-hidden"
            >
              <motion.div
                className="h-full bg-primary/50 rounded-full"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 8, ease: "linear" }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
