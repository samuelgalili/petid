/**
 * CRMBehavioralJourney — Behavioral timeline for a CRM customer card.
 * Fetches user_activity_logs with realtime subscription.
 */
import { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, MousePointerClick, ShoppingCart, LogOut, Clock, Sparkles, ArrowDownToLine } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  userId: string;
}

interface ActivityLog {
  id: string;
  event_type: string;
  route: string;
  time_spent_seconds: number | null;
  scroll_depth: number | null;
  element_id: string | null;
  element_label: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

const eventStyle: Record<string, { icon: typeof Eye; label: string; bg: string; text: string; line: string }> = {
  page_view: { icon: Eye, label: 'צפייה', bg: 'bg-sky-100', text: 'text-sky-600', line: 'border-sky-300' },
  click:     { icon: MousePointerClick, label: 'לחיצה', bg: 'bg-emerald-100', text: 'text-emerald-600', line: 'border-emerald-300' },
  scroll:    { icon: ArrowDownToLine, label: 'גלילה', bg: 'bg-violet-100', text: 'text-violet-600', line: 'border-violet-300' },
  exit:      { icon: LogOut, label: 'יציאה', bg: 'bg-amber-100', text: 'text-amber-600', line: 'border-amber-400' },
  stay:      { icon: Clock, label: 'שהייה', bg: 'bg-sky-100', text: 'text-sky-600', line: 'border-sky-300' },
};

function formatDwell(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function isCartRoute(route: string): boolean {
  return route.includes('/cart') || route.includes('/checkout') || route.includes('/shop');
}

function getEventCategory(log: ActivityLog): string {
  if (log.event_type === 'exit') return 'exit';
  if (log.event_type === 'click' && isCartRoute(log.route)) return 'cart';
  if (log.event_type === 'click') return 'click';
  return 'page_view';
}

function generateInsights(logs: ActivityLog[]): string {
  if (logs.length === 0) return 'אין מספיק נתונים לניתוח.';

  const routes = logs.filter(l => l.event_type === 'page_view');
  const clicks = logs.filter(l => l.event_type === 'click');
  const exits = logs.filter(l => l.event_type === 'exit');
  const shopViews = routes.filter(l => l.route.includes('/shop'));
  const feedViews = routes.filter(l => l.route === '/' || l.route === '/feed');
  const avgDwell = routes.reduce((s, l) => s + (l.time_spent_seconds || 0), 0) / (routes.length || 1);

  const parts: string[] = [];
  if (shopViews.length > 3) parts.push('עניין גבוה בחנות');
  if (feedViews.length > 5) parts.push('צריכת תוכן פעילה בפיד');
  if (clicks.length > 5) parts.push('אינטראקציה גבוהה — לחיצות תכופות');
  if (avgDwell > 120) parts.push(`זמן שהייה ממוצע גבוה (${formatDwell(Math.round(avgDwell))})`);
  if (exits.length > 2) parts.push(`${exits.length} נקודות יציאה — בדוק חיכוך`);
  if (parts.length === 0) parts.push('פעילות סטנדרטית — אין אותות חריגים');

  return parts.join(' · ');
}

export const CRMBehavioralJourney: React.FC<Props> = ({ userId }) => {
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['crm-behavioral-journey', userId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as ActivityLog[];
    },
    enabled: !!userId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`crm-journey-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'user_activity_logs',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['crm-behavioral-journey', userId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, queryClient]);

  const insights = useMemo(() => generateInsights(logs.slice(0, 10)), [logs]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-2 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI Insights Box */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.5} />
            <span className="text-xs font-semibold text-primary">AI Behavioral Insights</span>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">{insights}</p>
        </CardContent>
      </Card>

      {/* Timeline */}
      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">אין נתוני פעילות למשתמש זה</p>
      ) : (
        <ScrollArea className="h-[420px]">
          <div className="relative pr-6 pl-2 py-2">
            {/* Vertical line */}
            <div className="absolute right-[14px] top-0 bottom-0 w-[2px] bg-border/50" />

            {logs.map((log, i) => {
              const cat = getEventCategory(log);
              const style = cat === 'cart'
                ? { icon: ShoppingCart, label: 'סל קניות', bg: 'bg-emerald-100', text: 'text-emerald-600', line: 'border-emerald-300' }
                : eventStyle[log.event_type] || eventStyle.page_view;
              const Icon = style.icon;
              const isExit = log.event_type === 'exit';

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  className={cn(
                    "relative flex items-start gap-3 mb-3 py-2 px-2 rounded-xl transition-colors",
                    isExit && "bg-amber-50 dark:bg-amber-500/5"
                  )}
                >
                  {/* Dot */}
                  <div className={cn("relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0", style.bg)}>
                    <Icon className={cn("w-3.5 h-3.5", style.text)} strokeWidth={1.5} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-foreground">{log.route}</span>
                      <Badge variant="outline" className="text-[9px] h-4 px-1.5">{style.label}</Badge>
                      {isExit && <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-amber-100 text-amber-700 border-amber-300">נטישה</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                      {log.time_spent_seconds != null && log.time_spent_seconds > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          שהה {formatDwell(log.time_spent_seconds)}
                        </span>
                      )}
                      {log.scroll_depth != null && log.scroll_depth > 0 && (
                        <span>↓ {log.scroll_depth}%</span>
                      )}
                      {log.element_label && <span>🖱 {log.element_label}</span>}
                      <span>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: he })}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
