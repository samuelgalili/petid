import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CEONotification, NotificationTier, TIER_CONFIG 
} from "@/hooks/useCEONotifications";
import {
  AlertTriangle, Sparkles, Brain, Archive, Trash2,
  CheckCircle2, Eye, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { useState } from "react";

interface CEOAlertsTabProps {
  notifications: CEONotification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onArchive: (id: string) => void;
  onClearAll: () => void;
  onArchiveAll: () => void;
}

const TIER_ICONS: Record<NotificationTier, React.ComponentType<any>> = {
  critical: AlertTriangle,
  opportunity: Sparkles,
  insight: Brain,
};

const FILTER_OPTIONS: { value: "all" | NotificationTier; label: string }[] = [
  { value: "all", label: "הכל" },
  { value: "critical", label: "קריטי" },
  { value: "opportunity", label: "הזדמנות" },
  { value: "insight", label: "תובנה" },
];

export const CEOAlertsTab = ({
  notifications,
  unreadCount,
  onMarkRead,
  onArchive,
  onClearAll,
  onArchiveAll,
}: CEOAlertsTabProps) => {
  const [filter, setFilter] = useState<"all" | NotificationTier>("all");

  const filtered = filter === "all"
    ? notifications
    : notifications.filter(n => n.tier === filter);

  const timeAgo = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return "עכשיו";
    if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דק׳`;
    if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שעות`;
    return `לפני ${Math.floor(diff / 86400)} ימים`;
  };

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white text-[10px] px-2 py-0.5">
              {unreadCount} חדשות
            </Badge>
          )}
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] text-muted-foreground gap-1"
            onClick={() => { haptic("light"); onClearAll(); }}
          >
            <Eye className="w-3 h-3" />
            סמן נקראו
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] text-muted-foreground gap-1"
            onClick={() => { haptic("medium"); onArchiveAll(); }}
          >
            <Archive className="w-3 h-3" />
            ארכיון הכל
          </Button>
        </div>
      </div>

      {/* Tier filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => { haptic("selection"); setFilter(opt.value); }}
            className={cn(
              "px-3 py-1.5 rounded-full text-[11px] font-medium transition-all shrink-0 border",
              filter === opt.value
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-card border-border/20 text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.value !== "all" && (
              <span className="mr-1">{TIER_CONFIG[opt.value as NotificationTier].icon}</span>
            )}
            {opt.label}
            {opt.value !== "all" && (
              <span className="mr-1 text-[10px] opacity-60">
                ({notifications.filter(n => n.tier === opt.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center py-12"
              >
                <CheckCircle2 className="w-12 h-12 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">אין התראות</p>
              </motion.div>
            ) : (
              filtered.map((notif, idx) => {
                const tier = TIER_CONFIG[notif.tier];
                const TierIcon = TIER_ICONS[notif.tier];

                return (
                  <motion.div
                    key={notif.id}
                    layout
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -80, scale: 0.9 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <div
                      className={cn(
                        "relative rounded-2xl p-4 border backdrop-blur-xl transition-all",
                        "bg-card/60",
                        notif.isRead ? "opacity-70" : "",
                        tier.borderColor
                      )}
                      style={{
                        boxShadow: notif.isRead
                          ? "none"
                          : `0 4px 20px ${tier.glowColor}`,
                      }}
                      onClick={() => { if (!notif.isRead) onMarkRead(notif.id); }}
                    >
                      {/* Unread indicator */}
                      {!notif.isRead && (
                        <div className={cn(
                          "absolute top-4 left-4 w-2 h-2 rounded-full",
                          notif.tier === "critical" && "bg-red-500",
                          notif.tier === "opportunity" && "bg-amber-500",
                          notif.tier === "insight" && "bg-primary"
                        )} />
                      )}

                      <div className="flex items-start gap-3">
                        {/* Tier icon */}
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                          tier.bgColor
                        )}>
                          <TierIcon className={cn("w-4 h-4", tier.color)} strokeWidth={1.5} />
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              className={cn("text-[9px] px-1.5 py-0", tier.borderColor, tier.color)}
                            >
                              {tier.label}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground/50">
                              {timeAgo(notif.createdAt)}
                            </span>
                          </div>

                          {/* Content */}
                          <h4 className="text-sm font-bold text-foreground mb-0.5">{notif.title}</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                            {notif.message}
                          </p>

                          {/* Source + Action */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground/60">
                              {notif.sourceEmoji} {notif.source}
                            </span>
                            <div className="flex gap-1.5">
                              {notif.actionLabel && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={cn(
                                    "h-6 text-[10px] rounded-lg gap-1 px-2",
                                    tier.borderColor, tier.color,
                                    "hover:bg-card"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    haptic("medium");
                                    notif.actionFn?.();
                                    onMarkRead(notif.id);
                                  }}
                                >
                                  {notif.actionLabel}
                                  <ChevronRight className="w-3 h-3" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-muted-foreground/40 hover:text-muted-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  haptic("light");
                                  onArchive(notif.id);
                                }}
                              >
                                <Archive className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
};
