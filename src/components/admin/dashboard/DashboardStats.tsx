import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Package, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: {
    text: string;
    variant?: 'success' | 'warning' | 'default';
  };
  icon?: React.ReactNode;
  trend?: {
    value: string;
    direction: 'up' | 'down';
  };
  showThisMonth?: boolean;
}

export const DashboardStatsCard = ({ 
  title, 
  value, 
  subtitle, 
  badge, 
  icon,
  trend,
  showThisMonth
}: StatsCardProps) => {
  return (
    <Card className="border-slate-200 bg-white">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-3">
              <p className="text-3xl font-bold tracking-tight">{value}</p>
              {subtitle && (
                <div className="flex items-center gap-1.5">
                  {icon && <span className="text-sky-500">{icon}</span>}
                  <span className="text-lg text-muted-foreground">{subtitle}</span>
                </div>
              )}
            </div>
          </div>
          {badge && (
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs font-medium",
                badge.variant === 'success' && "bg-emerald-100 text-emerald-700",
                badge.variant === 'warning' && "bg-amber-100 text-amber-700",
                badge.variant === 'default' && "bg-slate-100 text-slate-700"
              )}
            >
              {badge.text}
            </Badge>
          )}
        </div>
        {(trend || showThisMonth) && (
          <div className="flex items-center gap-2 mt-2">
            {trend && (
              <span className={cn(
                "text-sm font-medium flex items-center gap-1",
                trend.direction === 'up' ? "text-emerald-600" : "text-red-600"
              )}>
                <TrendingUp className={cn("w-3.5 h-3.5", trend.direction === 'down' && "rotate-180")} />
                {trend.value}
              </span>
            )}
            {trend && <span className="text-sm text-muted-foreground">vo last month</span>}
            {showThisMonth && (
              <Badge variant="outline" className="text-xs font-normal">This Month</Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface DashboardStatsProps {
  totalProducts: number;
  discountedProducts: number;
  totalRevenue: number;
  revenueChange: number;
}

export const DashboardStats = ({ 
  totalProducts, 
  discountedProducts, 
  totalRevenue,
  revenueChange 
}: DashboardStatsProps) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <DashboardStatsCard
        title="Total Products"
        value={totalProducts.toLocaleString()}
        subtitle={discountedProducts.toString()}
        icon={<Coins className="w-4 h-4" />}
        badge={{ text: `Discounted ${discountedProducts}`, variant: 'default' }}
      />
      <DashboardStatsCard
        title="Sales Tactic"
        value={`$${(totalRevenue / 1000).toFixed(0).toLocaleString()}`}
        trend={{ 
          value: `${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(0)}%`, 
          direction: revenueChange >= 0 ? 'up' : 'down' 
        }}
        showThisMonth
      />
    </div>
  );
};
