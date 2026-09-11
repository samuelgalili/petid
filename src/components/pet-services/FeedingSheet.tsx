import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Utensils, ShoppingCart, Loader2 } from "lucide-react";
import { ServiceBottomSheet } from "./ServiceBottomSheet";
import { Button } from "@/components/ui/button";
import { fetchRecommendedProductGroups, type RecommendedProduct } from "@/lib/productRecommendations";

interface Pet {
  id: string;
  type: 'dog' | 'cat';
  breed?: string;
  weight?: number;
}

interface FeedingSheetProps {
  pet: Pet;
  isOpen: boolean;
  onClose: () => void;
}

export const FeedingSheet = ({ pet, isOpen, onClose }: FeedingSheetProps) => {
  // Generic, and true of any pet. It replaced a line that varied with a
  // percentage-derived amount; there is no amount here any more to vary with.
  const dietaryNote = 'חלקו לשתי ארוחות במהלך היום. לכמות המדויקת — ראו את הנחיות המוצר.';
  const [dryFoodProducts, setDryFoodProducts] = useState<RecommendedProduct[]>([]);
  const [wetFoodProducts, setWetFoodProducts] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // A daily amount was computed here as weight x 20 to weight x 30 grams —
      // 2% to 3% of body weight — and shown as "כמות יומית מומלצת". Two other
      // screens computed the same thing with different constants, so the same
      // animal got different numbers depending on where the owner looked.
      // Mipo no longer derives a feeding amount; the product's own guidance is
      // the single owner-facing source, and it is on the product page with its
      // provenance. See src/lib/feedingGuidance.ts and docs/pet-intelligence/34.
      const groups = await fetchRecommendedProductGroups([
        {
          key: 'dry',
          petType: pet.type,
          keywords: ['dry-food', 'dry food', 'מזון יבש', 'food', 'מזון'],
          limit: 2,
          fallbackToPetProducts: false,
        },
        {
          key: 'wet',
          petType: pet.type,
          keywords: ['wet-food', 'wet food', 'מזון רטוב'],
          limit: 1,
          fallbackToPetProducts: false,
        },
      ]);

      setDryFoodProducts(groups.dry || []);
      setWetFoodProducts(groups.wet || []);
    } catch (error) {
      console.error('Error fetching feeding products:', error);
      setDryFoodProducts([]);
      setWetFoodProducts([]);
    } finally {
      setLoading(false);
    }
  }, [pet.type]);

  useEffect(() => {
    if (!isOpen) return;
    fetchData();
  }, [isOpen, fetchData]);

  const allProducts = [...dryFoodProducts, ...wetFoodProducts];

  return (
    <ServiceBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="מזון מומלץ"
      infoContent={
        <div className="text-sm">
          <p className="text-xs text-muted-foreground">
            {dietaryNote}
          </p>
        </div>
      }
    >
      <div className="space-y-4">

        {/* Dry Food Section */}
        {dryFoodProducts.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">מזון יבש מומלץ</h4>
            <div className="space-y-2">
              {dryFoodProducts.map((product, index) => (
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
                      <h5 className="text-sm font-semibold text-foreground line-clamp-1">
                        {product.name}
                      </h5>
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
                    title="הוסף לעגלה"
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Wet Food Section */}
        {wetFoodProducts.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">מזון רטוב מומלץ</h4>
            <div className="space-y-2">
              {wetFoodProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (dryFoodProducts.length + index) * 0.1 }}
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
                      <h5 className="text-sm font-semibold text-foreground line-clamp-1">
                        {product.name}
                      </h5>
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
                    title="הוסף לעגלה"
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* No Products Found */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : allProducts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">לא נמצאו מוצרי מזון מומלצים</p>
          </div>
        ) : null}
      </div>
    </ServiceBottomSheet>
  );
};
