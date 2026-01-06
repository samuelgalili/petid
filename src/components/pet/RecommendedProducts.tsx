/**
 * Recommended Products - מוצרים מותאמים אישית (קרוסלה)
 */

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Star, Sparkles, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { useRef } from "react";

interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  description?: string;
  petType?: string;
}

interface RecommendedProductsProps {
  petType: string;
  petBreed: string | null;
  petAge?: number | null;
  petName: string;
  products: Product[];
}

export const RecommendedProducts = ({ 
  petType, 
  petBreed,
  petAge,
  petName, 
  products 
}: RecommendedProductsProps) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const scrollRef = useRef<HTMLDivElement>(null);

  // סינון מוצרים לפי סוג חיה - מציג עד 8 מוצרים בקרוסלה
  const filteredProducts = products
    .filter(p => !p.petType || p.petType === petType || p.petType === null)
    .slice(0, 8);

  const handleAddToCart = (product: Product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1
    });
    toast.success(`${product.name} נוסף לסל! 🛒`);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (filteredProducts.length === 0) return null;

  // תיאור מותאם לגזע ולגיל
  const getPersonalizedText = () => {
    const parts = [];
    if (petBreed) parts.push(petBreed);
    if (petAge) {
      if (petAge < 1) parts.push('גור');
      else if (petAge < 7) parts.push('בוגר');
      else parts.push('מבוגר');
    }
    return parts.length > 0 ? `מותאם ל${parts.join(', ')}` : 'מותאם לגזע ולגיל';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="space-y-4"
    >
      {/* כותרת */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-base">מומלץ עבור {petName}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {getPersonalizedText()}
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-primary text-xs"
          onClick={() => navigate('/shop')}
        >
          לכל המוצרים ←
        </Button>
      </div>

      {/* קרוסלת מוצרים */}
      <div className="relative group">
        {/* כפתורי ניווט */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity -mr-2"
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity -ml-2"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>

        {/* קרוסלה */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth pb-2 -mx-1 px-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * index }}
              className="flex-shrink-0 w-36"
            >
              <Card className="p-2 hover:shadow-lg transition-all duration-300 border-border/50 group/card h-full flex flex-col">
                {/* תמונה */}
                <div className="relative aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                  {product.originalPrice && product.originalPrice > product.price && (
                    <div className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                      -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                    </div>
                  )}
                </div>

                {/* מידע */}
                <div className="flex-1 flex flex-col justify-between min-h-0">
                  <h4 className="font-medium text-xs line-clamp-2 mb-1 leading-tight">{product.name}</h4>
                  
                  {product.rating && (
                    <div className="flex items-center gap-0.5 mb-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-[10px] text-muted-foreground">{product.rating}</span>
                    </div>
                  )}
                  
                  <div className="mt-auto">
                    <div className="flex items-baseline gap-1 mb-1.5">
                      <span className="text-sm font-bold text-primary">₪{product.price}</span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-[10px] text-muted-foreground line-through">
                          ₪{product.originalPrice}
                        </span>
                      )}
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full h-7 rounded-full gap-1 text-[10px] shadow-md"
                      onClick={() => handleAddToCart(product)}
                    >
                      <ShoppingCart className="w-3 h-3" />
                      הוסף לסל
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* קריאה לפעולה */}
      <Card className="p-3 bg-gradient-to-br from-primary/10 via-accent/5 to-background border-primary/20">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🎁</div>
          <div className="flex-1">
            <p className="text-xs font-medium">משלוח חינם להזמנות מעל ₪199</p>
            <p className="text-[10px] text-muted-foreground">+ 10% הנחה לחברי מועדון</p>
          </div>
          <Button 
            size="sm" 
            className="rounded-full h-8 text-xs"
            onClick={() => navigate('/shop')}
          >
            לחנות
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

export default RecommendedProducts;
