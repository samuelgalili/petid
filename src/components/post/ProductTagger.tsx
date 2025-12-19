import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ShoppingBag, X, Search, Plus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProductTag {
  productId: string;
  productName: string;
  productPrice: number;
  productImage: string;
  positionX: number;
  positionY: number;
}

interface ProductTaggerProps {
  imageUrl: string;
  tags: ProductTag[];
  onTagsChange: (tags: ProductTag[]) => void;
}

export const ProductTagger = ({ imageUrl, tags, onTagsChange }: ProductTaggerProps) => {
  const { user } = useAuth();
  const imageRef = useRef<HTMLDivElement>(null);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch user's business products
  const { data: products } = useQuery({
    queryKey: ['my-business-products', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // First get user's business
      const { data: business } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!business) return [];

      // Then get products
      const { data: products, error } = await supabase
        .from('business_products')
        .select('*')
        .eq('business_id', business.id)
        .order('name');

      if (error) throw error;
      return products;
    },
    enabled: !!user && isAddingTag,
  });

  const filteredProducts = products?.filter(p => 
    p.name.includes(searchQuery) || 
    (p.category && p.category.includes(searchQuery))
  );

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || !isAddingTag) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setPendingPosition({ x, y });
  };

  const handleSelectProduct = (product: any) => {
    if (!pendingPosition) return;

    const newTag: ProductTag = {
      productId: product.id,
      productName: product.name,
      productPrice: product.price,
      productImage: product.image_url,
      positionX: pendingPosition.x,
      positionY: pendingPosition.y,
    };

    onTagsChange([...tags, newTag]);
    setPendingPosition(null);
    setIsAddingTag(false);
    setSearchQuery('');
  };

  const handleRemoveTag = (index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="relative">
      {/* Image with Tags */}
      <div 
        ref={imageRef}
        className={`relative ${isAddingTag ? 'cursor-crosshair' : ''}`}
        onClick={handleImageClick}
      >
        <img
          src={imageUrl}
          alt="Tagged"
          className="w-full aspect-square object-cover rounded-xl"
        />

        {/* Existing Tags */}
        {tags.map((tag, index) => (
          <motion.div
            key={index}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute"
            style={{
              left: `${tag.positionX}%`,
              top: `${tag.positionY}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="relative group">
              <div className="w-4 h-4 bg-primary rounded-full border-2 border-background shadow-lg" />
              
              {/* Tag Preview */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-background rounded-lg p-2 shadow-lg border whitespace-nowrap">
                  <p className="text-xs font-medium">{tag.productName}</p>
                  <p className="text-xs text-primary font-bold">₪{tag.productPrice}</p>
                </div>
              </div>

              {/* Remove Button */}
              <button
                className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveTag(index);
                }}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        ))}

        {/* Pending Position Marker */}
        {pendingPosition && (
          <div
            className="absolute w-6 h-6 border-2 border-primary bg-primary/20 rounded-full animate-pulse"
            style={{
              left: `${pendingPosition.x}%`,
              top: `${pendingPosition.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        )}
      </div>

      {/* Add Tag Button */}
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant={isAddingTag ? "default" : "outline"}
          size="sm"
          className="gap-2 flex-1"
          onClick={() => {
            setIsAddingTag(!isAddingTag);
            setPendingPosition(null);
          }}
        >
          {isAddingTag ? (
            <>
              <Check className="w-4 h-4" />
              סיום תיוג
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              תייג מוצרים ({tags.length})
            </>
          )}
        </Button>
      </div>

      {/* Instructions */}
      {isAddingTag && !pendingPosition && (
        <p className="text-sm text-muted-foreground text-center mt-2">
          לחץ על התמונה במיקום המוצר
        </p>
      )}

      {/* Product Selection Panel */}
      <AnimatePresence>
        {pendingPosition && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-3 bg-muted rounded-xl p-3"
          >
            <div className="relative mb-2">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="חפש מוצר..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9"
              />
            </div>

            <ScrollArea className="h-48">
              <div className="space-y-2">
                {filteredProducts?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    לא נמצאו מוצרים
                  </p>
                ) : (
                  filteredProducts?.map((product) => (
                    <button
                      key={product.id}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-background transition-colors"
                      onClick={() => handleSelectProduct(product)}
                    >
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div className="flex-1 text-right">
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-primary text-sm font-bold">₪{product.price}</p>
                      </div>
                      <Plus className="w-5 h-5 text-muted-foreground" />
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>

            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={() => setPendingPosition(null)}
            >
              ביטול
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
