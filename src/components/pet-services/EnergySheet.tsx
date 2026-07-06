/**
 * EnergySheet - Activity recommendations based on exercise needs
 * ✅ Uses unified ProductRecommendationSheet
 */

import { useState, useEffect, useCallback } from "react";
import { Zap } from "lucide-react";
import { ProductRecommendationSheet, ProductWithLabel } from "./ProductRecommendationSheet";
import { fetchRecommendedProductGroups, type RecommendedProduct } from "@/lib/productRecommendations";

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

export const EnergySheet = ({ pet, isOpen, onClose }: EnergySheetProps) => {
  const [toyProducts, setToyProducts] = useState<RecommendedProduct[]>([]);
  const [puzzleProducts, setPuzzleProducts] = useState<RecommendedProduct[]>([]);
  const [feedingGameProducts, setFeedingGameProducts] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const groups = await fetchRecommendedProductGroups([
        {
          key: 'toys',
          petType: pet.type,
          keywords: ['toy', 'צעצוע', 'play', 'משחק'],
          limit: 1,
          fallbackToPetProducts: false,
        },
        {
          key: 'puzzles',
          petType: pet.type,
          keywords: ['puzzle', 'brain', 'interactive', 'חשיבה', 'אינטראקטיבי'],
          limit: 1,
          fallbackToPetProducts: false,
        },
        {
          key: 'feedingGames',
          petType: pet.type,
          keywords: ['slow feeder', 'lick mat', 'snuffle', 'האכלה איטית', 'משחק אוכל'],
          limit: 1,
          fallbackToPetProducts: false,
        },
      ]);

      setToyProducts(groups.toys || []);
      setPuzzleProducts(groups.puzzles || []);
      setFeedingGameProducts(groups.feedingGames || []);
    } catch (error) {
      console.error('Error fetching energy products:', error);
      setToyProducts([]);
      setPuzzleProducts([]);
      setFeedingGameProducts([]);
    } finally {
      setLoading(false);
    }
  }, [pet.type]);

  useEffect(() => {
    if (!isOpen) return;
    fetchData();
  }, [isOpen, fetchData]);

  // Get recommended activity minutes
  const getActivityMinutes = (): number => {
    const exercise = pet.breed?.toLowerCase() || '';
    if (exercise.includes('very high') || exercise.includes('גבוהה מאוד')) return 90;
    if (exercise.includes('high') || exercise.includes('גבוה')) return 60;
    if (exercise.includes('moderate') || exercise.includes('medium') || exercise.includes('בינוני')) return 45;
    if (exercise.includes('low') || exercise.includes('נמוך')) return 30;
    return 45; // default
  };

  const getEnergyLevel = () => {
    const level = pet.breed?.toLowerCase() || '';
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
