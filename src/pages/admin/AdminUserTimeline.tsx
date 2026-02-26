import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Eye, MousePointerClick, ArrowDownToLine, LogOut, Clock,
  Search, User, ChevronDown, Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

interface ActivityLog {
  id: string;
  user_id: string;
  session_id: string;
  event_type: 'page_view' | 'click' | 'scroll' | 'exit' | 'stay';
  route: string;
  route_label: string | null;
  time_spent_seconds: number | null;
  scroll_depth: number | null;
  element_id: string | null;
  element_label: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const eventConfig: Record<string, { icon: typeof Eye; label: string; color: string }> = {
  page_view: { icon: Eye, label: 'צפייה', color: 'text-blue-500 bg-blue-500/10' },
  click: { icon: MousePointerClick, label: 'לחיצה', color: 'text-emerald-500 bg-emerald-500/10' },
  scroll: { icon: ArrowDownToLine, label: 'גלילה', color: 'text-purple-500 bg-purple-500/10' },
  exit: { icon: LogOut, label: 'יציאה', color: 'text-red-500 bg-red-500/10' },
  stay: { icon: Clock, label: 'שהייה', color: 'text-yellow-500 bg-yellow-500/10' },
};

export default function AdminUserTimeline() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<{ id: string; email?: string }[]>([]);
  const [filterType, setFilterType] = useState<string>('all');

  // Fetch distinct users who have activity
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from('user_activity_logs')
        .select('user_id')
        .order('created_at', { ascending: false })
        .limit(500);
      if (data) {
        const unique = [...new Set(data.map((d: any) => d.user_id))] as string[];
        setUsers(unique.map(id => ({ id })));
      }
    })();
  }, []);

  // Fetch logs for selected user
  useEffect(() => {
    if (!selectedUserId) { setLogs([]); return; }
    setLoading(true);
    (async () => {
      let q = (supabase as any)
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', selectedUserId)
        .order('created_at', { ascending: false })
        .limit(200);
      const { data } = await q;
      setLogs(data || []);
      setLoading(false);
    })();
  }, [selectedUserId]);

  const filteredLogs = filterType === 'all' ? logs : logs.filter(l => l.event_type === filterType);

  // Identify drop-off routes (pages with exit events)
  const exitRoutes = new Set(logs.filter(l => l.event_type === 'exit').map(l => l.route));

  const filteredUsers = users.filter(u =>
    u.id.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="w-6 h-6 text-primary" strokeWidth={1.5} />
          User Activity Timeline
        </h1>
        <p className="text-muted-foreground text-sm mt-1">מעקב מסע משתמש כרונולוגי — זיהוי נקודות חיכוך ונטישה</p>
      </div>

      {/* User selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">חיפוש משתמש</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="הקלד User ID..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="pr-9"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]">
                <Filter className="w-3 h-3 ml-1" />
                <SelectValue placeholder="סוג אירוע" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="page_view">צפייה</SelectItem>
                <SelectItem value="click">לחיצה</SelectItem>
                <SelectItem value="scroll">גלילה</SelectItem>
                <SelectItem value="exit">יציאה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User chips */}
          {filteredUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {filteredUsers.slice(0, 20).map(u => (
                <Button
                  key={u.id}
                  variant={selectedUserId === u.id ? 'default' : 'outline'}
                  size="sm"
                  className="text-[10px] h-7 rounded-full"
                  onClick={() => setSelectedUserId(u.id)}
                >
                  {u.id.slice(0, 8)}...
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drop-off warning */}
      {exitRoutes.size > 0 && selectedUserId && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <LogOut className="w-4 h-4 text-red-500" strokeWidth={1.5} />
              <span className="text-sm font-semibold text-red-600">נקודות נטישה (Retention Signals)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[...exitRoutes].map(route => (
                <Badge key={route} variant="destructive" className="text-[10px]">
                  {route}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : selectedUserId && filteredLogs.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">ציר זמן — {filteredLogs.length} אירועים</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="relative pr-8 pl-4 py-4">
                {/* Vertical timeline line */}
                <div className="absolute right-[22px] top-0 bottom-0 w-[2px] bg-border/60" />

                {filteredLogs.map((log, i) => {
                  const cfg = eventConfig[log.event_type] || eventConfig.page_view;
                  const Icon = cfg.icon;
                  const isExit = log.event_type === 'exit';
                  const isDropOff = exitRoutes.has(log.route);

                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.5) }}
                      className={cn(
                        "relative flex items-start gap-3 mb-4 group",
                        isExit && "bg-red-500/5 -mx-4 px-4 py-2 rounded-xl"
                      )}
                    >
                      {/* Timeline dot */}
                      <div className={cn(
                        "relative z-10 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                        cfg.color,
                        isExit ? 'border-red-500/30' : 'border-transparent'
                      )}>
                        <Icon className="w-4 h-4" strokeWidth={1.5} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{log.route}</span>
                          <Badge variant="outline" className="text-[10px]">{cfg.label}</Badge>
                          {isDropOff && !isExit && (
                            <Badge variant="destructive" className="text-[9px]">חיכוך</Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                          {log.time_spent_seconds != null && log.time_spent_seconds > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />{log.time_spent_seconds}s
                            </span>
                          )}
                          {log.scroll_depth != null && log.scroll_depth > 0 && (
                            <span className="flex items-center gap-1">
                              <ArrowDownToLine className="w-3 h-3" />{log.scroll_depth}%
                            </span>
                          )}
                          {log.element_label && (
                            <span>🖱 {log.element_label}</span>
                          )}
                          <span>
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: he })}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : selectedUserId ? (
        <div className="text-center py-12 text-muted-foreground text-sm">אין אירועים למשתמש זה</div>
      ) : (
        <div className="text-center py-12 text-muted-foreground text-sm">בחר משתמש כדי לצפות בציר הזמן</div>
      )}
    </div>
  );
}
