import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Utensils, Edit2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

interface PetFoodTagProps {
  petId: string;
  currentFood: string | null;
  isOwner: boolean;
  breedName?: string;
}

export const PetFoodTag = ({ petId, currentFood, isOwner, breedName }: PetFoodTagProps) => {
  const [food, setFood] = useState(currentFood || '');
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(food);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('pets')
        .update({ current_food: inputValue || null } as any)
        .eq('id', petId);

      if (error) throw error;
      setFood(inputValue);
      setIsEditing(false);
      toast({ title: 'המזון עודכן' });
    } catch {
      toast({ title: 'שגיאה בעדכון', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Food suitability score (simplified)
  const getFoodScore = (): number | null => {
    if (!food) return null;
    // Simplified scoring - in production this would use breed-specific data
    return 82;
  };

  const score = getFoodScore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 flex-wrap"
    >
      {/* Current food tag */}
      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="editing"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center gap-1.5"
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="שם המזון..."
              className="h-7 text-xs w-32 px-2"
              dir="rtl"
              autoFocus
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="p-1 rounded-full bg-green-500/15 text-green-600 hover:bg-green-500/25 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setIsEditing(false); setInputValue(food); }}
              className="p-1 rounded-full bg-red-500/15 text-red-600 hover:bg-red-500/25 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="display"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => isOwner && setIsEditing(true)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
              food 
                ? 'bg-primary/10 text-primary hover:bg-primary/15' 
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Utensils className="w-3 h-3" />
            {food || 'הגדר מזון נוכחי'}
            {isOwner && <Edit2 className="w-2.5 h-2.5 mr-0.5 opacity-60" />}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Food suitability score */}
      {score && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-600 rounded-full text-[10px] font-bold"
        >
          התאמה: {score}%
        </motion.span>
      )}
    </motion.div>
  );
};
