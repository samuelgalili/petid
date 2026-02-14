import { motion } from "framer-motion";
import { Plus, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { PetCard, AddPetCard } from "./PetCard";
import { ComponentErrorBoundary } from "@/components/common/ComponentErrorBoundary";
import { useState } from "react";

interface MyPetsSectionProps {
  pets: any[];
  newlyAddedPetIds: Set<string>;
  onPetLongPressStart: (pet: any) => void;
  onPetLongPressEnd: () => void;
}

export const MyPetsSection = ({ 
  pets, 
  newlyAddedPetIds, 
  onPetLongPressStart, 
  onPetLongPressEnd 
}: MyPetsSectionProps) => {
  const navigate = useNavigate();
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);

  return (
    <ComponentErrorBoundary
      fallbackMessage="שגיאה בטעינת חיות המחמד"
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="px-4"
      >
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4" dir="rtl">
          <div className="flex items-center gap-2">
            <PawPrint className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground font-jakarta">
              חיות המחמד שלי
            </h2>
            {pets.length > 0 && (
              <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                {pets.length}
              </span>
            )}
          </div>
          {pets.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/add-pet')}
              className="text-accent hover:text-accent/80 text-xs font-bold h-8 px-3"
            >
              <Plus className="w-4 h-4 ml-1" />
              הוסף
            </Button>
          )}
        </div>

        {/* Empty State */}
        {pets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative overflow-hidden"
          >
            <div className="flex flex-col items-center justify-center py-10 text-center bg-gradient-to-br from-primary/10 via-background to-accent/10 rounded-3xl border-2 border-dashed border-primary/30 backdrop-blur-sm shadow-inner">
              <div className="absolute top-4 left-4 w-8 h-8 bg-primary/10 rounded-full blur-xl" />
              <div className="absolute bottom-6 right-6 w-12 h-12 bg-accent/10 rounded-full blur-xl" />
              
              <motion.button
                onClick={() => navigate('/add-pet')}
                className="relative mb-4 cursor-pointer"
                aria-label="הוסף את החיית המחמד הראשונה שלך"
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
              >
                <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center shadow-xl border-4 border-white relative z-10">
                  <Plus className="w-9 h-9 text-white" strokeWidth={3} />
                </div>
                <motion.div
                  className="absolute inset-0 bg-gradient-secondary rounded-full blur-lg opacity-40"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.button>
              
              <h3 className="text-lg font-extrabold text-foreground font-jakarta mb-2">
                בואו נתחיל! 🐾
              </h3>
              <p className="text-sm text-muted-foreground font-jakarta mb-6 max-w-[240px] leading-relaxed">
                הוסיפו את חיית המחמד הראשונה שלכם ותתחילו ליהנות מכל התכונות
              </p>
              <Button
                onClick={() => navigate('/add-pet')}
                className="bg-gradient-primary hover:opacity-90 text-white rounded-full font-jakarta font-bold px-8 py-3 text-sm h-11 shadow-lg hover:shadow-xl transition-all"
              >
                <Plus className="w-5 h-5 ml-2" strokeWidth={2.5} />
                הוסף חיית מחמד
              </Button>
            </div>
          </motion.div>
        ) : (
          /* Pet Cards Grid - 2 columns */
          <div className="grid grid-cols-2 gap-3">
            {pets.map((pet, index) => {
              const isNewPet = newlyAddedPetIds.has(pet.id);
              return (
                <PetCard
                  key={pet.id}
                  pet={pet}
                  index={index}
                  isNewPet={isNewPet}
                  isSelected={selectedPetId === pet.id}
                  onLongPressStart={() => onPetLongPressStart(pet)}
                  onLongPressEnd={onPetLongPressEnd}
                  onSelect={() => setSelectedPetId(pet.id)}
                />
              );
            })}
            
            {/* Add Pet Card */}
            <AddPetCard 
              index={pets.length} 
              onAddPet={() => navigate('/add-pet')} 
            />
          </div>
        )}
      </motion.div>
    </ComponentErrorBoundary>
  );
};
