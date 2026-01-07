import { LucideIcon, FileX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const AdminEmptyState = ({
  icon: Icon = FileX,
  title,
  description,
  actionLabel,
  onAction,
}: AdminEmptyStateProps) => {
  return (
    <div className="p-12 text-center">
      <Icon className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
      <p className="text-muted-foreground font-medium">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground/70 mt-1">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-4" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
