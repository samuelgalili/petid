import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Dog, Cat, Calendar, Ruler, Weight, User, MessageCircle, Edit2, Sparkles, Zap, Scissors, Utensils } from "lucide-react";
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
}

interface TopRecommendationProps {
  pet: Pet;
  onViewPolicy: () => void;
  onEnergyOpen?: () => void;
  onGroomingOpen?: () => void;
  onFeedingOpen?: () => void;
}

export const TopRecommendation = ({ pet, onEnergyOpen, onGroomingOpen, onFeedingOpen }: TopRecommendationProps) => {
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
        .select('size_category, weight_range_kg, life_expectancy_years')
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
        transition={{ delay: 0.1 }}
        className="mx-4 p-4 bg-card rounded-xl border border-border/30"
      >
        {/* Pet Header */}
        <div className="flex items-center gap-3 mb-4">
          {/* Pet Avatar */}
          <div className="w-14 h-14 rounded-full overflow-hidden bg-muted border-2 border-border flex-shrink-0">
            {pet.avatar_url ? (
              <img 
                src={pet.avatar_url} 
                alt={pet.name} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <img 
                  src={pet.type === 'dog' ? dogIcon : catIcon} 
                  alt={petTypeHe} 
                  className="w-8 h-8 opacity-60" 
                />
              </div>
            )}
          </div>
          
          {/* Name & Type */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-lg">{pet.name}</h3>
            <p className="text-xs text-muted-foreground">
              {pet.breed || petTypeHe}
            </p>
          </div>

          {/* Type Icon */}
          <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
            {pet.type === 'dog' ? (
              <Dog className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Cat className="w-4 h-4 text-muted-foreground" />
            )}
          </div>

          {/* Message Owner Button */}
          {owner && !isOwner && (
            <button
              onClick={handleMessageOwner}
              className="w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors flex items-center justify-center"
              title={`שליחת הודעה ל${owner.full_name?.split(' ')[0] || 'בעלים'}`}
            >
              <MessageCircle className="w-4 h-4 text-primary" />
            </button>
          )}

          {/* Edit Button - Show only to owner */}
          {isOwner && (
            <button
              onClick={() => navigate(`/pet/${pet.id}/edit`)}
              className="w-8 h-8 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors flex items-center justify-center"
              title="עריכת פרטים"
            >
              <Edit2 className="w-4 h-4 text-primary" />
            </button>
          )}
        </div>
        
        {/* Pet Details Grid - 3 columns with trait buttons */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {/* Age - Opens Insurance Sheet when user has confirmed age */}
          <button
            onClick={() => {
              if (!hasUserBirthDate && isOwner) {
                // First time - let user set birth date
                openEditModal('age');
              } else if (hasUserBirthDate) {
                // Age is confirmed - show insurance recommendation
                navigate(`/pet/${pet.id}/insurance`);
              }
            }}
            disabled={!isOwner && !hasUserBirthDate}
            className={`flex flex-col items-center p-2 rounded-lg bg-muted/30 relative ${(isOwner || hasUserBirthDate) ? 'hover:bg-muted/50 cursor-pointer' : ''}`}
          >
            {isAgeFromBreed && (
              <Sparkles className="w-2.5 h-2.5 text-amber-500 absolute top-1 left-1" />
            )}
            <Calendar className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-[10px] text-muted-foreground">גיל</span>
            <span className="text-xs font-semibold text-foreground text-center leading-tight">{getAgeDisplay()}</span>
            {hasUserBirthDate && (
              <span className="text-[8px] text-primary mt-0.5">לביטוח</span>
            )}
          </button>
          
          {/* Size - Auto from breed, display only */}
          <div className="flex flex-col items-center p-2 rounded-lg bg-muted/30 relative">
            {isSizeFromBreed && (
              <Sparkles className="w-2.5 h-2.5 text-amber-500 absolute top-1 left-1" />
            )}
            <Ruler className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-[10px] text-muted-foreground">גודל</span>
            <span className="text-xs font-semibold text-foreground">{getSizeDisplay()}</span>
          </div>
          
          {/* Weight - Opens Feeding Sheet with 3 recommendations */}
          <button
            onClick={() => {
              if (!pet.weight && isOwner) {
                // First time - let user set weight
                openEditModal('weight');
              } else {
                // Weight exists - open feeding recommendations
                onFeedingOpen?.();
              }
            }}
            className="flex flex-col items-center p-2 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer relative"
          >
            {isWeightFromBreed && (
              <Sparkles className="w-2.5 h-2.5 text-amber-500 absolute top-1 left-1" />
            )}
            <Weight className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-[10px] text-muted-foreground">משקל</span>
            <span className="text-xs font-semibold text-foreground">{getWeightDisplay()}</span>
            {(pet.weight || breedInfo?.weight_range_kg) && (
              <span className="text-[8px] text-primary mt-0.5">להמלצות מזון</span>
            )}
          </button>
        </div>


        {/* Breed Traits - Energy, Grooming, Feeding with level indicator */}
        <div className="grid grid-cols-3 gap-2">
          {/* Energy Button */}
          <button
            onClick={onEnergyOpen}
            className="flex flex-col items-center p-3 bg-muted/30 hover:bg-muted/50 rounded-lg border border-border/20 transition-colors group relative overflow-hidden"
          >
            {/* Mini gauge arc */}
            <div className="relative w-10 h-5 mb-1">
              <svg viewBox="0 0 100 50" className="w-full h-full">
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray="126"
                  strokeDashoffset="42"
                />
              </svg>
            </div>
            <Zap className="w-4 h-4 text-primary mb-0.5" />
            <span className="text-[10px] font-semibold text-foreground text-center">אנרגיה</span>
          </button>

          {/* Grooming Button */}
          <button
            onClick={onGroomingOpen}
            className="flex flex-col items-center p-3 bg-muted/30 hover:bg-muted/50 rounded-lg border border-border/20 transition-colors group relative overflow-hidden"
          >
            {/* Mini gauge arc */}
            <div className="relative w-10 h-5 mb-1">
              <svg viewBox="0 0 100 50" className="w-full h-full">
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray="126"
                  strokeDashoffset="42"
                />
              </svg>
            </div>
            <Scissors className="w-4 h-4 text-primary mb-0.5" />
            <span className="text-[10px] font-semibold text-foreground text-center">טיפוח</span>
          </button>

          {/* Feeding Button */}
          <button
            onClick={onFeedingOpen}
            className="flex flex-col items-center p-3 bg-muted/30 hover:bg-muted/50 rounded-lg border border-border/20 transition-colors group relative overflow-hidden"
          >
            {/* Show recommended grams prominently */}
            {recommendedGrams ? (
              <div className="flex items-baseline gap-0.5 mb-1">
                <span className="text-lg font-bold text-primary">{recommendedGrams}</span>
                <span className="text-[8px] text-muted-foreground">גרם/יום</span>
              </div>
            ) : (
              /* Mini gauge arc when no data */
              <div className="relative w-10 h-5 mb-1">
                <svg viewBox="0 0 100 50" className="w-full h-full">
                  <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="10"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            )}
            <Utensils className="w-4 h-4 text-primary mb-0.5" />
            <span className="text-[10px] font-semibold text-foreground text-center">האכלה</span>
          </button>
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
