/**
 * MedicalPharmacy — Products grouped by medical condition.
 * Adds "Vet-Recommended for [Pet Name]" badge when product matches pet's diagnosis.
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Pill, ShieldCheck, ShoppingCart, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActivePet } from "@/hooks/useActivePet";
import { useCart } from "@/contexts/CartContext";
import { OptimizedImage } from "@/components/OptimizedImage";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface MedicalCategory {
  id: string;
  name: string;
  nameHe: string;
  icon: string;
  keywords: string[];
}

const MEDICAL_CATEGORIES: MedicalCategory[] = [
  { id: "urinary", name: "Urinary", nameHe: "שתן", icon: "💧", keywords: ["urinary", "שתן", "struvite", "ph"] },
  { id: "renal", name: "Renal", nameHe: "כליות", icon: "🫘", keywords: ["renal", "kidney", "כליות"] },
  { id: "gastro", name: "Gastro", nameHe: "עיכול", icon: "🩺", keywords: ["gastro", "digestive", "עיכול", "sensitive"] },
  { id: "joint", name: "Joint Support", nameHe: "מפרקים", icon: "🦴", keywords: ["joint", "mobility", "מפרקים", "glucosamine"] },
  { id: "derma", name: "Skin & Coat", nameHe: "עור ופרווה", icon: "✨", keywords: ["skin", "coat", "derma", "עור", "omega"] },
  { id: "weight", name: "Weight Management", nameHe: "משקל", icon: "⚖️", keywords: ["diet", "weight", "light", "דיאטה", "משקל"] },
];

interface PharmacyProduct {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category: string | null;
  description: string | null;
  isVetRecommended: boolean;
}

export const MedicalPharmacy = () => {
  const { pet } = useActivePet();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [productsByCategory, setProductsByCategory] = useState<Record<string, PharmacyProduct[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("business_products")
        .select("id, name, price, image_url, category, description")
        .eq("in_stock", true)
        .limit(100);

      if (!data) { setLoading(false); return; }

      const petConditions = pet?.medical_conditions?.map(c => c.toLowerCase()) || [];

      const grouped: Record<string, PharmacyProduct[]> = {};
      for (const cat of MEDICAL_CATEGORIES) {
        const matching = data.filter(p => {
          const text = `${p.name || ""} ${p.description || ""} ${p.category || ""}`.toLowerCase();
          return cat.keywords.some(kw => text.includes(kw));
        });

        if (matching.length > 0) {
          grouped[cat.id] = matching.map(p => ({
            ...p,
            isVetRecommended: petConditions.some(cond =>
              cat.keywords.some(kw => cond.includes(kw) || cond.includes(cat.nameHe))
            ),
          }));
        }
      }

      setProductsByCategory(grouped);
      setLoading(false);
    };
    fetchProducts();
  }, [pet]);

  const activeCats = MEDICAL_CATEGORIES.filter(c => productsByCategory[c.id]?.length);
  if (loading || activeCats.length === 0) return null;

  // Sort: categories matching pet conditions first
  const petConditions = pet?.medical_conditions?.map(c => c.toLowerCase()) || [];
  const sortedCats = [...activeCats].sort((a, b) => {
    const aMatch = petConditions.some(c => a.keywords.some(kw => c.includes(kw) || c.includes(a.nameHe))) ? 1 : 0;
    const bMatch = petConditions.some(c => b.keywords.some(kw => c.includes(kw) || c.includes(b.nameHe))) ? 1 : 0;
    return bMatch - aMatch;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="px-4 py-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center">
          <Pill className="w-3.5 h-3.5 text-blue-600" strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground">בית מרקחת רפואי</h2>
          <p className="text-[10px] text-muted-foreground">מזון ותוספי תזונה רפואיים</p>
        </div>
      </div>

      {/* Category Chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3">
        {sortedCats.map(cat => {
          const isActive = expandedCategory === cat.id;
          const hasMatch = petConditions.some(c => cat.keywords.some(kw => c.includes(kw) || c.includes(cat.nameHe)));
          return (
            <button
              key={cat.id}
              onClick={() => setExpandedCategory(isActive ? null : cat.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : hasMatch
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-card border border-border/30 text-foreground"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.nameHe}</span>
              {hasMatch && !isActive && (
                <ShieldCheck className="w-3 h-3 text-primary" strokeWidth={2} />
              )}
            </button>
          );
        })}
      </div>

      {/* Products for expanded category */}
      {expandedCategory && productsByCategory[expandedCategory] && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-1"
        >
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {productsByCategory[expandedCategory].slice(0, 8).map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/product/${product.id}`)}
                className="flex-shrink-0 w-[120px] cursor-pointer"
              >
                <div className="relative rounded-xl overflow-hidden bg-card border border-border/30 shadow-sm">
                  <div className="relative aspect-square bg-muted">
                    <OptimizedImage
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full"
                      objectFit="cover"
                      sizes="120px"
                    />
                    {/* Vet-Recommended Badge */}
                    {product.isVetRecommended && pet && (
                      <div
                        className="absolute bottom-1 left-1 right-1 px-1.5 py-1 rounded-lg text-[8px] font-bold text-white text-center"
                        style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.9), rgba(22,163,74,0.8))", backdropFilter: "blur(8px)" }}
                      >
                        <ShieldCheck className="w-2.5 h-2.5 inline mr-0.5" />
                        מותאם ל{pet.name}
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <h3 className="text-[10px] font-medium text-foreground line-clamp-2 mb-1 leading-tight">{product.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-primary">₪{product.price}</span>
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart({ id: product.id, name: product.name, price: product.price, image: product.image_url, quantity: 1 });
                          toast.success("נוסף לעגלה! 🛒");
                        }}
                        className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                      >
                        <ShoppingCart className="w-3 h-3 text-primary-foreground" strokeWidth={2} />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
