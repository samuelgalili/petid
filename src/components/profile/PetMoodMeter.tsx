import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PetMoodMeterProps {
  petId: string;
  currentMood: string | null;
  isOwner: boolean;
}

const MOODS = [
  { emoji: '😊', label: 'שמח', value: 'happy' },
  { emoji: '😴', label: 'עייף', value: 'sleepy' },
  { emoji: '🥰', label: 'חייכני', value: 'loving' },
  { emoji: '😋', label: 'רעב', value: 'hungry' },
  { emoji: '🤒', label: 'לא בטוב', value: 'sick' },
  { emoji: '🤪', label: 'משתולל', value: 'hyper' },
];

export const PetMoodMeter = ({ petId, currentMood, isOwner }: PetMoodMeterProps) => {
  const [mood, setMood] = useState(currentMood);
  const [isExpanded, setIsExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const currentMoodData = MOODS.find(m => m.value === mood) || null;

  const handleSelectMood = async (moodValue: string) => {
    if (!isOwner || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('pets')
        .update({ 
          current_mood: moodValue,
          mood_updated_at: new Date().toISOString()
        } as any)
        .eq('id', petId);

      if (error) throw error;
      setMood(moodValue);
      setIsExpanded(false);
      toast({ title: 'מצב הרוח עודכן' });
    } catch (err: any) {
      toast({ title: 'שגיאה בעדכון', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative"
    >
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => isOwner && setIsExpanded(!isExpanded)}
        className="flex flex-col items-center gap-1 p-2.5 bg-gradient-to-b from-background to-muted/20 rounded-2xl border border-border/30 hover:border-primary/40 transition-all shadow-sm hover:shadow-md min-w-[60px]"
        title={isOwner ? 'עדכון מצב רוח' : 'מצב רוח'}
      >
        <span className="text-xl">{currentMoodData?.emoji || '😊'}</span>
        <span className="text-[9px] font-semibold text-foreground">מצב רוח</span>
        <span className="text-[8px] text-primary font-bold">
          {currentMoodData?.label || 'לחץ לעדכון'}
        </span>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            className="absolute top-full mt-2 right-1/2 translate-x-1/2 z-50 bg-card rounded-2xl border border-border shadow-lg p-3 min-w-[200px]"
          >
            <span className="text-xs font-semibold text-foreground block mb-2 text-center">איך מרגיש?</span>
            <div className="grid grid-cols-3 gap-2">
              {MOODS.map((m) => (
                <motion.button
                  key={m.value}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleSelectMood(m.value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
                    mood === m.value ? 'bg-primary/15 border border-primary/30' : 'hover:bg-muted'
                  }`}
                  disabled={saving}
                >
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="text-[9px] text-muted-foreground font-medium">{m.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
