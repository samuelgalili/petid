import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Star, Send, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * UXGuardian — Floating feedback widget with glassmorphism style.
 * Features:
 * - Star rating + text feedback
 * - Rage-click detection
 * - Slow-load detection (>3s)
 * - AI sentiment analysis (via edge function)
 */
export const UXGuardian = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Rage-click tracking
  const clickMapRef = useRef<Map<string, { count: number; timer: ReturnType<typeof setTimeout> }>>(new Map());
  const sessionIdRef = useRef(crypto.randomUUID());

  // ─── Rage-Click Detector ──────────────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Build a simple selector key
      const key = `${target.tagName}.${target.className?.split?.(" ")?.[0] || ""}#${target.id || ""}`;
      const map = clickMapRef.current;
      const entry = map.get(key);

      if (entry) {
        entry.count++;
        if (entry.count >= 4) {
          // Rage click detected — dispatch custom event
          window.dispatchEvent(new CustomEvent("UXG_RageClick", {
            detail: { element: target, count: entry.count, route: window.location.pathname },
          }));
          logRageClick(target, entry.count);
          entry.count = 0;
        }
      } else {
        const timer = setTimeout(() => map.delete(key), 2000);
        map.set(key, { count: 1, timer });
      }
    };

    document.addEventListener("click", handleClick, { passive: true });
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // ─── Slow Load Detector ───────────────────────────────────
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 3000) {
          logSlowLoad(entry.name, entry.duration);
        }
      }
    });

    try {
      observer.observe({ entryTypes: ["resource", "navigation"] });
    } catch {
      // Some browsers don't support all entry types
    }

    return () => observer.disconnect();
  }, []);

  const logRageClick = useCallback(async (element: HTMLElement, count: number) => {
    try {
      await supabase.from("rage_click_events" as any).insert({
        route: window.location.pathname,
        element_selector: element.tagName + (element.id ? `#${element.id}` : ""),
        element_text: element.textContent?.slice(0, 100) || null,
        click_count: count,
        session_id: sessionIdRef.current,
      } as any);

      // Also report to error reporter for Ofek/Ido
      await supabase.from("system_error_logs" as any).insert({
        message: `Rage click detected on "${element.textContent?.slice(0, 50) || element.tagName}" (${count} clicks)`,
        error_source: "client",
        error_type: "runtime",
        severity: "warning",
        component: element.tagName,
        route: window.location.pathname,
        metadata: { type: "rage_click", element_text: element.textContent?.slice(0, 100), count },
      } as any);
    } catch {
      // Silent
    }
  }, []);

  const logSlowLoad = useCallback(async (resourceName: string, duration: number) => {
    try {
      await supabase.from("system_error_logs" as any).insert({
        message: `Slow load detected: ${resourceName} took ${Math.round(duration)}ms`,
        error_source: "client",
        error_type: "timeout",
        severity: duration > 5000 ? "error" : "warning",
        route: window.location.pathname,
        metadata: { type: "slow_load", resource: resourceName, duration_ms: Math.round(duration) },
      } as any);
    } catch {
      // Silent
    }
  }, []);

  // ─── Submit Feedback ──────────────────────────────────────
  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);

    try {
      // Get user if logged in
      const { data: { user } } = await supabase.auth.getUser();

      // Insert feedback
      const { data: inserted, error } = await supabase
        .from("user_feedback" as any)
        .insert({
          user_id: user?.id || null,
          rating,
          message: message.trim() || null,
          route: window.location.pathname,
        } as any)
        .select("id")
        .single();

      if (error) throw error;

      // Trigger AI sentiment analysis in background
      supabase.functions.invoke("analyze-sentiment", {
        body: {
          feedback_id: (inserted as any)?.id,
          rating,
          message: message.trim(),
        },
      }).catch(() => {});

      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setRating(0);
        setMessage("");
      }, 2000);
    } catch {
      toast.error("שגיאה בשליחת הפידבק");
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <>
      {/* ─── Floating Trigger Button ─── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ delay: 3, type: "spring" }}
            onClick={() => setIsOpen(true)}
            className={cn(
              "fixed bottom-6 right-6 z-[9999] w-11 h-11 rounded-full",
              "flex items-center justify-center",
              "bg-background/60 backdrop-blur-xl border border-border/50",
              "shadow-lg hover:shadow-xl transition-all",
              "hover:scale-110 active:scale-95",
            )}
            aria-label="Send feedback"
          >
            <MessageSquare className="w-4.5 h-4.5 text-muted-foreground" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ─── Feedback Panel ─── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25 }}
            className={cn(
              "fixed bottom-20 right-6 z-[9999] w-72",
              "rounded-2xl overflow-hidden",
              "bg-background/70 backdrop-blur-2xl",
              "border border-border/40",
              "shadow-2xl",
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <p className="text-xs font-semibold text-foreground">איך החוויה? 🐾</p>
              <button
                onClick={() => { setIsOpen(false); setRating(0); setMessage(""); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-4 pb-5 pt-2 text-center"
              >
                <p className="text-2xl mb-1">💛</p>
                <p className="text-xs font-medium text-foreground">תודה על הפידבק!</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">זה עוזר לנו להשתפר</p>
              </motion.div>
            ) : (
              <div className="px-4 pb-4 space-y-3">
                {/* Stars */}
                <div className="flex items-center justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-0.5 transition-transform hover:scale-125"
                    >
                      <Star
                        className={cn(
                          "w-6 h-6 transition-colors",
                          star <= displayRating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30"
                        )}
                      />
                    </button>
                  ))}
                </div>

                {/* Text Input */}
                {rating > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="space-y-2"
                  >
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="רוצה לשתף עוד? (אופציונלי)"
                      rows={2}
                      className={cn(
                        "w-full text-xs rounded-xl p-2.5 resize-none",
                        "bg-muted/30 border border-border/30",
                        "placeholder:text-muted-foreground/40",
                        "focus:outline-none focus:ring-1 focus:ring-primary/30",
                      )}
                    />
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className={cn(
                        "w-full flex items-center justify-center gap-1.5",
                        "text-[11px] font-medium py-2 rounded-xl",
                        "bg-primary text-primary-foreground",
                        "hover:opacity-90 disabled:opacity-50 transition-opacity",
                      )}
                    >
                      <Send className="w-3 h-3" />
                      {submitting ? "שולח..." : "שלח פידבק"}
                    </button>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
