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
    "bottom-right": "bottom-24 right-6",
    "bottom-left": "bottom-24 left-6",
    "bottom-center": "bottom-24 left-1/2 -translate-x-1/2"
  };

  const sizeClasses = {
    default: "w-14 h-14",
    large: "w-16 h-16"
  };

  const variantClasses = {
    primary: "bg-white/95 backdrop-blur-md border-2 border-transparent bg-clip-padding shadow-xl shadow-[#4ECDC4]/20",
    success: "bg-white/95 backdrop-blur-md border-2 border-emerald-500 shadow-xl shadow-emerald-500/20",
    warning: "bg-white/95 backdrop-blur-md border-2 border-amber-500 shadow-xl shadow-amber-500/20"
  };

  const iconColorClasses = {
    primary: "text-[#1E5799]",
    success: "text-emerald-600",
    warning: "text-amber-600"
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
            <div className="flex flex-col-reverse gap-3 mb-20">
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
                        delay: index * 0.06,
                        duration: ANIMATION_DURATION.normal,
                        ease: EASING.easeOut
                      }
                    }
                  }}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleActionClick(action)}
                  className={cn(
                    "w-12 h-12 rounded-full shadow-lg transition-all bg-white/95 backdrop-blur-md border border-[#4ECDC4]/20 flex items-center justify-center hover:shadow-xl",
                    action.color
                  )}
                  title={action.label}
                  {...getAccessibleButtonProps(action.label)}
                >
                  <action.icon className="w-5 h-5 text-[#1E5799]" strokeWidth={2} />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <div className={cn("fixed z-50", positionClasses[position])}>
        {/* Gradient border wrapper */}
        <div className="p-[2px] rounded-full bg-gradient-to-br from-[#1E5799] via-[#4ECDC4] to-[#7DB9E8] shadow-xl shadow-[#4ECDC4]/30">
          <motion.button
            variants={celebrate}
            initial="initial"
            whileHover={{ scale: 1.1, rotate: isExpanded ? 90 : 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleMainClick}
            className={cn(
              "rounded-full bg-white/95 backdrop-blur-md transition-all flex items-center justify-center focus:outline-none",
              sizeClasses[size]
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
                  <X className={cn("w-6 h-6", iconColorClasses[variant])} strokeWidth={2} />
                </motion.div>
              ) : (
                <motion.div
                  key="icon"
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                  <Icon className={cn("w-6 h-6", iconColorClasses[variant])} strokeWidth={2} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </>
  );
};
