import { motion } from "framer-motion";
import { memo } from "react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Skeleton component for loading state
export const ProductCardSkeleton = memo(({ index = 0 }: { index?: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      className="bg-card rounded-2xl overflow-hidden shadow-card"
    >
      {/* Image Skeleton */}
      <div className="bg-surface p-3 flex items-center justify-center h-24">
        <Skeleton className="w-full h-full rounded-lg animate-pulse" />
      </div>
      
      {/* Content Skeleton */}
      <div className="p-3 space-y-2">
        <Skeleton className="h-3 w-3/4 rounded animate-pulse" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-12 rounded animate-pulse" />
          <Skeleton className="w-7 h-7 rounded-full animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
});

ProductCardSkeleton.displayName = 'ProductCardSkeleton';

export const PromoCardSkeleton = memo(({ index = 0 }: { index?: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl overflow-hidden shadow-card row-span-2 bg-muted p-4 flex flex-col items-center justify-center"
    >
      <Skeleton className="w-10 h-10 rounded-full mb-3 animate-pulse" />
      <Skeleton className="h-4 w-20 rounded mb-2 animate-pulse" />
      <Skeleton className="h-3 w-16 rounded animate-pulse" />
    </motion.div>
  );
});

PromoCardSkeleton.displayName = 'PromoCardSkeleton';

interface ProductCardProps {
  image: string;
  title: string;
  price: string;
  originalPrice?: string;
  index: number;
  hasSaleBadge?: boolean;
  onClick?: () => void;
  onAddToCart?: () => void;
}

export const ProductCard = memo(({ 
  image, 
  title, 
  price, 
  originalPrice,
  index, 
  hasSaleBadge = false,
  onClick,
  onAddToCart
}: ProductCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 + index * 0.05 }}
      className="relative p-[1.5px] rounded-2xl cursor-pointer group"
      style={{
        background: 'linear-gradient(135deg, #93C5FD, #FBBF24, #60A5FA)'
      }}
      onClick={onClick}
    >
      <div className="bg-white rounded-2xl overflow-hidden h-full transition-all group-hover:shadow-lg">
        {/* Image Container */}
        <div className="bg-gradient-to-br from-gray-50 to-white p-3 flex items-center justify-center h-24 relative">
          {hasSaleBadge && (
            <div 
              className="absolute top-2 right-2 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10"
              style={{
                background: 'linear-gradient(135deg, #F59E0B, #F97316)'
              }}
            >
              מבצע
            </div>
          )}
          <OptimizedImage 
            src={image} 
            alt={title}
            className="w-full h-full rounded-lg object-contain"
            objectFit="contain"
            sizes="(max-width: 768px) 33vw, 150px"
          />
        </div>
        
        {/* Content */}
        <div className="p-3 bg-white">
          <h3 className="text-xs font-bold text-gray-800 font-jakarta truncate mb-1">{title}</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-base font-black bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent font-jakarta">{price}</span>
              {originalPrice && (
                <span className="text-[10px] text-gray-400 line-through">{originalPrice}</span>
              )}
            </div>
            {onAddToCart && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart();
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
                style={{
                  background: 'linear-gradient(135deg, #60A5FA, #3B82F6)'
                }}
              >
                <Plus className="w-4 h-4 text-white" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.price === nextProps.price &&
    prevProps.image === nextProps.image &&
    prevProps.index === nextProps.index
  );
});

ProductCard.displayName = 'ProductCard';

interface PromoCardProps {
  title: string;
  subtitle: string;
  bgColor?: "yellow" | "red" | "blue";
  index: number;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export const PromoCard = memo(({ 
  title, 
  subtitle, 
  bgColor = "yellow",
  index, 
  icon,
  onClick
}: PromoCardProps) => {
  const gradients = {
    yellow: 'linear-gradient(135deg, #FBBF24, #F59E0B)',
    red: 'linear-gradient(135deg, #F97316, #EA580C)',
    blue: 'linear-gradient(135deg, #60A5FA, #3B82F6)'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 + index * 0.1 }}
      className="relative p-[1.5px] rounded-2xl cursor-pointer group row-span-2"
      style={{
        background: gradients[bgColor]
      }}
      onClick={onClick}
    >
      <div className="bg-white rounded-2xl overflow-hidden h-full p-4 flex flex-col items-center justify-center relative transition-all group-hover:shadow-lg">
        {/* Decorative border dots */}
        <div 
          className="absolute top-3 right-3 w-2 h-2 rounded-full"
          style={{ background: gradients[bgColor] }}
        />
        <div 
          className="absolute bottom-3 left-3 w-1.5 h-1.5 rounded-full"
          style={{ background: gradients[bgColor] }}
        />
        
        {/* Icon */}
        {icon && (
          <div className="mb-3">
            {icon}
          </div>
        )}
        
        {/* Content */}
        <h3 
          className="text-sm font-black font-jakarta text-center leading-tight bg-clip-text text-transparent"
          style={{ backgroundImage: gradients[bgColor] }}
        >
          {title}
        </h3>
        <p className="text-xs text-gray-500 font-jakarta mt-1 text-center">
          {subtitle}
        </p>
        
        {/* Arrow indicator */}
        <div 
          className="absolute bottom-3 left-3 text-lg bg-clip-text text-transparent"
          style={{ backgroundImage: gradients[bgColor] }}
        >
          ←
        </div>
      </div>
    </motion.div>
  );
});

PromoCard.displayName = 'PromoCard';
