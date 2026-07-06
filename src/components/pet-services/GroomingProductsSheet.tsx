import { useState, useEffect, useCallback } from "react";
import { Scissors } from "lucide-react";
import { ProductRecommendationSheet, ProductWithLabel } from "./ProductRecommendationSheet";
import { fetchRecommendedProducts, type RecommendedProduct } from "@/lib/productRecommendations";

interface Pet {
  id: string;
  type: 'dog' | 'cat';
  breed?: string;
}

interface GroomingProductsSheetProps {
  pet: Pet;
  isOpen: boolean;
  onClose: () => void;
}

export const GroomingProductsSheet = ({ pet, isOpen, onClose }: GroomingProductsSheetProps) => {
  const [products, setProducts] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const groomingProducts = await fetchRecommendedProducts({
        petType: pet.type,
        keywords: ['grooming', 'shampoo', 'brush', 'conditioner', 'טיפוח', 'שמפו', 'מרכך', 'מברשת'],
        limit: 3,
        fallbackToPetProducts: false,
      });

      setProducts(groomingProducts);
    } catch (error) {
      console.error('Error fetching grooming products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [pet.type]);

  useEffect(() => {
    if (!isOpen) return;
    fetchData();
  }, [isOpen, fetchData]);

  const getGroomingFrequency = () => {
    const breed = pet.breed?.toLowerCase() || '';
    if (breed.includes('poodle') || breed.includes('shih') || breed.includes('שיצו')) return 'שבועית';
    if (breed.includes('persian') || breed.includes('פרסי')) return 'יומית';
    return 'בינוני';
  };

  const groomingProducts: ProductWithLabel[] = products.map((p, i) => ({
    ...p,
    label: ['עדיפות 1', 'עדיפות 2', 'עדיפות 3'][i] || undefined
  }));

  const groomingInfo = (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Scissors className="w-4 h-4 text-primary" />
        <span className="font-semibold text-foreground">תדירות טיפוח</span>
      </div>
      <p className="text-sm text-muted-foreground">
        {getGroomingFrequency()}
      </p>
      <p className="text-xs text-muted-foreground mt-2">
        המלצה כללית עד שנחבר מאגר גזעים מלא ב-AWS.
      </p>
    </div>
  );

  return (
    <ProductRecommendationSheet
      isOpen={isOpen}
      onClose={onClose}
      title="מוצרי טיפוח מומלצים"
      infoContent={groomingInfo}
      products={groomingProducts}
      loading={loading}
    />
  );
};
