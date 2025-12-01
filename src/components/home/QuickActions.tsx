import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { QuickActionButton } from "./QuickActionButton";

interface QuickAction {
  icon: LucideIcon;
  title: string;
  path: string;
  bgColor: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export const QuickActions = ({ actions }: QuickActionsProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mb-6"
    >
      <div
        className="flex gap-4 overflow-x-auto pb-2 px-4 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {actions.map((action, index) => (
          <QuickActionButton
            key={action.path}
            icon={action.icon}
            title={action.title}
            index={index}
            onClick={() => navigate(action.path)}
          />
        ))}
      </div>
    </motion.div>
  );
};
