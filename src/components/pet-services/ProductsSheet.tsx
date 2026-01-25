/**
 * ProductsSheet - Personalized pet products (food, toys, treats, medical food)
 * Shows products filtered by pet type and category
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, ChevronLeft, Cookie, Utensils, Gamepad2, Stethoscope } from 'lucide-react';
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

interface ProductsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet | null;
}

const productCategories = [
  { id: 'dry_food', label: 'מזון יבש', icon: Utensils, query: 'מזון יבש,dry food' },
  { id: 'medical_food', label: 'מזון רפואי', icon: Stethoscope, query: 'מזון רפואי,medical,veterinary' },
  { id: 'toys', label: 'צעצועים', icon: Gamepad2, query: 'צעצוע,toy,משחק' },
  { id: 'treats', label: 'חטיפים', icon: Cookie, query: 'חטיף,treat,snack' },
];

export const ProductsSheet = ({ isOpen, onClose, pet }: ProductsSheetProps) => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>('dry_food');

  const activeCategoryData = productCategories.find(c => c.id === activeCategory);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products-recommendations', pet?.id, activeCategory],
    queryFn: async () => {
      const searchTerms = activeCategoryData?.query.split(',') || [];
      
      let query = supabase
        .from('business_products')
        .select('id, name, description, price, image_url, category, pet_type')
        .limit(20);

      // Build OR condition for category search
      if (searchTerms.length > 0) {
        const orConditions = searchTerms.map(term => `category.ilike.%${term.trim()}%`).join(',');
        query = query.or(orConditions);
      }

      const { data, error } = await query;

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

  const CategoryIcon = activeCategoryData?.icon || ShoppingBag;

  return (
    <ServiceBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={`מוצרים ל${pet?.name || 'חיית המחמד'}`}
    >
      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {productCategories.map((category) => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id;
          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Icon className="w-4 h-4" />
              {category.label}
            </button>
          );
        })}
      </div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary/5 rounded-2xl p-4 flex gap-3 mb-4"
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <CategoryIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{activeCategoryData?.label} מותאמים</p>
          <p className="text-xs text-muted-foreground">
            נבחרו במיוחד עבור {pet?.name} ({pet?.type === 'dog' ? 'כלב' : 'חתול'})
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
                    <CategoryIcon className="w-10 h-10 text-muted-foreground" />
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
            <CategoryIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-center">
            אין {activeCategoryData?.label} מתאימים כרגע
          </p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            נעדכן אותך כשיהיו מוצרים חדשים
          </p>
        </div>
      )}

      {/* View All Button */}
      {products && products.length > 0 && (
        <div className="mt-6">
          <Button 
            variant="outline" 
            className="w-full rounded-full"
            onClick={() => {
              onClose();
              navigate('/shop');
            }}
          >
            צפה בכל המוצרים
            <ChevronLeft className="w-4 h-4 mr-1" />
          </Button>
        </div>
      )}
    </ServiceBottomSheet>
  );
};
