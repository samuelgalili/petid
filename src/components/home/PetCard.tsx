import { motion } from "framer-motion";
import { Plus, Heart, Brain, Siren, Trash2, Weight, Hash, Sparkles } from "lucide-react";
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

/* ── Stat Cell — reusable mini component ── */
const StatCell = ({ label, value, placeholder }: { label: string; value: string | null; placeholder: string }) => (
  <motion.div
    whileHover={{ scale: 1.03 }}
    className="flex flex-col items-center text-center px-1 py-1.5 rounded-xl transition-colors hover:bg-muted/40 cursor-default min-w-0"
  >
    <span className="text-[10px] text-muted-foreground/70 font-medium mb-0.5 truncate w-full">{label}</span>
    {value ? (
      <span className="text-xs font-bold text-foreground truncate w-full" dir="auto" style={{ unicodeBidi: 'plaintext' as any }}>{value}</span>
    ) : (
      <span className="text-[9px] text-muted-foreground/50 italic leading-tight truncate w-full">{placeholder}</span>
    )}
  </motion.div>
);

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

  const weightLabel = useMemo(() => approx(pet.weight, 'ק"ג'), [pet.weight]);

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
      }}
      transition={{
        delay: 0.05 + index * 0.08,
        scale: isNewPet ? { duration: 0.6, repeat: 3, repeatType: "reverse" } : {},
        type: "spring",
        stiffness: 260,
        damping: 20
      }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      onTouchStart={onLongPressStart}
      onTouchEnd={onLongPressEnd}
      onMouseDown={onLongPressStart}
      onMouseUp={onLongPressEnd}
      onMouseLeave={onLongPressEnd}
      onClick={() => onSelect?.()}
      className={`cursor-pointer rounded-3xl bg-card shadow-[0_2px_16px_-4px_rgba(0,0,0,0.08)] transition-shadow duration-300 overflow-hidden ${
        isSelected
          ? 'ring-2 ring-primary/25 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.12)]'
          : 'hover:shadow-[0_6px_24px_-6px_rgba(0,0,0,0.12)]'
      }`}
    >
      {/* ═══ TOP: Image + Overlays ═══ */}
      <div className="relative w-full aspect-[4/3] bg-muted overflow-hidden">
        {pet.avatar_url ? (
          <OptimizedImage
            src={pet.avatar_url}
            alt={pet.name}
            className="w-full h-full"
            objectFit="cover"
            sizes="(max-width: 640px) 45vw, 200px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-muted to-muted/60">
            {petEmoji}
          </div>
        )}

        {/* Soft gradient overlay at bottom for text legibility */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

        {/* Delete — top-left */}
        <button
          onClick={handleDelete}
          className={`absolute top-2.5 left-2.5 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-colors z-10 ${
            showDeleteConfirm
              ? 'bg-destructive/90 text-destructive-foreground'
              : 'bg-background/60 text-muted-foreground/70 hover:text-destructive'
          }`}
          aria-label={showDeleteConfirm ? "אישור מחיקה" : "מחיקת חיית מחמד"}
          disabled={deleting}
        >
          <Trash2 className="w-3 h-3" strokeWidth={1.5} />
        </button>

        {/* Intelligence Pulse — top-right */}
        <motion.div
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-background/60 backdrop-blur-md flex items-center justify-center"
          animate={hasNewInsight ? {
            boxShadow: ['0 0 0 0px hsl(var(--primary)/0)', '0 0 0 6px hsl(var(--primary)/0.15)', '0 0 0 0px hsl(var(--primary)/0)'],
          } : {}}
          transition={hasNewInsight ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" } : {}}
          title={hasNewInsight ? "תובנה חדשה זמינה" : "מסונכרן"}
        >
          <Brain className={`w-3.5 h-3.5 ${hasNewInsight ? 'text-primary' : 'text-muted-foreground/50'}`} strokeWidth={1.5} />
        </motion.div>

        {/* Status Badges — bottom-left */}
        {isNewPet && (
          <motion.div
            className="absolute bottom-2 left-2 bg-background/80 backdrop-blur-md text-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Sparkles className="w-2.5 h-2.5 text-primary" strokeWidth={1.5} /> חדש
          </motion.div>
        )}
        {pet.is_lost && (
          <motion.div
            className="absolute bottom-2 left-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Siren className="w-3 h-3" strokeWidth={1.5} /> נעדר/ת
          </motion.div>
        )}

        {/* Selected heart — bottom-right */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
          >
            <Heart className="w-3 h-3 text-primary-foreground fill-current" />
          </motion.div>
        )}
      </div>

      {/* ═══ MIDDLE: Name + Breed + Stats ═══ */}
      <div className="px-3.5 pt-3.5 pb-2" dir="rtl">
        {/* Name row */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <h3 className="text-[15px] font-extrabold text-foreground truncate flex-1 leading-tight" style={{ wordBreak: 'break-word' }}>
            {pet.name}
          </h3>
          {genderIcon && (
            <span className={`text-base font-bold ${genderColor} flex-shrink-0 leading-none`}>
              {genderIcon}
            </span>
          )}
        </div>

        {/* Breed */}
        <p
          className="text-[11px] text-muted-foreground/70 font-medium truncate mb-3"
          dir="auto"
          style={{ wordBreak: 'break-word', unicodeBidi: 'plaintext' as any }}
        >
          {pet.breed || (pet.type === 'dog' ? 'גזע לא ידוע' : 'חתול')}
        </p>

        {/* 3-column stats grid */}
        <div className="grid grid-cols-3 gap-0.5">
          <StatCell
            label="משקל"
            value={weightLabel}
            placeholder="הוסף משקל"
          />
          <StatCell
            label="גזע"
            value={pet.breed || null}
            placeholder="זהה גזע"
          />
          <StatCell
            label="שבב"
            value={pet.chip_number || null}
            placeholder="הוסף שבב"
          />
        </div>
      </div>

      {/* ═══ BOTTOM: Quick Actions bar ═══ */}
      <div className="px-3.5 pb-3 pt-1">
        <div className="flex items-center justify-between">
          {age && (
            <span className="text-[10px] text-muted-foreground/60 font-medium">
              {age}
            </span>
          )}
          <div className="flex items-center gap-0.5 mr-auto">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[9px] text-muted-foreground/50 font-medium">מסונכרן</span>
          </div>
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
    prevProps.pet.chip_number === nextProps.pet.chip_number &&
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
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.97 }}
      onClick={onAddPet}
      className="cursor-pointer rounded-3xl bg-card shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_24px_-6px_rgba(0,0,0,0.1)] transition-shadow duration-300 overflow-hidden flex flex-col items-center justify-center min-h-[240px]"
    >
      <motion.div
        className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-3"
        whileHover={{ rotate: 90 }}
        transition={{ duration: 0.3 }}
      >
        <Plus className="w-7 h-7 text-muted-foreground/50" strokeWidth={1.5} />
      </motion.div>
      <span className="text-sm font-bold text-foreground/80">
        הוסף חיית מחמד
      </span>
      <span className="text-[11px] text-muted-foreground/50 mt-1">
        🐾 כלב, חתול ועוד
      </span>
    </motion.div>
  );
});
