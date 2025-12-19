import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Users, ChevronLeft, Hash, Trophy } from "lucide-react";
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
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          <h3 className="font-bold text-lg">אתגרים פעילים</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-primary">
          הכל
          <ChevronLeft className="w-4 h-4 mr-1" />
        </Button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {challenges.map((challenge, index) => (
          <motion.div
            key={challenge.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="min-w-[200px] w-[200px] overflow-hidden bg-gradient-to-br from-orange-50 to-pink-50 dark:from-orange-950/30 dark:to-pink-950/30 border-0 shadow-md">
              {/* Cover image or gradient */}
              <div className="h-20 bg-gradient-to-br from-orange-400 to-pink-500 relative">
                {challenge.cover_image_url && (
                  <img
                    src={challenge.cover_image_url}
                    alt={challenge.title_he}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <Badge className="absolute top-2 right-2 bg-white/90 text-orange-600 border-0">
                  <Flame className="w-3 h-3 mr-1" />
                  פעיל
                </Badge>
              </div>

              <div className="p-3 space-y-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Hash className="w-3 h-3" />
                  <span>{challenge.hashtag}</span>
                </div>
                
                <h4 className="font-bold text-sm line-clamp-1">{challenge.title_he}</h4>
                
                {challenge.description_he && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {challenge.description_he}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span>{challenge.participant_count}</span>
                  </div>
                  
                  <Button
                    size="sm"
                    variant={challenge.is_joined ? "outline" : "default"}
                    className={cn(
                      "h-7 text-xs rounded-full",
                      challenge.is_joined && "border-green-500 text-green-600"
                    )}
                    onClick={() => handleJoinChallenge(challenge.id)}
                    disabled={joiningId === challenge.id}
                  >
                    {challenge.is_joined ? (
                      <>
                        <Trophy className="w-3 h-3 mr-1" />
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
