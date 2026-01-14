import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, Package, UserPlus, ListTodo, Target, Ticket, Clock, 
  AlertTriangle, Flag, Calendar, Truck, RotateCcw, CreditCard, Download,
  Upload, Bot, ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  href: string;
  category: 'create' | 'view' | 'manage' | 'tools';
  badge?: string;
  badgeVariant?: 'default' | 'destructive' | 'secondary';
}

const quickActions: QuickAction[] = [
  // Create
  { id: 'new-order', label: 'הזמנה חדשה', icon: ShoppingCart, href: '/admin/orders?new=true', category: 'create' },
  { id: 'new-product', label: 'מוצר חדש', icon: Package, href: '/admin/products?new=true', category: 'create' },
  { id: 'new-user', label: 'משתמש חדש', icon: UserPlus, href: '/admin/users?new=true', category: 'create' },
  { id: 'new-task', label: 'משימה חדשה', icon: ListTodo, href: '/admin/tasks?new=true', category: 'create' },
  { id: 'new-lead', label: 'ליד חדש', icon: Target, href: '/admin/leads?new=true', category: 'create' },
  { id: 'new-coupon', label: 'קופון חדש', icon: Ticket, href: '/admin/coupons?new=true', category: 'create' },
  
  // View
  { id: 'pending-orders', label: 'הזמנות ממתינות', icon: Clock, href: '/admin/orders?status=pending', category: 'view' },
  { id: 'low-stock', label: 'מלאי נמוך', icon: AlertTriangle, href: '/admin/inventory?filter=low', category: 'view' },
  { id: 'pending-reports', label: 'דיווחים ממתינים', icon: Flag, href: '/admin/reports?status=pending', category: 'view' },
  { id: 'today-activity', label: 'פעילות היום', icon: Calendar, href: '/admin/audit?date=today', category: 'view' },
  
  // Manage
  { id: 'shipping', label: 'עדכון משלוחים', icon: Truck, href: '/admin/shipping', category: 'manage' },
  { id: 'returns', label: 'טיפול בהחזרות', icon: RotateCcw, href: '/admin/returns?status=pending', category: 'manage' },
  { id: 'debts', label: 'גביית חובות', icon: CreditCard, href: '/admin/debts', category: 'manage' },
  
  // Tools
  { id: 'export', label: 'ייצוא נתונים', icon: Download, href: '/admin/backup', category: 'tools' },
  { id: 'import', label: 'ייבוא נתונים', icon: Upload, href: '/admin/data-import', category: 'tools' },
  { id: 'scraper', label: 'סקראפר מוצרים', icon: Bot, href: '/admin/scraper', category: 'tools' },
];

const categoryLabels: Record<string, string> = {
  create: 'יצירה',
  view: 'צפייה',
  manage: 'ניהול',
  tools: 'כלים',
};

interface AdminQuickActionsProps {
  compact?: boolean;
  maxItems?: number;
}

export const AdminQuickActions: React.FC<AdminQuickActionsProps> = ({ 
  compact = false,
  maxItems,
}) => {
  const navigate = useNavigate();

  const displayedActions = maxItems ? quickActions.slice(0, maxItems) : quickActions;
  const groupedActions = displayedActions.reduce((acc, action) => {
    if (!acc[action.category]) acc[action.category] = [];
    acc[action.category].push(action);
    return acc;
  }, {} as Record<string, QuickAction[]>);

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {displayedActions.map(action => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              onClick={() => navigate(action.href)}
              className="gap-2"
            >
              <Icon className="w-4 h-4" />
              {action.label}
              {action.badge && (
                <Badge variant={action.badgeVariant || 'secondary'} className="text-[10px] px-1">
                  {action.badge}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">פעולות מהירות</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Object.entries(groupedActions).map(([category, actions]) => (
            <div key={category}>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">
                {categoryLabels[category]}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {actions.map(action => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.id}
                      variant="ghost"
                      onClick={() => navigate(action.href)}
                      className="justify-start gap-2 h-auto py-2 px-3"
                    >
                      <div className="p-1.5 rounded-md bg-muted">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm">{action.label}</span>
                      {action.badge && (
                        <Badge variant={action.badgeVariant || 'secondary'} className="mr-auto text-[10px]">
                          {action.badge}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
