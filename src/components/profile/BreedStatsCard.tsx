import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, Star, Sparkles, Baby, Users, Dog, Zap, Brain, Scissors, Volume2, Shield, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Pet {
  id: string;
  type: 'dog' | 'cat';
  breed?: string;
}

interface BreedInfo {
  breed_name_he?: string;
  size_category?: string;
  life_expectancy_years?: string;
  affection_family?: number;
  kids_friendly?: number;
  dog_friendly?: number;
  energy_level?: number;
  trainability?: number;
  grooming_freq?: number;
  barking_level?: number;
  watchdog_nature?: number;
  shedding_level?: number;
  stranger_openness?: number;
  mental_needs?: number;
  apartment_friendly?: boolean;
  good_with_children?: boolean;
  good_with_other_pets?: boolean;
  temperament_he?: string[];
  description_he?: string;
}

interface BreedStatsCardProps {
  pet: Pet;
}

// Numeric rating bar component (1-5 scale)
const RatingBar = ({ 
  value, 
  label,
  icon: Icon
}: { 
  value: number | null; 
  label: string;
  icon: React.ElementType;
}) => {
  if (value === null || value === undefined) return null;
  
  const percentage = (value / 5) * 100;
  
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div 
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <span className="text-xs font-medium w-4 text-right">{value}</span>
    </div>
  );
};

// Semi-circle gauge component for main stats
const GaugeIndicator = ({ 
  value, 
  label,
  maxValue = 5
}: { 
  value: number | null; 
  label: string;
  maxValue?: number;
}) => {
  if (value === null || value === undefined) return null;
  
  const normalizedValue = value / maxValue;
  const strokeDashoffset = 126 - (normalizedValue * 126);
  const rotation = -60 + (normalizedValue * 120);
  
  const getValueText = () => {
    if (value <= 2) return 'נמוך';
    if (value >= 4) return 'גבוה';
    return 'בינוני';
  };

  return (
    <div className="flex flex-col items-center p-3 bg-card rounded-xl border border-border/30">
      <span className="text-xs font-semibold text-foreground mb-2">{label}</span>
      <div className="relative w-16 h-8 mb-1">
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
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div 
          className="absolute bottom-0 left-1/2 w-0.5 h-6 bg-primary origin-bottom transition-transform duration-500"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
        />
        <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-primary rounded-full transform -translate-x-1/2" />
      </div>
      <span className="text-[10px] text-muted-foreground">{getValueText()}</span>
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
        .select(`
          breed_name_he,
          size_category,
          life_expectancy_years,
          affection_family,
          kids_friendly,
          dog_friendly,
          energy_level,
          trainability,
          grooming_freq,
          barking_level,
          watchdog_nature,
          shedding_level,
          stranger_openness,
          mental_needs,
          apartment_friendly,
          good_with_children,
          good_with_other_pets,
          temperament_he,
          description_he
        `)
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

  // Get life expectancy first number
  const lifeExpectancy = breedInfo.life_expectancy_years?.match(/\d+/)?.[0] || '12';

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
        {breedInfo.breed_name_he && (
          <span className="text-xs text-muted-foreground">• {breedInfo.breed_name_he}</span>
        )}
      </div>

      {/* Main Gauges Row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <GaugeIndicator value={breedInfo.grooming_freq} label="טיפוח" />
        <GaugeIndicator value={breedInfo.energy_level} label="אנרגיה" />
        <GaugeIndicator value={breedInfo.trainability} label="אילוף" />
      </div>

      {/* Info Cards Row */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="flex flex-col items-center p-3 bg-card rounded-xl border border-border/30">
          <span className="text-xs font-semibold text-foreground mb-2">תוחלת חיים</span>
          <Heart className="w-6 h-6 text-primary mb-1" />
          <span className="text-lg font-bold text-foreground">{lifeExpectancy}</span>
          <span className="text-[9px] text-muted-foreground">שנים</span>
        </div>

        <div className="flex flex-col items-center p-3 bg-card rounded-xl border border-border/30">
          <span className="text-xs font-semibold text-foreground mb-2">אהבה למשפחה</span>
          <Star className="w-6 h-6 text-primary mb-1" />
          <span className="text-lg font-bold text-foreground">{breedInfo.affection_family || 3}</span>
          <span className="text-[9px] text-muted-foreground">מתוך 5</span>
        </div>
      </div>

      {/* Detailed Ratings Section */}
      <div className="bg-card rounded-xl border border-border/30 p-4 space-y-3">
        <h4 className="text-xs font-bold text-foreground mb-3">מאפיינים מפורטים</h4>
        
        <RatingBar value={breedInfo.kids_friendly} label="ילדים" icon={Baby} />
        <RatingBar value={breedInfo.dog_friendly} label="כלבים" icon={Dog} />
        <RatingBar value={breedInfo.stranger_openness} label="זרים" icon={Users} />
        <RatingBar value={breedInfo.energy_level} label="אנרגיה" icon={Zap} />
        <RatingBar value={breedInfo.mental_needs} label="מנטלי" icon={Brain} />
        <RatingBar value={breedInfo.grooming_freq} label="טיפוח" icon={Scissors} />
        <RatingBar value={breedInfo.barking_level} label="נביחות" icon={Volume2} />
        <RatingBar value={breedInfo.watchdog_nature} label="שמירה" icon={Shield} />

        {/* Boolean traits */}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-border/30">
          {breedInfo.good_with_children && (
            <span className="text-[10px] px-2 py-1 bg-primary/10 text-primary rounded-full">
              טוב עם ילדים
            </span>
          )}
          {breedInfo.good_with_other_pets && (
            <span className="text-[10px] px-2 py-1 bg-primary/10 text-primary rounded-full">
              טוב עם חיות
            </span>
          )}
          {breedInfo.apartment_friendly && (
            <span className="text-[10px] px-2 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-1">
              <Home className="w-3 h-3" />
              מתאים לדירה
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {breedInfo.description_he && (
        <div className="mt-3 p-3 bg-muted/30 rounded-xl">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {breedInfo.description_he}
          </p>
        </div>
      )}
    </motion.div>
  );
};
