/**
 * SmartRecommendationSheet - Context-aware product recommendations
 * Fetches personalized products from smart-recommendations edge function
 * Supports: coat, energy, health, feeding, mobility, digestion categories
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Loader2, Shield, Sparkles } from "lucide-react";
import { ServiceBottomSheet } from "./ServiceBottomSheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface SmartProduct {
  id: string;
  name: string;
  price: number;
  image_url: string;
  label: string;
  personalizedCopy: string;
}

interface SmartRecommendationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  petId: string;
  petName: string;
  category: 'coat' | 'energy' | 'health' | 'feeding' | 'mobility' | 'digestion';
  title: string;
}

const categoryTitles: Record<string, string> = {
  coat: 'המלצות פרווה וטיפוח',
  energy: 'המלצות אנרגיה ופעילות',
  health: 'המלצות בריאות מונעת',
  feeding: 'המלצות תזונה',
  mobility: 'המלצות ניידות ומפרקים',
  digestion: 'המלצות עיכול',
};

export const SmartRecommendationSheet = ({
  isOpen,
  onClose,
  petId,
  petName,
  category,
  title,
}: SmartRecommendationSheetProps) => {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState<SmartProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [lifeStage, setLifeStage] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    fetchRecommendations();
  }, [isOpen, petId, category]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-recommendations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ petId, category }),
      });

      if (!resp.ok) throw new Error("Failed to fetch recommendations");

      const data = await resp.json();
      setProducts(data.products || []);
      setLifeStage(data.lifeStage || '');
    } catch (error) {
      console.error("Error fetching smart recommendations:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (product: SmartProduct) => {
    if (product.id === 'insurance-offer') {
      localStorage.setItem("chat_pending_intent", `אני מחפש אפשרויות ביטוח עבור ${petName}`);
      navigate('/chat');
      return;
    }

    setAddingToCart(product.id);
    try {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image_url,
        quantity: 1,
      });
      toast({
        title: 'נוסף לעגלה! 🛒',
        description: `${product.name} נוסף בהצלחה`,
        duration: 2,
      });
    } catch {
      toast({ title: 'שגיאה', description: 'לא ניתן להוסיף לעגלה', variant: 'destructive' });
    } finally {
      setAddingToCart(null);
    }
  };

  const lifeStageLabel = lifeStage === 'puppy' ? '🐾 גור' : lifeStage === 'senior' ? '🏥 סניור' : lifeStage === 'junior' ? '🌱 צעיר' : '';

  return (
    <ServiceBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={title || categoryTitles[category] || 'המלצות'}
    >
      <div className="space-y-4">
        {/* Life stage badge */}
        {lifeStageLabel && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/10">
            <Sparkles className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
            <span className="text-[11px] text-primary font-medium">
              מסונן לשלב חיים: {lifeStageLabel}
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : products.length > 0 ? (
          <div className="space-y-2.5">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-3 p-3 bg-muted/30 rounded-lg border border-border/30 hover:border-border/60 transition-colors"
              >
                {/* Product Image or Insurance Icon */}
                {product.id === 'insurance-offer' ? (
                  <div className="w-16 h-16 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-8 h-8 text-amber-500" strokeWidth={1.5} />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Product Info with Personalized Copy */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div>
                    <span className="text-[10px] text-primary font-medium">{product.label}</span>
                    <h4 className="text-sm font-semibold text-foreground line-clamp-1">{product.name}</h4>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      {product.personalizedCopy}
                    </p>
                    {product.price > 0 && (
                      <p className="text-xs text-foreground font-bold mt-0.5">₪{product.price.toFixed(0)}</p>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  size="sm"
                  className="h-8 w-8 p-0 flex-shrink-0 self-center"
                  variant={product.id === 'insurance-offer' ? 'default' : 'outline'}
                  onClick={() => handleAddToCart(product)}
                  disabled={addingToCart === product.id}
                  title={product.id === 'insurance-offer' ? 'הגן עכשיו' : 'הוסף לעגלה'}
                >
                  {addingToCart === product.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : product.id === 'insurance-offer' ? (
                    <Shield className="w-4 h-4" />
                  ) : (
                    <ShoppingCart className="w-4 h-4" />
                  )}
                </Button>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">לא נמצאו מוצרים תואמים לפרופיל של {petName}</p>
          </div>
        )}
      </div>
    </ServiceBottomSheet>
  );
};
