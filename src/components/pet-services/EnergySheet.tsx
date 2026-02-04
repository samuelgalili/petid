import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, ShoppingCart, Loader2 } from "lucide-react";
import { ServiceBottomSheet } from "./ServiceBottomSheet";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Pet {
  id: string;
  type: 'dog' | 'cat';
  breed?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category?: string;
}

interface EnergySheetProps {
  pet: Pet;
  isOpen: boolean;
  onClose: () => void;
}

export const EnergySheet = ({ pet, isOpen, onClose }: EnergySheetProps) => {
  const [breedInfo, setBreedInfo] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetchData();
  }, [isOpen, pet.breed, pet.type]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch breed info for exercise needs
      if (pet.breed) {
        const { data: breed } = await supabase
          .from('breed_information')
          .select('exercise_needs')
          .or(`breed_name.ilike.%${pet.breed}%,breed_name_he.ilike.%${pet.breed}%`)
          .maybeSingle();
        
        if (breed) {
          setBreedInfo(breed);
        }
      }

      // Fetch toy products - limit to 3
      const { data: toys } = await supabase
        .from('business_products')
        .select('id, name, price, image_url, category')
        .eq('pet_type', pet.type)
        .or('category.ilike.%toy%,category.ilike.%צעצוע%,category.ilike.%משחק%')
        .limit(3);

      setProducts(toys || []);
    } catch (error) {
      console.error('Error fetching energy products:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEnergyLevel = () => {
    const level = breedInfo?.exercise_needs?.toLowerCase() || '';
    if (level.includes('high') || level.includes('גבוה')) return 'גבוהה';
    if (level.includes('medium') || level.includes('בינוני')) return 'בינוני';
    if (level.includes('low') || level.includes('נמוך')) return 'נמוכה';
    return 'בינוני';
  };

  const getEnergyColor = () => {
    const level = getEnergyLevel();
    if (level === 'גבוהה') return 'from-yellow-500 to-orange-400';
    if (level === 'בינוני') return 'from-amber-400 to-yellow-300';
    return 'from-green-400 to-emerald-300';
  };

  const energyInfo = (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-4 h-4 text-primary" />
        <span className="font-semibold text-foreground">רמת אנרגיה</span>
      </div>
      <p className="text-sm text-muted-foreground">
        {getEnergyLevel()}
      </p>
      <p className="text-xs text-muted-foreground mt-2">
        לחיות מחמד עם רמת אנרגיה גבוהה נדרשים צעצועים בעלי אתגר וגירויים שונים כדי למנוע שעמום.
      </p>
    </div>
  );

  return (
    <ServiceBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="צעצועים מומלצים"
      infoContent={energyInfo}
    >
      <div className="space-y-4">

        {/* Products Grid */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : products.length > 0 ? (
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
                  title="הוסף לעגלה"
                >
                  <ShoppingCart className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">לא נמצאו מוצרים מומלצים</p>
          </div>
        )}
      </div>
    </ServiceBottomSheet>
  );
};
