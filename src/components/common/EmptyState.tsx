import { ReactNode } from "react";
import { LucideIcon, Package, Search, FileText, ShoppingCart, Heart, Bell, MessageSquare, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: "sm" | "md" | "lg";
  illustration?: ReactNode;
}

/**
 * Reusable empty state component with consistent styling
 */
export const EmptyState = ({
  icon: Icon = Package,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = "md",
  illustration,
}: EmptyStateProps) => {
  const sizeClasses = {
    sm: {
      container: "py-8 px-4",
      iconWrapper: "w-12 h-12",
      icon: "w-6 h-6",
      title: "text-base",
      description: "text-xs",
    },
    md: {
      container: "py-12 px-6",
      iconWrapper: "w-16 h-16",
      icon: "w-8 h-8",
      title: "text-lg",
      description: "text-sm",
    },
    lg: {
      container: "py-20 px-8",
      iconWrapper: "w-20 h-20",
      icon: "w-10 h-10",
      title: "text-xl",
      description: "text-base",
    },
  }[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        sizeClasses.container,
        className
      )}
    >
      {illustration || (
        <div className={cn(
          "rounded-full bg-muted flex items-center justify-center mb-4",
          sizeClasses.iconWrapper
        )}>
          <Icon className={cn("text-muted-foreground", sizeClasses.icon)} />
        </div>
      )}

      <h3 className={cn("font-bold text-foreground mb-2", sizeClasses.title)}>
        {title}
      </h3>

      {description && (
        <p className={cn("text-muted-foreground max-w-sm mb-6", sizeClasses.description)}>
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || "default"}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
};

// ===== Pre-configured Empty States =====

export const EmptySearch = ({ query, onClear }: { query?: string; onClear?: () => void }) => (
  <EmptyState
    icon={Search}
    title="לא נמצאו תוצאות"
    description={query ? `לא נמצאו תוצאות עבור "${query}"` : "נסו לחפש משהו אחר"}
    action={onClear ? { label: "נקה חיפוש", onClick: onClear, variant: "outline" } : undefined}
  />
);

export const EmptyProducts = ({ onAdd }: { onAdd?: () => void }) => (
  <EmptyState
    icon={ShoppingCart}
    title="אין מוצרים"
    description="עדיין לא נוספו מוצרים"
    action={onAdd ? { label: "הוסף מוצר", onClick: onAdd } : undefined}
  />
);

export const EmptyOrders = () => (
  <EmptyState
    icon={Package}
    title="אין הזמנות"
    description="עדיין לא בוצעו הזמנות"
  />
);

export const EmptyCart = ({ onShop }: { onShop?: () => void }) => (
  <EmptyState
    icon={ShoppingCart}
    title="העגלה ריקה"
    description="הוסיפו מוצרים לעגלה כדי להמשיך לתשלום"
    action={onShop ? { label: "לחנות", onClick: onShop } : undefined}
  />
);

export const EmptyFavorites = ({ onExplore }: { onExplore?: () => void }) => (
  <EmptyState
    icon={Heart}
    title="אין מועדפים"
    description="סמנו מוצרים שאתם אוהבים כדי לשמור אותם כאן"
    action={onExplore ? { label: "לחנות", onClick: onExplore } : undefined}
  />
);

export const EmptyNotifications = () => (
  <EmptyState
    icon={Bell}
    title="אין התראות"
    description="כל ההתראות החדשות יופיעו כאן"
    size="sm"
  />
);

export const EmptyMessages = ({ onStart }: { onStart?: () => void }) => (
  <EmptyState
    icon={MessageSquare}
    title="אין הודעות"
    description="התחילו שיחה עם חברים או עסקים"
    action={onStart ? { label: "התחל שיחה", onClick: onStart } : undefined}
  />
);

export const EmptyDocuments = ({ onUpload }: { onUpload?: () => void }) => (
  <EmptyState
    icon={FileText}
    title="אין מסמכים"
    description="העלו מסמכים לחיית המחמד שלכם"
    action={onUpload ? { label: "העלה מסמך", onClick: onUpload } : undefined}
  />
);

export const EmptyFollowers = () => (
  <EmptyState
    icon={Users}
    title="אין עוקבים"
    description="שתפו את הפרופיל שלכם כדי לקבל עוקבים"
    size="sm"
  />
);

export default EmptyState;
