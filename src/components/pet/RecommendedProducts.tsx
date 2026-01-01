/**
 * Recommended Products - מוצרים מותאמים אישית
 */

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Star, Sparkles, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

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
  petName: string;
  products: Product[];
}

export const RecommendedProducts = ({ 
  petType, 
  petBreed, 
  petName, 
  products 
}: RecommendedProductsProps) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();

  // סינון מוצרים לפי סוג חיה והגבלה ל-3
  const filteredProducts = products
    .filter(p => !p.petType || p.petType === petType || p.petType === null)
    .slice(0, 3);

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

  if (filteredProducts.length === 0) return null;

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
              מותאם לגזע ולגיל
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

      {/* מוצרים */}
      <div className="space-y-3">
        {filteredProducts.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * index }}
          >
            <Card className="p-3 flex gap-3 hover:shadow-lg transition-all duration-300 border-border/50 group">
              {/* תמונה */}
              <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
                {product.originalPrice && product.originalPrice > product.price && (
                  <div className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    -{Math.round((1 - product.price / product.originalPrice) * 100)}%
                  </div>
                )}
              </div>

              {/* מידע */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <h4 className="font-medium text-sm line-clamp-2 mb-1">{product.name}</h4>
                  {product.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs text-muted-foreground">{product.rating}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-bold text-primary">₪{product.price}</span>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <span className="text-xs text-muted-foreground line-through">
                        ₪{product.originalPrice}
                      </span>
                    )}
                  </div>
                  <Button 
                    size="sm" 
                    className="h-8 px-3 rounded-full gap-1.5 text-xs shadow-md"
                    onClick={() => handleAddToCart(product)}
                  >
                    <ShoppingCart className="w-3 h-3" />
                    הוסף
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* קריאה לפעולה */}
      <Card className="p-4 bg-gradient-to-br from-primary/10 via-accent/5 to-background border-primary/20">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🎁</div>
          <div className="flex-1">
            <p className="text-sm font-medium">משלוח חינם להזמנות מעל ₪199</p>
            <p className="text-xs text-muted-foreground">+ 10% הנחה לחברי מועדון</p>
          </div>
          <Button 
            size="sm" 
            className="rounded-full"
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
