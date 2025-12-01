/**
 * Floating Action Button (FAB) - Primary action always accessible
 * Based on Material Design FAB principles
 */

import { motion, AnimatePresence } from "framer-motion";
import { LucideIcon, Plus, X } from "lucide-react";
import { useState } from "react";
import { scaleIn, celebrate, ANIMATION_DURATION, EASING } from "@/lib/animations";
import { getAccessibleButtonProps, TAP_TARGET } from "@/lib/accessibility";
import { cn } from "@/lib/utils";

interface FABAction {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  color?: string;
}

interface FloatingActionButtonProps {
  icon?: LucideIcon;
  label?: string;
  onClick?: () => void;
  actions?: FABAction[];
  position?: "bottom-right" | "bottom-left" | "bottom-center";
  size?: "default" | "large";
  variant?: "primary" | "success" | "warning";
}

export const FloatingActionButton = ({
  icon: Icon = Plus,
  label = "פעולה מהירה",
  onClick,
  actions,
  position = "bottom-right",
  size = "default",
  variant = "primary"
}: FloatingActionButtonProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const positionClasses = {
    "bottom-right": "bottom-20 left-6",
    "bottom-left": "bottom-20 right-6",
    "bottom-center": "bottom-20 left-1/2 -translate-x-1/2"
  };

  const sizeClasses = {
    default: "w-14 h-14",
    large: "w-16 h-16"
  };

  const variantClasses = {
    primary: "bg-primary hover:bg-primary/90 text-primary-foreground shadow-primary/30",
    success: "bg-success hover:bg-success/90 text-white shadow-success/30",
    warning: "bg-warning hover:bg-warning/90 text-white shadow-warning/30"
  };

  const handleMainClick = () => {
    if (actions && actions.length > 0) {
      setIsExpanded(!isExpanded);
    } else if (onClick) {
      onClick();
    }
  };

  const handleActionClick = (action: FABAction) => {
    action.onClick();
    setIsExpanded(false);
  };

  return (
    <>
      {/* Backdrop when expanded */}
      <AnimatePresence>
        {isExpanded && actions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: ANIMATION_DURATION.fast }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* Speed Dial Actions */}
      <AnimatePresence>
        {isExpanded && actions && (
          <motion.div
            className={cn("fixed z-50", positionClasses[position])}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <div className="flex flex-col-reverse gap-3 mb-3">
              {actions.map((action, index) => (
                <motion.button
                  key={action.label}
                  variants={{
                    hidden: { opacity: 0, scale: 0, y: 20 },
                    visible: {
                      opacity: 1,
                      scale: 1,
                      y: 0,
                      transition: {
                        delay: index * 0.05,
                        duration: ANIMATION_DURATION.normal,
                        ease: EASING.easeOut
                      }
                    }
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleActionClick(action)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-full shadow-lg transition-all group",
                    action.color || "bg-background border border-border"
                  )}
                  style={{ minHeight: TAP_TARGET.minimum }}
                  {...getAccessibleButtonProps(action.label)}
                >
                  <span className="text-sm font-medium text-foreground whitespace-nowrap">
                    {action.label}
                  </span>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <action.icon className="w-5 h-5 text-primary" />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        variants={celebrate}
        initial="initial"
        whileHover={{ scale: 1.1, rotate: isExpanded ? 90 : 0 }}
        whileTap={{ scale: 0.9 }}
        onClick={handleMainClick}
        className={cn(
          "fixed z-50 rounded-full shadow-2xl transition-all flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-offset-2",
          positionClasses[position],
          sizeClasses[size],
          variantClasses[variant]
        )}
        {...getAccessibleButtonProps(label, isExpanded)}
      >
        <AnimatePresence mode="wait">
          {isExpanded ? (
            <motion.div
              key="close"
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="icon"
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              exit="hidden"
            >
              <Icon className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
};
