import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, Star, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Pet {
  id: string;
  type: 'dog' | 'cat';
  breed?: string;
}

interface BreedInfo {
  size_category?: string;
  life_expectancy_years?: string;
  exercise_needs?: string;
  grooming_needs?: string;
  temperament_he?: string[];
  training_difficulty?: string;
  good_with_children?: boolean;
  good_with_other_pets?: boolean;
  apartment_friendly?: boolean;
}

interface BreedStatsCardProps {
  pet: Pet;
}

// Semi-circle gauge component
const GaugeIndicator = ({ 
  value, 
  label 
}: { 
  value: 'low' | 'medium' | 'high'; 
  label: string;
}) => {
  const getRotation = () => {
    switch (value) {
      case 'low': return -60;
      case 'medium': return 0;
      case 'high': return 60;
      default: return 0;
    }
  };

  const getValueText = () => {
    switch (value) {
      case 'low': return 'נמוך';
      case 'medium': return 'בינוני';
      case 'high': return 'גבוה';
      default: return 'בינוני';
    }
  };

  return (
    <div className="flex flex-col items-center p-3 bg-card rounded-xl border border-border/30">
      <span className="text-xs font-semibold text-foreground mb-2">{label}</span>
      <div className="relative w-16 h-8 mb-1">
        {/* Gauge arc background */}
        <svg viewBox="0 0 100 50" className="w-full h-full">
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="126"
            strokeDashoffset={126 - (value === 'low' ? 42 : value === 'medium' ? 84 : 126)}
          />
        </svg>
        {/* Needle */}
        <div 
          className="absolute bottom-0 left-1/2 w-0.5 h-6 bg-primary origin-bottom transition-transform duration-500"
          style={{ transform: `translateX(-50%) rotate(${getRotation()}deg)` }}
        />
        <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-primary rounded-full transform -translate-x-1/2" />
      </div>
      <span className="text-[10px] text-muted-foreground">{getValueText()}</span>
    </div>
  );
};

// Slider indicator component
const SliderIndicator = ({
  value,
  label,
  leftLabel,
  rightLabel,
}: {
  value: 'low' | 'medium' | 'high';
  label: string;
  leftLabel: string;
  rightLabel: string;
}) => {
  const getPosition = () => {
    switch (value) {
      case 'low': return '15%';
      case 'medium': return '50%';
      case 'high': return '85%';
      default: return '50%';
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-foreground">{label}</span>
      </div>
      <div className="relative">
        <div className="h-1 bg-muted rounded-full" />
        <motion.div 
          className="absolute top-1/2 w-3 h-3 bg-primary rounded-full transform -translate-y-1/2 -translate-x-1/2"
          initial={{ left: '50%' }}
          animate={{ left: getPosition() }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between">
        <span className="text-[9px] text-muted-foreground">{leftLabel}</span>
        <span className="text-[9px] text-muted-foreground">{rightLabel}</span>
      </div>
    </div>
  );
};

export const BreedStatsCard = ({ pet }: BreedStatsCardProps) => {
  const [breedInfo, setBreedInfo] = useState<BreedInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBreedInfo = async () => {
      if (!pet.breed) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('breed_information')
        .select('size_category, life_expectancy_years, exercise_needs, grooming_needs, temperament_he, training_difficulty, good_with_children, good_with_other_pets, apartment_friendly')
        .or(`breed_name.ilike.%${pet.breed}%,breed_name_he.ilike.%${pet.breed}%`)
        .maybeSingle();

      if (data) {
        setBreedInfo(data);
      }
      setLoading(false);
    };

    fetchBreedInfo();
  }, [pet.breed]);

  if (loading || !breedInfo) return null;

  // Parse exercise_needs to level
  const parseLevel = (value?: string): 'low' | 'medium' | 'high' => {
    if (!value) return 'medium';
    const lower = value.toLowerCase();
    if (lower.includes('low') || lower.includes('נמוך')) return 'low';
    if (lower.includes('high') || lower.includes('גבוה')) return 'high';
    return 'medium';
  };

  // Parse size to level
  const parseSize = (value?: string): 'low' | 'medium' | 'high' => {
    if (!value) return 'medium';
    const lower = value.toLowerCase();
    if (lower.includes('small') || lower === 'small') return 'low';
    if (lower.includes('large') || lower.includes('extra')) return 'high';
    return 'medium';
  };

  const exerciseLevel = parseLevel(breedInfo.exercise_needs);
  const groomingLevel = parseLevel(breedInfo.grooming_needs);
  const sizeLevel = parseSize(breedInfo.size_category);
  const trainingLevel = parseLevel(breedInfo.training_difficulty);

  // Get life expectancy number
  const lifeExpectancy = breedInfo.life_expectancy_years?.match(/\d+/)?.[0] || '12';

  // Get temperament
  const temperament = breedInfo.temperament_he?.[0] || 'חברותי';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4"
    >
      {/* Stats Section Header */}
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">נתוני הגזע</h3>
      </div>

      {/* Gauges Row - Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <GaugeIndicator value={groomingLevel} label="טיפוח" />
        <GaugeIndicator value={exerciseLevel} label="אנרגיה" />
        <GaugeIndicator value={trainingLevel} label="אילוף" />
      </div>

      {/* Info Cards Row */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Life Expectancy */}
        <div className="flex flex-col items-center p-3 bg-card rounded-xl border border-border/30">
          <span className="text-xs font-semibold text-foreground mb-2">תוחלת חיים</span>
          <Heart className="w-6 h-6 text-primary mb-1" />
          <span className="text-lg font-bold text-foreground">{lifeExpectancy}</span>
          <span className="text-[9px] text-muted-foreground">שנים</span>
        </div>

        {/* Popularity (mock) */}
        <div className="flex flex-col items-center p-3 bg-card rounded-xl border border-border/30">
          <span className="text-xs font-semibold text-foreground mb-2">פופולריות</span>
          <Star className="w-6 h-6 text-primary mb-1" />
          <span className="text-lg font-bold text-foreground">54</span>
          <span className="text-[9px] text-muted-foreground">מתוך 100</span>
        </div>
      </div>

      {/* Traits Section */}
      <div className="bg-card rounded-xl border border-border/30 p-4 space-y-4">
        <h4 className="text-xs font-bold text-foreground">מאפיינים</h4>
        
        <SliderIndicator 
          value={sizeLevel} 
          label="גודל" 
          leftLabel="קטן" 
          rightLabel="גדול" 
        />
        
        <SliderIndicator 
          value={exerciseLevel} 
          label="רמת פעילות" 
          leftLabel="רובץ ספות" 
          rightLabel="ספורטיבי" 
        />
        
        <SliderIndicator 
          value={groomingLevel} 
          label="צורכי טיפוח" 
          leftLabel="מינימלי" 
          rightLabel="אינטנסיבי" 
        />

        {/* Boolean traits */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
          {breedInfo.good_with_children && (
            <span className="text-[10px] px-2 py-1 bg-primary/10 text-primary rounded-full">
              טוב עם ילדים
            </span>
          )}
          {breedInfo.good_with_other_pets && (
            <span className="text-[10px] px-2 py-1 bg-primary/10 text-primary rounded-full">
              טוב עם חיות אחרות
            </span>
          )}
          {breedInfo.apartment_friendly && (
            <span className="text-[10px] px-2 py-1 bg-primary/10 text-primary rounded-full">
              מתאים לדירה
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
