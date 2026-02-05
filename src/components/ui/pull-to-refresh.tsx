 /**
  * PullToRefresh - Native iOS/Android style pull-to-refresh gesture
  * With smooth animations and haptic feedback support
  */
 
 import { useState, useRef, useCallback, ReactNode } from "react";
 import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
 import { Loader2, ArrowDown, Check } from "lucide-react";
 
 interface PullToRefreshProps {
   children: ReactNode;
   onRefresh: () => Promise<void>;
   className?: string;
   threshold?: number;
   disabled?: boolean;
 }
 
 type RefreshState = "idle" | "pulling" | "ready" | "refreshing" | "complete";
 
 export const PullToRefresh = ({
   children,
   onRefresh,
   className = "",
   threshold = 80,
   disabled = false,
 }: PullToRefreshProps) => {
   const [state, setState] = useState<RefreshState>("idle");
   const containerRef = useRef<HTMLDivElement>(null);
   const startY = useRef(0);
   const y = useMotionValue(0);
   
   const indicatorOpacity = useTransform(y, [0, threshold / 2], [0, 1]);
   const indicatorScale = useTransform(y, [0, threshold], [0.5, 1]);
   const rotation = useTransform(y, [0, threshold], [0, 180]);
 
   const handleTouchStart = useCallback((e: React.TouchEvent) => {
     if (disabled || state === "refreshing") return;
     
     const scrollTop = containerRef.current?.scrollTop ?? 0;
     if (scrollTop > 0) return;
     
     startY.current = e.touches[0].clientY;
     setState("pulling");
   }, [disabled, state]);
 
   const handleTouchMove = useCallback((e: React.TouchEvent) => {
     if (state === "idle" || state === "refreshing" || disabled) return;
     
     const scrollTop = containerRef.current?.scrollTop ?? 0;
     if (scrollTop > 0) {
       setState("idle");
       y.set(0);
       return;
     }
     
     const currentY = e.touches[0].clientY;
     const diff = Math.max(0, (currentY - startY.current) * 0.5); // Resistance factor
     
     y.set(Math.min(diff, threshold * 1.5));
     
     if (diff >= threshold && state !== "ready") {
       setState("ready");
       // Trigger haptic feedback if available
       if (navigator.vibrate) navigator.vibrate(10);
     } else if (diff < threshold && state === "ready") {
       setState("pulling");
     }
   }, [state, disabled, threshold, y]);
 
   const handleTouchEnd = useCallback(async () => {
     if (disabled) return;
     
     if (state === "ready") {
       setState("refreshing");
       y.set(threshold / 2);
       
       try {
         await onRefresh();
         setState("complete");
         if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
         
         // Brief success state
         await new Promise(resolve => setTimeout(resolve, 400));
       } catch (error) {
         console.error("Refresh failed:", error);
       }
     }
     
     // Animate back to start
     y.set(0);
     setState("idle");
   }, [state, disabled, threshold, y, onRefresh]);
 
   return (
     <div className={`relative overflow-hidden ${className}`}>
       {/* Pull indicator */}
       <motion.div
         className="absolute left-0 right-0 flex items-center justify-center z-10 pointer-events-none"
         style={{ 
           top: 0,
           opacity: indicatorOpacity,
           y: useTransform(y, [0, threshold], [-30, 8])
         }}
       >
         <motion.div 
           className="w-10 h-10 rounded-full bg-background border border-border shadow-lg flex items-center justify-center"
           style={{ scale: indicatorScale }}
         >
           <AnimatePresence mode="wait">
             {state === "refreshing" ? (
               <motion.div
                 key="loading"
                 initial={{ opacity: 0, scale: 0.5 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.5 }}
               >
                 <Loader2 className="w-5 h-5 text-primary animate-spin" />
               </motion.div>
             ) : state === "complete" ? (
               <motion.div
                 key="complete"
                 initial={{ opacity: 0, scale: 0.5 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.5 }}
               >
                 <Check className="w-5 h-5 text-green-500" />
               </motion.div>
             ) : (
               <motion.div
                 key="arrow"
                 style={{ rotate: rotation }}
               >
                 <ArrowDown className="w-5 h-5 text-muted-foreground" />
               </motion.div>
             )}
           </AnimatePresence>
         </motion.div>
       </motion.div>
       
       {/* Content container */}
       <motion.div
         ref={containerRef}
         className="h-full overflow-y-auto"
         style={{ y }}
         onTouchStart={handleTouchStart}
         onTouchMove={handleTouchMove}
         onTouchEnd={handleTouchEnd}
       >
         {children}
       </motion.div>
     </div>
   );
 };