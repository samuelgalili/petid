import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dog, Cat, Calendar, Ruler, Weight, User, MessageCircle, Edit2, Sparkles, Zap, Scissors, Utensils, Wind, Heart, ShoppingBag, Package, Share2, CheckCircle2, Shield, TrendingUp, Lightbulb, CloudSun, BarChart3 } from "lucide-react";
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
import { PetMoodMeter } from "@/components/profile/PetMoodMeter";
import { PetQRCode } from "@/components/profile/PetQRCode";
import { PetFoodTag } from "@/components/profile/PetFoodTag";

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
  const [recentPurchases, setRecentPurchases] = useState<Array<{id: string; product_name: string; product_image: string | null; quantity: number; price: number; created_at: string}>>([]);
  const [feedingGuideline, setFeedingGuideline] = useState<{min: number; max: number} | null>(null);
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
        .select('size_category, weight_range_kg, life_expectancy_years, exercise_needs, grooming_needs, energy_level, grooming_freq, shedding_level, trainability')
        .or(`breed_name.ilike.%${pet.breed}%,breed_name_he.ilike.%${pet.breed}%`)
        .maybeSingle();
      
      if (data) {
        setBreedInfo(data);
      }
    };

    fetchBreedInfo();
  }, [pet.breed]);

  // Fetch recent purchases
  useEffect(() => {
    const fetchRecentPurchases = async () => {
      if (!user?.id) return;
      
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', user.id)
        .order('order_date', { ascending: false })
        .limit(5);
      
      if (!orders || orders.length === 0) return;
      
      const orderIds = orders.map(o => o.id);
      const { data: items } = await supabase
        .from('order_items')
        .select('id, product_name, product_image, quantity, price, created_at')
        .in('order_id', orderIds)
        .order('created_at', { ascending: false })
        .limit(6);
      
      if (items) {
        setRecentPurchases(items);
      }
    };

    fetchRecentPurchases();
  }, [user?.id]);

  // Fetch manufacturer feeding guidelines based on pet weight and age
  useEffect(() => {
    const fetchFeedingGuidelines = async () => {
      // Get pet weight
      let weightKg: number | null = pet.weight || null;
      if (!weightKg && breedInfo?.weight_range_kg) {
        const match = breedInfo.weight_range_kg.match(/(\d+)-(\d+)/);
        if (match) weightKg = (parseInt(match[1]) + parseInt(match[2])) / 2;
      }
      if (!weightKg) return;

      // Determine age group
      let ageGroup = 'adult';
      if (pet.birth_date) {
        const { years, months } = calculateAge(pet.birth_date);
        const ageYears = years + months / 12;
        if (ageYears < 0.5) ageGroup = 'puppy';
        else if (ageYears < 1.5) ageGroup = 'junior';
        else if (ageYears > 7) ageGroup = 'senior';
      }

      // Query guidelines that match this pet's weight range
      const { data } = await supabase
        .from('product_feeding_guidelines')
        .select('grams_per_day_min, grams_per_day_max')
        .lte('weight_min_kg', weightKg)
        .gte('weight_max_kg', weightKg)
        .eq('age_group', ageGroup)
        .limit(5);

      if (data && data.length > 0) {
        // Aggregate min/max across all matching products
        const minGrams = Math.min(...data.map(d => d.grams_per_day_min));
        const maxGrams = Math.max(...data.map(d => d.grams_per_day_max));
        setFeedingGuideline({ min: minGrams, max: maxGrams });
      }
    };

    fetchFeedingGuidelines();
  }, [pet.weight, pet.birth_date, breedInfo?.weight_range_kg]);

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

  // Get recommended activity minutes based on energy_level (1-5 scale) or exercise_needs
  const getActivityMinutes = (): number | null => {
    // Use energy_level from breed_information if available
    if (breedInfo?.energy_level) {
      const levels: Record<number, number> = { 1: 20, 2: 30, 3: 45, 4: 60, 5: 90 };
      return levels[breedInfo.energy_level] || 45;
    }
    // Fallback to exercise_needs text
    const exercise = breedInfo?.exercise_needs?.toLowerCase() || '';
    if (exercise.includes('very high') || exercise.includes('גבוהה מאוד')) return 90;
    if (exercise.includes('high') || exercise.includes('גבוה')) return 60;
    if (exercise.includes('moderate') || exercise.includes('medium') || exercise.includes('בינוני')) return 45;
    if (exercise.includes('low') || exercise.includes('נמוך')) return 30;
    return null;
  };

  // Get energy level value (1-5) for visual display
  const getEnergyLevel = (): number => {
    if (breedInfo?.energy_level) return breedInfo.energy_level;
    const mins = getActivityMinutes();
    if (!mins) return 3;
    if (mins >= 90) return 5;
    if (mins >= 60) return 4;
    if (mins >= 45) return 3;
    if (mins >= 30) return 2;
    return 1;
  };

  // Get grooming frequency level using grooming_freq (1-5) or grooming_needs
  const getGroomingLevel = (): number => {
    if (breedInfo?.grooming_freq) return breedInfo.grooming_freq;
    const grooming = breedInfo?.grooming_needs?.toLowerCase() || '';
    if (grooming.includes('high') || grooming.includes('daily') || grooming.includes('גבוה') || grooming.includes('יומי')) return 5;
    if (grooming.includes('low') || grooming.includes('minimal') || grooming.includes('נמוך')) return 1;
    return 3;
  };

  const getGroomingLevelHe = () => {
    const level = getGroomingLevel();
    if (level >= 4) return 'גבוה';
    if (level >= 2) return 'בינוני';
    return 'נמוך';
  };

  // Get shedding level (1-5)
  const getSheddingLevel = (): number => {
    return breedInfo?.shedding_level || 3;
  };

  const getSheddingLevelHe = () => {
    const level = getSheddingLevel();
    if (level >= 4) return 'רב';
    if (level >= 2) return 'בינוני';
    return 'מועט';
  };

  // Determine fur length from shedding level or grooming needs
  const getFurLength = (): 'short' | 'medium' | 'long' => {
    const shedding = getSheddingLevel();
    if (shedding >= 4) return 'long';
    if (shedding <= 2) return 'short';
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

  // Get life expectancy range for visual display
  const getLifeExpectancyYears = (): { min: number; max: number } | null => {
    const exp = breedInfo?.life_expectancy_years;
    if (!exp) return null;
    const match = exp.match(/(\d+)-(\d+)/);
    if (match) return { min: parseInt(match[1]), max: parseInt(match[2]) };
    const single = exp.match(/(\d+)/);
    if (single) return { min: parseInt(single[1]), max: parseInt(single[1]) };
    return null;
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

  // #5 Health status color
  const getHealthDotColor = () => {
    if (pet.birth_date && pet.weight && pet.size) return 'bg-green-500';
    if (pet.birth_date || pet.weight) return 'bg-amber-500';
    return 'bg-red-400';
  };

  // #14 Profile completion
  const profileCompletion = useMemo(() => {
    let score = 0;
    const total = 6;
    if (pet.name) score++;
    if (pet.breed) score++;
    if (pet.birth_date) score++;
    if (pet.size) score++;
    if (pet.weight) score++;
    if (pet.avatar_url) score++;
    return Math.round((score / total) * 100);
  }, [pet]);

  // #17 Daily tip based on breed
  const dailyTip = useMemo(() => {
    const tips: Record<string, string[]> = {
      high_energy: [
        'מומלץ לספק לפחות שעה של פעילות יומית',
        'משחקי חשיבה עוזרים לפרוק אנרגיה מנטלית',
        'ריצה או הליכה מהירה מתאימים לגזע זה',
      ],
      high_grooming: [
        'מומלץ להבריש את הפרווה לפחות 3 פעמים בשבוע',
        'רחצה כל 4-6 שבועות שומרת על בריאות העור',
        'בדיקת אוזניים שבועית מונעת זיהומים',
      ],
      general: [
        'מים נקיים וזמינים תמיד - חיוני לבריאות',
        'ביקור וטרינר שנתי מומלץ גם כשהכל תקין',
        'אימון בסיסי מחזק את הקשר בין הבעלים לחיה',
      ],
    };
    const energyLevel = breedInfo?.energy_level || 3;
    const groomingLevel = breedInfo?.grooming_freq || 3;
    
    let category = 'general';
    if (energyLevel >= 4) category = 'high_energy';
    else if (groomingLevel >= 4) category = 'high_grooming';
    
    const dayIndex = new Date().getDate() % tips[category].length;
    return tips[category][dayIndex];
  }, [breedInfo]);

  // #11 Share to WhatsApp
  const handleShare = async () => {
    const text = `🐾 הכירו את ${pet.name}!\n${pet.breed ? `גזע: ${pet.breed}\n` : ''}${getAgeDisplay() !== 'לא צוין' ? `גיל: ${getAgeDisplay()}\n` : ''}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${pet.name} - PetID`, text });
      } catch {}
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  // #19 Food suitability (simplified)
  const getFoodScore = (): number | null => {
    if (!feedingGuideline) return null;
    return Math.min(95, 70 + Math.floor(Math.random() * 25)); // Placeholder until real data
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5, type: "spring", damping: 20 }}
        className={`mx-4 p-5 rounded-2xl border border-border/30 shadow-sm ${
          pet.type === 'dog' 
            ? 'bg-gradient-to-br from-card via-card to-[hsl(210,60%,96%)]' 
            : 'bg-gradient-to-br from-card via-card to-[hsl(270,40%,96%)]'
        }`}
        dir="rtl"
      >
        {/* Pet Header with improved spacing */}
        <div className="flex items-center gap-4 mb-5">
          {/* Pet Avatar with animated ring (#3) */}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="relative w-16 h-16 flex-shrink-0"
          >
            {/* Animated gradient ring */}
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: pet.type === 'dog' 
                  ? 'linear-gradient(135deg, hsl(var(--primary)), hsl(210,80%,60%), hsl(var(--primary)))' 
                  : 'linear-gradient(135deg, hsl(270,60%,60%), hsl(var(--primary)), hsl(270,60%,60%))',
                padding: '2.5px',
              }}
              animate={{ 
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <div className="w-full h-full rounded-[14px] overflow-hidden bg-card">
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
              </div>
            </motion.div>
            
            {/* Health status dot (#5) */}
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${getHealthDotColor()} border-2 border-card shadow-sm`}
            />
          </motion.div>
          
          {/* Name, Breed Badge & Status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-foreground text-xl leading-tight">{pet.name}</h3>
              {/* #13 Updated tag */}
              {profileCompletion === 100 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-500/15 text-green-600 rounded-full text-[9px] font-bold"
                >
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  מעודכן
                </motion.span>
              )}
            </div>
            
            {/* #8 Breed badge */}
            {pet.breed && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-primary/8 rounded-full"
              >
                <img 
                  src={pet.type === 'dog' ? dogIcon : catIcon} 
                  alt="" 
                  className="w-3 h-3 opacity-60" 
                />
                <span className="text-xs text-primary font-medium">{pet.breed}</span>
              </motion.div>
            )}
            {!pet.breed && (
              <p className="text-sm text-muted-foreground mt-0.5">{petTypeHe}</p>
            )}

            {/* #6 Next event countdown */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap gap-1 mt-1.5"
            >
              {/* #16 Insurance tag */}
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-muted text-muted-foreground rounded-full text-[9px] font-medium">
                <Shield className="w-2.5 h-2.5" />
                ללא ביטוח
              </span>
            </motion.div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-1.5">
            {/* #11 Share button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleShare}
              className="w-9 h-9 rounded-xl bg-muted/50 hover:bg-primary/10 transition-colors flex items-center justify-center"
              title="שיתוף"
              aria-label="שיתוף חיית המחמד"
            >
              <Share2 className="w-4 h-4 text-muted-foreground" />
            </motion.button>

            {/* Message Owner / Edit */}
            {owner && !isOwner ? (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleMessageOwner}
                className="w-9 h-9 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors flex items-center justify-center"
                title={`שליחת הודעה ל${owner.full_name?.split(' ')[0] || 'בעלים'}`}
              >
                <MessageCircle className="w-4 h-4 text-primary" />
              </motion.button>
            ) : isOwner ? (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(`/pet/${pet.id}/edit`)}
                className="w-9 h-9 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors flex items-center justify-center"
                title="עריכת פרטים"
              >
                <Edit2 className="w-4 h-4 text-primary" />
              </motion.button>
            ) : null}
          </div>
        </div>

        {/* #14 Profile Completion Bar */}
        {profileCompletion < 100 && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-4 px-1"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-muted-foreground">השלמת פרופיל</span>
              <span className="text-[10px] font-bold text-primary">{profileCompletion}%</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${profileCompletion}%` }}
                transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                className="h-full bg-gradient-to-l from-primary to-primary/70 rounded-full"
              />
            </div>
          </motion.div>
        )}

        {/* #17 Daily Tip */}
        {breedInfo && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mb-4 p-3 bg-amber-500/8 rounded-xl border border-amber-500/15"
          >
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-600 block mb-0.5">טיפ יומי</span>
                <span className="text-xs text-foreground/80 leading-relaxed">{dailyTip}</span>
              </div>
            </div>
          </motion.div>
        )}
        
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


        {/* Food Tag + Mood + QR Code row */}
        <div className="mb-4">
          <PetFoodTag 
            petId={pet.id} 
            currentFood={(pet as any).current_food || null} 
            isOwner={isOwner} 
            breedName={pet.breed}
          />
        </div>

        {/* Breed Traits + Mood + QR - Enhanced visual design */}
        <div className="grid grid-cols-7 gap-1.5">
          {/* Energy Button */}
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={onEnergyOpen}
            className="relative flex flex-col items-center p-2.5 bg-gradient-to-b from-background to-muted/20 hover:from-primary/5 hover:to-primary/10 rounded-2xl border border-border/30 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md group"
            aria-label={`אנרגיה: ${activityMinutes || 0} דקות`}
          >
            {/* Level indicator dots */}
            <div className="flex gap-0.5 mb-1.5">
              {[1, 2, 3, 4, 5].map((dot) => (
                <motion.div
                  key={dot}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: dot * 0.05 }}
                  className={`w-1.5 h-1.5 rounded-full ${dot <= getEnergyLevel() ? 'bg-primary' : 'bg-muted-foreground/20'}`}
                />
              ))}
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-1 group-hover:bg-primary/20 transition-colors">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <span className="text-[10px] font-semibold text-foreground">אנרגיה</span>
            {activityMinutes && (
              <span className="text-[9px] text-primary font-bold">{activityMinutes} דק׳</span>
            )}
          </motion.button>

          {/* Grooming Button */}
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={onGroomingOpen}
            className="relative flex flex-col items-center p-2.5 bg-gradient-to-b from-background to-muted/20 hover:from-primary/5 hover:to-primary/10 rounded-2xl border border-border/30 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md group"
            aria-label={`טיפוח: ${getGroomingLevelHe()}`}
          >
            {/* Level indicator dots */}
            <div className="flex gap-0.5 mb-1.5">
              {[1, 2, 3, 4, 5].map((dot) => (
                <motion.div
                  key={dot}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: dot * 0.05 }}
                  className={`w-1.5 h-1.5 rounded-full ${dot <= getGroomingLevel() ? 'bg-primary' : 'bg-muted-foreground/20'}`}
                />
              ))}
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-1 group-hover:bg-primary/20 transition-colors">
              <Scissors className="w-4 h-4 text-primary" />
            </div>
            <span className="text-[10px] font-semibold text-foreground">טיפוח</span>
            <span className="text-[9px] text-primary font-bold">{getGroomingLevelHe()}</span>
          </motion.button>

          {/* Feeding Button */}
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={onFeedingOpen}
            className="relative flex flex-col items-center p-2.5 bg-gradient-to-b from-background to-muted/20 hover:from-primary/5 hover:to-primary/10 rounded-2xl border border-border/30 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md group"
            aria-label={`האכלה: ${recommendedGrams || 0} גרם`}
          >
            {/* Mini progress bar */}
            <div className="w-full h-1 bg-muted-foreground/10 rounded-full mb-1.5 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: feedingGuideline ? `${Math.min((feedingGuideline.max / 500) * 100, 100)}%` : recommendedGrams ? `${Math.min((recommendedGrams / 500) * 100, 100)}%` : '50%' }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="h-full bg-primary rounded-full"
              />
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-1 group-hover:bg-primary/20 transition-colors">
              <Utensils className="w-4 h-4 text-primary" />
            </div>
            <span className="text-[10px] font-semibold text-foreground">האכלה</span>
            {feedingGuideline ? (
              <span className="text-[9px] text-primary font-bold">{feedingGuideline.min}-{feedingGuideline.max} גרם</span>
            ) : recommendedGrams ? (
              <span className="text-[9px] text-primary font-bold">~{recommendedGrams} גרם/יום</span>
            ) : (
              <span className="text-[9px] text-muted-foreground">—</span>
            )}
          </motion.button>

          {/* Shedding/Fur Button */}
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={onFurOpen}
            className="relative flex flex-col items-center p-2.5 bg-gradient-to-b from-background to-muted/20 hover:from-primary/5 hover:to-primary/10 rounded-2xl border border-border/30 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md group"
            aria-label={`נשירה: ${getSheddingLevelHe()}`}
          >
            {/* Level indicator dots */}
            <div className="flex gap-0.5 mb-1.5">
              {[1, 2, 3, 4, 5].map((dot) => (
                <motion.div
                  key={dot}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: dot * 0.05 }}
                  className={`w-1.5 h-1.5 rounded-full ${dot <= getSheddingLevel() ? 'bg-primary' : 'bg-muted-foreground/20'}`}
                />
              ))}
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-1 group-hover:bg-primary/20 transition-colors">
              <Wind className="w-4 h-4 text-primary" />
            </div>
            <span className="text-[10px] font-semibold text-foreground">נשירה</span>
            <span className="text-[9px] text-primary font-bold">{getSheddingLevelHe()}</span>
          </motion.button>

          {/* Life Expectancy Button */}
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={onLifeExpectancyOpen}
            className="relative flex flex-col items-center p-2.5 bg-gradient-to-b from-background to-muted/20 hover:from-primary/5 hover:to-primary/10 rounded-2xl border border-border/30 hover:border-primary/40 transition-all duration-300 shadow-sm hover:shadow-md group"
            aria-label={`תוחלת חיים: ${getLifeExpectancy() || ''}`}
          >
            {/* Mini arc indicator */}
            <div className="relative w-6 h-3 mb-1">
              <svg viewBox="0 0 36 18" className="w-full h-full">
                <path
                  d="M 2 16 A 14 14 0 0 1 34 16"
                  fill="none"
                  stroke="hsl(var(--muted-foreground) / 0.2)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <motion.path
                  d="M 2 16 A 14 14 0 0 1 34 16"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="50"
                  initial={{ strokeDashoffset: 50 }}
                  animate={{ strokeDashoffset: getLifeExpectancyYears() ? 50 - (getLifeExpectancyYears()!.min / 20 * 50) : 25 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                />
              </svg>
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-1 group-hover:bg-primary/20 transition-colors">
              <Heart className="w-4 h-4 text-primary" />
            </div>
            <span className="text-[10px] font-semibold text-foreground">תוחלת</span>
            {getLifeExpectancy() && (
              <span className="text-[9px] text-primary font-bold">{getLifeExpectancy()} ש׳</span>
            )}
          </motion.button>
        </div>

        {/* Recent Purchases */}
        {recentPurchases.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">רכישות אחרונות</span>
              </div>
              <button 
                onClick={() => navigate('/orders')}
                className="text-[10px] text-primary font-medium hover:underline"
              >
                הכל →
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {recentPurchases.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-shrink-0 w-20 flex flex-col items-center p-2 bg-card rounded-xl border border-border/20 hover:border-primary/30 transition-all"
                >
                  {item.product_image ? (
                    <img 
                      src={item.product_image} 
                      alt={item.product_name}
                      className="w-12 h-12 rounded-lg object-cover mb-1.5"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted/30 flex items-center justify-center mb-1.5">
                      <Package className="w-5 h-5 text-muted-foreground/50" />
                    </div>
                  )}
                  <span className="text-[9px] font-medium text-foreground text-center line-clamp-2 leading-tight">
                    {item.product_name}
                  </span>
                  <span className="text-[8px] text-primary font-bold mt-0.5">₪{item.price}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
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
