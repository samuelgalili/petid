import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LucideIcon, Search, Plus, Download, RefreshCw, Filter, MoreVertical, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// =====================================================
// ADMIN DESIGN SYSTEM - PROFESSIONAL DARK THEME
// =====================================================

// Enhanced color palette with modern gradients
export const statCardStyles = {
  primary: {
    gradient: "from-primary/15 via-primary/8 to-transparent",
    border: "border-primary/25 hover:border-primary/40",
    icon: "bg-primary/15 text-primary",
    glow: "shadow-primary/10"
  },
  success: {
    gradient: "from-emerald-500/15 via-emerald-500/8 to-transparent",
    border: "border-emerald-500/25 hover:border-emerald-500/40",
    icon: "bg-emerald-500/15 text-emerald-500",
    glow: "shadow-emerald-500/10"
  },
  warning: {
    gradient: "from-amber-500/15 via-amber-500/8 to-transparent",
    border: "border-amber-500/25 hover:border-amber-500/40",
    icon: "bg-amber-500/15 text-amber-500",
    glow: "shadow-amber-500/10"
  },
  danger: {
    gradient: "from-rose-500/15 via-rose-500/8 to-transparent",
    border: "border-rose-500/25 hover:border-rose-500/40",
    icon: "bg-rose-500/15 text-rose-500",
    glow: "shadow-rose-500/10"
  },
  info: {
    gradient: "from-blue-500/15 via-blue-500/8 to-transparent",
    border: "border-blue-500/25 hover:border-blue-500/40",
    icon: "bg-blue-500/15 text-blue-500",
    glow: "shadow-blue-500/10"
  },
  purple: {
    gradient: "from-violet-500/15 via-violet-500/8 to-transparent",
    border: "border-violet-500/25 hover:border-violet-500/40",
    icon: "bg-violet-500/15 text-violet-500",
    glow: "shadow-violet-500/10"
  },
  cyan: {
    gradient: "from-cyan-500/15 via-cyan-500/8 to-transparent",
    border: "border-cyan-500/25 hover:border-cyan-500/40",
    icon: "bg-cyan-500/15 text-cyan-500",
    glow: "shadow-cyan-500/10"
  },
  orange: {
    gradient: "from-orange-500/15 via-orange-500/8 to-transparent",
    border: "border-orange-500/25 hover:border-orange-500/40",
    icon: "bg-orange-500/15 text-orange-500",
    glow: "shadow-orange-500/10"
  },
} as const;

// Legacy exports for backward compatibility
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

export type ColorVariant = keyof typeof statCardStyles;

// =====================================================
// ENHANCED STAT CARD COMPONENT
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
  onClick?: () => void;
  sparkline?: number[];
}

export const AdminStatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "primary",
  trend,
  onClick,
  sparkline,
}: AdminStatCardProps) => {
  const styles = statCardStyles[color];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className="group"
    >
      <Card 
        className={cn(
          "relative overflow-hidden border bg-gradient-to-br transition-all duration-300 cursor-pointer",
          styles.gradient,
          styles.border,
          onClick && "hover:shadow-lg",
          styles.glow
        )}
        onClick={onClick}
      >
        {/* Decorative gradient orb */}
        <div className={cn(
          "absolute -top-12 -left-12 w-32 h-32 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-30",
          color === "primary" && "bg-primary",
          color === "success" && "bg-emerald-500",
          color === "warning" && "bg-amber-500",
          color === "danger" && "bg-rose-500",
          color === "info" && "bg-blue-500",
          color === "purple" && "bg-violet-500",
          color === "cyan" && "bg-cyan-500",
          color === "orange" && "bg-orange-500",
        )} />
        
        <CardContent className="p-5 relative">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
              <div className="flex items-baseline gap-2 mb-1">
                <p className="text-2xl font-bold tracking-tight">{value}</p>
                {trend && (
                  <span className={cn(
                    "text-xs font-semibold px-1.5 py-0.5 rounded-md",
                    trend.isPositive 
                      ? "text-emerald-600 bg-emerald-500/10" 
                      : "text-rose-600 bg-rose-500/10"
                  )}>
                    {trend.isPositive ? "↑" : "↓"} {trend.value}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <div className={cn(
              "p-3 rounded-xl shrink-0 transition-transform group-hover:scale-110",
              styles.icon
            )}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
          
          {/* Mini sparkline */}
          {sparkline && sparkline.length > 0 && (
            <div className="mt-3 h-8 flex items-end gap-0.5">
              {sparkline.map((value, i) => {
                const max = Math.max(...sparkline);
                const height = (value / max) * 100;
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 rounded-sm transition-all",
                      color === "primary" && "bg-primary/40",
                      color === "success" && "bg-emerald-500/40",
                      color === "warning" && "bg-amber-500/40",
                      color === "danger" && "bg-rose-500/40",
                      color === "info" && "bg-blue-500/40",
                      color === "purple" && "bg-violet-500/40",
                      color === "cyan" && "bg-cyan-500/40",
                      color === "orange" && "bg-orange-500/40",
                    )}
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// =====================================================
// ENHANCED PAGE HEADER COMPONENT
// =====================================================
interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export const AdminPageHeader = ({ title, description, actions, breadcrumbs }: AdminPageHeaderProps) => {
  return (
    <div className="mb-6 space-y-3">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {breadcrumbs.map((item, idx) => (
            <span key={idx} className="flex items-center gap-1.5">
              {idx > 0 && <ChevronLeft className="w-3.5 h-3.5" />}
              {item.href ? (
                <a href={item.href} className="hover:text-foreground transition-colors">
                  {item.label}
                </a>
              ) : (
                <span className="text-foreground font-medium">{item.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground text-sm mt-1">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
};

// =====================================================
// ENHANCED TOOLBAR COMPONENT
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
  onFilter?: () => void;
  filterCount?: number;
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
  onFilter,
  filterCount,
  children,
}: AdminToolbarProps) => {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6 p-4 bg-card/50 rounded-xl border border-border/50 backdrop-blur-sm">
      {onSearchChange !== undefined && (
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pr-10 bg-background/50 border-border/50 focus:bg-background"
          />
        </div>
      )}
      
      <div className="flex items-center gap-2 flex-wrap">
        {children}
        
        {onFilter && (
          <Button variant="outline" size="sm" onClick={onFilter} className="gap-2">
            <Filter className="h-4 w-4" />
            סינון
            {filterCount !== undefined && filterCount > 0 && (
              <Badge variant="secondary" className="mr-1 h-5 px-1.5 text-xs">
                {filterCount}
              </Badge>
            )}
          </Button>
        )}
        
        {onRefresh && (
          <Button variant="outline" size="icon" onClick={onRefresh} disabled={isRefreshing} className="h-9 w-9">
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        )}
        
        {onExport && (
          <Button variant="outline" size="sm" className="gap-2" onClick={onExport}>
            <Download className="h-4 w-4" />
            ייצוא
          </Button>
        )}
        
        {onAdd && (
          <Button size="sm" className="gap-2" onClick={onAdd}>
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

// =====================================================
// ENHANCED STATUS BADGE COMPONENT
// =====================================================
type StatusType = 
  | "success" | "pending" | "processing" | "warning" | "danger" | "info" 
  | "draft" | "active" | "inactive" | "scheduled" | "completed" | "cancelled"
  | "shipped" | "delivered" | "refunded" | "failed" | "paid" | "unpaid";

const statusStyles: Record<StatusType, { bg: string; text: string; dot: string }> = {
  success: { bg: "bg-emerald-500/10", text: "text-emerald-600", dot: "bg-emerald-500" },
  pending: { bg: "bg-amber-500/10", text: "text-amber-600", dot: "bg-amber-500" },
  processing: { bg: "bg-blue-500/10", text: "text-blue-600", dot: "bg-blue-500" },
  warning: { bg: "bg-orange-500/10", text: "text-orange-600", dot: "bg-orange-500" },
  danger: { bg: "bg-rose-500/10", text: "text-rose-600", dot: "bg-rose-500" },
  info: { bg: "bg-sky-500/10", text: "text-sky-600", dot: "bg-sky-500" },
  draft: { bg: "bg-slate-500/10", text: "text-slate-600", dot: "bg-slate-400" },
  active: { bg: "bg-emerald-500/10", text: "text-emerald-600", dot: "bg-emerald-500" },
  inactive: { bg: "bg-slate-500/10", text: "text-slate-500", dot: "bg-slate-400" },
  scheduled: { bg: "bg-violet-500/10", text: "text-violet-600", dot: "bg-violet-500" },
  completed: { bg: "bg-emerald-500/10", text: "text-emerald-600", dot: "bg-emerald-500" },
  cancelled: { bg: "bg-rose-500/10", text: "text-rose-600", dot: "bg-rose-500" },
  shipped: { bg: "bg-blue-500/10", text: "text-blue-600", dot: "bg-blue-500" },
  delivered: { bg: "bg-emerald-500/10", text: "text-emerald-600", dot: "bg-emerald-500" },
  refunded: { bg: "bg-purple-500/10", text: "text-purple-600", dot: "bg-purple-500" },
  failed: { bg: "bg-rose-500/10", text: "text-rose-600", dot: "bg-rose-500" },
  paid: { bg: "bg-emerald-500/10", text: "text-emerald-600", dot: "bg-emerald-500" },
  unpaid: { bg: "bg-amber-500/10", text: "text-amber-600", dot: "bg-amber-500" },
};

interface AdminStatusBadgeProps {
  status: StatusType;
  label: string;
  showDot?: boolean;
  size?: "sm" | "md";
}

export const AdminStatusBadge = ({ status, label, showDot = true, size = "sm" }: AdminStatusBadgeProps) => {
  const style = statusStyles[status] || statusStyles.info;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 font-medium rounded-full",
      style.bg,
      style.text,
      size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
    )}>
      {showDot && (
        <span className={cn(
          "rounded-full",
          style.dot,
          size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2"
        )} />
      )}
      {label}
    </span>
  );
};

// =====================================================
// ENHANCED DATA CARD COMPONENT
// =====================================================
interface AdminDataCardProps {
  children: ReactNode;
  onClick?: () => void;
  isActive?: boolean;
  className?: string;
  actions?: { label: string; onClick: () => void; icon?: LucideIcon; variant?: "default" | "danger" }[];
}

export const AdminDataCard = ({ children, onClick, isActive, className, actions }: AdminDataCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className={cn(
          "border transition-all hover:shadow-md",
          isActive && "border-primary bg-primary/5 ring-1 ring-primary/20",
          onClick && "cursor-pointer hover:border-primary/50",
          className
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              {children}
            </div>
            {actions && actions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {actions.map((action, idx) => (
                    <DropdownMenuItem 
                      key={idx} 
                      onClick={(e) => {
                        e.stopPropagation();
                        action.onClick();
                      }}
                      className={cn(
                        "gap-2",
                        action.variant === "danger" && "text-destructive focus:text-destructive"
                      )}
                    >
                      {action.icon && <action.icon className="h-4 w-4" />}
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// =====================================================
// ENHANCED SECTION CARD COMPONENT
// =====================================================
interface AdminSectionCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const AdminSectionCard = ({ 
  title, 
  description,
  icon: Icon, 
  actions, 
  children,
  className,
  noPadding
}: AdminSectionCardProps) => {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-4 bg-gradient-to-b from-muted/30 to-transparent">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
            )}
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              {description && (
                <CardDescription className="mt-0.5">{description}</CardDescription>
              )}
            </div>
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent className={cn(noPadding && "p-0")}>
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
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-2xl bg-gradient-to-br from-muted to-muted/50 mb-4">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-sm max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <Button className="gap-2" onClick={action.onClick}>
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
  columns?: 2 | 3 | 4 | 5;
}

export const AdminStatsGrid = ({ children, columns = 4 }: StatsGridProps) => {
  const colsClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5",
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
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-muted/50 rounded-xl border border-border/50" />
        ))}
      </div>
      <div className="h-80 bg-muted/50 rounded-xl border border-border/50" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 bg-muted/50 rounded-xl border border-border/50" />
        <div className="h-64 bg-muted/50 rounded-xl border border-border/50" />
      </div>
    </div>
  );
};

// =====================================================
// QUICK ACTIONS COMPONENT
// =====================================================
interface QuickAction {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  color?: ColorVariant;
}

interface AdminQuickActionsProps {
  actions: QuickAction[];
}

export const AdminQuickActions = ({ actions }: AdminQuickActionsProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action, idx) => {
        const color = action.color || "primary";
        return (
          <Button
            key={idx}
            variant="outline"
            size="sm"
            onClick={action.onClick}
            className={cn(
              "gap-2 transition-colors",
              color === "success" && "hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30",
              color === "warning" && "hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30",
              color === "danger" && "hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30",
              color === "info" && "hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/30",
              color === "primary" && "hover:bg-primary/10 hover:text-primary hover:border-primary/30",
            )}
          >
            <action.icon className="h-4 w-4" />
            {action.label}
          </Button>
        );
      })}
    </div>
  );
};

// =====================================================
// TABLE ROW COMPONENT
// =====================================================
interface AdminTableRowProps {
  children: ReactNode;
  onClick?: () => void;
  isSelected?: boolean;
}

export const AdminTableRow = ({ children, onClick, isSelected }: AdminTableRowProps) => {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={{ backgroundColor: "hsl(var(--muted) / 0.5)" }}
      onClick={onClick}
      className={cn(
        "border-b border-border/50 transition-colors",
        onClick && "cursor-pointer",
        isSelected && "bg-primary/5"
      )}
    >
      {children}
    </motion.tr>
  );
};
