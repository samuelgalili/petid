import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Dog, Cat, Calendar, Ruler, Weight, User, MessageCircle, Edit2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
}

export const TopRecommendation = ({ pet }: TopRecommendationProps) => {
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
      setEditValue(pet.size || '');
    } else if (field === 'weight') {
      setEditValue(String(pet.weight || ''));
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
        updateData = { size: editValue || null };
      } else if (editField === 'weight') {
        const weightVal = parseFloat(editValue);
        updateData = { weight: isNaN(weightVal) ? null : weightVal };
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
        
        {/* Pet Details Grid */}
        <div className="grid grid-cols-4 gap-2">
          {/* Age - Clickable */}
          <button
            onClick={() => openEditModal('age')}
            disabled={!isOwner}
            className={`flex flex-col items-center p-2 rounded-lg bg-muted/30 relative ${isOwner ? 'hover:bg-muted/50 cursor-pointer' : ''}`}
          >
            {isAgeFromBreed && (
              <Sparkles className="w-2.5 h-2.5 text-amber-500 absolute top-1 left-1" />
            )}
            <Calendar className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-[10px] text-muted-foreground">גיל</span>
            <span className="text-xs font-semibold text-foreground text-center leading-tight">{getAgeDisplay()}</span>
          </button>
          
          {/* Size - Clickable */}
          <button
            onClick={() => openEditModal('size')}
            disabled={!isOwner}
            className={`flex flex-col items-center p-2 rounded-lg bg-muted/30 relative ${isOwner ? 'hover:bg-muted/50 cursor-pointer' : ''}`}
          >
            {isSizeFromBreed && (
              <Sparkles className="w-2.5 h-2.5 text-amber-500 absolute top-1 left-1" />
            )}
            <Ruler className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-[10px] text-muted-foreground">גודל</span>
            <span className="text-xs font-semibold text-foreground">{getSizeDisplay()}</span>
          </button>
          
          {/* Weight - Clickable */}
          <button
            onClick={() => openEditModal('weight')}
            disabled={!isOwner}
            className={`flex flex-col items-center p-2 rounded-lg bg-muted/30 relative ${isOwner ? 'hover:bg-muted/50 cursor-pointer' : ''}`}
          >
            {isWeightFromBreed && (
              <Sparkles className="w-2.5 h-2.5 text-amber-500 absolute top-1 left-1" />
            )}
            <Weight className="w-4 h-4 text-muted-foreground mb-1" />
            <span className="text-[10px] text-muted-foreground">משקל</span>
            <span className="text-xs font-semibold text-foreground">{getWeightDisplay()}</span>
          </button>

          {/* Owner - Clickable to send message */}
          <button
            onClick={handleMessageOwner}
            disabled={!owner}
            className="flex flex-col items-center p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="relative">
              <User className="w-4 h-4 text-primary mb-1" />
              <MessageCircle className="w-2.5 h-2.5 text-primary absolute -bottom-0.5 -left-1" />
            </div>
            <span className="text-[10px] text-primary">בעלים</span>
            <span className="text-xs font-semibold text-primary truncate max-w-full">
              {owner?.full_name?.split(' ')[0] || 'אני'}
            </span>
          </button>
        </div>
      </motion.div>

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center">עדכון {getFieldLabel()}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {editField === 'age' ? (
              <div className="space-y-3">
                <Label className="block text-center text-sm text-muted-foreground">
                  בחר תאריך לידה
                </Label>
                <DateWheelPicker
                  value={birthDate}
                  onChange={setBirthDate}
                  minYear={1990}
                  maxYear={new Date().getFullYear()}
                  locale="he-IL"
                  size="md"
                />
                {birthDate && (
                  <div className="text-center text-sm text-muted-foreground pt-2 border-t">
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
                <Label>{getFieldLabel()}</Label>
                <Select value={editValue} onValueChange={setEditValue}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="בחר גודל" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">קטן</SelectItem>
                    <SelectItem value="medium">בינוני</SelectItem>
                    <SelectItem value="large">גדול</SelectItem>
                    <SelectItem value="extra_large">ענק</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>{getFieldLabel()}</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="הזן משקל"
                  className="h-12 text-lg text-center"
                  autoFocus
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                className="flex-1"
                disabled={saving}
              >
                ביטול
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1"
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
