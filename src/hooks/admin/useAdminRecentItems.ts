import { useState, useEffect, useCallback } from 'react';

export interface RecentItem {
  id: string;
  type: 'page' | 'user' | 'order' | 'product' | 'task';
  title: string;
  href: string;
  timestamp: number;
}

const STORAGE_KEY = 'admin_recent_items';
const MAX_ITEMS = 10;

export const useAdminRecentItems = () => {
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setRecentItems(JSON.parse(stored));
      } catch {
        setRecentItems([]);
      }
    }
  }, []);

  const saveItems = useCallback((items: RecentItem[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    setRecentItems(items);
  }, []);

  const addRecentItem = useCallback((item: Omit<RecentItem, 'timestamp'>) => {
    const newItem: RecentItem = { ...item, timestamp: Date.now() };
    const filtered = recentItems.filter(r => r.id !== item.id);
    const updated = [newItem, ...filtered].slice(0, MAX_ITEMS);
    saveItems(updated);
  }, [recentItems, saveItems]);

  const clearRecentItems = useCallback(() => {
    saveItems([]);
  }, [saveItems]);

  return {
    recentItems,
    addRecentItem,
    clearRecentItems,
  };
};
