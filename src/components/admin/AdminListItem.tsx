import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AdminListItemProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
  onClick?: () => void;
}

export const AdminListItem = ({
  children,
  index = 0,
  className,
  onClick,
}: AdminListItemProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "p-4 hover:bg-accent/5 transition-colors",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};
