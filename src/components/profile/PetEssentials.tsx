import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { fetchRecommendedProducts, type RecommendedProduct } from "@/lib/productRecommendations";

interface Pet {
  id: string;
  name: string;
  type: "dog" | "cat";
  breed?: string;
  age_years?: number;
  age_months?: number;
  size?: string;
  avatar_url?: string;
}

interface PetEssentialsProps {
  pet: Pet;
  onOpenShop: () => void;
}

const ESSENTIAL_KEYWORDS = [
  "food",
  "מזון",
  "treat",
  "חטיף",
  "toy",
  "צעצוע",
  "health",
  "בריאות",
  "grooming",
  "טיפוח",
];

const badges = [
  { label: "מומלץ", color: "bg-primary text-primary-foreground" },
  { label: "מותאם", color: "bg-emerald-600 text-white" },
];

export const PetEssentials = ({ pet, onOpenShop }: PetEssentialsProps) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        const results = await fetchRecommendedProducts({
          petType: pet.type,
          keywords: ESSENTIAL_KEYWORDS,
          limit: 4,
        });
        if (active) setProducts(results);
      } catch (error) {
        console.error("Error fetching essentials:", error);
        if (active) setProducts([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchProducts();
    return () => {
      active = false;
    };
  }, [pet.id, pet.type]);

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

  if (products.length === 0) return null;

  return (
    <section className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">מוצרים ל{pet.name}</h3>
        </div>
        <Button variant="ghost" size="sm" className="h-8 rounded-full px-2 text-xs" onClick={onOpenShop}>
          הכל
          <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
        </Button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {products.map((product, index) => {
          const badge = badges[index];
          return (
            <motion.button
              key={product.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => navigate(`/product/${product.id}?petId=${pet.id}`)}
              className="w-[116px] flex-shrink-0 text-right"
            >
              <div className="relative w-[116px] h-[116px] rounded-2xl overflow-hidden border border-border/30 bg-muted">
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
                {badge && (
                  <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.color}`}>
                    {badge.label}
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-foreground mt-2 line-clamp-2 min-h-[2rem]">{product.name}</p>
              <p className="text-xs font-bold text-primary mt-0.5">₪{product.price.toFixed(0)}</p>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};
