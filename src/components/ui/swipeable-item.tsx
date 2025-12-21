import { useState, useRef, ReactNode } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Trash2, Edit2 } from 'lucide-react';

interface SwipeableItemProps {
  children: ReactNode;
  onDelete?: () => void;
  onEdit?: () => void;
  disabled?: boolean;
}

export const SwipeableItem = ({ children, onDelete, onEdit, disabled = false }: SwipeableItemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const x = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const ACTION_WIDTH = 70;
  const TOTAL_ACTION_WIDTH = (onDelete ? ACTION_WIDTH : 0) + (onEdit ? ACTION_WIDTH : 0);

  // Transform for background actions opacity
  const actionsOpacity = useTransform(x, [-TOTAL_ACTION_WIDTH, 0], [1, 0]);
  const actionsScale = useTransform(x, [-TOTAL_ACTION_WIDTH, 0], [1, 0.8]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = TOTAL_ACTION_WIDTH / 2;
    
    if (info.offset.x < -threshold) {
      setIsOpen(true);
      x.set(-TOTAL_ACTION_WIDTH);
    } else {
      setIsOpen(false);
      x.set(0);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    x.set(0);
  };

  if (disabled) {
    return <div className="relative">{children}</div>;
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Background Actions */}
      <motion.div 
        className="absolute inset-y-0 left-0 flex items-center"
        style={{ opacity: actionsOpacity, scale: actionsScale }}
      >
        {onEdit && (
          <button
            onClick={() => {
              onEdit();
              handleClose();
            }}
            className="h-full w-[70px] bg-blue-500 flex items-center justify-center text-white"
          >
            <Edit2 className="w-5 h-5" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => {
              onDelete();
              handleClose();
            }}
            className="h-full w-[70px] bg-red-500 flex items-center justify-center text-white"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </motion.div>

      {/* Swipeable Content */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: -TOTAL_ACTION_WIDTH, right: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative bg-background cursor-grab active:cursor-grabbing"
        onClick={() => isOpen && handleClose()}
      >
        {children}
      </motion.div>
    </div>
  );
};
