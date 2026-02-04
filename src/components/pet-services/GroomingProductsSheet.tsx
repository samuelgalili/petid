import { useState, useEffect } from "react";
import { Scissors } from "lucide-react";
import { ProductRecommendationSheet, ProductWithLabel } from "./ProductRecommendationSheet";
import { supabase } from "@/integrations/supabase/client";

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

// Product interface for internal fetching
interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category?: string;
}

export const GroomingProductsSheet = ({ pet, isOpen, onClose }: GroomingProductsSheetProps) => {
  const [breedInfo, setBreedInfo] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetchData();
  }, [isOpen, pet.breed, pet.type]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch breed info for grooming needs
      if (pet.breed) {
        const { data: breed } = await supabase
          .from('breed_information')
          .select('grooming_needs')
          .or(`breed_name.ilike.%${pet.breed}%,breed_name_he.ilike.%${pet.breed}%`)
          .maybeSingle();
        
        if (breed) {
          setBreedInfo(breed);
        }
      }

      // Fetch grooming products - limit to 3
      const { data: groomingProducts } = await supabase
        .from('business_products')
        .select('id, name, price, image_url, category')
        .eq('pet_type', pet.type)
        .or('category.ilike.%grooming%,category.ilike.%shampoo%,category.ilike.%brush%,category.ilike.%conditioner%,category.ilike.%שמפו%,category.ilike.%מרכך%,category.ilike.%מברשת%')
        .limit(3);

      setProducts(groomingProducts || []);
    } catch (error) {
      console.error('Error fetching grooming products:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGroomingFrequency = () => {
    const frequency = breedInfo?.grooming_needs?.toLowerCase() || '';
    if (frequency.includes('daily') || frequency.includes('יומי')) return 'יומית';
    if (frequency.includes('weekly') || frequency.includes('שבועי')) return 'שבועית';
    if (frequency.includes('monthly') || frequency.includes('חודשי')) return 'חודשית';
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
      {breedInfo?.grooming_needs && (
        <p className="text-xs text-muted-foreground mt-2">
          {breedInfo.grooming_needs}
        </p>
      )}
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
