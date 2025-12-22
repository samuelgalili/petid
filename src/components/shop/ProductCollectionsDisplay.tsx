import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronLeft, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface ProductCollectionsDisplayProps {
  businessId: string;
}

export const ProductCollectionsDisplay = ({ businessId }: ProductCollectionsDisplayProps) => {
  const navigate = useNavigate();

  const { data: collections = [] } = useQuery({
    queryKey: ['product-collections-display', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_collections')
        .select(`
          *,
          collection_products(
            product_id,
            business_products(id, name, image_url, price, sale_price)
          )
        `)
        .eq('business_id', businessId)
        .order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  if (collections.length === 0) return null;

  return (
    <div className="space-y-4">
      {collections.map((collection: any) => {
        const products = collection.collection_products?.map((cp: any) => cp.business_products).filter(Boolean) || [];
        
        if (products.length === 0) return null;

        return (
          <motion.div
            key={collection.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">{collection.name}</h3>
                {collection.is_featured && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
                    מומלץ
                  </span>
                )}
              </div>
              <button className="text-xs text-primary flex items-center gap-0.5">
                הכל
                <ChevronLeft className="w-3 h-3" />
              </button>
            </div>

            <ScrollArea className="w-full">
              <div className="flex gap-3 px-4 pb-2">
                {products.map((product: any) => (
                  <motion.div
                    key={product.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(`/product/${product.id}`)}
                    className="flex-shrink-0 w-32 cursor-pointer"
                  >
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                      {product.sale_price && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">
                          מבצע
                        </div>
                      )}
                    </div>
                    <div className="mt-1.5 px-1">
                      <p className="text-xs font-medium truncate">{product.name}</p>
                      <div className="flex items-center gap-1">
                        {product.sale_price ? (
                          <>
                            <span className="text-xs font-bold text-primary">₪{product.sale_price}</span>
                            <span className="text-[10px] text-muted-foreground line-through">₪{product.price}</span>
                          </>
                        ) : (
                          <span className="text-xs font-bold">₪{product.price}</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </motion.div>
        );
      })}
    </div>
  );
};
