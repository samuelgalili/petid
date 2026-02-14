/**
 * Breeds Encyclopedia Page - Public breed information browser
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, Dog, Cat, Heart, Baby, Zap, Brain, Scissors, Volume2, Shield, ChevronDown, X, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/ui/skeleton";

interface BreedInfo {
  id: string;
  breed_name: string;
  breed_name_he: string | null;
  pet_type: string;
  life_expectancy_years: string | null;
  description_he: string | null;
  affection_family: number | null;
  kids_friendly: number | null;
  dog_friendly: number | null;
  shedding_level: number | null;
  grooming_freq: number | null;
  drooling_level: number | null;
  stranger_openness: number | null;
  playfulness: number | null;
  watchdog_nature: number | null;
  trainability: number | null;
  energy_level: number | null;
  barking_level: number | null;
  mental_needs: number | null;
  size_category: string | null;
  weight_range_kg: string | null;
  image_url: string | null;
}

const RatingBar = ({ value, label, icon: Icon }: { value: number | null; label: string; icon: React.ElementType }) => {
  if (value === null) return null;
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="w-16 text-muted-foreground">{label}</span>
      <Progress value={value * 20} className="h-1.5 flex-1" />
      <span className="w-4 text-right font-medium">{value}</span>
    </div>
  );
};

const BreedCard = ({ breed, onClick }: { breed: BreedInfo; onClick: () => void }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-card border border-border/30 rounded-2xl p-4 cursor-pointer hover:shadow-lg transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground text-base leading-tight">
            {breed.breed_name_he || breed.breed_name}
          </h3>
          {breed.breed_name_he && (
            <p className="text-xs text-muted-foreground mt-0.5">{breed.breed_name}</p>
          )}
        </div>
        <Badge variant="secondary" className="text-xs shrink-0">
          {breed.life_expectancy_years || "—"} שנים
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="text-center p-2 bg-muted/30 rounded-lg">
          <Heart className="w-4 h-4 mx-auto text-primary mb-1" />
          <span className="text-xs font-medium">{breed.affection_family || "—"}</span>
        </div>
        <div className="text-center p-2 bg-muted/30 rounded-lg">
          <Zap className="w-4 h-4 mx-auto text-primary mb-1" />
          <span className="text-xs font-medium">{breed.energy_level || "—"}</span>
        </div>
        <div className="text-center p-2 bg-muted/30 rounded-lg">
          <Brain className="w-4 h-4 mx-auto text-primary mb-1" />
          <span className="text-xs font-medium">{breed.trainability || "—"}</span>
        </div>
        <div className="text-center p-2 bg-muted/30 rounded-lg">
          <Scissors className="w-4 h-4 mx-auto text-primary mb-1" />
          <span className="text-xs font-medium">{breed.grooming_freq || "—"}</span>
        </div>
      </div>

      {/* Description */}
      {breed.description_he && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {breed.description_he}
        </p>
      )}
    </motion.div>
  );
};

const BreedDetailSheet = ({ breed, onClose }: { breed: BreedInfo | null; onClose: () => void }) => {
  if (!breed) return null;

  return (
    <Sheet open={!!breed} onOpenChange={() => onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4 border-b border-border/30">
          <SheetTitle className="text-right flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
            <div>
              <span className="text-xl">{breed.breed_name_he || breed.breed_name}</span>
              {breed.breed_name_he && (
                <span className="text-sm text-muted-foreground block">{breed.breed_name}</span>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto h-full pb-20 pt-4">
          {/* Life Expectancy & Size */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="text-center p-4 bg-primary/5 rounded-2xl">
              <Heart className="w-8 h-8 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{breed.life_expectancy_years?.match(/\d+/)?.[0] || "12"}</p>
              <p className="text-xs text-muted-foreground">שנות חיים</p>
            </div>
            <div className="text-center p-4 bg-primary/5 rounded-2xl">
              <Dog className="w-8 h-8 mx-auto text-primary mb-2" />
              <p className="text-lg font-bold">{breed.size_category || "בינוני"}</p>
              <p className="text-xs text-muted-foreground">{breed.weight_range_kg || "—"} ק"ג</p>
            </div>
          </div>

          {/* Description */}
          {breed.description_he && (
            <div className="mb-6 p-4 bg-muted/30 rounded-2xl">
              <p className="text-sm leading-relaxed">{breed.description_he}</p>
            </div>
          )}

          {/* All Ratings */}
          <div className="space-y-3 bg-card rounded-2xl p-4 border border-border/30">
            <h4 className="font-semibold text-sm mb-4">מאפייני הגזע</h4>
            <RatingBar value={breed.affection_family} label="משפחה" icon={Heart} />
            <RatingBar value={breed.kids_friendly} label="ילדים" icon={Baby} />
            <RatingBar value={breed.dog_friendly} label="כלבים" icon={Dog} />
            <RatingBar value={breed.energy_level} label="אנרגיה" icon={Zap} />
            <RatingBar value={breed.trainability} label="אילוף" icon={Brain} />
            <RatingBar value={breed.grooming_freq} label="טיפוח" icon={Scissors} />
            <RatingBar value={breed.barking_level} label="נביחות" icon={Volume2} />
            <RatingBar value={breed.watchdog_nature} label="שמירה" icon={Shield} />
            <RatingBar value={breed.mental_needs} label="מנטלי" icon={Brain} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const Breeds = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [petType, setPetType] = useState<"dog" | "cat">("dog");
  const [selectedBreed, setSelectedBreed] = useState<BreedInfo | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "energy" | "family">("name");

  const { data: breeds, isLoading } = useQuery({
    queryKey: ["breeds-encyclopedia", petType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("breed_information")
        .select("*")
        .eq("pet_type", petType)
        .eq("is_active", true)
        .order("breed_name_he", { ascending: true });

      if (error) throw error;
      return data as BreedInfo[];
    },
  });

  const filteredBreeds = useMemo(() => {
    if (!breeds) return [];
    
    let result = breeds.filter(breed => {
      const searchLower = searchQuery.toLowerCase();
      return (
        breed.breed_name.toLowerCase().includes(searchLower) ||
        breed.breed_name_he?.toLowerCase().includes(searchLower)
      );
    });

    // Sort
    switch (sortBy) {
      case "energy":
        result.sort((a, b) => (b.energy_level || 0) - (a.energy_level || 0));
        break;
      case "family":
        result.sort((a, b) => (b.affection_family || 0) - (a.affection_family || 0));
        break;
      default:
        // Already sorted by name from query
        break;
    }

    return result;
  }, [breeds, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO title="אנציקלופדיית גזעים" description="מידע מקיף על גזעי כלבים וחתולים - תכונות, טמפרמנט, בריאות ועוד" url="/breeds" />
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/30">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">אנציקלופדיית גזעים</h1>
          </div>

          {/* Pet Type Tabs */}
          <Tabs value={petType} onValueChange={(v) => setPetType(v as "dog" | "cat")} className="mb-3">
            <TabsList className="w-full">
              <TabsTrigger value="dog" className="flex-1 gap-2">
                <Dog className="w-4 h-4" />
                כלבים
              </TabsTrigger>
              <TabsTrigger value="cat" className="flex-1 gap-2">
                <Cat className="w-4 h-4" />
                חתולים
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש גזע..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
          </div>

          {/* Sort Options */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            <Button
              variant={sortBy === "name" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy("name")}
              className="shrink-0"
            >
              א-ת
            </Button>
            <Button
              variant={sortBy === "energy" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy("energy")}
              className="shrink-0 gap-1"
            >
              <Zap className="w-3 h-3" />
              אנרגיה
            </Button>
            <Button
              variant={sortBy === "family" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy("family")}
              className="shrink-0 gap-1"
            >
              <Heart className="w-3 h-3" />
              משפחה
            </Button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="px-4 py-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredBreeds.length} גזעים נמצאו
        </p>
      </div>

      {/* Breeds Grid */}
      <div className="px-4">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-card border border-border/30 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[1,2,3,4].map(j => <Skeleton key={j} className="h-12 rounded-lg" />)}
                </div>
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : filteredBreeds.length === 0 ? (
          <div className="text-center py-12">
            <Dog className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">לא נמצאו גזעים</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBreeds.map((breed) => (
                <BreedCard
                  key={breed.id}
                  breed={breed}
                  onClick={() => setSelectedBreed(breed)}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Detail Sheet */}
      <BreedDetailSheet
        breed={selectedBreed}
        onClose={() => setSelectedBreed(null)}
      />
    </div>
  );
};

export default Breeds;
