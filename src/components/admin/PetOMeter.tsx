/**
 * PetOMeter — Global health gauge showing average health score across all pets.
 * Displays a circular SVG gauge with percentage and breakdown stats.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Activity, Heart, Syringe, FileCheck, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface HealthBreakdown {
  avgScore: number;
  totalPets: number;
  withVaccinations: number;
  withDocuments: number;
  withMedicalConditions: number;
}

function calculateHealthScore(pet: any, hasDoc: boolean, hasVacc: boolean): number {
  let score = 40; // base
  if (pet.birth_date) score += 10;
  if (pet.breed) score += 5;
  if (pet.weight) score += 5;
  if (pet.microchip_number) score += 10;
  if (hasVacc) score += 15;
  if (hasDoc) score += 15;
  return Math.min(score, 100);
}

export const PetOMeter = () => {
  const { data, isLoading } = useQuery<HealthBreakdown>({
    queryKey: ["pet-o-meter"],
    queryFn: async () => {
      // Fetch all active pets
      const { data: pets, error } = await (supabase as any)
        .from("pets")
        .select("id, birth_date, breed, weight, microchip_number, medical_conditions")
        .eq("archived", false);

      if (error) throw error;
      if (!pets || pets.length === 0) {
        return { avgScore: 0, totalPets: 0, withVaccinations: 0, withDocuments: 0, withMedicalConditions: 0 };
      }

      // Fetch document counts per pet
      const petIds = pets.map((p: any) => p.id);
      const { data: docs } = await supabase
        .from("pet_documents")
        .select("pet_id")
        .in("pet_id", petIds);

      const { data: extracted } = await supabase
        .from("pet_document_extracted_data")
        .select("pet_id, vaccination_type")
        .in("pet_id", petIds);

      const docsSet = new Set(docs?.map((d: any) => d.pet_id) || []);
      const vaccSet = new Set(
        extracted?.filter((e: any) => e.vaccination_type).map((e: any) => e.pet_id) || []
      );

      let totalScore = 0;
      let withMedical = 0;

      pets.forEach((pet: any) => {
        totalScore += calculateHealthScore(pet, docsSet.has(pet.id), vaccSet.has(pet.id));
        if (pet.medical_conditions && pet.medical_conditions.length > 0) withMedical++;
      });

      return {
        avgScore: Math.round(totalScore / pets.length),
        totalPets: pets.length,
        withVaccinations: vaccSet.size,
        withDocuments: docsSet.size,
        withMedicalConditions: withMedical,
      };
    },
    staleTime: 1000 * 60 * 10,
  });

  if (isLoading) {
    return (
      <Card className="border-none bg-gradient-to-br from-card to-card/80">
        <CardContent className="p-6 flex items-center justify-center min-h-[200px]">
          <Skeleton className="w-32 h-32 rounded-full" />
        </CardContent>
      </Card>
    );
  }

  const score = data?.avgScore || 0;
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const scoreColor =
    score >= 80 ? "hsl(var(--success, 142 76% 36%))" :
    score >= 60 ? "hsl(var(--warning, 38 92% 50%))" :
    "hsl(var(--destructive))";

  const stats = [
    { icon: Heart, label: "חיות רשומות", value: data?.totalPets || 0 },
    { icon: Syringe, label: "עם חיסונים", value: data?.withVaccinations || 0 },
    { icon: FileCheck, label: "עם מסמכים", value: data?.withDocuments || 0 },
    { icon: Activity, label: "מצבים רפואיים", value: data?.withMedicalConditions || 0 },
  ];

  return (
    <Card className="border-none bg-gradient-to-br from-card to-card/80 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10">
            <TrendingUp className="w-5 h-5 text-primary" strokeWidth={1.5} />
          </div>
          <CardTitle className="text-lg font-bold">Pet-O-Meter</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-2">
        <div className="flex items-center gap-6">
          {/* Gauge */}
          <div className="relative shrink-0">
            <svg width="130" height="130" viewBox="0 0 120 120">
              {/* Background circle */}
              <circle
                cx="60" cy="60" r="54"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
              />
              {/* Score arc */}
              <motion.circle
                cx="60" cy="60" r="54"
                fill="none"
                stroke={scoreColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                className="text-3xl font-bold text-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {score}
              </motion.span>
              <span className="text-[10px] text-muted-foreground font-medium">ציון בריאות</span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 flex-1">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                <Icon className="w-4 h-4 text-primary shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="text-lg font-bold text-foreground leading-none">{value}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
