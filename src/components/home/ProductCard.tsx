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
      className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Image Container */}
      <div className="bg-surface p-3 flex items-center justify-center h-24 relative">
        {hasSaleBadge && (
          <div className="absolute top-2 right-2 bg-brand-red text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10">
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
      <div className="p-3">
        <h3 className="text-xs font-bold text-foreground font-jakarta truncate mb-1">{title}</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-base font-black text-primary font-jakarta">{price}</span>
            {originalPrice && (
              <span className="text-[10px] text-muted-foreground line-through">{originalPrice}</span>
            )}
          </div>
          {onAddToCart && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart();
              }}
              className="w-7 h-7 rounded-full bg-primary hover:bg-primary-hover flex items-center justify-center transition-colors"
            >
              <Plus className="w-4 h-4 text-neutral-dark" strokeWidth={2.5} />
            </button>
          )}
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
  const bgClasses = {
    yellow: "bg-gradient-to-br from-primary to-primary-hover",
    red: "bg-brand-red",
    blue: "bg-icon-blue"
  };

  const textClasses = {
    yellow: "text-neutral-dark",
    red: "text-white",
    blue: "text-white"
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 + index * 0.1 }}
      className={`rounded-2xl overflow-hidden shadow-card row-span-2 ${bgClasses[bgColor]} p-4 flex flex-col items-center justify-center relative cursor-pointer hover:shadow-card-hover transition-all`}
      onClick={onClick}
    >
      {/* Decorative elements */}
      <div className="absolute top-3 right-3 w-8 h-8 bg-white/20 rounded-full" />
      <div className="absolute bottom-4 left-4 w-4 h-4 bg-white/10 rounded-full" />
      
      {/* Icon */}
      {icon && (
        <div className="mb-3">
          {icon}
        </div>
      )}
      
      {/* Content */}
      <h3 className={`text-sm font-black ${textClasses[bgColor]} font-jakarta text-center leading-tight`}>
        {title}
      </h3>
      <p className={`text-xs ${bgColor === 'yellow' ? 'text-neutral-dark/70' : 'text-white/80'} font-jakarta mt-1 text-center`}>
        {subtitle}
      </p>
      
      {/* Arrow indicator */}
      <div className={`absolute bottom-3 left-3 ${textClasses[bgColor]}`}>
        <span className="text-lg">←</span>
      </div>
    </motion.div>
  );
});

PromoCard.displayName = 'PromoCard';
