import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingCart, Star, ChevronLeft, Plus, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

interface Pet {
  id: string;
  name: string;
  type: string;
  breed?: string;
  avatar_url?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  sale_price?: number;
  image_url: string;
  category?: string;
  average_rating?: number;
  pet_type?: string;
}

interface PetShopViewProps {
  pet: Pet;
  onBack: () => void;
}

const categories = [
  { id: 'all', label: 'הכל' },
  { id: 'food', label: 'מזון' },
  { id: 'toys', label: 'צעצועים' },
  { id: 'grooming', label: 'טיפוח' },
  { id: 'health', label: 'בריאות' },
  { id: 'accessories', label: 'אביזרים' },
];

export const PetShopView = ({ pet, onBack }: PetShopViewProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { addToCart, getTotalItems } = useCart();
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  // Fetch products based on pet type
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        let query = supabase
          .from('business_products')
          .select('*')
          .eq('in_stock', true)
          .limit(20);

        // Filter by pet type if applicable
        if (pet.type === 'dog' || pet.type === 'cat') {
          query = query.or(`pet_type.eq.${pet.type},pet_type.is.null`);
        }

        const { data, error } = await query;
        if (error) throw error;
        setProducts(data || []);
        setFilteredProducts(data || []);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [pet.type]);

  // Filter products by category and search
  useEffect(() => {
    let filtered = products;

    if (activeCategory !== 'all') {
      filtered = filtered.filter(p => 
        p.category?.toLowerCase().includes(activeCategory.toLowerCase())
      );
    }

    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  }, [activeCategory, searchQuery, products]);

  const handleAddToCart = async (product: Product) => {
    setAddingToCart(product.id);
    try {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.sale_price || product.price,
        image: product.image_url,
        quantity: 1,
      });
      toast.success(`${product.name} נוסף לעגלה`);
    } catch (error) {
      toast.error('שגיאה בהוספה לעגלה');
    } finally {
      setTimeout(() => setAddingToCart(null), 300);
    }
  };

  const renderStars = (rating: number = 4) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted'}`}
          />
        ))}
      </div>
    );
  };

  const cartCount = getTotalItems();

  return (
    <motion.div
      className="fixed inset-0 bg-background z-50 overflow-hidden flex flex-col"
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
    >
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 bg-background border-b border-border/30">
        {/* Top Row - Back, Pet Info, Cart */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">חזרה</span>
          </button>

          {/* Pet Info */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              מוצרים ל{pet.name}
            </span>
            {pet.avatar_url && (
              <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-primary/30">
                <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Cart */}
          <button className="relative p-2 bg-muted/50 rounded-full hover:bg-muted transition-colors">
            <ShoppingCart className="w-5 h-5 text-foreground" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="חפש מוצרים..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pr-11 pl-4 bg-muted/50 rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-muted/30 rounded-2xl h-64 animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-muted-foreground text-sm">לא נמצאו מוצרים</p>
            <p className="text-muted-foreground/60 text-xs mt-1">נסה לשנות את הקטגוריה או החיפוש</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-muted/30 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Product Image */}
                  <div className="relative aspect-square bg-gradient-to-br from-muted/50 to-muted p-4">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                    {product.sale_price && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                        מבצע
                      </span>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-3 space-y-2">
                    <h3 className="font-medium text-sm text-foreground line-clamp-2 leading-tight min-h-[2.5rem]">
                      {product.name}
                    </h3>

                    {/* Price */}
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-foreground">
                        ₪{product.sale_price || product.price}
                      </span>
                      {product.sale_price && (
                        <span className="text-xs text-muted-foreground line-through">
                          ₪{product.price}
                        </span>
                      )}
                    </div>

                    {/* Rating */}
                    {renderStars(product.average_rating || 4)}

                    {/* Add to Cart Button */}
                    <motion.button
                      onClick={() => handleAddToCart(product)}
                      disabled={addingToCart === product.id}
                      whileTap={{ scale: 0.95 }}
                      className="w-full mt-2 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                      {addingToCart === product.id ? (
                        <motion.div
                          initial={{ rotate: 0 }}
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.5 }}
                        >
                          <Plus className="w-4 h-4" />
                        </motion.div>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" />
                          <span>הוסף לעגלה</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PetShopView;
