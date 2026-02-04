import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Utensils, ShoppingCart, Loader2 } from "lucide-react";
import { ServiceBottomSheet } from "./ServiceBottomSheet";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Pet {
  id: string;
  type: 'dog' | 'cat';
  breed?: string;
  weight?: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category?: string;
}

interface FeedingSheetProps {
  pet: Pet;
  isOpen: boolean;
  onClose: () => void;
}

export const FeedingSheet = ({ pet, isOpen, onClose }: FeedingSheetProps) => {
  const [breedInfo, setBreedInfo] = useState<any>(null);
  const [dryFoodProducts, setDryFoodProducts] = useState<Product[]>([]);
  const [wetFoodProducts, setWetFoodProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [dailyAmount, setDailyAmount] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    fetchData();
  }, [isOpen, pet.breed, pet.type, pet.weight]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch breed info
      let weightFromBreed = '';
      if (pet.breed) {
        const { data: breed } = await supabase
          .from('breed_information')
          .select('weight_range_kg, dietary_notes')
          .or(`breed_name.ilike.%${pet.breed}%,breed_name_he.ilike.%${pet.breed}%`)
          .maybeSingle();
        
        if (breed) {
          setBreedInfo(breed);
          weightFromBreed = breed.weight_range_kg;
        }
      }

      // Calculate daily amount
      const weight = pet.weight || extractWeightFromRange(weightFromBreed);
      if (weight) {
        const minGrams = Math.round(weight * 20); // 2%
        const maxGrams = Math.round(weight * 30); // 3%
        setDailyAmount(`${minGrams}-${maxGrams} גרם`);
      }

      // Fetch dry food products - limit to 2
      const { data: dryFood } = await supabase
        .from('business_products')
        .select('id, name, price, image_url, category')
        .eq('pet_type', pet.type)
        .or('category.ilike.%dry-food%,category.ilike.%מזון יבש%')
        .limit(2);

      setDryFoodProducts(dryFood || []);

      // Fetch wet food products - limit to 1
      const { data: wetFood } = await supabase
        .from('business_products')
        .select('id, name, price, image_url, category')
        .eq('pet_type', pet.type)
        .or('category.ilike.%wet-food%,category.ilike.%מזון רטוב%')
        .limit(1);

      setWetFoodProducts(wetFood || []);
    } catch (error) {
      console.error('Error fetching feeding products:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractWeightFromRange = (range: string): number => {
    if (!range) return 0;
    const match = range.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  };

  const allProducts = [...dryFoodProducts, ...wetFoodProducts];

  return (
    <ServiceBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="כמות האכלה מומלצת"
      subtitle={dailyAmount || 'לפי משקל'}
    >
      <div className="space-y-4">
        {/* Daily Amount Info */}
        <div className="bg-orange-500/10 p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Utensils className="w-5 h-5 text-orange-600" />
            <span className="font-semibold text-foreground">כמות יומית מומלצת</span>
          </div>
          <p className="text-sm font-bold text-orange-600 mb-1">
            {dailyAmount || 'בחישוב משקל...'}
          </p>
          <p className="text-xs text-muted-foreground">
            {breedInfo?.dietary_notes || 'חלקו לשתי הנשמות במהלך היום'}
          </p>
        </div>

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
