import { motion } from "framer-motion";
import { Plus, Heart, Calendar, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { memo, useMemo } from "react";
import { OptimizedImage } from "@/components/OptimizedImage";

interface PetCardProps {
  pet: any;
  index: number;
  isNewPet: boolean;
  isSelected?: boolean;
  onLongPressStart: () => void;
  onLongPressEnd: () => void;
  onSelect?: () => void;
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

export const PetCard = memo(({ 
  pet, 
  index, 
  isNewPet,
  isSelected = false,
  onLongPressStart, 
  onLongPressEnd,
  onSelect 
}: PetCardProps) => {
  const navigate = useNavigate();
  const age = useMemo(() => getAge(pet.birth_date), [pet.birth_date]);
  const genderIcon = useMemo(() => getGenderIcon(pet.gender), [pet.gender]);
  const genderColor = useMemo(() => getGenderColor(pet.gender), [pet.gender]);
  const petEmoji = pet.type === 'dog' ? '🐕' : '🐈';
  const petTypeLabel = pet.type === 'dog' ? 'כלב' : 'חתול';

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
      whileHover={{ y: -4, boxShadow: "0 12px 28px -8px rgba(0,0,0,0.15)" }}
      whileTap={{ scale: 0.97 }}
      onTouchStart={onLongPressStart}
      onTouchEnd={onLongPressEnd}
      onMouseDown={onLongPressStart}
      onMouseUp={onLongPressEnd}
      onMouseLeave={onLongPressEnd}
      onClick={() => {
        if (onSelect) onSelect();
        navigate(`/pet/${pet.id}`);
      }}
      className={`cursor-pointer rounded-2xl border bg-card shadow-card transition-all duration-200 overflow-hidden ${
        isSelected 
          ? 'border-primary ring-2 ring-primary/30 shadow-elevated' 
          : 'border-card-border hover:shadow-elevated'
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

        {/* Pet Type Badge - top left */}
        <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm text-foreground text-[10px] font-bold px-2 py-0.5 rounded-full border border-border/50 flex items-center gap-1">
          <span>{petEmoji}</span>
          <span>{petTypeLabel}</span>
        </div>

        {/* Health Indicator - top right */}
        <div className="absolute top-2 right-2">
          <div className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-white shadow-sm" title="בריאות תקינה" />
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

      {/* Info Section */}
      <div className="p-3 space-y-1.5" dir="rtl">
        {/* Name + Gender */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground font-jakarta truncate flex-1">
            {pet.name}
          </h3>
          {genderIcon && (
            <span className={`text-base font-bold ${genderColor} mr-1`}>
              {genderIcon}
            </span>
          )}
        </div>

        {/* Breed */}
        {pet.breed && (
          <p className="text-xs text-muted-foreground truncate font-jakarta">
            {pet.breed}
          </p>
        )}

        {/* Age + Events */}
        <div className="flex items-center justify-between pt-1">
          {age && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{age}</span>
            </div>
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
    prevProps.pet.name === nextProps.pet.name &&
    prevProps.pet.breed === nextProps.pet.breed &&
    prevProps.pet.avatar_url === nextProps.pet.avatar_url &&
    prevProps.pet.birth_date === nextProps.pet.birth_date &&
    prevProps.pet.gender === nextProps.pet.gender
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
