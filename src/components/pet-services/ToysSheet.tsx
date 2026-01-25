/**
 * ToysSheet - Personalized pet toys recommendations
 */

import { motion } from 'framer-motion';
import { Gamepad2, ChevronLeft } from 'lucide-react';
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
}

interface ToysSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet | null;
}

export const ToysSheet = ({ isOpen, onClose, pet }: ToysSheetProps) => {
  const navigate = useNavigate();

  const { data: products, isLoading } = useQuery({
    queryKey: ['toys-recommendations', pet?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_products')
        .select('id, name, description, price, image_url, category, pet_type')
        .or('category.ilike.%toy%,category.ilike.%צעצוע%,category.ilike.%משחק%')
        .limit(10);

      if (error) throw error;

      // Filter by pet type
      const filtered = data?.filter(p => {
        if (!p.pet_type) return true;
        return p.pet_type === pet?.type;
      }) || [];

      return filtered.slice(0, 6);
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
      title={`צעצועים ל${pet?.name || 'חיית המחמד'}`}
    >
      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-pink-50 dark:bg-pink-900/20 rounded-2xl p-4 flex gap-3 mb-4"
      >
        <div className="w-10 h-10 rounded-full bg-pink-100 dark:bg-pink-900/40 flex items-center justify-center shrink-0">
          <Gamepad2 className="w-5 h-5 text-pink-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">צעצועים מותאמים</p>
          <p className="text-xs text-muted-foreground">
            נבחרו בהתאם לגודל ולאופי של {pet?.name}
          </p>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-muted/50 rounded-2xl animate-pulse aspect-square" />
          ))}
        </div>
      ) : products?.length ? (
        <div className="grid grid-cols-2 gap-3">
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card rounded-2xl border border-border overflow-hidden cursor-pointer"
              onClick={() => handleViewProduct(product.id)}
            >
              {/* Image */}
              <div className="aspect-square bg-muted">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Gamepad2 className="w-10 h-10 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className="p-3">
                <h3 className="font-medium text-foreground text-sm line-clamp-2">{product.name}</h3>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-foreground">₪{product.price}</span>
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Gamepad2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-center">
            אין צעצועים מתאימים כרגע
          </p>
        </div>
      )}
    </ServiceBottomSheet>
  );
};
