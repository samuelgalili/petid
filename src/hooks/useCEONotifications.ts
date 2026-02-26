import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { haptic, successFeedback, errorFeedback } from "@/lib/haptics";

// ─── Notification Tier System ────────────────────────────────
export type NotificationTier = "critical" | "opportunity" | "insight";

export interface CEONotification {
  id: string;
  tier: NotificationTier;
  title: string;
  message: string;
  actionLabel?: string;
  actionFn?: () => void;
  source: string;
  sourceEmoji: string;
  createdAt: Date;
  isRead: boolean;
  isArchived: boolean;
  metadata?: Record<string, any>;
}

// ─── Tier Configuration ──────────────────────────────────────
export const TIER_CONFIG: Record<NotificationTier, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  icon: string;
}> = {
  critical: {
    label: "קריטי",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    glowColor: "rgba(239, 68, 68, 0.15)",
    icon: "🔴",
  },
  opportunity: {
    label: "הזדמנות",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    glowColor: "rgba(245, 158, 11, 0.15)",
    icon: "🟡",
  },
  insight: {
    label: "תובנה",
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    glowColor: "rgba(0, 153, 230, 0.15)",
    icon: "🔵",
  },
};

// ─── Executive Sound Simulation ──────────────────────────────
const playTierSound = (tier: NotificationTier) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (tier === "critical") {
      // Urgent double-beep
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 880;
      osc2.type = "sine";
      gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc2.start(ctx.currentTime + 0.2);
      osc2.stop(ctx.currentTime + 0.35);
    } else if (tier === "opportunity") {
      // Elegant rising chime (gold)
      osc.frequency.value = 523;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(784, ctx.currentTime + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else {
      // Soft ping (insight)
      osc.frequency.value = 660;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch {
    // Audio not available
  }
};

// ─── Hook ────────────────────────────────────────────────────
export const useCEONotifications = () => {
  const [notifications, setNotifications] = useState<CEONotification[]>([]);
  const processedAlerts = useRef<Set<string>>(new Set());

  // Add notification with sound + haptic
  const pushNotification = useCallback((notif: Omit<CEONotification, "id" | "createdAt" | "isRead" | "isArchived">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newNotif: CEONotification = {
      ...notif,
      id,
      createdAt: new Date(),
      isRead: false,
      isArchived: false,
    };

    setNotifications(prev => [newNotif, ...prev]);

    // Sound + haptics based on tier
    playTierSound(notif.tier);
    if (notif.tier === "critical") {
      errorFeedback();
    } else if (notif.tier === "opportunity") {
      successFeedback();
    } else {
      haptic("light");
    }
  }, []);

  // Mark as read
  const markRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  }, []);

  // Archive single
  const archive = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isArchived: true } : n)
    );
  }, []);

  // Clear all (mark as read)
  const clearAll = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  // Archive all
  const archiveAll = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isArchived: true })));
  }, []);

  // ─── Smart Trigger: Vendor Audit Price Discrepancy >5% ─────
  useEffect(() => {
    const checkVendorDiscrepancies = async () => {
      try {
        const { data: alerts } = await supabase
          .from("admin_data_alerts")
          .select("id, title, description, severity, metadata, is_resolved")
          .eq("category", "vendor_audit")
          .eq("is_resolved", false)
          .order("created_at", { ascending: false })
          .limit(10);

        (alerts || []).forEach((alert: any) => {
          if (processedAlerts.current.has(alert.id)) return;
          processedAlerts.current.add(alert.id);

          const discrepancy = (alert.metadata as any)?.discrepancy_pct || 0;
          if (discrepancy > 5) {
            pushNotification({
              tier: "critical",
              title: "פער מחיר ספק חריג",
              message: `${alert.title} — פער של ${discrepancy.toFixed(1)}% זוהה בביקורת הספק`,
              actionLabel: "בדוק",
              source: "Vendor Audit",
              sourceEmoji: "⚠️",
              metadata: { alertId: alert.id },
            });
          }
        });
      } catch { /* silent */ }
    };

    checkVendorDiscrepancies();
    const interval = setInterval(checkVendorDiscrepancies, 30000);
    return () => clearInterval(interval);
  }, [pushNotification]);

  // ─── Smart Trigger: Complete Pet Profile → Insurance Ready ──
  useEffect(() => {
    const channel = supabase
      .channel("ceo-notif-pets")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "pets",
      }, (payload) => {
        const pet = payload.new as any;
        // Check if profile is now "complete" — has name, breed, weight, microchip_number, and birthday
        if (
          pet.name && pet.breed && pet.weight && pet.microchip_number && pet.birth_date &&
          !processedAlerts.current.has(`pet-complete-${pet.id}`)
        ) {
          processedAlerts.current.add(`pet-complete-${pet.id}`);
          pushNotification({
            tier: "opportunity",
            title: "פרופיל מלא — מוכן לביטוח",
            message: `${pet.name} (${pet.breed}) השלים 100% פרופיל. ליד ביטוח Elite מוכן`,
            actionLabel: "שלח לשותף ביטוח",
            source: "Insurance Engine",
            sourceEmoji: "🏆",
            metadata: { petId: pet.id, petName: pet.name },
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [pushNotification]);

  // ─── Smart Trigger: Realtime admin_data_alerts ──────────────
  useEffect(() => {
    const channel = supabase
      .channel("ceo-notif-alerts")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "admin_data_alerts",
      }, (payload) => {
        const alert = payload.new as any;
        if (processedAlerts.current.has(alert.id)) return;
        processedAlerts.current.add(alert.id);

        const tier: NotificationTier =
          alert.severity === "critical" ? "critical" :
          alert.severity === "high" ? "critical" :
          alert.severity === "medium" ? "opportunity" : "insight";

        pushNotification({
          tier,
          title: alert.title,
          message: alert.description || "",
          source: alert.category || "System",
          sourceEmoji: tier === "critical" ? "🚨" : tier === "opportunity" ? "💰" : "💡",
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [pushNotification]);

  // ─── Generate initial demo notifications ───────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      if (notifications.length === 0) {
        pushNotification({
          tier: "critical",
          title: "פער מחיר בחשבונית #445",
          message: "Sarah זיהתה אי-התאמה של ₪340 מול הצעת המחיר המקורית",
          actionLabel: "שלח מייל מחאה",
          source: "Sarah — Vendor Audit",
          sourceEmoji: "⚠️",
        });

        setTimeout(() => {
          pushNotification({
            tier: "opportunity",
            title: "8 לידים Elite מוכנים",
            message: "פרופילים עם שבב מאומת + היסטוריה רפואית 100% — שווי הערכה ₪12,400",
            actionLabel: "Push לשותף ביטוח",
            source: "Insurance Engine",
            sourceEmoji: "🏆",
          });
        }, 800);

        setTimeout(() => {
          pushNotification({
            tier: "insight",
            title: "Dr. NRC למד 3 מחקרים חדשים",
            message: "מחקרי Omega-3 חדשים מ-AAFCO 2026 שולבו בבסיס הידע",
            actionLabel: "צפה בלוגיקה",
            source: "Dr. NRC",
            sourceEmoji: "🔬",
          });
        }, 1600);

        setTimeout(() => {
          pushNotification({
            tier: "opportunity",
            title: "מגמת Grain-Free +23%",
            message: "Danny מזהה עלייה חדה בביקוש — הזדמנות להגדלת מלאי",
            actionLabel: "צפה בנתונים",
            source: "Danny — Analytics",
            sourceEmoji: "📊",
          });
        }, 2400);
      }
    }, 1500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeNotifications = notifications.filter(n => !n.isArchived);
  const unreadCount = activeNotifications.filter(n => !n.isRead).length;

  return {
    notifications: activeNotifications,
    allNotifications: notifications,
    unreadCount,
    pushNotification,
    markRead,
    archive,
    clearAll,
    archiveAll,
  };
};
