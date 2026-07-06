/**
 * FurProductsSheet - Fur care products based on coat length
 * ✅ Uses unified ProductRecommendationSheet
 */

import { useState, useEffect, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { ProductRecommendationSheet, ProductWithLabel } from "./ProductRecommendationSheet";
import { fetchRecommendedProductGroups, type RecommendedProduct } from "@/lib/productRecommendations";

interface Pet {
  id: string;
  type: 'dog' | 'cat';
  breed?: string;
}

interface FurProductsSheetProps {
  pet: Pet;
  furLength: 'short' | 'medium' | 'long';
  isOpen: boolean;
  onClose: () => void;
}

export const FurProductsSheet = ({ pet, furLength, isOpen, onClose }: FurProductsSheetProps) => {
  const [brushProducts, setBrushProducts] = useState<RecommendedProduct[]>([]);
  const [shampooProducts, setShampooProducts] = useState<RecommendedProduct[]>([]);
  const [serumProducts, setSerumProducts] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const groups = await fetchRecommendedProductGroups([
        {
          key: 'brushes',
          petType: pet.type,
          keywords: ['brush', 'comb', 'מברשת', 'מסרק'],
          limit: 1,
          fallbackToPetProducts: false,
        },
        {
          key: 'shampoos',
          petType: pet.type,
          keywords: ['shampoo', 'שמפו'],
          limit: 1,
          fallbackToPetProducts: false,
        },
        {
          key: 'serums',
          petType: pet.type,
          keywords: ['serum', 'conditioner', 'oil', 'סרום', 'מרכך', 'שמן'],
          limit: 1,
          fallbackToPetProducts: false,
        },
      ]);

      setBrushProducts(groups.brushes || []);
      setShampooProducts(groups.shampoos || []);
      setSerumProducts(groups.serums || []);
    } catch (error) {
      console.error('Error fetching fur products:', error);
      setBrushProducts([]);
      setShampooProducts([]);
      setSerumProducts([]);
    } finally {
      setLoading(false);
    }
  }, [pet.type]);

  useEffect(() => {
    if (!isOpen) return;
    fetchData();
  }, [isOpen, fetchData]);

  const getFurLengthHe = () => {
    const labels: Record<string, string> = {
      short: 'קצר',
      medium: 'בינוני',
      long: 'ארוך',
    };
    return labels[furLength] || 'בינוני';
  };

  const getFurCareInfo = () => {
    if (furLength === 'long') {
      return 'פרווה ארוכה דורשת הברשה יומית למניעת קשרים ושימוש בסרום להזנה.';
    }
    if (furLength === 'short') {
      return 'פרווה קצרה דורשת הברשה שבועית לסילוק שיער מת.';
    }
    return 'פרווה בינונית דורשת הברשה 2-3 פעמים בשבוע.';
  };

  const allProducts: ProductWithLabel[] = [
    ...brushProducts.map(p => ({ ...p, label: 'מברשת מומלצת' })),
    ...shampooProducts.map(p => ({ ...p, label: 'שמפו מומלץ' })),
    ...serumProducts.map(p => ({ ...p, label: 'סרום/מרכך' }))
  ];

  const infoContent = (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="font-semibold text-foreground">אורך פרווה: {getFurLengthHe()}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {getFurCareInfo()}
      </p>
    </div>
  );

  return (
    <ProductRecommendationSheet
      isOpen={isOpen}
      onClose={onClose}
      title="מוצרי טיפוח פרווה"
      infoContent={infoContent}
      products={allProducts}
      loading={loading}
    />
  );
};
