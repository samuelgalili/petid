/**
 * BreedsList - Displays all breeds from breed_information table in the Data Hub
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Dog, Heart, Baby, Users, Scissors, Droplets, Zap, Brain, Volume2, Shield, Sparkles, Download, Share2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportData, shareFile } from "@/lib/exportData";
import { toast } from "sonner";

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
  is_active: boolean | null;
}

const RatingBar = ({ value, label, icon: Icon }: { value: number | null; label: string; icon: any }) => {
  if (value === null) return null;
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="w-3 h-3 text-muted-foreground" />
      <span className="w-16 text-muted-foreground truncate">{label}</span>
      <Progress value={value * 20} className="h-1.5 flex-1" />
      <span className="w-4 text-right font-medium">{value}</span>
    </div>
  );
};

export const BreedsList = () => {
  const { data: breeds, isLoading } = useQuery({
    queryKey: ["admin-breeds-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("breed_information")
        .select("*")
        .eq("pet_type", "dog")
        .order("breed_name_he", { ascending: true });

      if (error) throw error;
      return data as BreedInfo[];
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!breeds || breeds.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Dog className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>אין גזעים במערכת</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Header */}
      <div className="flex items-center justify-between bg-muted/30 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Dog className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{breeds.length}</p>
            <p className="text-sm text-muted-foreground">גזעים במערכת</p>
          </div>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Sparkles className="w-3 h-3" />
          נתונים מדויקים
        </Badge>
      </div>

      {/* Breeds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {breeds.map((breed, index) => (
          <motion.div
            key={breed.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
            className="bg-card border border-border/30 rounded-xl p-4 hover:shadow-lg transition-shadow"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-foreground">{breed.breed_name_he || breed.breed_name}</h3>
                <p className="text-xs text-muted-foreground">{breed.breed_name}</p>
              </div>
              <Badge variant={breed.is_active ? "default" : "secondary"} className="text-xs">
                {breed.life_expectancy_years || "—"}
              </Badge>
            </div>

            {/* Description */}
            {breed.description_he && (
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {breed.description_he}
              </p>
            )}

            {/* Ratings Grid */}
            <div className="space-y-1.5">
              <RatingBar value={breed.affection_family} label="משפחה" icon={Heart} />
              <RatingBar value={breed.kids_friendly} label="ילדים" icon={Baby} />
              <RatingBar value={breed.dog_friendly} label="כלבים" icon={Users} />
              <RatingBar value={breed.energy_level} label="אנרגיה" icon={Zap} />
              <RatingBar value={breed.trainability} label="אילוף" icon={Brain} />
              <RatingBar value={breed.grooming_freq} label="טיפוח" icon={Scissors} />
              <RatingBar value={breed.barking_level} label="נביחות" icon={Volume2} />
              <RatingBar value={breed.watchdog_nature} label="שמירה" icon={Shield} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
