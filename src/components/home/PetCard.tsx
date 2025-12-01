import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { memo } from "react";

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
  const petAge = pet.birth_date 
    ? Math.floor((new Date().getTime() - new Date(pet.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) 
    : null;

  return (
    <motion.div
      key={pet.id}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{
        opacity: 1,
        scale: isNewPet ? [1, 1.05, 1] : 1,
        y: 0
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
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.97 }}
      onTouchStart={onLongPressStart}
      onTouchEnd={onLongPressEnd}
      onMouseDown={onLongPressStart}
      onMouseUp={onLongPressEnd}
      onMouseLeave={onLongPressEnd}
      onClick={() => navigate(`/pet/${pet.id}`)}
      className="flex-shrink-0 cursor-pointer relative"
    >
      {/* New Pet Glow Effect */}
      {isNewPet && (
        <motion.div
          className="absolute -inset-2 bg-gradient-to-r from-[#7DD3C0] via-[#FBD66A] to-[#7DD3C0] rounded-3xl blur-xl opacity-30 z-0"
          animate={{
            opacity: [0.3, 0.5, 0.3],
            scale: [1, 1.05, 1]
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      
      {/* Pet Card */}
      <div className={`relative bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl transition-all min-w-[140px] z-10 ${
        isNewPet ? 'ring-2 ring-[#FBD66A] ring-offset-2' : ''
      }`}>
        {/* Pet Avatar with Status Badge */}
        <div className="relative mb-3 flex justify-center">
          <div className={`relative w-20 h-20 rounded-full bg-gradient-to-br from-[#FFE8D6] via-[#FFE5F0] to-[#E8F5E8] shadow-md overflow-hidden border-3 ${
            isNewPet ? 'border-[#FBD66A]' : 'border-white'
          } transition-all`}>
            {pet.avatar_url ? (
              <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl bg-gradient-to-br from-[#B8E3D5] via-[#7DD3C0] to-[#6BC4AD]">
                {pet.type === 'dog' ? '🐕' : '🐈'}
              </div>
            )}
          </div>
          
          {/* Type Badge */}
          <div className="absolute -top-1 -right-1 w-7 h-7 bg-white rounded-full shadow-md flex items-center justify-center border-2 border-gray-100">
            <span className="text-sm">{pet.type === 'dog' ? '🐕' : '🐈'}</span>
          </div>
          
          {/* New Badge */}
          {isNewPet && (
            <motion.div
              className="absolute -top-2 -left-2 bg-gradient-to-r from-[#FBD66A] to-[#F4C542] text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-md"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              ✨ חדש
            </motion.div>
          )}
        </div>
        
        {/* Pet Info */}
        <div className="text-center space-y-1">
          <h3 className="text-sm font-extrabold text-gray-900 font-jakarta truncate">
            {pet.name}
          </h3>
          
          {/* Breed */}
          {pet.breed && (
            <p className="text-[10px] font-semibold text-gray-500 truncate">
              {pet.breed}
            </p>
          )}
          
          {/* Age Badge */}
          {petAge !== null && (
            <div className="inline-flex items-center gap-1 bg-gradient-to-r from-[#E8F5E8] to-[#FFE8D6] px-2 py-1 rounded-full">
              <span className="text-[10px] font-bold text-gray-700">
                {petAge} {petAge === 1 ? 'שנה' : 'שנים'}
              </span>
            </div>
          )}
        </div>
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#7DD3C0]/10 to-transparent opacity-0 hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />
      </div>
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
      className="flex-shrink-0 cursor-pointer"
    >
      <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-2xl p-4 shadow-md hover:shadow-lg transition-all min-w-[140px] border-2 border-dashed border-[#7DD3C0]/40 hover:border-[#7DD3C0] flex flex-col items-center justify-center h-full">
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#7DD3C0]/10 to-[#6BC4AD]/10 flex items-center justify-center mb-3 hover:scale-110 transition-transform">
          <Plus className="w-8 h-8 text-[#7DD3C0]" strokeWidth={2.5} />
        </div>
        <p className="text-xs font-extrabold text-[#7DD3C0] font-jakarta">
          הוסף חיית מחמד
        </p>
      </div>
    </motion.div>
  );
});
