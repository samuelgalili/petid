/**
 * ProductRecommendationSheet - Unified component for all product recommendations
 * ✅ Eliminates duplicated code from Energy/Fur/Grooming sheets
 * ✅ Handles add-to-cart with loading states and toast notifications
 * ✅ Consistent design system styling
 */

import { ReactNode, useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { ServiceBottomSheet } from './ServiceBottomSheet';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';

export interface ProductWithLabel {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category?: string;
  label?: string; // e.g., "מברשת מומלצת", "צעצוע"
}

interface ProductRecommendationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  infoContent?: ReactNode;
  products: ProductWithLabel[];
  loading?: boolean;
  emptyMessage?: string;
}

export const ProductRecommendationSheet = ({
  isOpen,
  onClose,
  title,
  infoContent,
  products,
  loading = false,
  emptyMessage = 'לא נמצאו מוצרים מומלצים',
}: ProductRecommendationSheetProps) => {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const handleAddToCart = async (product: ProductWithLabel) => {
    setAddingToCart(product.id);
    try {
      // Add to cart with proper cart context structure
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image_url, // Note: CartItem uses 'image', not 'image_url'
        quantity: 1,
      });

      // Toast success feedback
      toast({
        title: 'נוסף לעגלה! 🛒',
        description: `${product.name} נוסף בהצלחה`,
        duration: 2,
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: 'שגיאה',
        description: 'לא הצליח להוסיף המוצר לעגלה',
        variant: 'destructive',
      });
    } finally {
      setAddingToCart(null);
    }
  };

  return (
    <ServiceBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      infoContent={infoContent}
    >
      <div className="space-y-4">
        {loading ? (
          // Loading state - centered spinner
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : products.length > 0 ? (
          // Products list - with smooth animations
          <div className="space-y-2">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-3 p-3 bg-muted/30 rounded-lg border border-border/30 hover:border-border/60 transition-colors"
              >
                {/* Product Image */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Product Info */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    {product.label && (
                      <span className="text-[10px] text-primary font-medium">
                        {product.label}
                      </span>
                    )}
                    <h4 className="text-sm font-semibold text-foreground line-clamp-1">
                      {product.name}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      ₪{product.price.toFixed(0)}
                    </p>
                  </div>
                </div>

                {/* Add to Cart Button */}
                <Button
                  size="sm"
                  className="h-8 w-8 p-0 flex-shrink-0"
                  variant="outline"
                  onClick={() => handleAddToCart(product)}
                  disabled={addingToCart === product.id}
                  title="הוסף לעגלה"
                >
                  {addingToCart === product.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-4 h-4" />
                  )}
                </Button>
              </motion.div>
            ))}
          </div>
        ) : (
          // Empty state
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        )}
      </div>
    </ServiceBottomSheet>
  );
};
