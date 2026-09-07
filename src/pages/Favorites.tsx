import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Heart, Loader2, ShoppingCart, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import BottomNav from "@/components/BottomNav";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { getShopProducts, type MipoProduct } from "@/lib/mipoApi";

const readFavorites = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem("mipo-favorites") || "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
};

const toPrice = (value: MipoProduct["price"] | MipoProduct["sale_price"]) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const Favorites = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState(readFavorites);
  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ["shop-products-aws"],
    queryFn: getShopProducts,
    staleTime: 1000 * 60 * 2,
  });

  const favoriteProducts = useMemo(() => products
    .filter((product) => favorites.includes(product.id) && product.in_stock !== false)
    .map((product) => {
      const regularPrice = toPrice(product.price);
      const salePrice = toPrice(product.sale_price);
      const price = salePrice > 0 ? salePrice : regularPrice;
      return {
        id: product.id,
        name: product.name,
        description: product.description || "",
        image: product.image_url || "/placeholder.svg",
        price,
        originalPrice: salePrice > 0 && regularPrice > salePrice ? regularPrice : null,
      };
    }), [favorites, products]);

  const removeFavorite = (productId: string) => {
    const nextFavorites = favorites.filter((id) => id !== productId);
    setFavorites(nextFavorites);
    localStorage.setItem("mipo-favorites", JSON.stringify(nextFavorites));
    toast({ title: "הוסר מהמועדפים", duration: 2000 });
  };

  const addProduct = (product: (typeof favoriteProducts)[number]) => {
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
    });
  };

  const handleAddToCart = (product: (typeof favoriteProducts)[number]) => {
    addProduct(product);
    toast({
      title: "נוסף לעגלה",
      description: `${product.name} נוסף לעגלה שלך`,
      duration: 2000,
    });
  };

  return (
    <div className="mipo-shell min-h-screen bg-white pb-20" dir="rtl">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="חזרה">
            <ArrowRight className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">המועדפים שלי</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-20" role="status">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="sr-only">טוען מוצרים</span>
          </div>
        ) : isError ? (
          <div className="py-16 text-center space-y-4" role="alert">
            <h2 className="text-lg font-semibold">לא ניתן לטעון את המועדפים</h2>
            <Button variant="outline" onClick={() => window.location.reload()}>נסו שוב</Button>
          </div>
        ) : favoriteProducts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
              <Heart className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold mb-2">אין מוצרים במועדפים</h2>
            <p className="text-muted-foreground mb-6">אפשר לשמור מוצרים מהחנות באמצעות כפתור הלב</p>
            <Button onClick={() => navigate("/shop")}>
              <ShoppingCart className="w-5 h-5 ml-2" />
              לחנות
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{favoriteProducts.length} מוצרים במועדפים</p>
            <AnimatePresence>
              {favoriteProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-4 border-border/50">
                    <div className="flex gap-4">
                      <button
                        type="button"
                        className="w-24 h-24 rounded-md overflow-hidden flex-shrink-0"
                        onClick={() => navigate(`/product/${product.id}`)}
                        aria-label={`פתיחת ${product.name}`}
                      >
                        <img src={product.image} alt="" className="w-full h-full object-cover" />
                      </button>
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <button
                            type="button"
                            className="font-semibold text-right hover:text-primary"
                            onClick={() => navigate(`/product/${product.id}`)}
                          >
                            {product.name}
                          </button>
                          {product.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-primary">₪{product.price.toFixed(2)}</span>
                          {product.originalPrice && (
                            <span className="text-sm text-muted-foreground line-through">
                              ₪{product.originalPrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={() => removeFavorite(product.id)}
                          aria-label={`הסרת ${product.name} מהמועדפים`}
                        >
                          <Trash2 className="w-5 h-5 text-destructive" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          onClick={() => handleAddToCart(product)}
                          aria-label={`הוספת ${product.name} לעגלה`}
                        >
                          <ShoppingCart className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {favoriteProducts.length > 1 && (
              <Button
                onClick={() => {
                  favoriteProducts.forEach(addProduct);
                  toast({ title: "כל המוצרים נוספו לעגלה" });
                }}
                className="w-full h-12"
              >
                <ShoppingCart className="w-5 h-5 ml-2" />
                הוסף הכל לעגלה - ₪{favoriteProducts.reduce((sum, product) => sum + product.price, 0).toFixed(2)}
              </Button>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Favorites;
