/**
 * EnergySheet - Activity recommendations based on exercise needs
 * ✅ Uses unified ProductRecommendationSheet
 */

import { useState, useEffect } from "react";
import { Zap } from "lucide-react";
import { ProductRecommendationSheet, ProductWithLabel } from "./ProductRecommendationSheet";
import { supabase } from "@/integrations/supabase/client";

interface Pet {
  id: string;
  type: 'dog' | 'cat';
  breed?: string;
}

interface EnergySheetProps {
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

export const EnergySheet = ({ pet, isOpen, onClose }: EnergySheetProps) => {
  const [breedInfo, setBreedInfo] = useState<any>(null);
  const [toyProducts, setToyProducts] = useState<Product[]>([]);
  const [puzzleProducts, setPuzzleProducts] = useState<Product[]>([]);
  const [feedingGameProducts, setFeedingGameProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetchData();
  }, [isOpen, pet.breed, pet.type]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch breed info for exercise needs
      if (pet.breed) {
        const { data: breed } = await supabase
          .from('breed_information')
          .select('exercise_needs')
          .or(`breed_name.ilike.%${pet.breed}%,breed_name_he.ilike.%${pet.breed}%`)
          .maybeSingle();
        
        if (breed) {
          setBreedInfo(breed);
        }
      }

      // Fetch toy products - limit to 1
      const { data: toys } = await supabase
        .from('business_products')
        .select('id, name, price, image_url, category')
        .eq('pet_type', pet.type)
        .or('category.ilike.%toy%,category.ilike.%צעצוע%')
        .limit(1);

      setToyProducts(toys || []);

      // Fetch puzzle/thinking game products - limit to 1
      const { data: puzzles } = await supabase
        .from('business_products')
        .select('id, name, price, image_url, category')
        .eq('pet_type', pet.type)
        .or('category.ilike.%puzzle%,category.ilike.%חשיבה%,category.ilike.%brain%,category.ilike.%interactive%,category.ilike.%אינטראקטיבי%')
        .limit(1);

      setPuzzleProducts(puzzles || []);

      // Fetch feeding game/slow feeder products - limit to 1
      const { data: feedingGames } = await supabase
        .from('business_products')
        .select('id, name, price, image_url, category')
        .eq('pet_type', pet.type)
        .or('category.ilike.%slow feeder%,category.ilike.%lick mat%,category.ilike.%snuffle%,category.ilike.%האכלה איטית%,category.ilike.%משחק אוכל%')
        .limit(1);

      setFeedingGameProducts(feedingGames || []);
    } catch (error) {
      console.error('Error fetching energy products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get recommended activity minutes
  const getActivityMinutes = (): number => {
    const exercise = breedInfo?.exercise_needs?.toLowerCase() || '';
    if (exercise.includes('very high') || exercise.includes('גבוהה מאוד')) return 90;
    if (exercise.includes('high') || exercise.includes('גבוה')) return 60;
    if (exercise.includes('moderate') || exercise.includes('medium') || exercise.includes('בינוני')) return 45;
    if (exercise.includes('low') || exercise.includes('נמוך')) return 30;
    return 45; // default
  };

  const getEnergyLevel = () => {
    const level = breedInfo?.exercise_needs?.toLowerCase() || '';
    if (level.includes('very high') || level.includes('גבוהה מאוד')) return 'גבוהה מאוד';
    if (level.includes('high') || level.includes('גבוה')) return 'גבוהה';
    if (level.includes('medium') || level.includes('moderate') || level.includes('בינוני')) return 'בינונית';
    if (level.includes('low') || level.includes('נמוך')) return 'נמוכה';
    return 'בינונית';
  };

  const allProducts: ProductWithLabel[] = [
    ...toyProducts.map(p => ({ ...p, label: 'צעצוע' })),
    ...puzzleProducts.map(p => ({ ...p, label: 'משחק חשיבה' })),
    ...feedingGameProducts.map(p => ({ ...p, label: 'משחק האכלה' }))
  ];

  const energyInfo = (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-4 h-4 text-primary" />
        <span className="font-semibold text-foreground">רמת אנרגיה: {getEnergyLevel()}</span>
      </div>
      <p className="text-sm text-primary font-bold">
        {getActivityMinutes()} דקות פעילות מומלצות ביום
      </p>
      <p className="text-xs text-muted-foreground mt-2">
        לחיות מחמד עם רמת אנרגיה גבוהה נדרשים צעצועים בעלי אתגר וגירויים שונים כדי למנוע שעמום.
      </p>
    </div>
  );

  return (
    <ProductRecommendationSheet
      isOpen={isOpen}
      onClose={onClose}
      title="המלצות פעילות ומשחקים"
      infoContent={energyInfo}
      products={allProducts}
      loading={loading}
    />
  );
};
