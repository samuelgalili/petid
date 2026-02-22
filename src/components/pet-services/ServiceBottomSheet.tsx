/**
 * ServiceBottomSheet - Premium pull-up drawer for all pet services
 * Uses Vaul drawer with glassmorphism + Framer Motion
 */

import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info } from 'lucide-react';
import { Drawer } from 'vaul';

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
    <Drawer.Root 
      open={isOpen} 
      onOpenChange={(open) => { if (!open) onClose(); }}
      shouldScaleBackground
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50" />
        <Drawer.Content 
          className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl outline-none"
          style={{ maxHeight: '92vh' }}
          dir="rtl"
        >
          {/* Glassmorphism background */}
          <div className="absolute inset-0 rounded-t-3xl bg-background/95 backdrop-blur-xl border-t border-border/30 shadow-[0_-8px_40px_rgba(0,0,0,0.12)]" />
          
          <div className="relative flex flex-col h-full">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <motion.div 
                className="w-10 h-1 bg-muted-foreground/25 rounded-full"
                initial={{ width: 30 }}
                animate={{ width: 40 }}
                transition={{ duration: 0.3 }}
              />
            </div>
            
            {/* Header */}
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="flex items-center justify-between px-5 pb-4 border-b border-border/20"
            >
              <h2 className="text-lg font-bold text-foreground">{title}</h2>
              <div className="flex items-center gap-2">
                {infoContent && (
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowInfo(!showInfo)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      showInfo ? 'bg-primary/20' : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    <Info className={`w-4 h-4 ${showInfo ? 'text-primary' : 'text-muted-foreground'}`} />
                  </motion.button>
                )}
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </motion.button>
              </div>
            </motion.div>

            {/* Info Tooltip */}
            <AnimatePresence>
              {showInfo && infoContent && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mx-5 mt-3 p-3 bg-primary/8 rounded-xl border border-primary/15 backdrop-blur-sm"
                >
                  {infoContent}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Content - Scrollable */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="flex-1 overflow-y-auto px-5 py-4"
            >
              {children}
            </motion.div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};