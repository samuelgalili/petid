import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Dog, Cat, Calendar, Ruler, Weight, User, MessageCircle, Edit2, Sparkles, Zap, Scissors, Utensils, Feather, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateWheelPicker } from "@/components/ui/date-wheel-picker";
import { SizeWheelPicker, WeightWheelPicker } from "@/components/ui/wheel-picker";
import { useToast } from "@/hooks/use-toast";
import dogIcon from "@/assets/dog-official.svg";
import catIcon from "@/assets/cat-official.png";

interface Pet {
  id: string;
  name: string;
  type: 'dog' | 'cat';
  breed?: string;
  birth_date?: string;
  age_years?: number;
  age_months?: number;
  size?: string;
  weight?: number;
  avatar_url?: string;
  user_id?: string;
}

interface OwnerProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface BreedInfo {
  size_category?: string;
  weight_range_kg?: string;
  life_expectancy_years?: string;
  exercise_needs?: string;
  grooming_needs?: string;
  energy_level?: number;
  grooming_freq?: number;
  shedding_level?: number;
  trainability?: number;
}

interface TopRecommendationProps {
  pet: Pet;
  onViewPolicy: () => void;
  onEnergyOpen?: () => void;
  onGroomingOpen?: () => void;
  onFeedingOpen?: () => void;
  onFurOpen?: () => void;
  onLifeExpectancyOpen?: () => void;
}

export const TopRecommendation = ({ pet, onEnergyOpen, onGroomingOpen, onFeedingOpen, onFurOpen, onLifeExpectancyOpen }: TopRecommendationProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [breedInfo, setBreedInfo] = useState<BreedInfo | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editField, setEditField] = useState<'age' | 'size' | 'weight' | null>(null);
  const [birthDate, setBirthDate] = useState<Date>(new Date());
  const [sizeValue, setSizeValue] = useState<string>('');
  const [weightValue, setWeightValue] = useState<number>(10);
  const [saving, setSaving] = useState(false);
  const isOwner = user?.id === pet.user_id;

  // Fetch owner profile
  useEffect(() => {
    const fetchOwner = async () => {
      if (!pet.user_id) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', pet.user_id)
        .maybeSingle();
      
      if (data) {
        setOwner(data);
      }
    };

    fetchOwner();
  }, [pet.user_id]);

  // Fetch breed info for defaults
  useEffect(() => {
    const fetchBreedInfo = async () => {
      if (!pet.breed) return;
      
      const { data } = await supabase
        .from('breed_information')
        .select('size_category, weight_range_kg, life_expectancy_years, exercise_needs, grooming_needs')
        .or(`breed_name.ilike.%${pet.breed}%,breed_name_he.ilike.%${pet.breed}%`)
        .maybeSingle();
      
      if (data) {
        setBreedInfo(data);
      }
    };

    fetchBreedInfo();
  }, [pet.breed]);

  // Check if using AI data - use birth_date for age calculation
  const hasUserBirthDate = !!pet.birth_date;
  const isAgeFromBreed = !hasUserBirthDate && breedInfo?.life_expectancy_years;
  const isSizeFromBreed = !pet.size && breedInfo?.size_category;
  const isWeightFromBreed = !pet.weight && breedInfo?.weight_range_kg;

  // Calculate age from birth_date
  const calculateAge = (birthDateStr: string) => {
    const birth = new Date(birthDateStr);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    if (now.getDate() < birth.getDate()) {
      months--;
      if (months < 0) {
        years--;
        months += 12;
      }
    }
    return { years, months };
  };

  // Format age display
  const getAgeDisplay = () => {
    if (pet.birth_date) {
      const { years, months } = calculateAge(pet.birth_date);
      const yearsText = years === 1 ? 'שנה' : 'שנים';
      const monthsText = months === 1 ? 'חודש' : 'חודשים';
      
      if (years > 0 && months > 0) {
        return `${years} ${yearsText} ו-${months} ${monthsText}`;
      }
      if (years > 0) {
        return `${years} ${yearsText}`;
      }
      if (months > 0) {
        return `${months} ${monthsText}`;
      }
      return 'פחות מחודש';
    }
    if (breedInfo?.life_expectancy_years) {
      return `~${breedInfo.life_expectancy_years.split('-')[0]} שנים`;
    }
    return 'לא צוין';
  };

  // Get size display in Hebrew
  const getSizeDisplay = () => {
    const sizes: Record<string, string> = {
      'small': 'קטן',
      'medium': 'בינוני',
      'large': 'גדול',
      'extra_large': 'ענק',
    };
    if (pet.size) {
      return sizes[pet.size] || pet.size;
    }
    if (breedInfo?.size_category) {
      return sizes[breedInfo.size_category] || breedInfo.size_category;
    }
    return 'לא צוין';
  };

  // Get weight display
  const getWeightDisplay = () => {
    if (pet.weight) {
      return `${pet.weight} ק"ג`;
    }
    if (breedInfo?.weight_range_kg) {
      return `~${breedInfo.weight_range_kg} ק"ג`;
    }
    return 'לא צוין';
  };

  // Calculate recommended daily feeding in grams based on weight, age, and activity
  const getRecommendedFeedingGrams = (): number | null => {
    // Get weight - from pet data or breed average
    let weightKg: number | null = null;
    if (pet.weight) {
      weightKg = pet.weight;
    } else if (breedInfo?.weight_range_kg) {
      // Parse weight range and take average
      const range = breedInfo.weight_range_kg;
      const match = range.match(/(\d+)-(\d+)/);
      if (match) {
        weightKg = (parseInt(match[1]) + parseInt(match[2])) / 2;
      } else {
        const singleMatch = range.match(/(\d+)/);
        if (singleMatch) {
          weightKg = parseInt(singleMatch[1]);
        }
      }
    }
    
    if (!weightKg) return null;
    
    // Calculate age in years for adjustment
    let ageYears = 3; // default adult
    if (pet.birth_date) {
      const { years, months } = calculateAge(pet.birth_date);
      ageYears = years + (months / 12);
    }
    
    // Base calculation: 2-3% of body weight for adults
    // Puppies/kittens need more (3-4%), seniors need less (1.5-2%)
    let percentageOfWeight = 0.025; // 2.5% default for adults
    
    if (ageYears < 1) {
      percentageOfWeight = 0.04; // 4% for puppies/kittens
    } else if (ageYears < 2) {
      percentageOfWeight = 0.03; // 3% for young adults
    } else if (ageYears > 7) {
      percentageOfWeight = 0.02; // 2% for seniors
    }
    
    // Convert to grams (weight in kg * percentage * 1000)
    const dailyGrams = Math.round(weightKg * percentageOfWeight * 1000);
    
    return dailyGrams;
  };

  const recommendedGrams = getRecommendedFeedingGrams();

  // Get recommended activity minutes based on exercise needs
  const getActivityMinutes = (): number | null => {
    const exercise = breedInfo?.exercise_needs?.toLowerCase() || '';
    if (exercise.includes('very high') || exercise.includes('גבוהה מאוד')) return 90;
    if (exercise.includes('high') || exercise.includes('גבוה')) return 60;
    if (exercise.includes('moderate') || exercise.includes('medium') || exercise.includes('בינוני')) return 45;
    if (exercise.includes('low') || exercise.includes('נמוך')) return 30;
    return 45; // default
  };

  // Get grooming frequency level
  const getGroomingLevel = (): 'low' | 'medium' | 'high' => {
    const grooming = breedInfo?.grooming_needs?.toLowerCase() || '';
    if (grooming.includes('high') || grooming.includes('daily') || grooming.includes('גבוה') || grooming.includes('יומי')) return 'high';
    if (grooming.includes('low') || grooming.includes('minimal') || grooming.includes('נמוך')) return 'low';
    return 'medium';
  };

  const getGroomingLevelHe = () => {
    const levels: Record<string, string> = { low: 'נמוך', medium: 'בינוני', high: 'גבוה' };
    return levels[getGroomingLevel()];
  };

  // Determine fur length from grooming needs
  const getFurLength = (): 'short' | 'medium' | 'long' => {
    const grooming = breedInfo?.grooming_needs?.toLowerCase() || '';
    if (grooming.includes('long') || grooming.includes('ארוך') || grooming.includes('daily')) return 'long';
    if (grooming.includes('short') || grooming.includes('קצר') || grooming.includes('minimal')) return 'short';
    return 'medium';
  };

  const getFurLengthHe = () => {
    const lengths: Record<string, string> = { short: 'קצר', medium: 'בינוני', long: 'ארוך' };
    return lengths[getFurLength()];
  };

  // Get life expectancy display
  const getLifeExpectancy = (): string | null => {
    return breedInfo?.life_expectancy_years || null;
  };

  const activityMinutes = getActivityMinutes();

  // Open edit modal
  const openEditModal = (field: 'age' | 'size' | 'weight') => {
    if (!isOwner) return;
    setEditField(field);
    if (field === 'age') {
      // Set birthDate from pet data or default to today
      if (pet.birth_date) {
        setBirthDate(new Date(pet.birth_date));
      } else {
        setBirthDate(new Date());
      }
    } else if (field === 'size') {
      // Set size from pet data or breed default
      setSizeValue(pet.size || breedInfo?.size_category || 'medium');
    } else if (field === 'weight') {
      // Set weight from pet data or parse from breed range
      if (pet.weight) {
        setWeightValue(pet.weight);
      } else if (breedInfo?.weight_range_kg) {
        const avgWeight = parseInt(breedInfo.weight_range_kg.split('-')[0]) || 10;
        setWeightValue(avgWeight);
      } else {
        setWeightValue(10);
      }
    }
    setEditModalOpen(true);
  };

  // Save field update
  const handleSave = async () => {
    if (!editField || !isOwner) return;
    setSaving(true);

    try {
      let updateData: Record<string, any> = {};
      
      if (editField === 'age') {
        // Save birth_date
        const formattedDate = birthDate.toISOString().split('T')[0];
        updateData = { birth_date: formattedDate };
      } else if (editField === 'size') {
        updateData = { size: sizeValue || null };
      } else if (editField === 'weight') {
        updateData = { weight: weightValue || null };
      }

      const { error } = await supabase
        .from('pets')
        .update(updateData)
        .eq('id', pet.id);

      if (error) throw error;

      toast({ title: 'הנתונים עודכנו בהצלחה' });
      setEditModalOpen(false);
      setEditField(null);
      // Refresh page to get updated data
      window.location.reload();
    } catch (error: any) {
      console.error('Update error:', error);
      toast({ title: 'שגיאה בעדכון', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Handle send message to owner
  const handleMessageOwner = () => {
    if (owner?.id) {
      navigate(`/messages?userId=${owner.id}`);
    }
  };

  const petTypeHe = pet.type === 'dog' ? 'כלב' : 'חתול';

  const getFieldLabel = () => {
    switch(editField) {
      case 'age': return 'גיל (בשנים)';
      case 'size': return 'גודל';
      case 'weight': return 'משקל (ק"ג)';
      default: return '';
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="mx-4 p-5 bg-card rounded-2xl border border-border/30 shadow-sm"
        dir="rtl"
      >
        {/* Pet Header with improved spacing */}
        <div className="flex items-center gap-4 mb-5">
          {/* Pet Avatar with animation */}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-16 h-16 rounded-2xl overflow-hidden bg-muted border-2 border-primary/20 flex-shrink-0 shadow-md"
          >
            {pet.avatar_url ? (
              <img 
                src={pet.avatar_url} 
                alt={pet.name} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/5">
                <img 
                  src={pet.type === 'dog' ? dogIcon : catIcon} 
                  alt={petTypeHe} 
                  className="w-10 h-10 opacity-70" 
                />
              </div>
            )}
          </motion.div>
          
          {/* Name & Type with better typography */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-xl leading-tight">{pet.name}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {pet.breed || petTypeHe}
            </p>
          </div>

          {/* Type Icon with better styling */}
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center"
          >
            {pet.type === 'dog' ? (
              <Dog className="w-5 h-5 text-muted-foreground" />
            ) : (
              <Cat className="w-5 h-5 text-muted-foreground" />
            )}
          </motion.div>

          {/* Message Owner Button */}
          {owner && !isOwner && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleMessageOwner}
              className="w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors flex items-center justify-center"
              title={`שליחת הודעה ל${owner.full_name?.split(' ')[0] || 'בעלים'}`}
              aria-label="שליחת הודעה לבעלים"
            >
              <MessageCircle className="w-5 h-5 text-primary" />
            </motion.button>
          )}

          {/* Edit Button - Show only to owner */}
          {isOwner && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/pet/${pet.id}/edit`)}
              className="w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors flex items-center justify-center"
              title="עריכת פרטים"
              aria-label="עריכת פרטי חיית המחמד"
            >
              <Edit2 className="w-5 h-5 text-primary" />
            </motion.button>
          )}
        </div>
        
        {/* Pet Details Grid - 3 columns with animated gauge cards */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {/* Age Gauge Card */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (!hasUserBirthDate && isOwner) {
                openEditModal('age');
              } else if (hasUserBirthDate) {
                navigate(`/pet/${pet.id}/insurance`);
              }
            }}
            disabled={!isOwner && !hasUserBirthDate}
            className="bg-card rounded-2xl p-4 flex flex-col items-center shadow-sm border border-border/20 relative hover:shadow-md hover:border-primary/30 transition-all duration-300"
            aria-label={`גיל: ${getAgeDisplay()}`}
          >
            {isAgeFromBreed && (
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 absolute top-2 left-2" />
              </motion.div>
            )}
            <span className="text-sm font-semibold text-foreground mb-2">גיל</span>
            <div className="relative w-18 h-11 mb-1">
              <svg viewBox="0 0 100 55" className="w-full h-full">
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <motion.path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray="126"
                  initial={{ strokeDashoffset: 126 }}
                  animate={{ strokeDashoffset: 126 - (hasUserBirthDate ? 80 : 40) }}
                  transition={{ delay: 0.3, duration: 1, ease: "easeOut" }}
                />
              </svg>
            </div>
            <span className="text-sm text-muted-foreground text-center leading-tight font-medium">{getAgeDisplay()}</span>
          </motion.button>
          
          {/* Size Gauge Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.03, y: -2 }}
            className="bg-card rounded-2xl p-4 flex flex-col items-center shadow-sm border border-border/20 relative hover:shadow-md hover:border-primary/30 transition-all duration-300 cursor-default"
            role="img"
            aria-label={`גודל: ${getSizeDisplay()}`}
          >
            {isSizeFromBreed && (
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 absolute top-2 left-2" />
              </motion.div>
            )}
            <span className="text-sm font-semibold text-foreground mb-2">גודל</span>
            <div className="relative w-18 h-11 mb-1">
              <svg viewBox="0 0 100 55" className="w-full h-full">
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <motion.path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray="126"
                  initial={{ strokeDashoffset: 126 }}
                  animate={{ strokeDashoffset: 126 - (() => {
                    const size = pet.size || breedInfo?.size_category || 'medium';
                    if (size === 'small') return 32;
                    if (size === 'medium') return 63;
                    if (size === 'large') return 95;
                    if (size === 'extra_large') return 126;
                    return 63;
                  })() }}
                  transition={{ delay: 0.4, duration: 1, ease: "easeOut" }}
                />
              </svg>
            </div>
            <span className="text-sm text-muted-foreground font-medium">{getSizeDisplay()}</span>
          </motion.div>
          
          {/* Weight Gauge Card */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (!pet.weight && isOwner) {
                openEditModal('weight');
              } else {
                onFeedingOpen?.();
              }
            }}
            className="bg-card rounded-2xl p-4 flex flex-col items-center shadow-sm border border-border/20 relative hover:shadow-md hover:border-primary/30 transition-all duration-300"
            aria-label={`משקל: ${getWeightDisplay()}`}
          >
            {isWeightFromBreed && (
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 absolute top-2 left-2" />
              </motion.div>
            )}
            <span className="text-sm font-semibold text-foreground mb-2">משקל</span>
            <div className="relative w-18 h-11 mb-1">
              <svg viewBox="0 0 100 55" className="w-full h-full">
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <motion.path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray="126"
                  initial={{ strokeDashoffset: 126 }}
                  animate={{ strokeDashoffset: 126 - Math.min((pet.weight || 10) / 50 * 126, 126) }}
                  transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
                />
              </svg>
            </div>
            <span className="text-sm text-muted-foreground font-medium">{getWeightDisplay()}</span>
          </motion.button>
        </div>


        {/* Breed Traits - 5 buttons with improved styling */}
        <div className="grid grid-cols-5 gap-2">
          {/* Energy Button */}
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onEnergyOpen}
            className="flex flex-col items-center p-3 bg-muted/30 hover:bg-primary/10 rounded-xl border border-border/20 hover:border-primary/30 transition-all duration-300"
            aria-label={`אנרגיה: ${activityMinutes || 0} דקות`}
          >
            {activityMinutes && (
              <div className="flex items-baseline gap-0.5">
                <span className="text-sm font-bold text-primary">{activityMinutes}</span>
                <span className="text-[8px] text-muted-foreground">דק׳</span>
              </div>
            )}
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-semibold text-foreground text-center mt-0.5">אנרגיה</span>
          </motion.button>

          {/* Grooming Button */}
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onGroomingOpen}
            className="flex flex-col items-center p-3 bg-muted/30 hover:bg-primary/10 rounded-xl border border-border/20 hover:border-primary/30 transition-all duration-300"
            aria-label={`טיפוח: ${getGroomingLevelHe()}`}
          >
            <span className="text-xs font-bold text-primary">{getGroomingLevelHe()}</span>
            <Scissors className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-semibold text-foreground text-center mt-0.5">טיפוח</span>
          </motion.button>

          {/* Feeding Button */}
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onFeedingOpen}
            className="flex flex-col items-center p-3 bg-muted/30 hover:bg-primary/10 rounded-xl border border-border/20 hover:border-primary/30 transition-all duration-300"
            aria-label={`האכלה: ${recommendedGrams || 0} גרם`}
          >
            {recommendedGrams ? (
              <div className="flex items-baseline gap-0.5">
                <span className="text-sm font-bold text-primary">{recommendedGrams}</span>
                <span className="text-[8px] text-muted-foreground">ג׳</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
            <Utensils className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-semibold text-foreground text-center mt-0.5">האכלה</span>
          </motion.button>

          {/* Fur Length Button */}
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onFurOpen}
            className="flex flex-col items-center p-3 bg-muted/30 hover:bg-primary/10 rounded-xl border border-border/20 hover:border-primary/30 transition-all duration-300"
            aria-label={`פרווה: ${getFurLengthHe()}`}
          >
            <span className="text-xs font-bold text-primary">{getFurLengthHe()}</span>
            <Feather className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-semibold text-foreground text-center mt-0.5">פרווה</span>
          </motion.button>

          {/* Life Expectancy Button */}
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onLifeExpectancyOpen}
            className="flex flex-col items-center p-3 bg-muted/30 hover:bg-primary/10 rounded-xl border border-border/20 hover:border-primary/30 transition-all duration-300"
            aria-label={`תוחלת חיים: ${getLifeExpectancy() || ''}`}
          >
            {getLifeExpectancy() && (
              <div className="flex items-baseline gap-0.5">
                <span className="text-xs font-bold text-primary">{getLifeExpectancy()?.split('-')[0]}</span>
                <span className="text-[8px] text-muted-foreground">ש׳</span>
              </div>
            )}
            <Heart className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-semibold text-foreground text-center mt-0.5">תוחלת</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-xs p-4" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">עדכון {getFieldLabel()}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 py-2">
            {editField === 'age' ? (
              <div className="space-y-2">
                <Label className="block text-center text-xs text-muted-foreground">
                  בחר תאריך לידה
                </Label>
                <DateWheelPicker
                  value={birthDate}
                  onChange={setBirthDate}
                  minYear={1990}
                  maxYear={new Date().getFullYear()}
                  locale="he-IL"
                  size="sm"
                />
                {birthDate && (
                  <div className="text-center text-xs text-muted-foreground pt-2 border-t">
                    גיל: {(() => {
                      const now = new Date();
                      let years = now.getFullYear() - birthDate.getFullYear();
                      let months = now.getMonth() - birthDate.getMonth();
                      if (months < 0) { years--; months += 12; }
                      if (now.getDate() < birthDate.getDate()) { months--; if (months < 0) { years--; months += 12; } }
                      const yearsText = years === 1 ? 'שנה' : 'שנים';
                      const monthsText = months === 1 ? 'חודש' : 'חודשים';
                      if (years > 0 && months > 0) return `${years} ${yearsText} ו-${months} ${monthsText}`;
                      if (years > 0) return `${years} ${yearsText}`;
                      if (months > 0) return `${months} ${monthsText}`;
                      return 'פחות מחודש';
                    })()}
                  </div>
                )}
              </div>
            ) : editField === 'size' ? (
              <div className="space-y-2">
                <Label className="block text-center text-xs text-muted-foreground">
                  בחר גודל
                </Label>
                <SizeWheelPicker
                  value={sizeValue}
                  onChange={setSizeValue}
                  defaultFromBreed={breedInfo?.size_category}
                />
              </div>
            ) : editField === 'weight' ? (
              <div className="space-y-2">
                <Label className="block text-center text-xs text-muted-foreground">
                  בחר משקל
                </Label>
                <WeightWheelPicker
                  value={weightValue}
                  onChange={setWeightValue}
                  min={1}
                  max={100}
                  step={1}
                />
              </div>
            ) : null}

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                className="flex-1 h-9 text-sm"
                disabled={saving}
              >
                ביטול
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 h-9 text-sm"
                disabled={saving}
              >
                {saving ? 'שומר...' : 'שמור'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
