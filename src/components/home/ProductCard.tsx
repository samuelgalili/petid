import { motion } from "framer-motion";
import { memo } from "react";
import { OptimizedImage } from "@/components/OptimizedImage";

interface ProductCardProps {
  image: string;
  title: string;
  price: string;
  bgColor: string;
  index: number;
  hasSaleBadge?: boolean;
  onClick?: () => void;
}

export const ProductCard = memo(({ 
  image, 
  title, 
  price, 
  bgColor, 
  index, 
  hasSaleBadge = false,
  onClick
}: ProductCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.65 + index * 0.05 }}
      className="rounded-2xl overflow-hidden shadow-md cursor-pointer"
      onClick={onClick}
    >
      <div className={`${bgColor} p-3 flex items-center justify-center h-28 relative`}>
        {hasSaleBadge && (
          <div className="absolute top-2 left-2 bg-white text-error text-[8px] font-bold px-2 py-0.5 rounded-full z-10">
            SALE
          </div>
        )}
        <OptimizedImage 
          src={image} 
          alt={title}
          className="w-full h-full rounded-lg"
          objectFit="cover"
          sizes="(max-width: 768px) 33vw, 200px"
        />
      </div>
      <div className="bg-white p-2">
        <h3 className="text-xs font-bold text-gray-900 font-jakarta truncate">{title}</h3>
        <p className="text-lg font-extrabold text-error">{price}</p>
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
  image: string;
  title: string;
  subtitle: string;
  bgColor: string;
  textColor: string;
  index: number;
  badgeText?: string;
  onClick?: () => void;
}

export const PromoCard = memo(({ 
  image, 
  title, 
  subtitle, 
  bgColor, 
  textColor, 
  index, 
  badgeText = "petid",
  onClick
}: PromoCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.75 + index * 0.25 }}
      className={`rounded-2xl overflow-hidden shadow-lg row-span-2 ${bgColor} p-4 flex flex-col items-center justify-center relative cursor-pointer`}
      onClick={onClick}
    >
      <div className="absolute top-2 right-2 text-white opacity-50">
        <div className="w-2 h-2 bg-white rounded-full mb-1"></div>
        <div className="w-1 h-1 bg-white rotate-45"></div>
      </div>
      <div className="absolute top-3 right-6">
        <div className="w-1.5 h-1.5 bg-pink-500 rotate-45"></div>
      </div>
      <OptimizedImage 
        src={image} 
        alt={title}
        className="w-20 h-20 mb-2"
        objectFit="contain"
        sizes="80px"
      />
      <h3 className={`text-sm font-extrabold ${textColor} font-jakarta text-center`}>{title}</h3>
      <p className={`text-xs ${textColor === 'text-white' ? 'text-white/90' : 'text-gray-700'} font-jakarta mt-1`}>{subtitle}</p>
      <div className="absolute bottom-3 left-3">
        <div className={`${textColor === 'text-white' ? 'text-white' : 'text-error'} font-extrabold text-xs`}>
          {badgeText}
        </div>
      </div>
    </motion.div>
  );
});

PromoCard.displayName = 'PromoCard';
