/**
 * Smart Panel - Groups related actions into cohesive surfaces
 * Based on Material Design Card & Apple HIG grouped lists
 */

import { motion } from "framer-motion";
import { LucideIcon, ChevronLeft } from "lucide-react";
import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { slideUp, ANIMATION_DURATION } from "@/lib/animations";
import { getAccessibleLinkProps, TAP_TARGET } from "@/lib/accessibility";
import { cn } from "@/lib/utils";

interface SmartPanelProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  onHeaderClick?: () => void;
}

interface SmartPanelItemProps {
  icon: LucideIcon;
  label: string;
  value?: string | number;
  badge?: string | number;
  to?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "highlighted" | "warning" | "success";
}

export const SmartPanel = ({ 
  title, 
  description, 
  icon: Icon, 
  children, 
  className,
  onHeaderClick 
}: SmartPanelProps) => {
  return (
    <motion.div
      variants={slideUp}
      initial="hidden"
      animate="visible"
      className={cn(
        "bg-background rounded-2xl shadow-sm border border-border/30 overflow-hidden",
        className
      )}
    >
      {(title || description) && (
        <div 
          className={cn(
            "px-4 py-3 border-b border-border/30",
            onHeaderClick && "cursor-pointer hover:bg-secondary/50 transition-colors"
          )}
          onClick={onHeaderClick}
          role={onHeaderClick ? "button" : undefined}
          tabIndex={onHeaderClick ? 0 : undefined}
        >
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-[#2D2D2D]" strokeWidth={1.5} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className="text-base font-semibold text-foreground truncate">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-sm text-muted-foreground truncate">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="divide-y divide-border/20">
        {children}
      </div>
    </motion.div>
  );
};

export const SmartPanelItem = ({
  icon: Icon,
  label,
  value,
  badge,
  to,
  onClick,
  disabled = false,
  variant = "default"
}: SmartPanelItemProps) => {
  const variantStyles = {
    default: "hover:bg-muted/50",
    highlighted: "bg-primary/5 hover:bg-primary/10 border-r-2 border-primary",
    warning: "bg-warning/5 hover:bg-warning/10",
    success: "bg-success/5 hover:bg-success/10"
  };

  const content = (
    <>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors group-hover:bg-primary/10",
          variant === "default" && "bg-muted",
          variant === "highlighted" && "bg-primary/20",
          variant === "warning" && "bg-warning/20",
          variant === "success" && "bg-success/20"
        )}>
          <Icon 
            className={cn(
              "w-5 h-5 transition-colors",
              variant === "default" && "text-[#2D2D2D] group-hover:text-[#00A870]",
              variant === "highlighted" && "text-[#00A870]",
              variant === "warning" && "text-warning",
              variant === "success" && "text-success"
            )} 
            strokeWidth={1.5}
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{label}</p>
          {value && (
            <p className="text-xs text-muted-foreground truncate">{value}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {badge !== undefined && (
          <span className={cn(
            "px-2 py-1 rounded-full text-xs font-semibold",
            variant === "default" && "bg-primary/10 text-primary",
            variant === "highlighted" && "bg-primary text-primary-foreground",
            variant === "warning" && "bg-warning/20 text-warning",
            variant === "success" && "bg-success/20 text-success"
          )}>
            {badge}
          </span>
        )}
        <ChevronLeft className="w-5 h-5 text-[#2D2D2D] group-hover:text-[#00A870] transition-colors" strokeWidth={1.5} />
      </div>
    </>
  );

  const baseClasses = cn(
    "flex items-center gap-3 px-4 transition-all group",
    variantStyles[variant],
    disabled && "opacity-50 cursor-not-allowed"
  );

  const motionProps = {
    whileHover: disabled ? {} : { x: -4 },
    whileTap: disabled ? {} : { scale: 0.98 },
    transition: { duration: ANIMATION_DURATION.fast }
  };

  if (to && !disabled) {
    return (
      <motion.div {...motionProps}>
        <Link
          to={to}
          className={baseClasses}
          style={{ minHeight: TAP_TARGET.comfortable }}
          {...getAccessibleLinkProps(label)}
        >
          {content}
        </Link>
      </motion.div>
    );
  }

  if (onClick && !disabled) {
    return (
      <motion.button
        {...motionProps}
        onClick={onClick}
        className={cn(baseClasses, "w-full text-right")}
        style={{ minHeight: TAP_TARGET.comfortable }}
        disabled={disabled}
        aria-label={label}
      >
        {content}
      </motion.button>
    );
  }

  return (
    <div 
      className={cn(baseClasses, "cursor-default")}
      style={{ minHeight: TAP_TARGET.comfortable }}
    >
      {content}
    </div>
  );
};

SmartPanel.Item = SmartPanelItem;
