import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityItem {
  id: string;
  type: 'order' | 'user' | 'product' | 'task' | 'system' | 'lead';
  action: 'created' | 'updated' | 'deleted' | 'completed' | 'status_changed';
  title: string;
  description?: string;
  timestamp: Date;
  userId?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

export const useActivityFeed = (limit: number = 20) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchActivities = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (data) {
        const mapped: ActivityItem[] = data.map(log => ({
          id: log.id,
          type: mapEntityType(log.entity_type),
          action: mapActionType(log.action_type),
          title: formatActivityTitle(log.entity_type, log.action_type),
          description: formatActivityDescription(log),
          timestamp: new Date(log.created_at),
          userId: log.admin_id,
          entityId: log.entity_id || undefined,
          metadata: log.metadata as Record<string, any> || undefined,
        }));
        setActivities(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchActivities();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('activity_feed')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'admin_audit_log',
      }, (payload) => {
        const newActivity: ActivityItem = {
          id: payload.new.id,
          type: mapEntityType(payload.new.entity_type),
          action: mapActionType(payload.new.action_type),
          title: formatActivityTitle(payload.new.entity_type, payload.new.action_type),
          description: formatActivityDescription(payload.new),
          timestamp: new Date(payload.new.created_at),
          userId: payload.new.admin_id,
          entityId: payload.new.entity_id,
          metadata: payload.new.metadata,
        };
        setActivities(prev => [newActivity, ...prev.slice(0, limit - 1)]);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchActivities, limit]);

  return {
    activities,
    isLoading,
    refresh: fetchActivities,
  };
};

function mapEntityType(type: string): ActivityItem['type'] {
  const mapping: Record<string, ActivityItem['type']> = {
    orders: 'order',
    users: 'user',
    products: 'product',
    tasks: 'task',
    leads: 'lead',
  };
  return mapping[type] || 'system';
}

function mapActionType(action: string): ActivityItem['action'] {
  if (action.includes('create') || action.includes('add')) return 'created';
  if (action.includes('update') || action.includes('edit')) return 'updated';
  if (action.includes('delete') || action.includes('remove')) return 'deleted';
  if (action.includes('complete')) return 'completed';
  if (action.includes('status')) return 'status_changed';
  return 'updated';
}

function formatActivityTitle(entityType: string, actionType: string): string {
  const entityNames: Record<string, string> = {
    orders: 'הזמנה',
    users: 'משתמש',
    products: 'מוצר',
    tasks: 'משימה',
    leads: 'ליד',
  };
  const actionNames: Record<string, string> = {
    create: 'נוצר/ה',
    update: 'עודכן/ה',
    delete: 'נמחק/ה',
    status_change: 'סטטוס שונה',
  };

  const entity = entityNames[entityType] || entityType;
  const action = Object.entries(actionNames).find(([key]) => actionType.includes(key))?.[1] || actionType;
  
  return `${entity} ${action}`;
}

function formatActivityDescription(log: any): string {
  if (log.metadata?.description) return log.metadata.description;
  if (log.new_values) return `שינויים: ${JSON.stringify(log.new_values).slice(0, 100)}`;
  return '';
}
