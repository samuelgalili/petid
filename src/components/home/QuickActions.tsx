import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
          <motion.div
            key={action.path}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.35 + index * 0.05 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(action.path)}
            className="flex-shrink-0 cursor-pointer"
          >
            <div className="flex flex-col items-center gap-2">
              <div className="w-[72px] h-[72px] rounded-full bg-white shadow-lg flex items-center justify-center hover:shadow-xl transition-all border border-gray-100">
                <action.icon className="w-8 h-8 text-gray-800" strokeWidth={1.5} />
              </div>
              <p className="text-[11px] font-bold text-gray-900 font-jakarta text-center max-w-[80px] leading-tight">
                {action.title}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
