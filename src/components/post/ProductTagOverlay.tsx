import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ProductTag {
  id: string;
  product_id: string;
  position_x: number;
  position_y: number;
  product?: {
    id: string;
    name: string;
    price: number;
    image_url: string;
    business_id: string;
  };
}

interface ProductTagOverlayProps {
  tags: ProductTag[];
  showTags: boolean;
  onToggleTags: () => void;
}

export const ProductTagOverlay = ({ tags, showTags, onToggleTags }: ProductTagOverlayProps) => {
  const navigate = useNavigate();
  const [activeTag, setActiveTag] = useState<string | null>(null);

  if (!tags || tags.length === 0) return null;

  return (
    <>
      {/* Toggle Button */}
      <Button
        variant="secondary"
        size="sm"
        className="absolute bottom-3 left-3 gap-1 bg-background/80 backdrop-blur-sm rounded-full px-3 h-8"
        onClick={onToggleTags}
      >
        <ShoppingBag className="w-4 h-4" />
        <span className="text-xs font-medium">{tags.length}</span>
      </Button>

      {/* Tags */}
      <AnimatePresence>
        {showTags && tags.map((tag) => (
          <motion.div
            key={tag.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute cursor-pointer"
            style={{
              left: `${tag.position_x}%`,
              top: `${tag.position_y}%`,
              transform: 'translate(-50%, -100%)',
            }}
            onClick={() => setActiveTag(activeTag === tag.id ? null : tag.id)}
          >
            {/* Dot */}
            <div className="w-3 h-3 bg-primary rounded-full border-2 border-background shadow-lg" />
            
            {/* Tag Content */}
            <AnimatePresence>
              {activeTag === tag.id && tag.product && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="bg-background rounded-xl p-3 shadow-xl border min-w-[160px]">
                    <div className="flex gap-2">
                      <img
                        src={tag.product.image_url}
                        alt={tag.product.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1">{tag.product.name}</p>
                        <p className="text-primary font-bold">₪{tag.product.price}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full mt-2 h-8 text-xs"
                      onClick={() => navigate(`/shop?product=${tag.product?.id}`)}
                    >
                      <ShoppingBag className="w-3 h-3 mr-1" />
                      צפה במוצר
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>
    </>
  );
};
