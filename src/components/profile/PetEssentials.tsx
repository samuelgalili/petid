import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Pet {
  id: string;
  name: string;
  type: 'dog' | 'cat';
  breed?: string;
  age_years?: number;
  age_months?: number;
  size?: string;
  avatar_url?: string;
}

interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  category?: string;
  badge?: string;
  badgeColor?: string;
}

interface PetEssentialsProps {
  pet: Pet;
  onOpenShop: () => void;
}

export const PetEssentials = ({ pet, onOpenShop }: PetEssentialsProps) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, [pet.id, pet.type]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Fetch products matching pet type
      const { data, error } = await supabase
        .from('scraped_products')
        .select('id, product_name, main_image_url, final_price, pet_type')
        .eq('pet_type', pet.type)
        .neq('stock_status', 'out_of_stock')
        .limit(4);

      if (error) throw error;

      if (data && data.length > 0) {
        const mappedProducts: Product[] = data.map((p, index) => ({
          id: p.id,
          name: p.product_name,
          image: p.main_image_url || '',
          price: typeof p.final_price === 'string' ? parseFloat(p.final_price) : (p.final_price || 0),
          category: undefined,
          // Add badges for first few items
          badge: index === 0 ? 'מומלץ' : index === 1 ? 'עמיד' : undefined,
          badgeColor: index === 0 ? 'bg-success' : index === 1 ? 'bg-warning' : undefined,
        }));
        setProducts(mappedProducts);
      } else {
        // Fallback mock products if no data
        setProducts([
          { id: '1', name: 'מזון יבש', image: '', price: 240, badge: 'מומלץ', badgeColor: 'bg-success' },
          { id: '2', name: 'חטיף דנטלי', image: '', price: 45, badge: 'עמיד', badgeColor: 'bg-warning' },
          { id: '3', name: 'צעצוע לעיסה', image: '', price: 89 },
          { id: '4', name: 'תרסיס נגד פרעושים', image: '', price: 120 },
        ]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      // Set fallback products on error
      setProducts([
        { id: '1', name: 'מזון יבש', image: '', price: 240, badge: 'מומלץ', badgeColor: 'bg-success' },
        { id: '2', name: 'חטיף דנטלי', image: '', price: 45, badge: 'עמיד', badgeColor: 'bg-warning' },
        { id: '3', name: 'צעצוע לעיסה', image: '', price: 89 },
        { id: '4', name: 'תרסיס נגד פרעושים', image: '', price: 120 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category?: string) => {
    // Return emoji based on category
    switch (category?.toLowerCase()) {
      case 'food':
      case 'מזון':
        return '🍽️';
      case 'treats':
      case 'חטיפים':
        return '🦴';
      case 'toys':
      case 'צעצועים':
        return '🎾';
      case 'health':
      case 'בריאות':
        return '💊';
      default:
        return pet.type === 'dog' ? '🐕' : '🐱';
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-32 bg-muted animate-pulse rounded" />
          <div className="h-8 w-16 bg-muted animate-pulse rounded-full" />
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-[100px] flex-shrink-0">
              <div className="w-20 h-20 bg-muted animate-pulse rounded-2xl mx-auto mb-2" />
              <div className="h-3 w-16 bg-muted animate-pulse rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="px-4 py-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-foreground">
          הכרחיים ל{pet.name}
        </h3>
        <Button
          variant="default"
          size="sm"
          onClick={onOpenShop}
          className="rounded-full px-4 h-8 bg-primary text-primary-foreground"
        >
          <ShoppingBag className="w-3.5 h-3.5 ml-1" />
          חנות
          <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
        </Button>
      </div>

      {/* Products Grid */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {products.map((product, index) => (
          <motion.button
            key={product.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            onClick={() => navigate(`/product/${product.id}`)}
            className="flex flex-col items-center flex-shrink-0 w-[100px]"
          >
            {/* Product Image */}
            <div className="relative w-20 h-20 mb-2">
              <div className="w-full h-full rounded-2xl bg-muted/50 border border-border/30 overflow-hidden flex items-center justify-center">
                {product.image ? (
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl">{getCategoryIcon(product.category)}</span>
                )}
              </div>
              
              {/* Badge */}
              {product.badge && (
                <span className={`absolute -top-1 -right-1 px-1.5 py-0.5 text-[9px] font-bold text-white rounded-full ${product.badgeColor}`}>
                  {product.badge}
                </span>
              )}
            </div>
            
            {/* Product Name */}
            <span className="text-xs font-medium text-foreground text-center line-clamp-1 mb-0.5">
              {product.name}
            </span>
            
            {/* Price */}
            <span className="text-xs font-bold text-primary">
              ₪{product.price}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};
