import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { OptimizedImage } from '@/components/OptimizedImage';
import { cn } from '@/lib/utils';

interface ImageCarouselProps {
  images: string[];
  alt: string;
  onDoubleClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const ImageCarousel = ({ 
  images, 
  alt, 
  onDoubleClick, 
  className,
  children 
}: ImageCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle only single image
  if (!images || images.length === 0) return null;
  
  if (images.length === 1) {
    return (
      <div 
        className={cn("relative cursor-pointer", className)}
        onDoubleClick={onDoubleClick}
      >
        <OptimizedImage
          src={images[0]}
          alt={alt}
          className="w-full aspect-square rounded-xl overflow-hidden"
          objectFit="cover"
          sizes="(max-width: 768px) 100vw, 672px"
        />
        {children}
      </div>
    );
  }

  const handleDragEnd = (event: any, info: PanInfo) => {
    const threshold = 50;
    
    if (info.offset.x < -threshold && currentIndex < images.length - 1) {
      setDirection(1);
      setCurrentIndex(currentIndex + 1);
    } else if (info.offset.x > threshold && currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToSlide = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
  };

  const goNext = () => {
    if (currentIndex < images.length - 1) {
      setDirection(1);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0
    })
  };

  return (
    <div 
      ref={containerRef}
      className={cn("relative cursor-pointer overflow-hidden", className)}
      onDoubleClick={onDoubleClick}
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            x: { type: "spring", stiffness: 300, damping: 30 },
            opacity: { duration: 0.2 }
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="w-full"
        >
          <OptimizedImage
            src={images[currentIndex]}
            alt={`${alt} - ${currentIndex + 1}`}
          className="w-full aspect-square rounded-xl overflow-hidden"
          objectFit="cover"
          sizes="(max-width: 768px) 100vw, 672px"
          />
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-[#262626] hover:bg-white transition-colors z-10"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      
      {currentIndex < images.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-[#262626] hover:bg-white transition-colors z-10"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={(e) => { e.stopPropagation(); goToSlide(index); }}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-300",
              index === currentIndex 
                ? "bg-[#0095F6] w-2.5" 
                : "bg-white/70 hover:bg-white"
            )}
          />
        ))}
      </div>

      {/* Slide Counter */}
      <div className="absolute top-4 right-4 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full z-10">
        {currentIndex + 1}/{images.length}
      </div>

      {children}
    </div>
  );
};
