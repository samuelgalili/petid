import { useState } from 'react';
import { LazyImage } from '@/components/common/LazyImage';
import { motion } from 'framer-motion';
import { Heart, Star, ShoppingCart, BadgeCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';

interface ProductCardProps {
  product: any;
  compact?: boolean;
  viewMode?: 'grid' | 'list';
  showDiscount?: boolean;
  isInWishlist?: boolean;
}

export const ProductCard = ({ 
  product, 
  compact, 
  viewMode = 'grid', 
  showDiscount,
  isInWishlist: initialIsInWishlist = false 
}: ProductCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const queryClient = useQueryClient();
  const [isInWishlist, setIsInWishlist] = useState(initialIsInWishlist);

  const business = product.business_profiles;
  const hasDiscount = product.sale_price && product.sale_price < product.price;
  const discountPercent = hasDiscount 
    ? Math.round((1 - product.sale_price / product.price) * 100) 
    : 0;

  const wishlistMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      if (isInWishlist) {
        await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', product.id);
      } else {
        await supabase
          .from('wishlists')
          .insert({ user_id: user.id, product_id: product.id });
      }
    },
    onSuccess: () => {
      setIsInWishlist(!isInWishlist);
      queryClient.invalidateQueries({ queryKey: ['user-wishlist'] });
      toast.success(isInWishlist ? 'הוסר מהרשימה' : 'נוסף לרשימת המשאלות');
    },
  });

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({
      id: product.id,
      name: product.name,
      price: product.sale_price || product.price,
      image: product.image_url,
    });
    toast.success('נוסף לסל');
  };

  if (viewMode === 'list') {
    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate(`/product/${product.id}`)}
        className="flex gap-3 p-3 bg-card border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
      >
        <div className="relative w-24 h-24 flex-shrink-0">
          <LazyImage
            src={product.image_url}
            alt={product.name}
            className="w-full h-full rounded-lg"
          />
          {hasDiscount && showDiscount && (
            <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              -{discountPercent}%
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{product.name}</h3>
          
          {business && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs text-muted-foreground truncate">
                {business.business_name}
              </span>
              {business.is_verified && (
                <BadgeCheck className="w-3 h-3 text-primary flex-shrink-0" />
              )}
            </div>
          )}

          {product.average_rating > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs">{product.average_rating}</span>
              <span className="text-xs text-muted-foreground">
                ({product.review_count})
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            {hasDiscount ? (
              <>
                <span className="font-bold text-primary">₪{product.sale_price}</span>
                <span className="text-xs text-muted-foreground line-through">
                  ₪{product.price}
                </span>
              </>
            ) : (
              <span className="font-bold">₪{product.price}</span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              wishlistMutation.mutate();
            }}
          >
            <Heart className={`w-4 h-4 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleAddToCart}
          >
            <ShoppingCart className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/product/${product.id}`)}
      className={`bg-card border rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow ${
        compact ? 'min-w-[160px]' : ''
      }`}
    >
      <div className="relative aspect-square">
        <LazyImage
          src={product.image_url}
          alt={product.name}
          className="w-full h-full"
        />
        
        {/* Wishlist button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            wishlistMutation.mutate();
          }}
          className="absolute top-2 left-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors"
        >
          <Heart className={`w-4 h-4 ${isInWishlist ? 'fill-red-500 text-red-500' : ''}`} />
        </button>

        {/* Discount badge */}
        {hasDiscount && (
          <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
            -{discountPercent}%
          </span>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-medium text-sm truncate">{product.name}</h3>
        
        {business && !compact && (
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs text-muted-foreground truncate">
              {business.business_name}
            </span>
            {business.is_verified && (
              <BadgeCheck className="w-3 h-3 text-primary flex-shrink-0" />
            )}
          </div>
        )}

        {product.average_rating > 0 && !compact && (
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs">{product.average_rating}</span>
            <span className="text-xs text-muted-foreground">
              ({product.review_count})
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            {hasDiscount ? (
              <>
                <span className="font-bold text-primary">₪{product.sale_price}</span>
                {!compact && (
                  <span className="text-xs text-muted-foreground line-through">
                    ₪{product.price}
                  </span>
                )}
              </>
            ) : (
              <span className="font-bold">₪{product.price}</span>
            )}
          </div>

          {!compact && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
