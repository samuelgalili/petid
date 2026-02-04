/**
 * ServiceBottomSheet - Unified bottom sheet for all pet services
 * Opens from bottom with scroll, minimalist and clean design
 */

import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info } from 'lucide-react';

interface ServiceBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  infoContent?: ReactNode;
}

export const ServiceBottomSheet = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  infoContent
}: ServiceBottomSheetProps) => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />
          
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 top-4 bg-background rounded-t-3xl z-50 flex flex-col"
            dir="rtl"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">{title}</h2>
              <div className="flex items-center gap-2">
                {infoContent && (
                  <button 
                    onClick={() => setShowInfo(!showInfo)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      showInfo ? 'bg-primary/20' : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    <Info className={`w-4 h-4 ${showInfo ? 'text-primary' : 'text-muted-foreground'}`} />
                  </button>
                )}
                <button 
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Info Tooltip */}
            <AnimatePresence>
              {showInfo && infoContent && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mx-5 mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20"
                >
                  {infoContent}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
