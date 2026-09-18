/**
 * Products grouped by health-related catalog keywords.
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Info, Pill } from "lucide-react";
import { useActivePet } from "@/hooks/useActivePet";
import { useCart } from "@/contexts/CartContext";
import { ShopRailCard } from "@/components/shop/ShopRailCard";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { getShopProducts } from "@/lib/mipoApi";

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
  matchesProfileTopic: boolean;
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
      try {
        const data = (await getShopProducts()).filter((product) => product.in_stock !== false);

        const petConditions = pet?.medical_conditions?.map(c => c.toLowerCase()) || [];

        const grouped: Record<string, PharmacyProduct[]> = {};
        for (const cat of MEDICAL_CATEGORIES) {
          const matching = data.filter(p => {
            const text = `${p.name || ""} ${p.description || ""} ${p.category || ""}`.toLowerCase();
            return cat.keywords.some(kw => text.includes(kw));
          });

          if (matching.length > 0) {
            grouped[cat.id] = matching.map(p => ({
              id: p.id,
              name: p.name,
              price: Number(p.sale_price || p.price || 0),
              image_url: p.image_url || "/placeholder.svg",
              category: p.category,
              description: p.description || null,
              matchesProfileTopic: petConditions.some(cond =>
                cat.keywords.some(kw => cond.includes(kw) || cond.includes(cat.nameHe))
              ),
            }));
          }
        }

        setProductsByCategory(grouped);
      } catch (error) {
        console.error("Error loading medical pharmacy products:", error);
        setProductsByCategory({});
      } finally {
        setLoading(false);
      }
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
      {/* Header. Same shape as the rail above it, so the two read as two
          sections of one page rather than two components that met by accident. */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-mipo-line">
          <Pill className="h-4 w-4 text-mipo-ink" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold text-mipo-ink">מוצרים לפי נושא בריאותי</h2>
          <p className="truncate text-[12px] text-mipo-muted">קיבוץ לפי מונחים בתיאור המוצר בלבד</p>
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
              /* The same chip the category bar at the top of the shop uses:
                 a thin line at rest, ink when selected. A chip that "matches
                 the profile" keeps a mark - an emerald edge - because that is
                 a claim about THIS pet and it has to be distinguishable from
                 the one the finger is currently on. */
              className={`flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2.5 text-[13px] font-medium transition-colors ${
                isActive
                  ? "mipo-chip-selected"
                  : hasMatch
                    ? "border-emerald-300 text-emerald-700 hover:bg-mipo-soft dark:text-emerald-400"
                    : "border-mipo-line bg-mipo-surface text-mipo-ink hover:bg-mipo-soft"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.nameHe}</span>
              {hasMatch && !isActive && (
                <Info className="h-3 w-3" strokeWidth={2} />
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
                className="flex-shrink-0"
              >
                <ShopRailCard
                  product={product}
                  /* The claim that this relates to something in the pet's own
                     profile is the one thing on the card worth a colour, so it
                     is the only thing that gets one. It used to be an 8px green
                     gradient laid over the product photo. */
                  reason={product.matchesProfileTopic && pet ? `קשור לנושא בפרופיל של ${pet.name}` : null}
                  reasonTone="profile"
                  onOpen={() => navigate(`/product/${product.id}`)}
                  onAdd={() => {
                    addToCart({ productId: product.id, name: product.name, price: product.price, image: product.image_url, quantity: 1 });
                    toast.success("נוסף לעגלה! 🛒");
                  }}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
      <p className="mt-3 text-[12px] leading-relaxed text-mipo-muted">
        הסינון אינו המלצה רפואית. יש לבדוק את תווית המוצר ולהתייעץ עם וטרינר לפני שינוי תזונתי רפואי.
      </p>
    </motion.div>
  );
};
