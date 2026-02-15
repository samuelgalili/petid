import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export interface SearchResult {
  id: string;
  type: 'page' | 'user' | 'order' | 'product' | 'lead' | 'task';
  title: string;
  subtitle?: string;
  href: string;
  icon?: string;
}

const adminPages: SearchResult[] = [
  { id: 'dashboard', type: 'page', title: 'דשבורד', href: '/admin/dashboard', icon: 'LayoutDashboard' },
  { id: 'control-room', type: 'page', title: 'AI Control Room', href: '/admin/control-room', icon: 'Crown' },
  { id: 'analytics', type: 'page', title: 'אנליטיקות', href: '/admin/analytics', icon: 'BarChart3' },
  { id: 'financial', type: 'page', title: 'כספים', href: '/admin/financial', icon: 'Wallet' },
  { id: 'tasks', type: 'page', title: 'משימות', href: '/admin/tasks', icon: 'ListTodo' },
  { id: 'automations', type: 'page', title: 'אוטומציות', href: '/admin/automations', icon: 'Zap' },
  { id: 'time-tracking', type: 'page', title: 'מעקב שעות', href: '/admin/time-tracking', icon: 'Clock' },
  { id: 'calendar', type: 'page', title: 'יומן', href: '/admin/calendar', icon: 'CalendarDays' },
  { id: 'ai-service', type: 'page', title: 'שירות AI', href: '/admin/ai-service', icon: 'Bot' },
  { id: 'crm', type: 'page', title: 'CRM', href: '/admin/crm', icon: 'Contact' },
  
  { id: 'helpdesk', type: 'page', title: 'תמיכה', href: '/admin/helpdesk', icon: 'Headphones' },
  { id: 'leads', type: 'page', title: 'לידים', href: '/admin/leads', icon: 'UserPlus' },
  { id: 'debts', type: 'page', title: 'חובות לקוחות', href: '/admin/debts', icon: 'CreditCard' },
  { id: 'segments', type: 'page', title: 'פילוח לקוחות', href: '/admin/segments', icon: 'Users2' },
  { id: 'suppliers', type: 'page', title: 'ספקים', href: '/admin/suppliers', icon: 'Truck' },
  { id: 'purchase-orders', type: 'page', title: 'הזמנות רכש', href: '/admin/purchase-orders', icon: 'ShoppingCart' },
  { id: 'inventory', type: 'page', title: 'מלאי', href: '/admin/inventory', icon: 'Boxes' },
  { id: 'invoices', type: 'page', title: 'חשבוניות', href: '/admin/invoices', icon: 'Receipt' },
  { id: 'users', type: 'page', title: 'משתמשים וצוות', href: '/admin/users', icon: 'Users' },
  { id: 'roles', type: 'page', title: 'תפקידים והרשאות', href: '/admin/roles', icon: 'Shield' },
  { id: 'stories', type: 'page', title: 'סטוריז', href: '/admin/stories', icon: 'PlaySquare' },
  { id: 'blog', type: 'page', title: 'בלוג', href: '/admin/blog', icon: 'FileText' },
  { id: 'reports', type: 'page', title: 'דיווחים', href: '/admin/reports', icon: 'Flag' },
  { id: 'adoption', type: 'page', title: 'אימוץ', href: '/admin/adoption', icon: 'Heart' },
  { id: 'parks', type: 'page', title: 'פארקים', href: '/admin/parks', icon: 'MapPin' },
  { id: 'business', type: 'page', title: 'עסקים', href: '/admin/business', icon: 'Store' },
  { id: 'branches', type: 'page', title: 'סניפים', href: '/admin/branches', icon: 'Building2' },
  { id: 'products', type: 'page', title: 'מוצרים', href: '/admin/products', icon: 'Package' },
  { id: 'categories', type: 'page', title: 'קטגוריות', href: '/admin/categories', icon: 'FolderTree' },
  { id: 'pricing', type: 'page', title: 'תמחור', href: '/admin/pricing', icon: 'DollarSign' },
  { id: 'coupons', type: 'page', title: 'קופונים', href: '/admin/coupons', icon: 'Ticket' },
  { id: 'orders', type: 'page', title: 'הזמנות', href: '/admin/orders', icon: 'ShoppingCart' },
  { id: 'shipping', type: 'page', title: 'משלוחים', href: '/admin/shipping', icon: 'Truck' },
  { id: 'returns', type: 'page', title: 'החזרות', href: '/admin/returns', icon: 'RotateCcw' },
  { id: 'marketing', type: 'page', title: 'שיווק', href: '/admin/marketing', icon: 'Megaphone' },
  { id: 'scraper', type: 'page', title: 'סקראפר מוצרים', href: '/admin/scraper', icon: 'Bot' },
  { id: 'data-import', type: 'page', title: 'ייבוא נתונים', href: '/admin/data-import', icon: 'Upload' },
  { id: 'integrations', type: 'page', title: 'אינטגרציות', href: '/admin/integrations', icon: 'Plug' },
  { id: 'webhooks', type: 'page', title: 'Webhooks & API', href: '/admin/webhooks', icon: 'Webhook' },
  { id: 'notification-rules', type: 'page', title: 'כללי התראות', href: '/admin/notification-rules', icon: 'Bell' },
  { id: 'audit', type: 'page', title: 'לוג פעילות', href: '/admin/audit', icon: 'History' },
  { id: 'backup', type: 'page', title: 'גיבוי וייצוא', href: '/admin/backup', icon: 'HardDrive' },
  { id: 'settings', type: 'page', title: 'הגדרות', href: '/admin/settings', icon: 'Settings' },
];

export const useAdminSearch = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Keyboard shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const search = useCallback(async (searchQuery: string) => {
    setQuery(searchQuery);
    setSelectedIndex(0);
    
    if (!searchQuery.trim()) {
      setResults(adminPages.slice(0, 8));
      return;
    }

    setIsLoading(true);
    
    try {
      // Filter pages
      const pageResults = adminPages.filter(page => 
        page.title.toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Search in database entities
      const [usersRes, ordersRes, productsRes, leadsRes, tasksRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email').ilike('full_name', `%${searchQuery}%`).limit(3),
        supabase.from('orders').select('id, order_number, status').ilike('order_number', `%${searchQuery}%`).limit(3),
        supabase.from('business_products').select('id, name, sku').ilike('name', `%${searchQuery}%`).limit(3),
        supabase.from('leads').select('id, name, email').ilike('name', `%${searchQuery}%`).limit(3),
        supabase.from('admin_tasks').select('id, title, status').ilike('title', `%${searchQuery}%`).limit(3),
      ]);

      const userResults: SearchResult[] = (usersRes.data || []).map(u => ({
        id: u.id,
        type: 'user' as const,
        title: u.full_name || 'משתמש',
        subtitle: u.email,
        href: `/admin/users?id=${u.id}`,
      }));

      const orderResults: SearchResult[] = (ordersRes.data || []).map(o => ({
        id: o.id,
        type: 'order' as const,
        title: `הזמנה #${o.order_number}`,
        subtitle: o.status,
        href: `/admin/orders?id=${o.id}`,
      }));

      const productResults: SearchResult[] = (productsRes.data || []).map(p => ({
        id: p.id,
        type: 'product' as const,
        title: p.name,
        subtitle: p.sku,
        href: `/admin/products?id=${p.id}`,
      }));

      const leadResults: SearchResult[] = (leadsRes.data || []).map(l => ({
        id: l.id,
        type: 'lead' as const,
        title: l.name,
        subtitle: l.email,
        href: `/admin/leads?id=${l.id}`,
      }));

      const taskResults: SearchResult[] = (tasksRes.data || []).map(t => ({
        id: t.id,
        type: 'task' as const,
        title: t.title,
        subtitle: t.status,
        href: `/admin/tasks?id=${t.id}`,
      }));

      setResults([
        ...pageResults.slice(0, 5),
        ...userResults,
        ...orderResults,
        ...productResults,
        ...leadResults,
        ...taskResults,
      ]);
    } catch (error) {
      console.error('Search error:', error);
      setResults(adminPages.filter(p => p.title.includes(searchQuery)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectResult = useCallback((result: SearchResult) => {
    navigate(result.href);
    setIsOpen(false);
    setQuery('');
  }, [navigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      selectResult(results[selectedIndex]);
    }
  }, [results, selectedIndex, selectResult]);

  return {
    isOpen,
    setIsOpen,
    query,
    search,
    results,
    isLoading,
    selectedIndex,
    selectResult,
    handleKeyDown,
  };
};
