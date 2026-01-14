import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface WidgetConfig {
  id: string;
  type: string;
  title: string;
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  visible: boolean;
  settings?: Record<string, any>;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'revenue', type: 'stat', title: 'הכנסות', size: 'small', position: { x: 0, y: 0 }, visible: true },
  { id: 'orders', type: 'stat', title: 'הזמנות', size: 'small', position: { x: 1, y: 0 }, visible: true },
  { id: 'users', type: 'stat', title: 'משתמשים', size: 'small', position: { x: 2, y: 0 }, visible: true },
  { id: 'pending', type: 'stat', title: 'ממתינים', size: 'small', position: { x: 3, y: 0 }, visible: true },
  { id: 'chart', type: 'chart', title: 'גרף מכירות', size: 'large', position: { x: 0, y: 1 }, visible: true },
  { id: 'activity', type: 'activity', title: 'פעילות אחרונה', size: 'medium', position: { x: 2, y: 1 }, visible: true },
  { id: 'calendar', type: 'calendar', title: 'יומן', size: 'medium', position: { x: 0, y: 2 }, visible: true },
  { id: 'tasks', type: 'tasks', title: 'משימות', size: 'medium', position: { x: 2, y: 2 }, visible: true },
  { id: 'goals', type: 'goals', title: 'יעדים', size: 'medium', position: { x: 0, y: 3 }, visible: true },
  { id: 'notes', type: 'notes', title: 'הערות', size: 'medium', position: { x: 2, y: 3 }, visible: true },
];

const STORAGE_KEY = 'admin_dashboard_widgets';

export const useAdminWidgets = () => {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadWidgets();
  }, [user?.id]);

  const loadWidgets = useCallback(async () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setWidgets(JSON.parse(stored));
      } catch {
        setWidgets(DEFAULT_WIDGETS);
      }
    }
  }, []);

  const saveWidgets = useCallback((newWidgets: WidgetConfig[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newWidgets));
    setWidgets(newWidgets);
  }, []);

  const updateWidget = useCallback((id: string, updates: Partial<WidgetConfig>) => {
    const updated = widgets.map(w => w.id === id ? { ...w, ...updates } : w);
    saveWidgets(updated);
  }, [widgets, saveWidgets]);

  const toggleWidgetVisibility = useCallback((id: string) => {
    updateWidget(id, { visible: !widgets.find(w => w.id === id)?.visible });
  }, [widgets, updateWidget]);

  const moveWidget = useCallback((id: string, position: { x: number; y: number }) => {
    updateWidget(id, { position });
  }, [updateWidget]);

  const resetWidgets = useCallback(() => {
    saveWidgets(DEFAULT_WIDGETS);
  }, [saveWidgets]);

  const addWidget = useCallback((widget: Omit<WidgetConfig, 'id' | 'position'>) => {
    const newWidget: WidgetConfig = {
      ...widget,
      id: `widget_${Date.now()}`,
      position: { x: 0, y: widgets.length },
    };
    saveWidgets([...widgets, newWidget]);
  }, [widgets, saveWidgets]);

  const removeWidget = useCallback((id: string) => {
    saveWidgets(widgets.filter(w => w.id !== id));
  }, [widgets, saveWidgets]);

  return {
    widgets,
    isEditing,
    setIsEditing,
    updateWidget,
    toggleWidgetVisibility,
    moveWidget,
    resetWidgets,
    addWidget,
    removeWidget,
    visibleWidgets: widgets.filter(w => w.visible),
  };
};
