/**
 * EnergySheet - Activity recommendations based on exercise needs
 * ✅ Uses unified ProductRecommendationSheet
 */

import { useState, useEffect, useCallback } from "react";
import { Zap } from "lucide-react";
import { ProductRecommendationSheet, ProductWithLabel } from "./ProductRecommendationSheet";
import { fetchRecommendedProductGroups, type RecommendedProduct } from "@/lib/productRecommendations";
import { getBreedInfo, type MipoBreedInfo } from "@/lib/mipoApi";
import { breedActivityMinutes, breedEnergyLabelHe } from "@/lib/petActivity";

/**
 * The pet carries a breed *name*; the energy level lives in breed_information.
 * Matching is on either spelling and is deliberately exact: a partial match on
 * a mixed breed ("לברדור + פודל") would pick whichever parent sorted first and
 * present it as the animal's own energy level.
 */
const findBreed = (breeds: MipoBreedInfo[], breedName?: string | null): MipoBreedInfo | null => {
  const wanted = String(breedName || "").trim().toLowerCase();
  if (!wanted) return null;
  return breeds.find((breed) => (
    breed.breed_name?.trim().toLowerCase() === wanted
    || breed.breed_name_he?.trim().toLowerCase() === wanted
  )) || null;
};

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
  const [breedInfo, setBreedInfo] = useState<MipoBreedInfo | null>(null);
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

      // Breed reference data is where energy level actually lives. Without it
      // this sheet has nothing to say about activity, and says so.
      const breeds = await getBreedInfo(pet.type).catch(() => [] as MipoBreedInfo[]);
      setBreedInfo(findBreed(breeds, pet.breed));
    } catch (error) {
      console.error('Error fetching energy products:', error);
      setToyProducts([]);
      setPuzzleProducts([]);
      setFeedingGameProducts([]);
      setBreedInfo(null);
    } finally {
      setLoading(false);
    }
  }, [pet.type, pet.breed]);

  useEffect(() => {
    if (!isOpen) return;
    fetchData();
  }, [isOpen, fetchData]);

  // Both of these matched `pet.breed` — the breed's *name* — against the string
  // "high". A breed name never contains it, so every pet was told 45 minutes
  // and "בינונית" whatever its breed. They now read the breed's energy level
  // from breed_information, through the same helper the profile screen uses,
  // and return null when the breed is unknown rather than inventing a default.
  const activityMinutes = breedActivityMinutes(breedInfo);
  const energyLabel = breedEnergyLabelHe(breedInfo);

  const allProducts: ProductWithLabel[] = [
    ...toyProducts.map(p => ({ ...p, label: 'צעצוע' })),
    ...puzzleProducts.map(p => ({ ...p, label: 'משחק חשיבה' })),
    ...feedingGameProducts.map(p => ({ ...p, label: 'משחק האכלה' }))
  ];

  const energyInfo = (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-4 h-4 text-primary" />
        <span className="font-semibold text-foreground">
          רמת אנרגיה: {energyLabel ?? 'לא ידועה'}
        </span>
      </div>
      {activityMinutes !== null && (
        <p className="text-sm text-primary font-bold">
          {activityMinutes} דקות פעילות מומלצות ביום — טיפוסי לגזע
        </p>
      )}
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
