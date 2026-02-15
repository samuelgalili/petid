/**
 * FleetSafetyAlert — Shows a persistent banner when another pet
 * in the fleet has active medical conditions (cross-pet intelligence).
 */
import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ChevronLeft } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { usePetPreference, type PetProfile } from "@/contexts/PetPreferenceContext";
import { Dog, Cat } from "lucide-react";

interface FleetSafetyAlertProps {
  /** Called when user taps the banner to switch to the sick pet */
  onSwitchToPet?: (petId: string) => void;
}

export const FleetSafetyAlert = ({ onSwitchToPet }: FleetSafetyAlertProps) => {
  const { activePet, pets, switchPet } = usePetPreference();

  // Find other pets with medical conditions
  const sickPets = useMemo(() => {
    if (!activePet) return [];
    return pets.filter(
      (p) =>
        p.id !== activePet.id &&
        p.medical_conditions &&
        p.medical_conditions.length > 0
    );
  }, [activePet, pets]);

  if (sickPets.length === 0) return null;

  const handleSwitch = (pet: PetProfile) => {
    switchPet(pet.id);
    onSwitchToPet?.(pet.id);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="overflow-hidden"
      >
        <div className="mx-4 mt-2 p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 flex items-center gap-3" dir="rtl">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              {sickPets.length === 1
                ? `ל${sickPets[0].name} יש מצב רפואי שדורש תשומת לב`
                : `${sickPets.length} חיות מחמד עם מצבים רפואיים`}
            </p>
            <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">
              {sickPets
                .map((p) => `${p.name}: ${(p.medical_conditions || []).slice(0, 2).join(", ")}`)
                .join(" • ")}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {sickPets.slice(0, 2).map((pet) => (
              <button
                key={pet.id}
                onClick={() => handleSwitch(pet)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 transition-colors"
              >
                <Avatar className="w-5 h-5">
                  {pet.avatar_url ? (
                    <AvatarImage src={pet.avatar_url} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[8px]">
                    {pet.pet_type === "cat" ? <Cat className="w-3 h-3" /> : <Dog className="w-3 h-3" />}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300">
                  {pet.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
