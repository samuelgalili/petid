import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Users, ChevronLeft, Hash, Trophy, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Challenge {
  id: string;
  title: string;
  title_he: string;
  description: string | null;
  description_he: string | null;
  hashtag: string;
  cover_image_url: string | null;
  participant_count: number;
  is_active: boolean;
  ends_at: string | null;
  is_joined?: boolean;
}

interface ChallengesSectionProps {
  className?: string;
}

const GRADIENT_VARIANTS = [
  "from-orange-500 via-pink-500 to-purple-600",
  "from-blue-500 via-cyan-400 to-teal-500",
  "from-emerald-500 via-green-400 to-lime-500",
  "from-violet-600 via-purple-500 to-fuchsia-500",
  "from-rose-500 via-red-400 to-orange-500",
];

export const ChallengesSection = ({ className }: ChallengesSectionProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    fetchChallenges();
  }, [user]);

  const fetchChallenges = async () => {
    try {
      const { data: challengesData } = await supabase
        .from("challenges")
        .select("*")
        .eq("is_active", true)
        .order("participant_count", { ascending: false })
        .limit(5);

      if (!challengesData) {
        setChallenges([]);
        return;
      }

      // Check if user joined any challenges
      if (user) {
        const { data: participations } = await supabase
          .from("challenge_participants")
          .select("challenge_id")
          .eq("user_id", user.id);

        const joinedIds = new Set(participations?.map(p => p.challenge_id) || []);
        
        setChallenges(challengesData.map(c => ({
          ...c,
          is_joined: joinedIds.has(c.id)
        })));
      } else {
        setChallenges(challengesData);
      }
    } catch (error) {
      console.error("Error fetching challenges:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChallenge = async (challengeId: string) => {
    if (!user) {
      toast.error("יש להתחבר כדי להשתתף באתגר");
      return;
    }

    setJoiningId(challengeId);
    try {
      const challenge = challenges.find(c => c.id === challengeId);
      
      if (challenge?.is_joined) {
        // Leave challenge
        await supabase
          .from("challenge_participants")
          .delete()
          .eq("challenge_id", challengeId)
          .eq("user_id", user.id);

        toast.success("יצאת מהאתגר");
      } else {
        // Join challenge
        await supabase
          .from("challenge_participants")
          .insert({
            challenge_id: challengeId,
            user_id: user.id
          });

        toast.success("הצטרפת לאתגר! 🎉");
      }

      fetchChallenges();
    } catch (error) {
      toast.error("שגיאה בעדכון האתגר");
    } finally {
      setJoiningId(null);
    }
  };

  if (loading || challenges.length === 0) return null;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-orange-500/25">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <motion.div
              className="absolute -top-0.5 -right-0.5"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            </motion.div>
          </div>
          <div>
            <h3 className="font-bold text-base">אתגרים פעילים</h3>
            <p className="text-xs text-muted-foreground">השתתפו וזכו בפרסים</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 rounded-full">
          הכל
          <ChevronLeft className="w-4 h-4 mr-1" />
        </Button>
      </div>

      {/* Challenges Carousel */}
      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
        {challenges.map((challenge, index) => (
          <motion.div
            key={challenge.id}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: index * 0.08, type: "spring", stiffness: 300 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="flex-shrink-0"
          >
            <Card className="min-w-[220px] w-[220px] overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 bg-card">
              {/* Cover with gradient overlay */}
              <div className={cn(
                "h-24 relative bg-gradient-to-br",
                GRADIENT_VARIANTS[index % GRADIENT_VARIANTS.length]
              )}>
                {challenge.cover_image_url && (
                  <img
                    src={challenge.cover_image_url}
                    alt={challenge.title_he}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                
                {/* Floating badge */}
                <Badge className="absolute top-2.5 right-2.5 bg-white/95 text-orange-600 border-0 shadow-lg backdrop-blur-sm font-medium">
                  <Flame className="w-3 h-3 mr-1 animate-pulse" />
                  פעיל
                </Badge>

                {/* Hashtag on image */}
                <div className="absolute bottom-2 right-2.5 flex items-center gap-1 text-white/90 text-sm font-medium">
                  <Hash className="w-3.5 h-3.5" />
                  <span>{challenge.hashtag}</span>
                </div>
              </div>

              <div className="p-3.5 space-y-3">
                <div>
                  <h4 className="font-bold text-sm leading-tight line-clamp-1">{challenge.title_he}</h4>
                  {challenge.description_he && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {challenge.description_he}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                    <Users className="w-3.5 h-3.5" />
                    <span className="font-medium">{challenge.participant_count} משתתפים</span>
                  </div>
                  
                  <Button
                    size="sm"
                    variant={challenge.is_joined ? "outline" : "default"}
                    className={cn(
                      "h-8 text-xs font-medium rounded-full px-4 transition-all duration-200",
                      challenge.is_joined 
                        ? "border-green-500 text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-950/30" 
                        : "bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 shadow-md"
                    )}
                    onClick={() => handleJoinChallenge(challenge.id)}
                    disabled={joiningId === challenge.id}
                  >
                    {joiningId === challenge.id ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                      />
                    ) : challenge.is_joined ? (
                      <>
                        <Trophy className="w-3.5 h-3.5 mr-1" />
                        משתתף
                      </>
                    ) : (
                      "הצטרף"
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
