import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  unit: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  deadline?: Date;
  category: 'revenue' | 'orders' | 'users' | 'leads' | 'custom';
}

const STORAGE_KEY = 'admin_goals';

export const useAdminGoals = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);

  useEffect(() => {
    loadGoals();
  }, [user?.id]);

  const loadGoals = useCallback(async () => {
    // Try to load from localStorage first
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setGoals(parsed.map((g: any) => ({
          ...g,
          deadline: g.deadline ? new Date(g.deadline) : undefined,
        })));
      } catch {
        setGoals([]);
      }
    }

    // Fetch current values from database
    await updateGoalProgress();
  }, []);

  const updateGoalProgress = useCallback(async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const [ordersRes, usersRes, leadsRes] = await Promise.all([
      supabase.from('orders').select('id, total').gte('created_at', startOfMonth.toISOString()),
      supabase.from('profiles').select('id').gte('created_at', startOfMonth.toISOString()),
      supabase.from('leads').select('id').gte('created_at', startOfMonth.toISOString()),
    ]);

    const revenue = (ordersRes.data || []).reduce((sum, o) => sum + (parseFloat(o.total?.toString() || '0')), 0);
    const ordersCount = ordersRes.data?.length || 0;
    const usersCount = usersRes.data?.length || 0;
    const leadsCount = leadsRes.data?.length || 0;

    setGoals(prev => prev.map(goal => {
      switch (goal.category) {
        case 'revenue':
          return { ...goal, current: revenue };
        case 'orders':
          return { ...goal, current: ordersCount };
        case 'users':
          return { ...goal, current: usersCount };
        case 'leads':
          return { ...goal, current: leadsCount };
        default:
          return goal;
      }
    }));
  }, []);

  const saveGoals = useCallback((newGoals: Goal[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newGoals));
    setGoals(newGoals);
  }, []);

  const addGoal = useCallback((goal: Omit<Goal, 'id'>) => {
    const newGoal: Goal = {
      ...goal,
      id: `goal_${Date.now()}`,
    };
    saveGoals([...goals, newGoal]);
  }, [goals, saveGoals]);

  const updateGoal = useCallback((id: string, updates: Partial<Goal>) => {
    saveGoals(goals.map(g => g.id === id ? { ...g, ...updates } : g));
  }, [goals, saveGoals]);

  const removeGoal = useCallback((id: string) => {
    saveGoals(goals.filter(g => g.id !== id));
  }, [goals, saveGoals]);

  const getProgress = useCallback((goal: Goal) => {
    return Math.min(100, (goal.current / goal.target) * 100);
  }, []);

  return {
    goals,
    addGoal,
    updateGoal,
    removeGoal,
    getProgress,
    updateGoalProgress,
  };
};
