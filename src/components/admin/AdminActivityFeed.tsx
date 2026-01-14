import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, ShoppingCart, User, Package, ListTodo, Target, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActivityFeed, ActivityItem } from '@/hooks/admin/useActivityFeed';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

const typeIcons: Record<ActivityItem['type'], React.ComponentType<any>> = {
  order: ShoppingCart,
  user: User,
  product: Package,
  task: ListTodo,
  lead: Target,
  system: Settings,
};

const typeColors: Record<ActivityItem['type'], string> = {
  order: 'text-green-500 bg-green-500/10',
  user: 'text-blue-500 bg-blue-500/10',
  product: 'text-purple-500 bg-purple-500/10',
  task: 'text-yellow-500 bg-yellow-500/10',
  lead: 'text-orange-500 bg-orange-500/10',
  system: 'text-muted-foreground bg-muted',
};

const actionLabels: Record<ActivityItem['action'], string> = {
  created: 'נוצר',
  updated: 'עודכן',
  deleted: 'נמחק',
  completed: 'הושלם',
  status_changed: 'סטטוס שונה',
};

interface AdminActivityFeedProps {
  limit?: number;
  compact?: boolean;
}

export const AdminActivityFeed: React.FC<AdminActivityFeedProps> = ({ 
  limit = 10,
  compact = false,
}) => {
  const navigate = useNavigate();
  const { activities, isLoading, refresh } = useActivityFeed(limit);

  if (isLoading && activities.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4" />
            פעילות אחרונה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-muted" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4" />
          פעילות אחרונה
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className={cn("pr-3", compact ? "max-h-[200px]" : "max-h-[400px]")}>
          <div className="space-y-3">
            {activities.map(activity => {
              const Icon = typeIcons[activity.type];
              
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 group cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-2 rounded-lg transition-colors"
                >
                  <div className={cn("p-2 rounded-lg shrink-0", typeColors[activity.type])}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    {activity.description && !compact && (
                      <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">
                        {actionLabels[activity.action]}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(activity.timestamp, { addSuffix: true, locale: he })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {activities.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                אין פעילות להצגה
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
