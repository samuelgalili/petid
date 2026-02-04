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

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category?: string;
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

  const allProducts = [...brushProducts, ...shampooProducts, ...serumProducts];

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

  const renderProduct = (product: Product, index: number, label: string) => (
    <motion.div
      key={product.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex gap-3 p-3 bg-muted/30 rounded-lg border border-border/30 hover:border-border/60 transition-colors"
    >
      {/* Product Image */}
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Product Info */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <span className="text-[10px] text-primary font-medium">{label}</span>
          <h4 className="text-sm font-semibold text-foreground line-clamp-1">
            {product.name}
          </h4>
          <p className="text-xs text-muted-foreground">
            ₪{product.price.toFixed(0)}
          </p>
        </div>
      </div>

      {/* Add to Cart Button */}
      <Button
        size="sm"
        className="h-8 w-8 p-0 flex-shrink-0"
        variant="outline"
        title="הוסף לעגלה"
      >
        <ShoppingCart className="w-4 h-4" />
      </Button>
    </motion.div>
  );

  return (
    <ServiceBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="מוצרי טיפוח פרווה"
      infoContent={infoContent}
    >
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : allProducts.length > 0 ? (
          <div className="space-y-2">
            {brushProducts.map((p, i) => renderProduct(p, i, 'מברשת מומלצת'))}
            {shampooProducts.map((p, i) => renderProduct(p, brushProducts.length + i, 'שמפו מומלץ'))}
            {serumProducts.map((p, i) => renderProduct(p, brushProducts.length + shampooProducts.length + i, 'סרום/מרכך'))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">לא נמצאו מוצרים מומלצים</p>
          </div>
        )}
      </div>
    </ServiceBottomSheet>
  );
};
