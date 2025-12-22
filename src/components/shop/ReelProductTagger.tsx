import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, Search, Package, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';

interface ReelProductTag {
  productId: string;
  productName: string;
  productPrice: number;
  productImage: string;
  positionX: number;
  positionY: number;
  timestampSeconds?: number;
}

interface ReelProductTaggerProps {
  onTagProduct: (tag: ReelProductTag) => void;
  onRemoveTag: (productId: string) => void;
  tags: ReelProductTag[];
  isActive: boolean;
  onToggle: () => void;
  videoDuration?: number;
}

export const ReelProductTagger = ({ 
  onTagProduct, 
  onRemoveTag, 
  tags, 
  isActive, 
  onToggle,
  videoDuration = 0
}: ReelProductTaggerProps) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTimestamp, setSelectedTimestamp] = useState(0);

  const { data: business } = useQuery({
    queryKey: ['my-business', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['my-products', business?.id],
    queryFn: async () => {
      if (!business) return [];
      const { data, error } = await supabase
        .from('business_products')
        .select('id, name, image_url, price')
        .eq('business_id', business.id);
      if (error) throw error;
      return data;
    },
    enabled: !!business && isActive,
  });

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectProduct = (product: any) => {
    onTagProduct({
      productId: product.id,
      productName: product.name,
      productPrice: product.price,
      productImage: product.image_url,
      positionX: 50,
      positionY: 80,
      timestampSeconds: selectedTimestamp,
    });
    setSearchQuery('');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!business) return null;

  return (
    <div className="space-y-2">
      {/* Toggle Button */}
      <Button
        variant={isActive ? 'default' : 'outline'}
        size="sm"
        onClick={onToggle}
        className="w-full"
      >
        <ShoppingBag className="w-4 h-4 ml-2" />
        תייג מוצרים ברילס
      </Button>

      {/* Product Picker */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-background border rounded-xl overflow-hidden"
          >
            <div className="p-3 space-y-3">
              {/* Timestamp selector */}
              {videoDuration > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    הצג מוצר בזמן:
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={videoDuration}
                      value={selectedTimestamp}
                      onChange={(e) => setSelectedTimestamp(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-10">
                      {formatTime(selectedTimestamp)}
                    </span>
                  </div>
                </div>
              )}

              <div className="relative">
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="חפש מוצר..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-8 h-8 text-sm"
                />
              </div>
            </div>

            <ScrollArea className="max-h-40">
              <div className="p-2 space-y-1">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    לא נמצאו מוצרים
                  </div>
                ) : (
                  filteredProducts.map((product) => {
                    const isTagged = tags.some(t => t.productId === product.id);
                    return (
                      <motion.button
                        key={product.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => isTagged ? onRemoveTag(product.id) : handleSelectProduct(product)}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg transition-colors ${
                          isTagged ? 'bg-primary/10 border border-primary' : 'hover:bg-muted'
                        }`}
                      >
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <div className="flex-1 text-right">
                          <p className="text-sm font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">₪{product.price}</p>
                        </div>
                        {isTagged && (
                          <X className="w-4 h-4 text-primary" />
                        )}
                      </motion.button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tagged Products Preview */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <motion.div
              key={tag.productId}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded-full text-xs"
            >
              <Package className="w-3 h-3" />
              <span className="max-w-20 truncate">{tag.productName}</span>
              {tag.timestampSeconds !== undefined && (
                <span className="text-muted-foreground">
                  @{formatTime(tag.timestampSeconds)}
                </span>
              )}
              <button
                onClick={() => onRemoveTag(tag.productId)}
                className="hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
