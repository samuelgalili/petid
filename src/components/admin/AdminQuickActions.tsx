import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3,
  Clock,
  FolderTree,
  Package,
  PackageSearch,
  Settings,
  ShoppingCart,
  Sparkles,
  Ticket,
  Upload
} from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  category: 'create' | 'view' | 'manage' | 'tools';
  badge?: string;
  badgeVariant?: 'default' | 'destructive' | 'secondary';
}

const quickActions: QuickAction[] = [
  // Create
  { id: 'new-product', label: 'מוצר חדש', icon: Package, href: '/admin/products?new=true', category: 'create' },
  { id: 'new-coupon', label: 'קופון חדש', icon: Ticket, href: '/admin/coupons?new=true', category: 'create' },
  
  // View
  { id: 'orders', label: 'הזמנות', icon: ShoppingCart, href: '/admin/orders', category: 'view' },
  { id: 'pending-orders', label: 'הזמנות ממתינות', icon: Clock, href: '/admin/orders?status=pending', category: 'view' },
  { id: 'products-review', label: 'מוצרים לבדיקה', icon: PackageSearch, href: '/admin/products?filter=needs_review', category: 'view' },
  { id: 'analytics', label: 'אנליטיקות', icon: BarChart3, href: '/admin/analytics', category: 'view' },
  
  // Manage
  { id: 'categories', label: 'קטגוריות', icon: FolderTree, href: '/admin/categories', category: 'manage' },
  { id: 'settings', label: 'הגדרות', icon: Settings, href: '/admin/settings', category: 'manage' },
  
  // Tools
  { id: 'import', label: 'ייבוא מהיר', icon: Upload, href: '/admin/quick-import', category: 'tools' },
  { id: 'smart-editor', label: 'עורך חכם', icon: Sparkles, href: '/admin/smart-editor', category: 'tools' },
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
