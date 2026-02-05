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

// Animated Semi-circle gauge component with hover effects
const SemiCircleGauge = ({ 
  value, 
  maxValue = 5,
  label,
  valueLabel,
  delay = 0
}: { 
  value: number;
  maxValue?: number;
  label: string;
  valueLabel: string;
  delay?: number;
}) => {
  const percentage = (value / maxValue) * 100;
  const strokeDashoffset = 126 - (percentage / 100) * 126;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="bg-card rounded-2xl p-4 flex flex-col items-center shadow-sm border border-border/20 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-300"
      role="img"
      aria-label={`${label}: ${valueLabel}`}
    >
      <span className="text-sm font-semibold text-foreground mb-2">{label}</span>
      
      <div className="relative w-20 h-12">
        <svg viewBox="0 0 100 55" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="10"
            strokeLinecap="round"
          />
          
          {/* Animated value arc */}
          <motion.path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray="126"
            initial={{ strokeDashoffset: 126 }}
            animate={{ strokeDashoffset }}
            transition={{ delay: delay + 0.2, duration: 1, ease: "easeOut" }}
          />
          
          {/* Center indicator dot */}
          <motion.circle
            cx="50"
            cy="50"
            r="4"
            fill="hsl(var(--primary))"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.8, duration: 0.3, ease: "backOut" }}
          />
        </svg>
      </div>
      
      <motion.span 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.5 }}
        className="text-sm font-medium text-muted-foreground mt-1"
      >
        {valueLabel}
      </motion.span>
    </motion.div>
  );
};

// Icon stat card with animations
const IconStatCard = ({ 
  icon: Icon,
  label,
  value,
  subValue,
  delay = 0
}: { 
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  delay?: number;
}) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: "easeOut" }}
    whileHover={{ scale: 1.03, y: -2 }}
    whileTap={{ scale: 0.98 }}
    className="bg-card rounded-2xl p-4 flex flex-col items-center shadow-sm border border-border/20 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-300"
    role="img"
    aria-label={`${label}: ${value}${subValue ? ` ${subValue}` : ''}`}
  >
    <span className="text-sm font-semibold text-foreground mb-3">{label}</span>
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ delay: delay + 0.2, duration: 0.5, ease: "backOut" }}
    >
      <Icon className="w-10 h-10 text-primary mb-2" strokeWidth={1.5} />
    </motion.div>
    <motion.span 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: delay + 0.4 }}
      className="text-xl font-bold text-foreground"
    >
      {value}
    </motion.span>
    {subValue && (
      <motion.span 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.5 }}
        className="text-xs text-muted-foreground"
      >
        {subValue}
      </motion.span>
    )}
  </motion.div>
);

// Rating dots for expanded section with stagger animation
const RatingDots = ({ 
  value, 
  label,
  icon: Icon,
  index = 0
}: { 
  value: number | null; 
  label: string;
  icon: React.ElementType;
  index?: number;
}) => {
  if (value === null || value === undefined) return null;
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="flex items-center justify-between py-3 border-b border-border/10 last:border-0 hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors"
      role="img"
      aria-label={`${label}: ${value} מתוך 5`}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((dot) => (
          <motion.div
            key={dot}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.05 + dot * 0.05, duration: 0.2, ease: "backOut" }}
            className={`w-3 h-3 rounded-full transition-colors ${
              dot <= value 
                ? 'bg-primary shadow-sm shadow-primary/30' 
                : 'bg-muted'
            }`}
          />
        ))}
      </div>
    </motion.div>
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
      
      Object.entries(breedVariations).forEach(([key, values]) => {
        if (breedLower.includes(key.toLowerCase()) || key.toLowerCase().includes(breedLower)) {
          searchTerms.push(...values);
        }
      });

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
      <div className="mx-4 mb-4 p-4 bg-muted/30 rounded-2xl" role="status" aria-label="טוען נתונים">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-32 bg-muted rounded-lg" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded-2xl" />
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
        className="mx-4 mb-4 p-6 bg-card rounded-2xl border border-border/30"
      >
        <div className="text-center py-4">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-14 h-14 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center"
          >
            <Search className="w-7 h-7 text-muted-foreground" />
          </motion.div>
          <p className="text-base text-muted-foreground mb-4 font-medium">
            לא נמצא מידע על הגזע
          </p>
          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate('/breed-detect')}
            className="gap-2 hover:scale-105 transition-transform"
          >
            <Camera className="w-5 h-5" />
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
      {/* Header with animation */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2 px-1"
      >
        <motion.div
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
        >
          <Sparkles className="w-5 h-5 text-amber-500" />
        </motion.div>
        <span className="text-sm font-semibold text-amber-600">נתוני גזע</span>
        <span className="text-base text-foreground font-bold">
          {breedInfo.breed_name_he || pet.breed}
        </span>
      </motion.div>

      {/* Top row - 3 gauge cards with stagger */}
      <div className="grid grid-cols-3 gap-3">
        <SemiCircleGauge 
          value={breedInfo.shedding_level || 3} 
          label="נשירת שיער" 
          valueLabel={getLevelLabel(breedInfo.shedding_level)}
          delay={0}
        />
        <SemiCircleGauge 
          value={breedInfo.grooming_freq || 3} 
          label="טיפוח" 
          valueLabel={getLevelLabel(breedInfo.grooming_freq)}
          delay={0.1}
        />
        <SemiCircleGauge 
          value={breedInfo.energy_level || 3} 
          label="אנרגיה" 
          valueLabel={getLevelLabel(breedInfo.energy_level)}
          delay={0.2}
        />
      </div>

      {/* Bottom row - 2 icon cards */}
      <div className="grid grid-cols-2 gap-3">
        <IconStatCard
          icon={Award}
          label="ידידותיות למשפחה"
          value={`${(breedInfo.affection_family || 3) * 20}`}
          subValue="מתוך 100"
          delay={0.3}
        />
        <IconStatCard
          icon={Heart}
          label="תוחלת חיים ממוצעת"
          value={lifeExpectancy}
          delay={0.4}
        />
      </div>

      {/* Expandable Details Button */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="w-full px-4 py-3 flex items-center justify-center gap-2 bg-card hover:bg-muted/50 transition-all duration-300 rounded-2xl border border-border/20 hover:border-primary/30 hover:shadow-sm"
        aria-expanded={isExpanded}
        aria-controls="breed-details"
      >
        <span className="text-sm font-medium text-muted-foreground">
          {isExpanded ? 'הסתר פרטים' : 'הצג את כל המאפיינים'}
        </span>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </motion.button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            id="breed-details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="bg-card rounded-2xl border border-border/20 p-4 space-y-1">
              <RatingDots value={breedInfo.kids_friendly ?? null} label="ידידותי לילדים" icon={Baby} index={0} />
              <RatingDots value={breedInfo.dog_friendly ?? null} label="ידידותי לכלבים" icon={Dog} index={1} />
              <RatingDots value={breedInfo.stranger_openness ?? null} label="פתיחות לזרים" icon={Users} index={2} />
              <RatingDots value={breedInfo.trainability ?? null} label="קלות אימון" icon={Brain} index={3} />
              <RatingDots value={breedInfo.barking_level ?? null} label="רמת נביחות" icon={Volume2} index={4} />
              <RatingDots value={breedInfo.watchdog_nature ?? null} label="יצר שמירה" icon={Shield} index={5} />
              <RatingDots value={breedInfo.mental_needs ?? null} label="צורך מנטלי" icon={Brain} index={6} />

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap gap-2 pt-4"
              >
                {breedInfo.good_with_children && (
                  <motion.span 
                    whileHover={{ scale: 1.05 }}
                    className="text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-full flex items-center gap-1.5 font-medium"
                  >
                    <Baby className="w-3.5 h-3.5" />
                    טוב עם ילדים
                  </motion.span>
                )}
                {breedInfo.good_with_other_pets && (
                  <motion.span 
                    whileHover={{ scale: 1.05 }}
                    className="text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-full flex items-center gap-1.5 font-medium"
                  >
                    <Dog className="w-3.5 h-3.5" />
                    טוב עם חיות
                  </motion.span>
                )}
                {breedInfo.apartment_friendly && (
                  <motion.span 
                    whileHover={{ scale: 1.05 }}
                    className="text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-full flex items-center gap-1.5 font-medium"
                  >
                    <Home className="w-3.5 h-3.5" />
                    מתאים לדירה
                  </motion.span>
                )}
                {breedInfo.size_category && (
                  <span className="text-xs px-3 py-1.5 bg-muted text-muted-foreground rounded-full font-medium">
                    גודל: {sizeHe[breedInfo.size_category] || breedInfo.size_category}
                  </span>
                )}
              </motion.div>
            </div>

            {breedInfo.description_he && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-3"
              >
                <p className="text-sm text-muted-foreground leading-relaxed bg-card p-4 rounded-2xl border border-border/20">
                  {breedInfo.description_he}
                </p>
              </motion.div>
            )}

            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-3 flex gap-3"
            >
              <Button
                variant="outline"
                size="lg"
                className="flex-1 hover:scale-[1.02] transition-transform"
                onClick={() => navigate(`/breeds?search=${encodeURIComponent(pet.breed || '')}`)}
              >
                לאנציקלופדיה
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="flex-1 hover:scale-[1.02] transition-transform"
                onClick={() => navigate('/breed-quiz')}
              >
                שאלון התאמה
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
