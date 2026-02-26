import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, ShoppingCart, Package, Brain, Sparkles,
  TrendingUp, AlertTriangle, Wallet, Eye, RotateCcw,
  ChevronLeft, Check, Clock, Bell, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScienceBadge } from '@/components/ui/ScienceBadge';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─── Types ───
type NotifCategory = 'sales' | 'inventory' | 'ai';

interface Notification {
  id: string;
  category: NotifCategory;
  title: string;
  body: string;
  time: string;
  read: boolean;
  action: { label: string; route: string };
}

interface AiInsight {
  id: string;
  assistant: string;
  title: string;
  body: string;
  badge?: boolean;
  action: { label: string; route: string };
}

const categoryConfig: Record<NotifCategory, { icon: typeof ShoppingCart; color: string; bg: string; label: string }> = {
  sales: { icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-500/10', label: 'מכירות' },
  inventory: { icon: Package, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'מלאי' },
  ai: { icon: Brain, color: 'text-primary', bg: 'bg-primary/10', label: 'תובנות AI' },
};

const SmartNotifications = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | NotifCategory>('all');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Fetch AI insights from agent action logs
  const { data: aiInsights = [] } = useQuery({
    queryKey: ["smart-notifications-insights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_action_logs")
        .select("*")
        .eq("action_type", "bot_scheduled_report")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data || []).map((log: any) => ({
        id: log.id,
        assistant: log.description?.match(/\[([^\]]+)\]/)?.[1] || "AI",
        title: log.description?.replace(/\[[^\]]+\]\s*/, "").substring(0, 60) || "תובנה",
        body: log.description?.replace(/\[[^\]]+\]\s*/, "").substring(0, 200) || "",
        badge: false,
        action: { label: 'צפה בפרטים', route: '/admin/robot-fleet' },
      }));
    },
  });

  // Fetch recent notifications from admin_data_alerts
  const { data: notifications = [] } = useQuery({
    queryKey: ["smart-notifications-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_data_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []).map((alert: any): Notification => ({
        id: alert.id,
        category: alert.category === 'inventory' ? 'inventory' : alert.category === 'sales' ? 'sales' : 'ai' as NotifCategory,
        title: alert.title,
        body: alert.description || "",
        time: new Date(alert.created_at).toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
        read: alert.is_read || false,
        action: { label: 'צפה', route: '/admin/notifications' },
      }));
    },
  });

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.category === filter);
  const unreadCount = notifications.filter(n => !n.read && !readIds.has(n.id)).length;

  const markRead = (id: string) => setReadIds(prev => new Set(prev).add(id));
  const markAllRead = () => setReadIds(new Set(notifications.map(n => n.id)));

  const filters: { key: 'all' | NotifCategory; label: string }[] = [
    { key: 'all', label: 'הכל' },
    { key: 'sales', label: 'מכירות' },
    { key: 'inventory', label: 'מלאי' },
    { key: 'ai', label: 'AI' },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between px-5 h-14 max-w-3xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-[15px] font-semibold tracking-tight">מרכז התראות</span>
            {unreadCount > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={markAllRead}>
            <Check className="w-3.5 h-3.5 ml-1" />
            קראתי
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-6 space-y-8">

        {/* ─── AI Insights Section ─── */}
        {aiInsights.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.5} />
            <h2 className="text-sm font-semibold">המלצות חכמות</h2>
          </div>

          <div className="space-y-3">
            {aiInsights.map((insight: AiInsight, i: number) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className="border border-primary/10 bg-primary/[0.02] hover:bg-primary/[0.04] transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Brain className="w-4 h-4 text-primary" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-semibold text-primary/70 uppercase tracking-wider">
                            {insight.assistant}
                          </span>
                          {insight.badge && <ScienceBadge size="sm" />}
                        </div>
                        <p className="text-sm font-semibold leading-snug">{insight.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{insight.body}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-3 text-xs text-primary hover:text-primary hover:bg-primary/10 rounded-xl mt-1"
                          onClick={() => navigate(insight.action.route)}
                        >
                          {insight.action.label}
                          <ChevronLeft className="w-3 h-3 mr-1" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ─── Filter Chips ─── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'px-4 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                filter === f.key
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ─── Notification List ─── */}
        <motion.section className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((notif, i) => {
              const cfg = categoryConfig[notif.category];
              const Icon = cfg.icon;
              const isRead = readIds.has(notif.id);

              return (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => markRead(notif.id)}
                >
                  <Card className={cn(
                    'border transition-all cursor-pointer',
                    isRead
                      ? 'border-border/30 bg-card/40'
                      : 'border-border/50 bg-card shadow-sm'
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', cfg.bg)}>
                          <Icon className={cn('w-4 h-4', cfg.color)} strokeWidth={1.5} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn('text-sm font-semibold leading-snug', isRead && 'text-muted-foreground')}>
                              {notif.title}
                            </p>
                            {!isRead && (
                              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{notif.body}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {notif.time}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                'h-7 px-3 text-[11px] rounded-xl',
                                notif.category === 'sales' && 'text-emerald-600 hover:bg-emerald-500/10',
                                notif.category === 'inventory' && 'text-orange-500 hover:bg-orange-500/10',
                                notif.category === 'ai' && 'text-primary hover:bg-primary/10',
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(notif.action.route);
                              }}
                            >
                              {notif.action.label}
                              <ChevronLeft className="w-3 h-3 mr-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">אין התראות בקטגוריה זו</p>
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
};

export default SmartNotifications;
