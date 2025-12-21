import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingBag, Tag, Plus, X, MoreVertical, Trash2, Edit2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface BusinessProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  image_url: string;
  category: string | null;
  in_stock: boolean;
  is_featured: boolean;
}

interface BusinessShopTabProps {
  businessId: string;
  isOwner?: boolean;
}

export const BusinessShopTab = ({ businessId, isOwner }: BusinessShopTabProps) => {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ['business-products', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_products')
        .select('*')
        .eq('business_id', businessId)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BusinessProduct[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('business_products')
        .delete()
        .eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-products', businessId] });
      toast.success('המוצר נמחק');
      setSelectedProduct(null);
    },
    onError: () => {
      toast.error('שגיאה במחיקה');
    }
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ productId, isFeatured }: { productId: string; isFeatured: boolean }) => {
      const { error } = await supabase
        .from('business_products')
        .update({ is_featured: !isFeatured })
        .eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-products', businessId] });
      toast.success('המוצר עודכן');
    }
  });

  // Handle long press for mobile
  const handleLongPress = (productId: string) => {
    if (isOwner) {
      setSelectedProduct(productId);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-1 p-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="animate-pulse aspect-square bg-muted" />
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
          <ShoppingBag className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="font-bold text-lg mb-1">אין מוצרים עדיין</h3>
        <p className="text-muted-foreground text-sm mb-4">
          {isOwner ? 'הוסף מוצרים לחנות שלך' : 'העסק עדיין לא הוסיף מוצרים'}
        </p>
        {isOwner && (
          <Button className="gap-2 rounded-xl">
            <Plus className="w-4 h-4" />
            הוסף מוצר
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Instagram-style Grid */}
      <div className="grid grid-cols-3 gap-0.5">
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: index * 0.03 }}
            className="relative aspect-square cursor-pointer group"
            onContextMenu={(e) => {
              e.preventDefault();
              handleLongPress(product.id);
            }}
            onClick={() => isOwner && selectedProduct !== product.id && setSelectedProduct(null)}
          >
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            
            {/* Hover overlay with price */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white font-bold">₪{product.price}</span>
            </div>

            {/* Sale Badge - Small */}
            {product.original_price && product.original_price > product.price && (
              <div className="absolute top-1 right-1">
                <Tag className="w-3 h-3 text-red-500" />
              </div>
            )}

            {/* Featured indicator */}
            {product.is_featured && (
              <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-primary" />
            )}

            {/* Out of Stock */}
            {!product.in_stock && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <span className="text-xs font-bold text-muted-foreground">אזל</span>
              </div>
            )}

            {/* Quick Actions for Owner (on selection) */}
            <AnimatePresence>
              {isOwner && selectedProduct === product.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 bg-black/70 flex items-center justify-center gap-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="absolute top-2 right-2 text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  
                  <button 
                    className="flex flex-col items-center gap-1 text-white"
                    onClick={() => toggleFeaturedMutation.mutate({ productId: product.id, isFeatured: product.is_featured || false })}
                  >
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Edit2 className="w-5 h-5" />
                    </div>
                    <span className="text-xs">{product.is_featured ? 'הסר מומלץ' : 'סמן מומלץ'}</span>
                  </button>
                  
                  <button 
                    className="flex flex-col items-center gap-1 text-white"
                    onClick={() => deleteMutation.mutate(product.id)}
                  >
                    <div className="w-10 h-10 rounded-full bg-red-500/50 flex items-center justify-center">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <span className="text-xs">מחק</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}

        {/* Add Product Button for Owner - as grid item */}
        {isOwner && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="aspect-square bg-muted border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <Plus className="w-6 h-6 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">הוסף</span>
          </motion.button>
        )}
      </div>

      {/* Floating tip for owners */}
      {isOwner && products.length > 0 && !selectedProduct && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-muted-foreground mt-4 px-4"
        >
          💡 לחץ לחיצה ארוכה על מוצר לעריכה מהירה
        </motion.p>
      )}
    </div>
  );
};
