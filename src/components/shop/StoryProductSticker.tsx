import { motion } from 'framer-motion';
import { ShoppingBag, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface StoryProductStickerProps {
  storyId: string;
}

export const StoryProductSticker = ({ storyId }: StoryProductStickerProps) => {
  const navigate = useNavigate();

  const { data: productTags = [] } = useQuery({
    queryKey: ['story-product-tags', storyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('story_product_tags')
        .select(`
          *,
          business_products(id, name, image_url, price, sale_price)
        `)
        .eq('story_id', storyId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!storyId,
  });

  if (productTags.length === 0) return null;

  return (
    <>
      {productTags.map((tag: any) => {
        const product = tag.business_products;
        if (!product) return null;

        return (
          <motion.div
            key={tag.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              position: 'absolute',
              left: `${tag.position_x}%`,
              top: `${tag.position_y}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className="z-20"
          >
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/product/${product.id}`)}
              className="flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg"
            >
              <div className="relative">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <ShoppingBag className="w-3 h-3 text-white" />
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-xs font-medium text-foreground max-w-24 truncate">
                  {product.name}
                </p>
                <div className="flex items-center gap-1">
                  {product.sale_price ? (
                    <>
                      <span className="text-xs font-bold text-primary">
                        ₪{product.sale_price}
                      </span>
                      <span className="text-[10px] text-muted-foreground line-through">
                        ₪{product.price}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs font-bold text-primary">
                      ₪{product.price}
                    </span>
                  )}
                </div>
              </div>

              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </motion.button>
          </motion.div>
        );
      })}
    </>
  );
};
