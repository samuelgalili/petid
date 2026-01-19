/**
 * Pet Product Carousels - קרוסלות מוצרים מומלצים לחיית מחמד
 * מזון יבש (3 מוצרים), צעצועים, הדברה
 */

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ShoppingBag, 
  ChevronLeft, 
  Star,
  Sparkles,
  Package,
  Bug
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface PetProductCarouselsProps {
  petId: string;
  petName: string;
  petType: string;
  petBreed: string | null;
  petAge: string;
}

interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  category: string;
  petType: string;
}

interface ProductCategory {
  key: string;
  title: string;
  subtitle: string;
  icon: typeof Package;
  color: string;
  bgColor: string;
  limit: number;
  dbCategory: string[];
}

export const PetProductCarousels = ({ 
  petId, 
  petName, 
  petType, 
  petBreed,
  petAge 
}: PetProductCarouselsProps) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [productsByCategory, setProductsByCategory] = useState<Record<string, Product[]>>({});
  const [loading, setLoading] = useState(true);

  // מיפוי סוג חיה לעברית
  const petTypeHebrew = petType === 'dog' ? 'כלבים' : petType === 'cat' ? 'חתולים' : 'חיות מחמד';
  const petTypeSingle = petType === 'dog' ? 'כלב' : petType === 'cat' ? 'חתול' : 'חיית מחמד';

  // קטגוריות מוצרים
  const categories: ProductCategory[] = [
    { 
      key: 'dry-food', 
      title: `מזון יבש ל${petTypeSingle}`, 
      subtitle: `מזון מומלץ ל${petName}`,
      icon: Package,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      limit: 3,
      dbCategory: ['dry-food', 'food', 'מזון יבש']
    },
    { 
      key: 'toys', 
      title: `צעצועים ל${petTypeSingle}`, 
      subtitle: 'משחקים והעשרה',
      icon: Sparkles,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
      limit: 6,
      dbCategory: ['toys', 'צעצועים', 'משחקים']
    },
    { 
      key: 'pest-control', 
      title: 'הדברה וטיפוח', 
      subtitle: 'הגנה מפני פרעושים וקרציות',
      icon: Bug,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      limit: 6,
      dbCategory: ['pest-control', 'הדברה', 'flea', 'tick', 'פרעושים', 'קרציות']
    },
  ];

  // מוצרים לדוגמה כשאין מוצרים אמיתיים
  const getPlaceholderProducts = (category: ProductCategory): Product[] => {
    const placeholders: Record<string, Product[]> = {
      'dry-food': [
        { id: 'p1', name: `מזון יבש פרימיום ל${petTypeSingle}`, image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=300', price: 89, originalPrice: 119, rating: 4.8, category: 'dry-food', petType },
        { id: 'p2', name: `מזון הוליסטי ל${petTypeSingle} בוגר`, image: 'https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=300', price: 129, rating: 4.9, category: 'dry-food', petType },
        { id: 'p3', name: `מזון רפואי ל${petTypeSingle}`, image: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=300', price: 159, originalPrice: 189, rating: 4.7, category: 'dry-food', petType },
      ],
      'toys': [
        { id: 't1', name: `צעצוע לעיסה ל${petTypeSingle}`, image: 'https://images.unsplash.com/photo-1535294435445-d7249524ef2e?w=300', price: 35, rating: 4.6, category: 'toys', petType },
        { id: 't2', name: 'כדור אינטראקטיבי', image: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=300', price: 59, originalPrice: 79, rating: 4.8, category: 'toys', petType },
        { id: 't3', name: 'חבל משיכה', image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=300', price: 29, rating: 4.5, category: 'toys', petType },
      ],
      'pest-control': [
        { id: 'h1', name: 'טיפות נגד פרעושים', image: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=300', price: 89, rating: 4.9, category: 'pest-control', petType },
        { id: 'h2', name: 'קולר הדברה', image: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=300', price: 129, originalPrice: 159, rating: 4.7, category: 'pest-control', petType },
        { id: 'h3', name: 'שמפו טיפולי', image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=300', price: 45, rating: 4.6, category: 'pest-control', petType },
      ],
    };
    return placeholders[category.key] || [];
  };

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const results: Record<string, Product[]> = {};

        for (const category of categories) {
          // נסה לטעון מהדאטאבייס
          const { data, error } = await supabase
            .from('business_products')
            .select('id, name, image_url, price, sale_price, average_rating, category, pet_type')
            .in('category', category.dbCategory)
            .or(`pet_type.eq.${petType},pet_type.is.null`)
            .eq('in_stock', true)
            .limit(category.limit);

          if (data && data.length > 0) {
            results[category.key] = data.map(p => ({
              id: p.id,
              name: p.name,
              image: p.image_url,
              price: p.sale_price || p.price,
              originalPrice: p.sale_price ? p.price : undefined,
              rating: p.average_rating || undefined,
              category: p.category || category.key,
              petType: p.pet_type || petType,
            }));
          } else {
            // אם אין מוצרים, השתמש ב-placeholders
            results[category.key] = getPlaceholderProducts(category).slice(0, category.limit);
          }
        }

        setProductsByCategory(results);
      } catch (error) {
        console.error('Error fetching products:', error);
        // במקרה של שגיאה, השתמש ב-placeholders
        const fallback: Record<string, Product[]> = {};
        categories.forEach(cat => {
          fallback[cat.key] = getPlaceholderProducts(cat).slice(0, cat.limit);
        });
        setProductsByCategory(fallback);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [petType]);

  const handleAddToCart = (product: Product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
    });
    toast.success(`${product.name} נוסף לעגלה! 🛒`);
  };

  const handleNavigateToShop = (category: string) => {
    navigate('/shop', { 
      state: { 
        petId, 
        petBreed, 
        petAge, 
        petType, 
        petName,
        category 
      } 
    });
  };

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        {categories.map((cat) => (
          <div key={cat.key} className="animate-pulse">
            <div className="h-5 bg-muted rounded w-32 mb-3" />
            <div className="flex gap-3 overflow-hidden">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-36">
                  <div className="h-28 bg-muted rounded-xl mb-2" />
                  <div className="h-4 bg-muted rounded w-24 mb-1" />
                  <div className="h-4 bg-muted rounded w-16" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8" dir="rtl">
      {categories.map((category, categoryIndex) => {
        const products = productsByCategory[category.key] || [];
        const Icon = category.icon;
        
        if (products.length === 0) return null;

        return (
          <div key={category.key}>
            {/* כותרת קטגוריה - עיצוב משופר */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${category.bgColor} flex items-center justify-center shadow-sm`}>
                  <Icon className={`w-5 h-5 ${category.color}`} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">{category.title}</h3>
                  <p className="text-xs text-muted-foreground">{category.subtitle}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-primary hover:text-primary/80 h-8 px-3 rounded-full"
                onClick={() => handleNavigateToShop(category.key)}
              >
                הכל
                <ChevronLeft className="w-4 h-4 mr-1" />
              </Button>
            </div>

            {/* קרוסלת מוצרים - עיצוב משופר */}
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
              {products.map((product, productIndex) => (
                <Card 
                  key={product.id}
                  className="flex-shrink-0 w-40 overflow-hidden border-0 shadow-md hover:shadow-xl transition-all cursor-pointer group rounded-2xl bg-card"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  {/* תמונה עם אפקט hover */}
                  <div className="relative h-32 overflow-hidden bg-gradient-to-br from-muted to-muted/50">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=300';
                      }}
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    {/* תגית מבצע */}
                    {product.originalPrice && (
                      <span className="absolute top-2 right-2 text-[10px] font-bold bg-gradient-to-r from-red-500 to-pink-500 text-white px-2 py-1 rounded-full shadow-sm">
                        🔥 מבצע
                      </span>
                    )}
                    
                    {/* Quick add button on hover */}
                    <Button
                      size="sm"
                      className="absolute bottom-2 left-2 right-2 h-8 text-[10px] bg-white/90 backdrop-blur-sm text-foreground hover:bg-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg font-semibold"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(product);
                      }}
                    >
                      <ShoppingBag className="w-3 h-3 ml-1" />
                      הוסף לסל
                    </Button>
                  </div>

                  {/* תוכן */}
                  <div className="p-3">
                    <h4 className="text-sm font-semibold line-clamp-2 mb-2 min-h-[40px] text-foreground">{product.name}</h4>
                    
                    {/* דירוג */}
                    {product.rating && (
                      <div className="flex items-center gap-1 mb-2">
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${i < Math.floor(product.rating!) ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted'}`} 
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium">({product.rating.toFixed(1)})</span>
                      </div>
                    )}

                    {/* מחיר */}
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-primary">₪{product.price}</span>
                      {product.originalPrice && (
                        <span className="text-xs text-muted-foreground line-through">₪{product.originalPrice}</span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PetProductCarousels;
