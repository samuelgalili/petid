/**
 * HealthScoreHighlight — Shows top health-score users to encourage profile completion.
 * Social proof: "These owners completed their pet's profile."
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, Star, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";

interface HighScoreUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
  petName: string;
  score: number;
}

export const HealthScoreHighlight = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<HighScoreUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      // Get pets with most completed fields (proxy for health score)
      const { data: pets } = await (supabase as any)
        .from("pets")
        .select("user_id, name, breed, birth_date, weight, microchip_number, vet_name, current_food, avatar_url, has_insurance, is_neutered, gender")
        .eq("archived", false)
        .limit(50);

      if (!pets?.length) { setLoading(false); return; }

      // Calculate completeness for each pet
      const scored = pets.map((pet: any) => {
        const fields = ["breed", "birth_date", "weight", "microchip_number", "vet_name", "current_food", "has_insurance", "is_neutered", "gender"];
        const filled = fields.filter(f => pet[f] !== null && pet[f] !== "" && pet[f] !== false).length;
        return { ...pet, score: Math.round((filled / fields.length) * 100) };
      });

      // Top scorers
      const top = scored
        .filter((p: any) => p.score >= 70)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5);

      if (!top.length) { setLoading(false); return; }

      // Get profiles
      const ownerIds = [...new Set(top.map((p: any) => p.user_id))] as string[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", ownerIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      const result: HighScoreUser[] = top.map((pet: any) => {
        const profile = profileMap.get(pet.user_id);
        return {
          id: pet.user_id,
          full_name: profile?.full_name || "בעלים אחראי",
          avatar_url: profile?.avatar_url || null,
          petName: pet.name,
          score: pet.score,
        };
      });

      setUsers(result);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading || users.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="snap-start flex-shrink-0 w-full px-4 py-4"
      style={{ minHeight: "100dvh" }}
    >
      <div className="h-full flex flex-col justify-center" dir="rtl">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">בעלי חיות אחראיים 🏆</h3>
            <p className="text-xs text-muted-foreground">פרופילים מלאים = חיות בריאות יותר</p>
          </div>
        </div>

        {/* User cards */}
        <div className="space-y-2.5">
          {users.map((user, i) => (
            <motion.div
              key={`${user.id}-${i}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 * i }}
              className="bg-card border border-border/30 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => navigate(`/user/${user.id}`)}
            >
              <Avatar className="w-11 h-11 border-2 border-primary/30">
                <AvatarImage src={user.avatar_url || ""} className="object-cover" />
                <AvatarFallback className="bg-muted text-xs font-bold text-muted-foreground">
                  {user.full_name.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{user.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">🐾 {user.petName}</p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10">
                  <Star className="w-3 h-3 text-primary fill-primary" />
                  <span className="text-xs font-bold text-primary">{user.score}%</span>
                </div>
                <ChevronLeft className="w-4 h-4 text-muted-foreground" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={() => navigate("/")}
          className="mt-4 w-full py-3 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/15 transition-colors"
        >
          השלם את הפרופיל שלך ← הצטרף לרשימה
        </motion.button>
      </div>
    </motion.div>
  );
};
