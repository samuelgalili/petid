import { ReactNode, useRef, useState } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Trash2, Edit, Archive, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface SwipeAction {
  icon: ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}

interface SwipeableListItemProps {
  children: ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  className?: string;
  disabled?: boolean;
}

const ACTION_WIDTH = 80;

/**
 * Swipeable list item with customizable actions
 */
export const SwipeableListItem = ({
  children,
  leftActions = [],
  rightActions = [],
  onSwipeLeft,
  onSwipeRight,
  threshold = 0.3,
  className,
  disabled = false,
}: SwipeableListItemProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState<"left" | "right" | null>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);

  const leftActionsWidth = leftActions.length * ACTION_WIDTH;
  const rightActionsWidth = rightActions.length * ACTION_WIDTH;

  // Background colors based on swipe direction
  const leftBg = useTransform(
    x,
    [-rightActionsWidth, 0, leftActionsWidth],
    ["hsl(var(--destructive))", "transparent", "hsl(var(--primary))"]
  );

  const handleDragStart = () => {
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (disabled) return;
    setIsDragging(false);

    const velocity = info.velocity.x;
    const offset = info.offset.x;
    const containerWidth = constraintsRef.current?.offsetWidth || 0;
    const swipeThreshold = containerWidth * threshold;

    // Fast swipe or past threshold
    if (velocity < -500 || offset < -swipeThreshold) {
      if (rightActions.length > 0) {
        setIsOpen("right");
      } else {
        onSwipeLeft?.();
      }
    } else if (velocity > 500 || offset > swipeThreshold) {
      if (leftActions.length > 0) {
        setIsOpen("left");
      } else {
        onSwipeRight?.();
      }
    } else {
      setIsOpen(null);
    }
  };

  const getSnapPoint = () => {
    if (isOpen === "left") return leftActionsWidth;
    if (isOpen === "right") return -rightActionsWidth;
    return 0;
  };

  const handleClose = () => {
    setIsOpen(null);
  };

  return (
    <div ref={constraintsRef} className={cn("relative overflow-hidden", className)}>
      {/* Left actions (shown on swipe right) */}
      {leftActions.length > 0 && (
        <div className="absolute inset-y-0 left-0 flex">
          {leftActions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onClick();
                handleClose();
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-white transition-all",
                action.color
              )}
              style={{ width: ACTION_WIDTH }}
            >
              {action.icon}
              <span className="text-[10px] font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right actions (shown on swipe left) */}
      {rightActions.length > 0 && (
        <div className="absolute inset-y-0 right-0 flex">
          {rightActions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onClick();
                handleClose();
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-white transition-all",
                action.color
              )}
              style={{ width: ACTION_WIDTH }}
            >
              {action.icon}
              <span className="text-[10px] font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <motion.div
        style={{ x, backgroundColor: leftBg }}
        drag={disabled ? false : "x"}
        dragConstraints={{
          left: rightActions.length > 0 ? -rightActionsWidth : 0,
          right: leftActions.length > 0 ? leftActionsWidth : 0,
        }}
        dragElastic={0.1}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        animate={{ x: getSnapPoint() }}
        transition={{ type: "spring", stiffness: 500, damping: 40 }}
        className={cn(
          "relative bg-card",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        onClick={isOpen ? handleClose : undefined}
      >
        {children}
      </motion.div>
    </div>
  );
};

// ===== Pre-configured Action Buttons =====
export const createDeleteAction = (onDelete: () => void): SwipeAction => ({
  icon: <Trash2 className="w-5 h-5" />,
  label: "מחק",
  color: "bg-destructive",
  onClick: onDelete,
});

export const createEditAction = (onEdit: () => void): SwipeAction => ({
  icon: <Edit className="w-5 h-5" />,
  label: "ערוך",
  color: "bg-primary",
  onClick: onEdit,
});

export const createArchiveAction = (onArchive: () => void): SwipeAction => ({
  icon: <Archive className="w-5 h-5" />,
  label: "ארכיון",
  color: "bg-amber-500",
  onClick: onArchive,
});

export const createMoreAction = (onMore: () => void): SwipeAction => ({
  icon: <MoreHorizontal className="w-5 h-5" />,
  label: "עוד",
  color: "bg-muted-foreground",
  onClick: onMore,
});

export default SwipeableListItem;
