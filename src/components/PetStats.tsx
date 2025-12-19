import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Camera, Heart, Calendar, Trophy, Activity, TrendingUp, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PetStatsProps {
  petId: string;
  className?: string;
}

interface Stats {
  photoCount: number;
  postCount: number;
  daysSinceCreation: number;
  moodScore: number | null;
  activityLevel: "low" | "medium" | "high";
  achievements: number;
}

export const PetStats = ({ petId, className }: PetStatsProps) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [petId]);

  const fetchStats = async () => {
    try {
      // Fetch pet details
      const { data: pet } = await supabase
        .from("pets")
        .select("created_at, mood_score")
        .eq("id", petId)
        .maybeSingle();

      // Fetch photo count
      const { count: photoCount } = await supabase
        .from("pet_photos")
        .select("*", { count: "exact", head: true })
        .eq("pet_id", petId);

      // Fetch posts with this pet tagged
      const { count: postCount } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("pet_id", petId);

      // Calculate days since creation
      const daysSinceCreation = pet?.created_at
        ? Math.floor((Date.now() - new Date(pet.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Determine activity level based on posts
      const activityLevel = (postCount || 0) > 10 ? "high" : (postCount || 0) > 3 ? "medium" : "low";

      setStats({
        photoCount: photoCount || 0,
        postCount: postCount || 0,
        daysSinceCreation,
        moodScore: pet?.mood_score || null,
        activityLevel,
        achievements: Math.floor(((postCount || 0) + (photoCount || 0)) / 5),
      });
    } catch (error) {
      console.error("Error fetching pet stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={cn("p-4 space-y-4", className)}>
        <div className="h-5 w-32 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-10 w-10 bg-muted rounded-lg animate-pulse mx-auto" />
              <div className="h-4 w-12 bg-muted rounded animate-pulse mx-auto" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!stats) return null;

  const activityColors = {
    low: "from-blue-500 to-cyan-500",
    medium: "from-yellow-500 to-orange-500",
    high: "from-green-500 to-emerald-500",
  };

  const activityLabels = {
    low: "רגוע",
    medium: "פעיל",
    high: "סופר פעיל",
  };

  return (
    <Card className={cn("p-4 overflow-hidden border-0 shadow-lg bg-gradient-to-br from-card to-muted/30", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary-foreground" />
          </div>
          <h3 className="font-bold text-sm">סטטיסטיקות</h3>
        </div>
        <Badge variant="secondary" className={`bg-gradient-to-r ${activityColors[stats.activityLevel]} text-white border-0`}>
          <Sparkles className="w-3 h-3 mr-1" />
          {activityLabels[stats.activityLevel]}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center p-3 rounded-xl bg-muted/50"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-pink-500/25">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <p className="text-xl font-bold">{stats.photoCount}</p>
          <p className="text-xs text-muted-foreground">תמונות</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center p-3 rounded-xl bg-muted/50"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-violet-500/25">
            <Heart className="w-5 h-5 text-white" />
          </div>
          <p className="text-xl font-bold">{stats.postCount}</p>
          <p className="text-xs text-muted-foreground">פוסטים</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center p-3 rounded-xl bg-muted/50"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-2 shadow-lg shadow-amber-500/25">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <p className="text-xl font-bold">{stats.achievements}</p>
          <p className="text-xs text-muted-foreground">הישגים</p>
        </motion.div>
      </div>

      {/* Days Together */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-3 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">ימים ביחד</span>
          </div>
          <span className="text-lg font-bold text-primary">{stats.daysSinceCreation}</span>
        </div>
        <Progress value={Math.min((stats.daysSinceCreation / 365) * 100, 100)} className="h-2" />
        <p className="text-xs text-muted-foreground mt-1">
          {stats.daysSinceCreation >= 365 
            ? `🎉 כבר שנה שלמה יחד!` 
            : `עוד ${365 - stats.daysSinceCreation} ימים לשנה ראשונה`}
        </p>
      </motion.div>

      {/* Mood Score */}
      {stats.moodScore !== null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-3 p-3 rounded-xl bg-muted/50"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">ציון מצב רוח</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold">{stats.moodScore}</span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
          </div>
          <Progress 
            value={stats.moodScore} 
            className="h-2 mt-2" 
          />
        </motion.div>
      )}
    </Card>
  );
};
