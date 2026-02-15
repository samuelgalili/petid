/**
 * FeedProductCards — Inline commerce cards injected between feed posts.
 * Shows breed/age-relevant products from the shop.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Sparkles, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface SmartProduct {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  image_url: string;
  category: string | null;
  relevance_reason: string;
}

export const FeedProductCards = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [products, setProducts] = useState<SmartProduct[]>([]);
  const [petName, setPetName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Get user's primary pet for personalization
      const { data: pets } = await (supabase as any)
        .from("pets")
        .select("name, breed, birth_date, type, medical_conditions, current_food")
        .eq("user_id", user.id)
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(1);

      const pet = pets?.[0];
      setPetName(pet?.name || null);

      // Build category filter based on pet data
      let categoryFilter: string[] = [];
      if (pet?.pet_type === "cat") {
        categoryFilter = ["חתולים", "cat", "cats"];
      } else {
        categoryFilter = ["כלבים", "dog", "dogs"];
      }

      // Fetch relevant products
      const { data: prods } = await supabase
        .from("business_products")
        .select("id, name, price, sale_price, image_url, category, life_stage, pet_type")
        .eq("in_stock", true)
        .order("average_rating", { ascending: false })
        .limit(6);

      if (prods?.length) {
        const mapped: SmartProduct[] = prods.slice(0, 4).map((p: any) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          sale_price: p.sale_price,
          image_url: p.image_url,
          category: p.category,
          relevance_reason: pet?.name ? `מותאם ל${pet.name}` : "פופולרי",
        }));
        setProducts(mapped);
      }
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading || products.length === 0) return null;

  const handleQuickAdd = (product: SmartProduct) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.sale_price || product.price,
      image: product.image_url,
      quantity: 1,
    });
    toast.success("נוסף לעגלה! 🛒");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="snap-start flex-shrink-0 w-full px-4 py-4"
      style={{ minHeight: "100dvh" }}
    >
      <div className="h-full flex flex-col justify-center" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {petName ? `מיוחד ל${petName}` : "מוצרים מומלצים"}
              </h3>
              <p className="text-xs text-muted-foreground">מבוסס על הפרופיל והגזע</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/shop")}
            className="text-xs text-primary font-semibold flex items-center gap-0.5"
          >
            לחנות
            <ChevronLeft className="w-3 h-3" />
          </button>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 gap-3">
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="bg-card border border-border/30 rounded-2xl overflow-hidden group cursor-pointer"
              onClick={() => navigate(`/product/${product.id}`)}
            >
              <div className="w-full aspect-square bg-muted relative overflow-hidden">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                {/* Relevance tag */}
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-primary/90 text-primary-foreground text-[10px] font-semibold flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  {product.relevance_reason}
                </div>
                {product.sale_price && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                    מבצע
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight mb-2">
                  {product.name}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {product.sale_price ? (
                      <>
                        <span className="text-base font-bold text-primary">₪{product.sale_price}</span>
                        <span className="text-xs text-muted-foreground line-through">₪{product.price}</span>
                      </>
                    ) : (
                      <span className="text-base font-bold text-foreground">₪{product.price}</span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickAdd(product);
                    }}
                    className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                  >
                    <ShoppingCart className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
