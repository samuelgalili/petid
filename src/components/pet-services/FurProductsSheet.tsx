/**
 * FurProductsSheet - Fur care products based on coat length
 * ✅ Uses unified ProductRecommendationSheet
 */

import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { ProductRecommendationSheet, ProductWithLabel } from "./ProductRecommendationSheet";
import { supabase } from "@/integrations/supabase/client";

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
  const [brushProducts, setBrushProducts] = useState<Product[]>([]);
  const [shampooProducts, setShampooProducts] = useState<Product[]>([]);
  const [serumProducts, setSerumProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetchData();
  }, [isOpen, pet.type, furLength]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch brush products
      const { data: brushes } = await supabase
        .from('business_products')
        .select('id, name, price, image_url, category')
        .eq('pet_type', pet.type)
        .or('category.ilike.%brush%,category.ilike.%מברשת%,category.ilike.%comb%,category.ilike.%מסרק%')
        .limit(1);

      setBrushProducts(brushes || []);

      // Fetch shampoo products
      const { data: shampoos } = await supabase
        .from('business_products')
        .select('id, name, price, image_url, category')
        .eq('pet_type', pet.type)
        .or('category.ilike.%shampoo%,category.ilike.%שמפו%')
        .limit(1);

      setShampooProducts(shampoos || []);

      // Fetch serum/conditioner products
      const { data: serums } = await supabase
        .from('business_products')
        .select('id, name, price, image_url, category')
        .eq('pet_type', pet.type)
        .or('category.ilike.%serum%,category.ilike.%סרום%,category.ilike.%conditioner%,category.ilike.%מרכך%,category.ilike.%oil%,category.ilike.%שמן%')
        .limit(1);

      setSerumProducts(serums || []);
    } catch (error) {
      console.error('Error fetching fur products:', error);
    } finally {
      setLoading(false);
    }
  };

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
