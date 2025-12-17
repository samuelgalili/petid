import { motion } from "framer-motion";
import { ShoppingBag, Tag } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface Product {
  id: string;
  title: string;
  price: string;
  originalPrice?: string;
  image: string;
  description?: string;
  hasSale?: boolean;
}

interface ProductPostCardProps {
  product: Product;
}

export const ProductPostCard = ({ product }: ProductPostCardProps) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const handleShopClick = () => {
    navigate('/shop');
  };

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.title,
      price: parseFloat(product.price.replace('₪', '')),
      image: product.image,
      quantity: 1,
    });
    toast.success(`${product.title} נוסף לסל`);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white border-b border-gray-100"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#F7BF00] to-[#F4B400] p-[2px]">
              <div className="w-full h-full rounded-full bg-white" />
            </div>
            <Avatar className="w-10 h-10 relative border-2 border-white">
              <AvatarImage 
                src="https://api.dicebear.com/7.x/bottts/svg?seed=petid-shop" 
                alt="Petid חנות" 
              />
              <AvatarFallback className="bg-gradient-to-tr from-[#F7BF00] to-[#F4B400] text-white">
                🛒
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-[#262626]">Petid חנות</p>
              <Badge className="bg-[#F7BF00] text-[#262626] text-[10px] px-2 py-0 h-5 border-0 font-semibold">
                חנות
              </Badge>
            </div>
            <p className="text-xs text-[#8E8E8E]">ממולץ עבורך</p>
          </div>
        </div>
      </div>

      {/* Image with CTA strip */}
      <div className="relative aspect-square overflow-hidden">
        <OptimizedImage
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover"
        />
        
        {/* Sale badge */}
        {product.hasSale && (
          <div className="absolute top-3 left-3 bg-[#C8102E] text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Tag className="w-3 h-3" />
            מבצע
          </div>
        )}

        {/* Gradient overlay at bottom */}
        <div className="absolute bottom-10 left-0 right-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent h-24 pointer-events-none" />
        
        {/* Price overlay */}
        <div className="absolute bottom-14 left-3 right-3 text-white">
          <h3 className="text-lg font-bold mb-1">{product.title}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black">{product.price}</span>
            {product.originalPrice && (
              <span className="text-sm line-through opacity-70">{product.originalPrice}</span>
            )}
          </div>
        </div>

        {/* CTA Strip at bottom of image */}
        <motion.button
          onClick={handleAddToCart}
          className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm py-2.5 px-4 flex items-center justify-between cursor-pointer hover:bg-white transition-colors"
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#F7BF00] flex items-center justify-center">
              <ShoppingBag className="w-3.5 h-3.5 text-[#262626]" />
            </div>
            <span className="text-sm font-semibold text-[#262626]">הוסף לסל</span>
          </div>
          <span className="text-[#F7BF00] text-sm font-bold">{product.price} ←</span>
        </motion.button>
      </div>

      {/* Caption area */}
      <div className="p-3 space-y-2">
        {/* Description */}
        {product.description && (
          <p className="text-sm text-[#262626] leading-relaxed line-clamp-2" dir="rtl">
            <span className="font-semibold">Petid חנות</span>{" "}
            🛍️ {product.description}
          </p>
        )}

        {/* Hashtags */}
        <p className="text-xs text-[#0095F6]" dir="rtl">
          #חיותמחמד #מוצריםלחיות #Petid #קניות
        </p>
      </div>
    </motion.article>
  );
};