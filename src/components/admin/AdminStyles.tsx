import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LucideIcon, Search, Plus, Download, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// =====================================================
// ADMIN DESIGN SYSTEM - UNIFIED STYLES
// =====================================================

// Color palette for stat cards with gradients
export const statCardGradients = {
  primary: "from-primary/10 to-primary/5 border-primary/20",
  success: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
  warning: "from-amber-500/10 to-amber-500/5 border-amber-500/20",
  danger: "from-rose-500/10 to-rose-500/5 border-rose-500/20",
  info: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
  purple: "from-violet-500/10 to-violet-500/5 border-violet-500/20",
  cyan: "from-cyan-500/10 to-cyan-500/5 border-cyan-500/20",
  orange: "from-orange-500/10 to-orange-500/5 border-orange-500/20",
} as const;

export const iconColors = {
  primary: "text-primary bg-primary/10",
  success: "text-emerald-600 bg-emerald-500/10",
  warning: "text-amber-600 bg-amber-500/10",
  danger: "text-rose-600 bg-rose-500/10",
  info: "text-blue-600 bg-blue-500/10",
  purple: "text-violet-600 bg-violet-500/10",
  cyan: "text-cyan-600 bg-cyan-500/10",
  orange: "text-orange-600 bg-orange-500/10",
} as const;

export type ColorVariant = keyof typeof statCardGradients;

// =====================================================
// STAT CARD COMPONENT
// =====================================================
interface AdminStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: ColorVariant;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export const AdminStatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "primary",
  trend,
}: AdminStatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn("border bg-gradient-to-br", statCardGradients[color])}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className={cn("p-3 rounded-xl", iconColors[color])}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground truncate">{title}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">{value}</p>
                {trend && (
                  <span className={cn(
                    "text-xs font-medium",
                    trend.isPositive ? "text-emerald-600" : "text-rose-600"
                  )}>
                    {trend.isPositive ? "↑" : "↓"} {trend.value}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// =====================================================
// PAGE HEADER COMPONENT
// =====================================================
interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export const AdminPageHeader = ({ title, description, actions }: AdminPageHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-sm mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};

// =====================================================
// TOOLBAR COMPONENT
// =====================================================
interface AdminToolbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onAdd?: () => void;
  addLabel?: string;
  onExport?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  children?: ReactNode;
}

export const AdminToolbar = ({
  searchValue,
  onSearchChange,
  searchPlaceholder = "חיפוש...",
  onAdd,
  addLabel = "הוסף חדש",
  onExport,
  onRefresh,
  isRefreshing,
  children,
}: AdminToolbarProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      {onSearchChange !== undefined && (
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pr-10"
          />
        </div>
      )}
      
      <div className="flex items-center gap-2">
        {children}
        
        {onRefresh && (
          <Button variant="outline" size="icon" onClick={onRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        )}
        
        {onExport && (
          <Button variant="outline" className="gap-2" onClick={onExport}>
            <Download className="h-4 w-4" />
            ייצוא
          </Button>
        )}
        
        {onAdd && (
          <Button className="gap-2" onClick={onAdd}>
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

// =====================================================
// STATUS BADGE COMPONENT
// =====================================================
type StatusType = 
  | "success" | "pending" | "processing" | "warning" | "danger" | "info" 
  | "draft" | "active" | "inactive" | "scheduled" | "completed" | "cancelled";

const statusStyles: Record<StatusType, string> = {
  success: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  processing: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  warning: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  danger: "bg-rose-500/10 text-rose-700 border-rose-500/20",
  info: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  draft: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  inactive: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  scheduled: "bg-violet-500/10 text-violet-700 border-violet-500/20",
  completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  cancelled: "bg-rose-500/10 text-rose-700 border-rose-500/20",
};

interface AdminStatusBadgeProps {
  status: StatusType;
  label: string;
}

export const AdminStatusBadge = ({ status, label }: AdminStatusBadgeProps) => {
  return (
    <Badge variant="outline" className={cn("font-medium", statusStyles[status])}>
      {label}
    </Badge>
  );
};

// =====================================================
// DATA CARD COMPONENT (for list items)
// =====================================================
interface AdminDataCardProps {
  children: ReactNode;
  onClick?: () => void;
  isActive?: boolean;
  className?: string;
}

export const AdminDataCard = ({ children, onClick, isActive, className }: AdminDataCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={{ scale: 1.005 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className={cn(
          "border transition-all cursor-pointer hover:shadow-md hover:border-primary/30",
          isActive && "border-primary bg-primary/5",
          className
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// =====================================================
// SECTION CARD COMPONENT
// =====================================================
interface AdminSectionCardProps {
  title: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const AdminSectionCard = ({ 
  title, 
  icon: Icon, 
  actions, 
  children,
  className 
}: AdminSectionCardProps) => {
  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {Icon && <Icon className="h-5 w-5 text-primary" />}
            {title}
          </CardTitle>
          {actions}
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
};

// =====================================================
// EMPTY STATE COMPONENT
// =====================================================
interface AdminEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const AdminEmptyState = ({ icon: Icon, title, description, action }: AdminEmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-4 rounded-full bg-muted mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-sm max-w-sm">{description}</p>
      )}
      {action && (
        <Button className="mt-4 gap-2" onClick={action.onClick}>
          <Plus className="h-4 w-4" />
          {action.label}
        </Button>
      )}
    </div>
  );
};

// =====================================================
// STATS GRID COMPONENT
// =====================================================
interface StatsGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}

export const AdminStatsGrid = ({ children, columns = 4 }: StatsGridProps) => {
  const colsClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };
  
  return (
    <div className={cn("grid gap-4 mb-6", colsClass[columns])}>
      {children}
    </div>
  );
};

// =====================================================
// LOADING SKELETON COMPONENT
// =====================================================
export const AdminLoadingSkeleton = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
      <div className="h-64 bg-muted animate-pulse rounded-lg" />
    </div>
  );
};
