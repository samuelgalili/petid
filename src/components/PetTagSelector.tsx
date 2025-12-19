import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PawPrint, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import defaultPetAvatar from "@/assets/default-pet-avatar.png";

interface Pet {
  id: string;
  name: string;
  avatar_url: string | null;
  type: string;
}

interface PetTagSelectorProps {
  selectedPets: string[];
  onChange: (petIds: string[]) => void;
  className?: string;
}

export const PetTagSelector = ({ selectedPets, onChange, className }: PetTagSelectorProps) => {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPets = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("pets")
        .select("id, name, avatar_url, type")
        .eq("user_id", user.id)
        .eq("archived", false);

      setPets(data || []);
      setLoading(false);
    };

    fetchPets();
  }, [user]);

  const togglePet = (petId: string) => {
    if (selectedPets.includes(petId)) {
      onChange(selectedPets.filter(id => id !== petId));
    } else {
      onChange([...selectedPets, petId]);
    }
  };

  if (loading || pets.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <PawPrint className="w-4 h-4" />
        <span>תייגו חיות מחמד</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {pets.map((pet) => {
          const isSelected = selectedPets.includes(pet.id);
          return (
            <Button
              key={pet.id}
              type="button"
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => togglePet(pet.id)}
              className={cn(
                "flex items-center gap-2 h-9 px-3 rounded-full transition-all",
                isSelected && "bg-primary text-primary-foreground"
              )}
            >
              <Avatar className="w-5 h-5">
                <AvatarImage src={pet.avatar_url || defaultPetAvatar} alt={pet.name} />
                <AvatarFallback>{pet.name[0]}</AvatarFallback>
              </Avatar>
              <span>{pet.name}</span>
              {isSelected && <Check className="w-3 h-3" />}
            </Button>
          );
        })}
      </div>
      
      {selectedPets.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedPets.map((petId) => {
            const pet = pets.find(p => p.id === petId);
            if (!pet) return null;
            return (
              <Badge key={petId} variant="secondary" className="flex items-center gap-1">
                {pet.name}
                <button
                  type="button"
                  onClick={() => togglePet(petId)}
                  className="hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};
