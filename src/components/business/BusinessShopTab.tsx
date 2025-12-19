import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingBag, Tag, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 p-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="aspect-square bg-muted rounded-xl" />
            <div className="h-4 bg-muted rounded mt-2 w-3/4" />
            <div className="h-3 bg-muted rounded mt-1 w-1/2" />
          </div>
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
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            הוסף מוצר
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
        <Badge variant="default" className="cursor-pointer whitespace-nowrap">הכל</Badge>
        {Array.from(new Set(products.map(p => p.category).filter(Boolean))).map((cat) => (
          <Badge key={cat} variant="outline" className="cursor-pointer whitespace-nowrap">
            {cat}
          </Badge>
        ))}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 gap-3">
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group cursor-pointer"
          >
            <div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              
              {/* Sale Badge */}
              {product.original_price && product.original_price > product.price && (
                <Badge className="absolute top-2 right-2 bg-red-500 text-white">
                  <Tag className="w-3 h-3 mr-1" />
                  מבצע
                </Badge>
              )}

              {/* Featured Badge */}
              {product.is_featured && (
                <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
                  מומלץ
                </Badge>
              )}

              {/* Out of Stock */}
              {!product.in_stock && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                  <span className="font-bold text-muted-foreground">אזל</span>
                </div>
              )}
            </div>

            <div className="mt-2">
              <h4 className="font-medium text-sm line-clamp-1">{product.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-bold text-primary">₪{product.price}</span>
                {product.original_price && product.original_price > product.price && (
                  <span className="text-muted-foreground text-sm line-through">
                    ₪{product.original_price}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Product Button for Owner */}
      {isOwner && (
        <Button className="w-full mt-6 gap-2">
          <Plus className="w-4 h-4" />
          הוסף מוצר
        </Button>
      )}
    </div>
  );
};
