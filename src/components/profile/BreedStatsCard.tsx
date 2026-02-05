import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Sparkles, Baby, Users, Dog, Zap, Brain, Scissors, Volume2, Shield, Home, ChevronDown, ChevronUp, Camera, Search } from "lucide-react";
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

// Compact rating dots (1-5)
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
          <motion.div
            key={dot}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: dot * 0.05 }}
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

// Circular stat component
const CircleStat = ({ 
  value, 
  label, 
  suffix = '',
  color = 'primary'
}: { 
  value: string | number; 
  label: string;
  suffix?: string;
  color?: string;
}) => (
  <div className="flex flex-col items-center">
    <div className={`w-14 h-14 rounded-full bg-${color}/10 flex items-center justify-center mb-1`}>
      <span className={`text-lg font-bold text-${color}`}>{value}</span>
    </div>
    <span className="text-[10px] text-muted-foreground text-center">{label}</span>
    {suffix && <span className="text-[9px] text-muted-foreground">{suffix}</span>}
  </div>
);

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
        .or(`breed_name.ilike.%${pet.breed}%,breed_name_he.ilike.%${pet.breed}%`)
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
      <div className="mx-4 mb-4 p-4 bg-card rounded-2xl border border-border/30">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded-xl" />
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

  // Get life expectancy first number
  const lifeExpectancy = breedInfo.life_expectancy_years?.match(/\d+/)?.[0] || '12';
  
  // Get size in Hebrew
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
      className="mx-4 mb-4"
    >
      {/* Main Card */}
      <div className="bg-card rounded-2xl border border-border/30 overflow-hidden">
        {/* Header with breed image */}
        <div className="relative">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent" />
          
          <div className="relative p-4">
            <div className="flex items-start gap-3">
              {/* Breed/Pet Image */}
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted border-2 border-background shadow-lg flex-shrink-0">
                {pet.avatar_url ? (
                  <img 
                    src={pet.avatar_url} 
                    alt={pet.breed} 
                    className="w-full h-full object-cover"
                  />
                ) : breedInfo.image_url ? (
                  <img 
                    src={breedInfo.image_url} 
                    alt={breedInfo.breed_name_he} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/10">
                    <Dog className="w-8 h-8 text-primary/50" />
                  </div>
                )}
              </div>

              {/* Breed Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs text-amber-600 font-medium">נתוני גזע</span>
                </div>
                <h3 className="text-lg font-bold text-foreground truncate">
                  {breedInfo.breed_name_he || pet.breed}
                </h3>
                {breedInfo.temperament_he && breedInfo.temperament_he.length > 0 && (
                  <p className="text-xs text-muted-foreground truncate">
                    {breedInfo.temperament_he.slice(0, 3).join(' • ')}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Stats Row */}
            <div className="flex items-center justify-around mt-4 pt-3 border-t border-border/30">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Heart className="w-4 h-4 text-red-400" />
                  <span className="text-lg font-bold text-foreground">{lifeExpectancy}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">שנות חיים</span>
              </div>
              
              <div className="w-px h-8 bg-border/50" />
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="text-lg font-bold text-foreground">{breedInfo.energy_level || 3}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">אנרגיה</span>
              </div>
              
              <div className="w-px h-8 bg-border/50" />
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-lg font-bold text-foreground">{breedInfo.affection_family || 3}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">חיבה</span>
              </div>
            </div>
          </div>
        </div>

        {/* Expandable Details Section */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2.5 flex items-center justify-center gap-2 bg-muted/30 hover:bg-muted/50 transition-colors border-t border-border/30"
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
              <div className="p-4 space-y-1 border-t border-border/30">
                <RatingDots value={breedInfo.kids_friendly} label="ידידותי לילדים" icon={Baby} />
                <RatingDots value={breedInfo.dog_friendly} label="ידידותי לכלבים" icon={Dog} />
                <RatingDots value={breedInfo.stranger_openness} label="פתיחות לזרים" icon={Users} />
                <RatingDots value={breedInfo.trainability} label="קלות אימון" icon={Brain} />
                <RatingDots value={breedInfo.grooming_freq} label="תדירות טיפוח" icon={Scissors} />
                <RatingDots value={breedInfo.barking_level} label="רמת נביחות" icon={Volume2} />
                <RatingDots value={breedInfo.watchdog_nature} label="יצר שמירה" icon={Shield} />
                <RatingDots value={breedInfo.mental_needs} label="צורך מנטלי" icon={Brain} />

                {/* Tags */}
                <div className="flex flex-wrap gap-2 pt-3">
                  {breedInfo.good_with_children && (
                    <span className="text-[10px] px-2.5 py-1 bg-green-500/10 text-green-600 rounded-full flex items-center gap-1">
                      <Baby className="w-3 h-3" />
                      טוב עם ילדים
                    </span>
                  )}
                  {breedInfo.good_with_other_pets && (
                    <span className="text-[10px] px-2.5 py-1 bg-blue-500/10 text-blue-600 rounded-full flex items-center gap-1">
                      <Dog className="w-3 h-3" />
                      טוב עם חיות
                    </span>
                  )}
                  {breedInfo.apartment_friendly && (
                    <span className="text-[10px] px-2.5 py-1 bg-purple-500/10 text-purple-600 rounded-full flex items-center gap-1">
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

              {/* Description */}
              {breedInfo.description_he && (
                <div className="px-4 pb-4">
                  <p className="text-xs text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-xl">
                    {breedInfo.description_he}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="px-4 pb-4 flex gap-2">
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
      </div>
    </motion.div>
  );
};
