import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Heart, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import confetti from "canvas-confetti";

// Same products data as Shop page
const allProducts = [
  {
    id: 1,
    name: "מזון יבש פרימיום לכלבים",
    description: "15 ק״ג - מלא בשר",
    price: 189,
    originalPrice: 249,
    image: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=500&h=500&fit=crop",
  },
  {
    id: 2,
    name: "חטיפי עוף מיובשים",
    description: "500 גר׳",
    price: 45,
    originalPrice: null,
    image: "https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=500&h=500&fit=crop",
  },
  {
    id: 3,
    name: "מיטה אורתופדית",
    description: "גודל L - זיכרון צורה",
    price: 299,
    originalPrice: 399,
    image: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500&h=500&fit=crop",
  },
  {
    id: 4,
    name: "צעצוע אינטראקטיבי",
    description: "משחק חכם",
    price: 129,
    originalPrice: null,
    image: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=500&h=500&fit=crop",
  },
  {
    id: 5,
    name: "שמפו טיפולי",
    description: "500 מ״ל",
    price: 59,
    originalPrice: 79,
    image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500&h=500&fit=crop",
  },
  {
    id: 6,
    name: "קערה אוטומטית",
    description: "עם מתקן מים",
    price: 169,
    originalPrice: null,
    image: "https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=500&h=500&fit=crop",
  },
];

const Favorites = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<number[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("petid-favorites");
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  }, []);

  const favoriteProducts = allProducts.filter(p => favorites.includes(p.id));

  const removeFavorite = (productId: number) => {
    const newFavorites = favorites.filter(id => id !== productId);
    setFavorites(newFavorites);
    localStorage.setItem("petid-favorites", JSON.stringify(newFavorites));
    toast({
      title: "הוסר מהמועדפים",
      description: "המוצר הוסר מרשימת המועדפים",
      duration: 2000,
    });
  };

  const handleAddToCart = (product: typeof allProducts[0]) => {
    addToCart({
      id: product.id.toString(),
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
    });

    // Play success sound
    const audio = new Audio('https://cdn.pixabay.com/audio/2022/03/24/audio_805cb46880.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {});

    // Trigger confetti
    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#FFC107', '#FF9800', '#E91E63'],
    });

    toast({
      title: "🎉 נוסף לעגלה",
      description: `${product.name} נוסף לעגלה שלך`,
      duration: 2000,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => navigate(-1)}
          >
            <ArrowRight className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold font-jakarta text-foreground">המועדפים שלי</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6">
        {favoriteProducts.length === 0 ? (
          /* Empty State */
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center mb-6">
              <Heart className="w-12 h-12 text-muted" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2 font-jakarta">
              אין מוצרים במועדפים
            </h2>
            <p className="text-muted-foreground mb-6 font-jakarta">
              לחץ על הלב במוצרים כדי לשמור אותם כאן
            </p>
            <Button
              onClick={() => navigate("/shop")}
              className="bg-instagram-blue hover:bg-instagram-blue/90 text-white font-bold rounded-xl px-6"
            >
              <ShoppingCart className="w-5 h-5 ml-2" />
              לחנות
            </Button>
          </motion.div>
        ) : (
          /* Favorites Grid */
          <div className="space-y-4">
            <p className="text-sm text-gray-500 font-jakarta">
              {favoriteProducts.length} מוצרים במועדפים
            </p>
            
            <AnimatePresence>
              {favoriteProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-4 bg-white shadow-sm border-0">
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <div 
                        className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer"
                        onClick={() => navigate(`/product/${product.id}`)}
                      >
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h3 
                            className="font-bold text-gray-900 font-jakarta cursor-pointer hover:text-[#FFC107] transition-colors"
                            onClick={() => navigate(`/product/${product.id}`)}
                          >
                            {product.name}
                          </h3>
                          <p className="text-sm text-gray-500 font-jakarta">
                            {product.description}
                          </p>
                        </div>

                        {/* Price */}
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-[#E91E63] font-jakarta">
                            ₪{product.price}
                          </span>
                          {product.originalPrice && (
                            <span className="text-sm text-gray-400 line-through font-jakarta">
                              ₪{product.originalPrice}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => removeFavorite(product.id)}
                          className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors"
                          aria-label="הסר ממועדפים"
                        >
                          <Trash2 className="w-5 h-5" strokeWidth={1.5} />
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleAddToCart(product)}
                          className="w-10 h-10 rounded-full bg-[#FFC107] flex items-center justify-center text-gray-900 hover:bg-[#FFB300] transition-colors"
                          aria-label="הוסף לעגלה"
                        >
                          <ShoppingCart className="w-5 h-5" strokeWidth={1.5} />
                        </motion.button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Add All to Cart Button */}
            {favoriteProducts.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="pt-4"
              >
                <Button
                  onClick={() => {
                    favoriteProducts.forEach(product => {
                      addToCart({
                        id: product.id.toString(),
                        name: product.name,
                        price: product.price,
                        image: product.image,
                        quantity: 1,
                      });
                    });
                    confetti({
                      particleCount: 100,
                      spread: 80,
                      origin: { y: 0.6 },
                    });
                    toast({
                      title: "🎉 כל המוצרים נוספו לעגלה",
                      description: `${favoriteProducts.length} מוצרים נוספו בהצלחה`,
                    });
                  }}
                  className="w-full h-14 bg-[#FFC107] hover:bg-[#FFB300] text-gray-900 text-lg font-bold rounded-2xl shadow-lg"
                >
                  <ShoppingCart className="w-6 h-6 ml-2" />
                  הוסף הכל לעגלה - ₪{favoriteProducts.reduce((sum, p) => sum + p.price, 0)}
                </Button>
              </motion.div>
            )}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Favorites;
