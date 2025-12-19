import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, Filter, Dog, Cat, PawPrint, X, MapPin, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import defaultPetAvatar from "@/assets/default-pet-avatar.png";

const DOG_BREEDS = [
  "כל הגזעים", "מעורב", "לברדור רטריבר", "גולדן רטריבר", "בולדוג צרפתי", 
  "פודל", "ביגל", "רוטווילר", "יורקשייר טרייר", "האסקי סיבירי", "גרמן שפרד"
];

const CAT_BREEDS = [
  "כל הגזעים", "מעורב", "חתול בית", "פרסי", "סיאמי", "מיין קון", 
  "בריטי קצר שיער", "רגדול", "בנגלי", "ספינקס"
];

interface Pet {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  avatar_url: string | null;
  gender: string | null;
  age: number | null;
  user_id: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface PetSearchProps {
  className?: string;
  onPetSelect?: (pet: Pet) => void;
}

export const PetSearch = ({ className, onPetSelect }: PetSearchProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [petType, setPetType] = useState<string>("all");
  const [breed, setBreed] = useState<string>("כל הגזעים");
  const [showFilters, setShowFilters] = useState(false);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const breeds = petType === "dog" ? DOG_BREEDS : petType === "cat" ? CAT_BREEDS : [];

  const searchPets = useCallback(async () => {
    setLoading(true);
    setHasSearched(true);

    try {
      let query = supabase
        .from("pets")
        .select("id, name, type, breed, avatar_url, gender, age, user_id")
        .eq("archived", false)
        .limit(20);

      if (searchQuery.trim()) {
        query = query.ilike("name", `%${searchQuery.trim()}%`);
      }

      if (petType !== "all") {
        query = query.eq("type", petType);
      }

      if (breed && breed !== "כל הגזעים") {
        query = query.ilike("breed", `%${breed}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Fetch profiles separately for each pet
      const petsWithProfiles: Pet[] = [];
      for (const pet of data || []) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", pet.user_id)
          .maybeSingle();
        
        petsWithProfiles.push({
          ...pet,
          profiles: profile || undefined
        });
      }
      
      setPets(petsWithProfiles);
    } catch (error) {
      console.error("Error searching pets:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, petType, breed]);

  useEffect(() => {
    if (searchQuery.length >= 2 || petType !== "all" || breed !== "כל הגזעים") {
      const debounce = setTimeout(searchPets, 300);
      return () => clearTimeout(debounce);
    } else {
      setPets([]);
      setHasSearched(false);
    }
  }, [searchQuery, petType, breed, searchPets]);

  const handlePetClick = (pet: Pet) => {
    if (onPetSelect) {
      onPetSelect(pet);
    } else {
      navigate(`/user/${pet.user_id}`);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setPetType("all");
    setBreed("כל הגזעים");
    setPets([]);
    setHasSearched(false);
  };

  const hasActiveFilters = searchQuery || petType !== "all" || breed !== "כל הגזעים";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search input */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="חפש חיות מחמד לפי שם..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10 pl-10 h-12 rounded-full bg-muted/50 border-0"
        />
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute left-1 top-1/2 -translate-y-1/2 rounded-full",
            showFilters && "bg-primary/10 text-primary"
          )}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-5 h-5" />
        </Button>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <div className="flex gap-2">
              <Button
                variant={petType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => { setPetType("all"); setBreed("כל הגזעים"); }}
                className="rounded-full"
              >
                <PawPrint className="w-4 h-4 ml-1" />
                הכל
              </Button>
              <Button
                variant={petType === "dog" ? "default" : "outline"}
                size="sm"
                onClick={() => { setPetType("dog"); setBreed("כל הגזעים"); }}
                className="rounded-full"
              >
                <Dog className="w-4 h-4 ml-1" />
                כלבים
              </Button>
              <Button
                variant={petType === "cat" ? "default" : "outline"}
                size="sm"
                onClick={() => { setPetType("cat"); setBreed("כל הגזעים"); }}
                className="rounded-full"
              >
                <Cat className="w-4 h-4 ml-1" />
                חתולים
              </Button>
            </div>

            {breeds.length > 0 && (
              <Select value={breed} onValueChange={setBreed}>
                <SelectTrigger className="w-full rounded-full">
                  <SelectValue placeholder="בחר גזע" />
                </SelectTrigger>
                <SelectContent>
                  {breeds.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-destructive"
              >
                <X className="w-4 h-4 ml-1" />
                נקה פילטרים
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!loading && hasSearched && pets.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <PawPrint className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>לא נמצאו חיות מחמד</p>
        </div>
      )}

      {!loading && pets.length > 0 && (
        <div className="space-y-2">
          {pets.map((pet, index) => (
            <motion.div
              key={pet.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handlePetClick(pet)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 border-2 border-primary/20">
                    <AvatarImage src={pet.avatar_url || defaultPetAvatar} alt={pet.name} />
                    <AvatarFallback>{pet.name[0]}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold truncate">{pet.name}</h4>
                      {pet.type === "dog" ? (
                        <Dog className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      ) : (
                        <Cat className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {pet.breed && <span className="truncate">{pet.breed}</span>}
                      {pet.gender && (
                        <Badge variant="outline" className="text-xs">
                          {pet.gender === "male" ? "זכר" : "נקבה"}
                        </Badge>
                      )}
                    </div>
                    
                    {pet.profiles?.full_name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        של {pet.profiles.full_name}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
