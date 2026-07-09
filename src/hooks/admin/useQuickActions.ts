import { useState, useCallback, useMemo } from 'react';

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: () => void | Promise<void>;
  shortcut?: string;
  category: 'create' | 'view' | 'manage' | 'tools';
}

export const useQuickActions = (navigate: (path: string) => void) => {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const executeAction = useCallback(async (action: QuickAction) => {
    setIsLoading(action.id);
    try {
      await action.action();
    } finally {
      setIsLoading(null);
    }
  }, []);

  const actions: QuickAction[] = useMemo(() => [
    // Create actions
    { id: 'new-product', label: 'מוצר חדש', icon: 'Package', action: () => navigate('/admin/products?new=true'), category: 'create' },
    { id: 'new-coupon', label: 'קופון חדש', icon: 'Ticket', action: () => navigate('/admin/coupons?new=true'), category: 'create' },
    
    // View actions
    { id: 'view-orders', label: 'הזמנות', icon: 'ShoppingCart', action: () => navigate('/admin/orders'), category: 'view' },
    { id: 'view-pending-orders', label: 'הזמנות ממתינות', icon: 'Clock', action: () => navigate('/admin/orders?status=pending'), category: 'view' },
    { id: 'view-products-review', label: 'מוצרים לבדיקה', icon: 'PackageSearch', action: () => navigate('/admin/products?filter=needs_review'), category: 'view' },
    { id: 'view-analytics', label: 'אנליטיקות', icon: 'BarChart3', action: () => navigate('/admin/analytics'), category: 'view' },
    
    // Manage actions
    { id: 'manage-categories', label: 'קטגוריות', icon: 'FolderTree', action: () => navigate('/admin/categories'), category: 'manage' },
    { id: 'manage-settings', label: 'הגדרות', icon: 'Settings', action: () => navigate('/admin/settings'), category: 'manage' },
    
    // Tools
    { id: 'import-data', label: 'ייבוא מהיר', icon: 'Upload', action: () => navigate('/admin/quick-import'), category: 'tools' },
    { id: 'smart-editor', label: 'עורך חכם', icon: 'Sparkles', action: () => navigate('/admin/smart-editor'), category: 'tools' },
  ], [navigate]);

  const getActionsByCategory = useCallback((category: QuickAction['category']) => {
    return actions.filter(a => a.category === category);
  }, [actions]);

  return {
    actions,
    executeAction,
    isLoading,
    getActionsByCategory,
  };
};
