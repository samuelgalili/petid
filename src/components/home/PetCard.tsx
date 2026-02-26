import { motion } from "framer-motion";
import { Plus, Heart, Calendar, Siren, Trash2, FlaskConical } from "lucide-react";
import { memo, useMemo, useState } from "react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PetCardProps {
  pet: any;
  index: number;
  isNewPet: boolean;
  isSelected?: boolean;
  hasNewInsight?: boolean;
  onLongPressStart: () => void;
  onLongPressEnd: () => void;
  onSelect?: () => void;
  onDeleted?: () => void;
}

const getAge = (birthDate: string | null): string | null => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const now = new Date();
  const years = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  const months = Math.floor(((now.getTime() - birth.getTime()) % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
  if (years > 0) return `${years} ${years === 1 ? 'שנה' : 'שנים'}`;
  if (months > 0) return `${months} ${months === 1 ? 'חודש' : 'חודשים'}`;
  return 'גור';
};

const getGenderIcon = (gender: string | null) => {
  if (gender === 'male' || gender === 'זכר') return '♂';
  if (gender === 'female' || gender === 'נקבה') return '♀';
  return null;
};

const getGenderColor = (gender: string | null) => {
  if (gender === 'male' || gender === 'זכר') return 'text-blue-500';
  if (gender === 'female' || gender === 'נקבה') return 'text-pink-500';
  return 'text-muted-foreground';
};

/** Approx prefix for safety/legal compliance */
const approx = (value: number | null | undefined, unit: string) => {
  if (value == null) return null;
  return `כ-${value} ${unit}`;
};

export const PetCard = memo(({ 
  pet, 
  index, 
  isNewPet,
  isSelected = false,
  hasNewInsight = false,
  onLongPressStart, 
  onLongPressEnd,
  onSelect,
  onDeleted
}: PetCardProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const age = useMemo(() => getAge(pet.birth_date), [pet.birth_date]);
  const genderIcon = useMemo(() => getGenderIcon(pet.gender), [pet.gender]);
  const genderColor = useMemo(() => getGenderColor(pet.gender), [pet.gender]);
  const petEmoji = pet.type === 'dog' ? '🐕' : '🐈';
  const petTypeLabel = pet.type === 'dog' ? 'כלב' : 'חתול';

  const weightLabel = useMemo(() => approx(pet.weight, 'ק"ג'), [pet.weight]);
  const dailyKcal = useMemo(() => {
    if (!pet.weight) return null;
    return Math.round(70 * Math.pow(pet.weight, 0.75));
  }, [pet.weight]);
  const kcalLabel = useMemo(() => approx(dailyKcal, 'kcal'), [dailyKcal]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    setDeleting(true);
    try {
      const { error } = await supabase.from("pets").update({ archived: true } as any).eq("id", pet.id);
      if (error) throw error;
      toast.success(`${pet.name} הוסר/ה בהצלחה`);
      onDeleted?.();
    } catch {
      toast.error("שגיאה במחיקה");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <motion.div
      key={pet.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isNewPet ? [1, 1.03, 1] : 1,
        ...(hasNewInsight ? { boxShadow: ['0 0 0 0px hsl(var(--primary)/0)', '0 0 0 4px hsl(var(--primary)/0.2)', '0 0 0 0px hsl(var(--primary)/0)'] } : {}),
      }}
      transition={{
        delay: 0.05 + index * 0.08,
        scale: isNewPet ? { duration: 0.6, repeat: 3, repeatType: "reverse" } : {},
        boxShadow: hasNewInsight ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {},
        type: "spring",
        stiffness: 260,
        damping: 20
      }}
      whileHover={{ y: -4, boxShadow: "0 12px 28px -8px rgba(0,0,0,0.15)" }}
      whileTap={{ scale: 0.97 }}
      onTouchStart={onLongPressStart}
      onTouchEnd={onLongPressEnd}
      onMouseDown={onLongPressStart}
      onMouseUp={onLongPressEnd}
      onMouseLeave={onLongPressEnd}
      onClick={() => {
        if (onSelect) onSelect();
      }}
      className={`cursor-pointer rounded-2xl border bg-card/70 backdrop-blur-[10px] shadow-card transition-all duration-200 overflow-hidden ${
        isSelected 
          ? 'border-primary/40 ring-2 ring-primary/30 shadow-elevated' 
          : 'border-border/30 hover:shadow-elevated'
      }`}
    >
      {/* Image Section */}
      <div className="relative w-full aspect-square bg-muted overflow-hidden">
        {pet.avatar_url ? (
          <OptimizedImage 
            src={pet.avatar_url} 
            alt={pet.name}
            className="w-full h-full"
            objectFit="cover"
            sizes="(max-width: 640px) 45vw, 200px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-accent/10 to-accent/30">
            {petEmoji}
          </div>
        )}

        {/* Delete Button - top left */}
        <button
          onClick={handleDelete}
          className={`absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm border transition-colors z-10 ${
            showDeleteConfirm 
              ? 'bg-destructive/90 border-destructive text-destructive-foreground' 
              : 'bg-background/80 border-border/50 text-muted-foreground hover:text-destructive'
          }`}
          aria-label={showDeleteConfirm ? "אישור מחיקה" : "מחיקת חיית מחמד"}
          disabled={deleting}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* Pet Type Badge */}
        <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm text-foreground text-xs font-bold px-2.5 py-1 rounded-full border border-border/50 flex items-center gap-1">
          <span>{petEmoji}</span>
          <span>{petTypeLabel}</span>
        </div>

        {/* Health Indicator */}
        <div className="absolute top-12 right-2">
          <div className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-background shadow-sm" title="בריאות תקינה" />
        </div>

        {/* New Badge */}
        {isNewPet && (
          <motion.div
            className="absolute bottom-2 left-2 bg-gradient-to-r from-primary to-accent text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            ✨ חדש
          </motion.div>
        )}

        {/* Lost Badge */}
        {pet.is_lost && (
          <motion.div
            className="absolute bottom-2 left-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Siren className="w-3 h-3" />
            נעדר/ת
          </motion.div>
        )}

        {/* Selected Indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md"
          >
            <Heart className="w-3.5 h-3.5 text-primary-foreground fill-current" />
          </motion.div>
        )}
      </div>

      {/* Info Section — Glassmorphism panel */}
      <div className="p-3.5 space-y-2" dir="rtl">
        {/* Name + Science Badge + Gender */}
        <div className="flex items-center gap-1.5">
          <h3 className="text-base font-extrabold text-foreground font-jakarta truncate flex-1" style={{ wordBreak: 'break-word' }}>
            {pet.name}
          </h3>
          {/* PetID Science Score badge */}
          <div className="flex-shrink-0 flex items-center gap-0.5 bg-primary/10 rounded-full px-1.5 py-0.5 border border-primary/20">
            <FlaskConical className="w-2.5 h-2.5 text-primary" strokeWidth={1.5} />
            <span className="text-[8px] font-bold text-primary leading-none">NRC</span>
          </div>
          {genderIcon && (
            <span className={`text-lg font-extrabold ${genderColor} flex-shrink-0`}>
              {genderIcon}
            </span>
          )}
        </div>

        {/* Breed */}
        {pet.breed && (
          <p className="text-sm font-medium text-muted-foreground truncate font-jakarta" style={{ wordBreak: 'break-word', unicodeBidi: 'plaintext' }} dir="auto">
            {pet.breed}
          </p>
        )}

        {/* Stats row: Age, Weight, Kcal */}
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 pt-1">
          {age && (
            <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <Calendar className="w-3 h-3 flex-shrink-0" strokeWidth={1.5} />
              <span>{age}</span>
            </div>
          )}
          {weightLabel && (
            <span className="text-xs text-muted-foreground" dir="auto" style={{ unicodeBidi: 'plaintext' }}>
              {weightLabel}
            </span>
          )}
          {kcalLabel && (
            <span className="text-xs text-muted-foreground" dir="auto" style={{ unicodeBidi: 'plaintext' }}>
              {kcalLabel}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.pet.id === nextProps.pet.id &&
    prevProps.isNewPet === nextProps.isNewPet &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.hasNewInsight === nextProps.hasNewInsight &&
    prevProps.pet.name === nextProps.pet.name &&
    prevProps.pet.breed === nextProps.pet.breed &&
    prevProps.pet.avatar_url === nextProps.pet.avatar_url &&
    prevProps.pet.birth_date === nextProps.pet.birth_date &&
    prevProps.pet.gender === nextProps.pet.gender &&
    prevProps.pet.weight === nextProps.pet.weight &&
    prevProps.pet.is_lost === nextProps.pet.is_lost
  );
});

interface AddPetCardProps {
  index: number;
  onAddPet: () => void;
}

export const AddPetCard = memo(({ index, onAddPet }: AddPetCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.08 }}
      whileHover={{ y: -4, boxShadow: "0 12px 28px -8px rgba(0,0,0,0.15)" }}
      whileTap={{ scale: 0.97 }}
      onClick={onAddPet}
      className="cursor-pointer rounded-2xl border-2 border-dashed border-accent/40 bg-card/50 hover:border-accent hover:bg-accent/5 transition-all duration-200 overflow-hidden flex flex-col items-center justify-center min-h-[200px]"
    >
      <motion.div
        className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-accent/20 flex items-center justify-center mb-3"
        whileHover={{ rotate: 90 }}
        transition={{ duration: 0.3 }}
      >
        <Plus className="w-8 h-8 text-accent" strokeWidth={2} />
      </motion.div>
      <span className="text-sm font-bold text-accent font-jakarta">
        הוסף חיית מחמד
      </span>
      <span className="text-xs text-muted-foreground mt-1">
        🐾 כלב, חתול ועוד
      </span>
    </motion.div>
  );
});
