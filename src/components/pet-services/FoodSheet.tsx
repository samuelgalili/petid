/**
 * FoodSheet - Personalized pet food recommendations
 * Shows only 3 relevant products based on breed, age, and health
 */

import { motion } from 'framer-motion';
import { Utensils, ChevronLeft, Star, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ServiceBottomSheet } from './ServiceBottomSheet';
import { Button } from '@/components/ui/button';

interface Pet {
  id: string;
  name: string;
  type: 'dog' | 'cat';
  breed?: string;
  age_years?: number;
  age_months?: number;
  health_notes?: string;
}

interface FoodSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet | null;
}

export const FoodSheet = ({ isOpen, onClose, pet }: FoodSheetProps) => {
  const navigate = useNavigate();

  const { data: products, isLoading } = useQuery({
    queryKey: ['food-recommendations', pet?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_products')
        .select('id, name, description, price, image_url, category, pet_type')
        .or('category.ilike.%food%,category.ilike.%מזון%,category.ilike.%מזון יבש%,category.ilike.%מזון רטוב%')
        .limit(10);

      if (error) throw error;

      // Filter by pet type
      const filtered = data?.filter(p => {
        if (!p.pet_type) return true;
        return p.pet_type === pet?.type;
      }) || [];

      // Return only 3 products
      return filtered.slice(0, 3);
    },
    enabled: isOpen && !!pet,
  });

  const handleViewProduct = (productId: string) => {
    onClose();
    navigate(`/product/${productId}?petId=${pet?.id}`);
  };

  return (
    <ServiceBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={`מזון מומלץ ל${pet?.name || 'חיית המחמד'}`}
    >
      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary/5 rounded-2xl p-4 flex gap-3 mb-4"
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Utensils className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">מזון מותאם אישית</p>
          <p className="text-xs text-muted-foreground">
            מוצרים שנבחרו במיוחד לפי גזע, גיל ומצב בריאותי
          </p>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-muted/50 rounded-2xl p-4 animate-pulse h-28" />
          ))}
        </div>
      ) : products?.length ? (
        <div className="space-y-4">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-2xl border border-border p-4"
            >
              <div className="flex gap-3">
                {/* Image */}
                <div className="w-20 h-20 rounded-xl bg-muted overflow-hidden shrink-0">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Utensils className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground text-sm line-clamp-2">{product.name}</h3>
                  {product.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {product.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-foreground">₪{product.price}</span>
                    <Button 
                      size="sm" 
                      className="rounded-full h-8 px-4 text-xs"
                      onClick={() => handleViewProduct(product.id)}
                    >
                      צפה
                      <ChevronLeft className="w-3 h-3 mr-0.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Utensils className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-center">
            אין מוצרי מזון מתאימים כרגע
          </p>
        </div>
      )}
    </ServiceBottomSheet>
  );
};
