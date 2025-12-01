import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { memo } from "react";
import { buttonHover, buttonTap, ANIMATION_DURATION } from "@/lib/animations";
import { getKeyboardAccessibleProps, TAP_TARGET } from "@/lib/accessibility";

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
  const keyboardProps = getKeyboardAccessibleProps(onClick);
  
  return (
    <motion.div
      whileHover={buttonHover}
      whileTap={buttonTap}
      onClick={onClick}
      className="flex-shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-2xl"
      {...keyboardProps}
      aria-label={title}
      style={{ minWidth: TAP_TARGET.minimum, minHeight: TAP_TARGET.minimum }}
    >
      <div className="flex flex-col items-center gap-2">
        <motion.div 
          className="w-[72px] h-[72px] rounded-full bg-white shadow-sm flex items-center justify-center border border-border transition-all hover:border-primary/20 hover:shadow-md group"
          transition={{ duration: ANIMATION_DURATION.fast }}
        >
          <Icon 
            className="w-7 h-7 text-[#2D2D2D] group-hover:text-[#00A870] transition-colors duration-200" 
            strokeWidth={1.5} 
          />
        </motion.div>
        <p className="text-[11px] font-medium text-foreground font-jakarta text-center max-w-[80px] leading-tight">
          {title}
        </p>
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  return prevProps.title === nextProps.title && prevProps.index === nextProps.index;
});

QuickActionButton.displayName = 'QuickActionButton';
