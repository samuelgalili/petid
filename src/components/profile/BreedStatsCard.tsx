import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, Baby, Users, Dog, Brain, Scissors, Volume2, Shield, Home, ChevronDown, ChevronUp, Camera, Search, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Pet {
  id: string;
  type: 'dog' | 'cat';
  breed?: string;
  avatar_url?: string;
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
  image_url?: string;
}

interface BreedStatsCardProps {
  pet: Pet;
}

// Semi-circle gauge component
const SemiCircleGauge = ({ 
  value, 
  maxValue = 5,
  label,
  valueLabel
}: { 
  value: number;
  maxValue?: number;
  label: string;
  valueLabel: string;
}) => {
  const percentage = (value / maxValue) * 100;
  const angle = (percentage / 100) * 180;
  
  // SVG arc calculation
  const radius = 40;
  const strokeWidth = 8;
  const centerX = 50;
  const centerY = 50;
  
  // Calculate arc end point
  const endAngle = (180 - angle) * (Math.PI / 180);
  const endX = centerX + radius * Math.cos(endAngle);
  const endY = centerY - radius * Math.sin(endAngle);
  
  // Create arc path
  const largeArcFlag = angle > 180 ? 1 : 0;
  const arcPath = `M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
  const backgroundArcPath = `M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`;
  
  // Needle calculation
  const needleAngle = (180 - angle) * (Math.PI / 180);
  const needleLength = radius - 5;
  const needleX = centerX + needleLength * Math.cos(needleAngle);
  const needleY = centerY - needleLength * Math.sin(needleAngle);

  return (
    <div className="bg-card rounded-2xl p-4 flex flex-col items-center shadow-sm border border-border/20">
      <span className="text-sm font-medium text-foreground mb-2">{label}</span>
      
      <div className="relative w-24 h-14">
        <svg viewBox="0 0 100 55" className="w-full h-full">
          {/* Background arc */}
          <path
            d={backgroundArcPath}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          
          {/* Value arc */}
          <motion.path
            d={arcPath}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          
          {/* Needle */}
          <motion.g
            initial={{ rotate: -180 }}
            animate={{ rotate: -180 + angle }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ transformOrigin: `${centerX}px ${centerY}px` }}
          >
            <line
              x1={centerX}
              y1={centerY}
              x2={centerX}
              y2={centerY - needleLength + 5}
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle
              cx={centerX}
              cy={centerY}
              r="4"
              fill="hsl(var(--primary))"
            />
          </motion.g>
        </svg>
      </div>
      
      <span className="text-sm text-muted-foreground mt-1">{valueLabel}</span>
    </div>
  );
};

// Icon stat card component
const IconStatCard = ({ 
  icon: Icon,
  label,
  value,
  subValue
}: { 
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
}) => (
  <div className="bg-card rounded-2xl p-4 flex flex-col items-center shadow-sm border border-border/20">
    <span className="text-sm font-medium text-foreground mb-3">{label}</span>
    <Icon className="w-10 h-10 text-primary mb-2" strokeWidth={1.5} />
    <span className="text-lg font-bold text-foreground">{value}</span>
    {subValue && <span className="text-xs text-muted-foreground">{subValue}</span>}
  </div>
);

// Rating dots for expanded section
const RatingDots = ({ 
  value, 
  label,
  icon: Icon
}: { 
  value: number | null; 
  label: string;
  icon: React.ElementType;
}) => {
  if (value === null || value === undefined) return null;
  
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((dot) => (
          <div
            key={dot}
            className={`w-2.5 h-2.5 rounded-full ${
              dot <= value 
                ? 'bg-primary' 
                : 'bg-muted'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

// Get level label in Hebrew
const getLevelLabel = (value: number | undefined | null): string => {
  if (!value) return 'בינוני';
  if (value <= 2) return 'נמוך';
  if (value <= 3) return 'בינוני';
  return 'גבוה';
};

export const BreedStatsCard = ({ pet }: BreedStatsCardProps) => {
  const navigate = useNavigate();
  const [breedInfo, setBreedInfo] = useState<BreedInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchBreedInfo = async () => {
      if (!pet.breed) {
        setLoading(false);
        return;
      }

      // Hebrew breed name variations mapping
      const breedVariations: Record<string, string[]> = {
        'שיצו': ['שי טסו', 'שיה טסו', 'shih tzu'],
        'שי טסו': ['שיצו', 'שיה טסו', 'shih tzu'],
        'דאקל': ['תחש', 'dachshund'],
        'תחש': ['דאקל', 'dachshund'],
        'גולדן': ['גולדן רטריבר', 'golden retriever'],
        'לברדור': ['לברדור רטריבר', 'labrador retriever'],
        'האסקי': ['סיבירי האסקי', 'siberian husky'],
        'פודל': ['פודל', 'poodle'],
        'יורקי': ['יורקשייר טרייר', 'yorkshire terrier'],
        'צ\'יוואווה': ['צ\'יוואווה', 'chihuahua'],
        'בולדוג': ['בולדוג צרפתי', 'french bulldog', 'בולדוג אנגלי'],
        'רועה גרמני': ['רועה גרמני', 'german shepherd'],
        'ביגל': ['ביגל', 'beagle'],
        'בוקסר': ['בוקסר', 'boxer'],
        'מלטז': ['מלטז', 'maltese'],
        'שנאוצר': ['שנאוצר', 'schnauzer'],
        'קוקר': ['קוקר ספנייל', 'cocker spaniel'],
        'פאג': ['פאג', 'pug'],
        'פומרניאן': ['פומרניאן', 'pomeranian'],
      };

      const breedLower = pet.breed.toLowerCase();
      const searchTerms = [pet.breed];
      
      // Add variations if they exist
      Object.entries(breedVariations).forEach(([key, values]) => {
        if (breedLower.includes(key.toLowerCase()) || key.toLowerCase().includes(breedLower)) {
          searchTerms.push(...values);
        }
      });

      // Build dynamic OR filter
      const orFilters = searchTerms.flatMap(term => [
        `breed_name.ilike.%${term}%`,
        `breed_name_he.ilike.%${term}%`
      ]).join(',');

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
          description_he,
          image_url
        `)
        .or(orFilters)
        .maybeSingle();

      if (data) {
        setBreedInfo(data);
      }
      setLoading(false);
    };

    fetchBreedInfo();
  }, [pet.breed]);

  if (loading) {
    return (
      <div className="mx-4 mb-4 p-4 bg-muted/30 rounded-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-muted rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!breedInfo) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mb-4 p-4 bg-card rounded-2xl border border-border/30"
      >
        <div className="text-center py-4">
          <div className="w-12 h-12 mx-auto mb-3 bg-muted rounded-full flex items-center justify-center">
            <Search className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            לא נמצא מידע על הגזע
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/breed-detect')}
            className="gap-2"
          >
            <Camera className="w-4 h-4" />
            זהה גזע מתמונה
          </Button>
        </div>
      </motion.div>
    );
  }

  const lifeExpectancy = breedInfo.life_expectancy_years?.match(/\d+/)?.[0] || '12';
  
  const sizeHe: Record<string, string> = {
    'small': 'קטן',
    'medium': 'בינוני', 
    'large': 'גדול',
    'extra_large': 'ענק'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4 space-y-4"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <Sparkles className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-medium text-amber-600">נתוני גזע</span>
        <span className="text-sm text-foreground font-bold">
          {breedInfo.breed_name_he || pet.breed}
        </span>
      </div>

      {/* Top row - 3 gauge cards */}
      <div className="grid grid-cols-3 gap-3">
        <SemiCircleGauge 
          value={breedInfo.shedding_level || 3} 
          label="נשירת שיער" 
          valueLabel={getLevelLabel(breedInfo.shedding_level)}
        />
        <SemiCircleGauge 
          value={breedInfo.grooming_freq || 3} 
          label="טיפוח" 
          valueLabel={getLevelLabel(breedInfo.grooming_freq)}
        />
        <SemiCircleGauge 
          value={breedInfo.energy_level || 3} 
          label="אנרגיה" 
          valueLabel={getLevelLabel(breedInfo.energy_level)}
        />
      </div>

      {/* Bottom row - 2 icon cards */}
      <div className="grid grid-cols-2 gap-3">
        <IconStatCard
          icon={Award}
          label="ידידותיות למשפחה"
          value={`${(breedInfo.affection_family || 3) * 20}`}
          subValue="מתוך 100"
        />
        <IconStatCard
          icon={Heart}
          label="תוחלת חיים ממוצעת"
          value={lifeExpectancy}
        />
      </div>

      {/* Expandable Details Section */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2.5 flex items-center justify-center gap-2 bg-card hover:bg-muted/50 transition-colors rounded-2xl border border-border/20"
      >
        <span className="text-xs font-medium text-muted-foreground">
          {isExpanded ? 'הסתר פרטים' : 'הצג את כל המאפיינים'}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-card rounded-2xl border border-border/20 p-4 space-y-1">
              <RatingDots value={breedInfo.kids_friendly ?? null} label="ידידותי לילדים" icon={Baby} />
              <RatingDots value={breedInfo.dog_friendly ?? null} label="ידידותי לכלבים" icon={Dog} />
              <RatingDots value={breedInfo.stranger_openness ?? null} label="פתיחות לזרים" icon={Users} />
              <RatingDots value={breedInfo.trainability ?? null} label="קלות אימון" icon={Brain} />
              <RatingDots value={breedInfo.barking_level ?? null} label="רמת נביחות" icon={Volume2} />
              <RatingDots value={breedInfo.watchdog_nature ?? null} label="יצר שמירה" icon={Shield} />
              <RatingDots value={breedInfo.mental_needs ?? null} label="צורך מנטלי" icon={Brain} />

              <div className="flex flex-wrap gap-2 pt-3">
                {breedInfo.good_with_children && (
                  <span className="text-[10px] px-2.5 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-1">
                    <Baby className="w-3 h-3" />
                    טוב עם ילדים
                  </span>
                )}
                {breedInfo.good_with_other_pets && (
                  <span className="text-[10px] px-2.5 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-1">
                    <Dog className="w-3 h-3" />
                    טוב עם חיות
                  </span>
                )}
                {breedInfo.apartment_friendly && (
                  <span className="text-[10px] px-2.5 py-1 bg-primary/10 text-primary rounded-full flex items-center gap-1">
                    <Home className="w-3 h-3" />
                    מתאים לדירה
                  </span>
                )}
                {breedInfo.size_category && (
                  <span className="text-[10px] px-2.5 py-1 bg-muted text-muted-foreground rounded-full">
                    גודל: {sizeHe[breedInfo.size_category] || breedInfo.size_category}
                  </span>
                )}
              </div>
            </div>

            {breedInfo.description_he && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground leading-relaxed bg-card p-3 rounded-2xl border border-border/20">
                  {breedInfo.description_he}
                </p>
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => navigate(`/breeds?search=${encodeURIComponent(pet.breed || '')}`)}
              >
                לאנציקלופדיה
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => navigate('/breed-quiz')}
              >
                שאלון התאמה
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
