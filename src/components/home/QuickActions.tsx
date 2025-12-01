import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { QuickActionButton } from "./QuickActionButton";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { ARIA_LABELS } from "@/lib/microcopy";

interface QuickAction {
  icon: LucideIcon;
  title: string;
  path: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export const QuickActions = ({ actions }: QuickActionsProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="mb-6"
      role="navigation"
      aria-label={ARIA_LABELS.navigation}
    >
      <div
        className="flex gap-4 overflow-x-auto pb-2 px-4 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {actions.map((action, index) => (
          <motion.div key={action.path} variants={staggerItem}>
            <QuickActionButton
              icon={action.icon}
              title={action.title}
              index={index}
              onClick={() => navigate(action.path)}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
