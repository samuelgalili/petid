import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { memo } from "react";
import { OptimizedImage } from "@/components/OptimizedImage";

interface PetCardProps {
  pet: any;
  index: number;
  isNewPet: boolean;
  onLongPressStart: () => void;
  onLongPressEnd: () => void;
}

export const PetCard = memo(({ 
  pet, 
  index, 
  isNewPet, 
  onLongPressStart, 
  onLongPressEnd 
}: PetCardProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      key={pet.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: 1,
        scale: isNewPet ? [1, 1.05, 1] : 1,
      }}
      transition={{
        delay: 0.05 + index * 0.05,
        scale: isNewPet ? {
          duration: 0.6,
          repeat: 3,
          repeatType: "reverse"
        } : {},
        type: "spring",
        stiffness: 260,
        damping: 20
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onTouchStart={onLongPressStart}
      onTouchEnd={onLongPressEnd}
      onMouseDown={onLongPressStart}
      onMouseUp={onLongPressEnd}
      onMouseLeave={onLongPressEnd}
      onClick={() => navigate(`/pet/${pet.id}`)}
      className="flex-shrink-0 cursor-pointer flex flex-col items-center gap-2"
    >
      {/* Story-style Circle with Gradient Border */}
      <div className="relative">
        {/* Gradient Border Ring */}
        <div className={`w-[76px] h-[76px] rounded-full p-[3px] ${
          isNewPet 
            ? 'bg-gradient-to-tr from-primary via-accent to-success animate-pulse' 
            : 'bg-gradient-to-tr from-primary via-accent to-primary-light'
        }`}>
          <div className="w-full h-full rounded-full bg-background p-[2px]">
            <div className="w-full h-full rounded-full overflow-hidden bg-muted">
              {pet.avatar_url ? (
                <OptimizedImage 
                  src={pet.avatar_url} 
                  alt={pet.name}
                  className="w-full h-full"
                  objectFit="cover"
                  sizes="72px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-accent/20 to-accent/40">
                  {pet.type === 'dog' ? '🐕' : '🐈'}
                </div>
              )}
            </div>
          </div>
        </div>
        
        
        {/* New Badge */}
        {isNewPet && (
          <motion.div
            className="absolute -top-1 -right-1 bg-gradient-to-r from-primary to-accent text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-md"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            ✨
          </motion.div>
        )}
      </div>
      
      {/* Pet Name */}
      <span className="text-xs font-bold text-foreground font-jakarta text-center max-w-[76px] truncate">
        {pet.name}
      </span>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.pet.id === nextProps.pet.id &&
    prevProps.isNewPet === nextProps.isNewPet &&
    prevProps.pet.name === nextProps.pet.name &&
    prevProps.pet.breed === nextProps.pet.breed &&
    prevProps.pet.avatar_url === nextProps.pet.avatar_url &&
    prevProps.pet.birth_date === nextProps.pet.birth_date
  );
});

interface AddPetCardProps {
  index: number;
  onAddPet: () => void;
}

export const AddPetCard = memo(({ index, onAddPet }: AddPetCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.05 + index * 0.05 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onAddPet}
      className="flex-shrink-0 cursor-pointer flex flex-col items-center gap-2"
    >
      {/* Add Button Circle */}
      <div className="w-[76px] h-[76px] rounded-full p-[3px] bg-gradient-to-tr from-border via-muted to-border">
        <div className="w-full h-full rounded-full bg-background p-[2px]">
          <div className="w-full h-full rounded-full flex items-center justify-center bg-muted/50 border-2 border-dashed border-accent/50 hover:border-accent transition-colors">
            <Plus className="w-7 h-7 text-accent" strokeWidth={2.5} />
          </div>
        </div>
      </div>
      
      {/* Label */}
      <span className="text-xs font-bold text-accent font-jakarta text-center">
        הוסף
      </span>
    </motion.div>
  );
});
