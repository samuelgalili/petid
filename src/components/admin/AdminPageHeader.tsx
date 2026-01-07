import { LucideIcon, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminPageHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onRefresh?: () => void;
  loading?: boolean;
  actions?: React.ReactNode;
}

export const AdminPageHeader = ({
  title,
  description,
  icon: Icon,
  onRefresh,
  loading,
  actions,
}: AdminPageHeaderProps) => {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-l from-card/80 to-transparent border border-border/50 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
          <Icon className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-bold text-lg">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex gap-2">
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="gap-2 bg-background/50"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            רענן
          </Button>
        )}
        {actions}
      </div>
    </div>
  );
};
