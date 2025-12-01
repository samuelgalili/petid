import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { memo } from "react";

interface QuickActionButtonProps {
  icon: LucideIcon;
  title: string;
  index: number;
  onClick: () => void;
}

export const QuickActionButton = memo(({ 
  icon: Icon, 
  title, 
  index, 
  onClick 
}: QuickActionButtonProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.35 + index * 0.05 }}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex-shrink-0 cursor-pointer"
    >
      <div className="flex flex-col items-center gap-2">
        <div className="w-[72px] h-[72px] rounded-full bg-white shadow-lg flex items-center justify-center hover:shadow-xl transition-all border border-gray-100">
          <Icon className="w-8 h-8 text-gray-800" strokeWidth={1.5} />
        </div>
        <p className="text-[11px] font-bold text-gray-900 font-jakarta text-center max-w-[80px] leading-tight">
          {title}
        </p>
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  return prevProps.title === nextProps.title && prevProps.index === nextProps.index;
});

QuickActionButton.displayName = 'QuickActionButton';
