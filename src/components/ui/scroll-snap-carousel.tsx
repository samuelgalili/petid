 /**
  * ScrollSnapCarousel - Native scroll-snap carousel with momentum
  * Optimized for mobile touch interactions
  */
 
 import { ReactNode, useRef, useState, useCallback, useEffect } from "react";
 import { motion, useMotionValue, useTransform, animate } from "framer-motion";
 import { cn } from "@/lib/utils";
 
 interface ScrollSnapCarouselProps {
   children: ReactNode[];
   className?: string;
   itemClassName?: string;
   gap?: number;
   showIndicators?: boolean;
   indicatorPosition?: "bottom" | "top";
   autoPlay?: boolean;
   autoPlayInterval?: number;
   onIndexChange?: (index: number) => void;
 }
 
 export const ScrollSnapCarousel = ({
   children,
   className = "",
   itemClassName = "",
   gap = 12,
   showIndicators = true,
   indicatorPosition = "bottom",
   autoPlay = false,
   autoPlayInterval = 4000,
   onIndexChange,
 }: ScrollSnapCarouselProps) => {
   const containerRef = useRef<HTMLDivElement>(null);
   const [activeIndex, setActiveIndex] = useState(0);
   const [itemWidth, setItemWidth] = useState(0);
   
   // Calculate item width on mount and resize
   useEffect(() => {
     const updateWidth = () => {
       if (containerRef.current) {
         const containerWidth = containerRef.current.offsetWidth;
         setItemWidth(containerWidth * 0.85); // 85% width items
       }
     };
     
     updateWidth();
     window.addEventListener("resize", updateWidth);
     return () => window.removeEventListener("resize", updateWidth);
   }, []);
   
   // Auto-play logic
   useEffect(() => {
     if (!autoPlay || !children.length) return;
     
     const interval = setInterval(() => {
       setActiveIndex(prev => (prev + 1) % children.length);
     }, autoPlayInterval);
     
     return () => clearInterval(interval);
   }, [autoPlay, autoPlayInterval, children.length]);
   
   // Scroll to active index
   useEffect(() => {
     if (containerRef.current && itemWidth) {
       const scrollPosition = activeIndex * (itemWidth + gap);
       containerRef.current.scrollTo({
         left: scrollPosition,
         behavior: "smooth"
       });
       onIndexChange?.(activeIndex);
     }
   }, [activeIndex, itemWidth, gap, onIndexChange]);
   
   const handleScroll = useCallback(() => {
     if (!containerRef.current || !itemWidth) return;
     
     const scrollLeft = containerRef.current.scrollLeft;
     const newIndex = Math.round(scrollLeft / (itemWidth + gap));
     
     if (newIndex !== activeIndex && newIndex >= 0 && newIndex < children.length) {
       setActiveIndex(newIndex);
     }
   }, [activeIndex, itemWidth, gap, children.length]);
 
   return (
     <div className={cn("relative", className)}>
       {/* Indicators - top position */}
       {showIndicators && indicatorPosition === "top" && (
         <div className="flex justify-center gap-1.5 mb-3">
           {children.map((_, i) => (
             <button
               key={i}
               onClick={() => setActiveIndex(i)}
               className={cn(
                 "h-1.5 rounded-full transition-all duration-300",
                 i === activeIndex 
                   ? "w-6 bg-primary" 
                   : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
               )}
               aria-label={`Go to slide ${i + 1}`}
             />
           ))}
         </div>
       )}
       
       {/* Scrollable container */}
       <div
         ref={containerRef}
         className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
         style={{ 
           gap: `${gap}px`,
           paddingLeft: `${(containerRef.current?.offsetWidth ?? 0 - itemWidth) / 2}px`,
           scrollPaddingLeft: `${(containerRef.current?.offsetWidth ?? 0 - itemWidth) / 2}px`,
         }}
         onScroll={handleScroll}
       >
         {children.map((child, i) => (
           <motion.div
             key={i}
             className={cn(
               "flex-shrink-0 snap-center",
               itemClassName
             )}
             style={{ width: itemWidth || "85%" }}
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ 
               opacity: 1, 
               scale: i === activeIndex ? 1 : 0.95,
             }}
             transition={{ duration: 0.3 }}
           >
             {child}
           </motion.div>
         ))}
       </div>
       
       {/* Indicators - bottom position */}
       {showIndicators && indicatorPosition === "bottom" && (
         <div className="flex justify-center gap-1.5 mt-3">
           {children.map((_, i) => (
             <button
               key={i}
               onClick={() => setActiveIndex(i)}
               className={cn(
                 "h-1.5 rounded-full transition-all duration-300",
                 i === activeIndex 
                   ? "w-6 bg-primary" 
                   : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
               )}
               aria-label={`Go to slide ${i + 1}`}
             />
           ))}
         </div>
       )}
     </div>
   );
 };
 
 // Utility component for horizontal scroll with snap
 interface HorizontalSnapScrollProps {
   children: ReactNode;
   className?: string;
   itemClassName?: string;
   gap?: number;
 }
 
 export const HorizontalSnapScroll = ({
   children,
   className = "",
   gap = 12,
 }: HorizontalSnapScrollProps) => {
   return (
     <div
       className={cn(
         "flex overflow-x-auto snap-x snap-mandatory scrollbar-hide px-4",
         className
       )}
       style={{ gap: `${gap}px` }}
     >
       {children}
     </div>
   );
 };
 
 export const SnapItem = ({
   children,
   className = "",
 }: {
   children: ReactNode;
   className?: string;
 }) => (
   <div className={cn("flex-shrink-0 snap-start", className)}>
     {children}
   </div>
 );