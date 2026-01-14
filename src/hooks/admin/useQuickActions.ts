import { useState, useCallback } from 'react';

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

  const actions: QuickAction[] = [
    // Create actions
    { id: 'new-order', label: 'הזמנה חדשה', icon: 'ShoppingCart', action: () => navigate('/admin/orders?new=true'), category: 'create' },
    { id: 'new-product', label: 'מוצר חדש', icon: 'Package', action: () => navigate('/admin/products?new=true'), category: 'create' },
    { id: 'new-user', label: 'משתמש חדש', icon: 'UserPlus', action: () => navigate('/admin/users?new=true'), category: 'create' },
    { id: 'new-task', label: 'משימה חדשה', icon: 'ListTodo', action: () => navigate('/admin/tasks?new=true'), category: 'create' },
    { id: 'new-lead', label: 'ליד חדש', icon: 'Target', action: () => navigate('/admin/leads?new=true'), category: 'create' },
    { id: 'new-coupon', label: 'קופון חדש', icon: 'Ticket', action: () => navigate('/admin/coupons?new=true'), category: 'create' },
    
    // View actions
    { id: 'view-orders', label: 'הזמנות ממתינות', icon: 'Clock', action: () => navigate('/admin/orders?status=pending'), category: 'view' },
    { id: 'view-low-stock', label: 'מלאי נמוך', icon: 'AlertTriangle', action: () => navigate('/admin/inventory?filter=low'), category: 'view' },
    { id: 'view-reports', label: 'דיווחים ממתינים', icon: 'Flag', action: () => navigate('/admin/reports?status=pending'), category: 'view' },
    { id: 'view-today', label: 'פעילות היום', icon: 'Calendar', action: () => navigate('/admin/audit?date=today'), category: 'view' },
    
    // Manage actions
    { id: 'manage-shipping', label: 'עדכון משלוחים', icon: 'Truck', action: () => navigate('/admin/shipping'), category: 'manage' },
    { id: 'manage-returns', label: 'טיפול בהחזרות', icon: 'RotateCcw', action: () => navigate('/admin/returns?status=pending'), category: 'manage' },
    { id: 'manage-debts', label: 'גביית חובות', icon: 'CreditCard', action: () => navigate('/admin/debts'), category: 'manage' },
    
    // Tools
    { id: 'export-data', label: 'ייצוא נתונים', icon: 'Download', action: () => navigate('/admin/backup'), category: 'tools' },
    { id: 'import-data', label: 'ייבוא נתונים', icon: 'Upload', action: () => navigate('/admin/data-import'), category: 'tools' },
    { id: 'scraper', label: 'סקראפר מוצרים', icon: 'Bot', action: () => navigate('/admin/scraper'), category: 'tools' },
  ];

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
