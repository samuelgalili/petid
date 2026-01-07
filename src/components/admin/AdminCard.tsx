import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AdminCardProps {
  title?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  noPadding?: boolean;
  delay?: number;
}

export const AdminCard = ({
  title,
  icon: Icon,
  children,
  className,
  headerClassName,
  contentClassName,
  noPadding,
  delay = 0.2,
}: AdminCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className={cn(
        "border border-border/50 bg-card/50 backdrop-blur-sm",
        className
      )}>
        {title && (
          <CardHeader className={cn("border-b border-border/50", headerClassName)}>
            <CardTitle className="flex items-center gap-2">
              {Icon && <Icon className="w-5 h-5 text-primary" />}
              {title}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className={cn(noPadding ? "p-0" : "p-4", contentClassName)}>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
};
