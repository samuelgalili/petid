import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Users, Trophy, ChevronLeft, Flame, Star, Gift } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { OptimizedImage } from "@/components/OptimizedImage";

// Challenge theme images
import morningWalkImg from "@/assets/challenges/morning-walk.jpg";
import cozyCornerImg from "@/assets/challenges/cozy-corner.jpg";
import happySmileImg from "@/assets/challenges/happy-smile.jpg";

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

interface ChallengePostCardProps {
  challenge: Challenge;
  gradientIndex?: number;
  onJoinChange?: () => void;
}

// Map hashtags to default images
const getDefaultImage = (hashtag: string): string => {
  const hashtagLower = hashtag.toLowerCase();
  if (hashtagLower.includes('טיול') || hashtagLower.includes('בוקר') || hashtagLower.includes('הליכה')) {
    return morningWalkImg;
  }
  if (hashtagLower.includes('פינה') || hashtagLower.includes('נעימה') || hashtagLower.includes('מנוחה') || hashtagLower.includes('שינה')) {
    return cozyCornerImg;
  }
  if (hashtagLower.includes('חיוך') || hashtagLower.includes('שמח') || hashtagLower.includes('יפה')) {
    return happySmileImg;
  }
  // Default fallback
  return happySmileImg;
};

export const ChallengePostCard = ({ challenge, gradientIndex = 0, onJoinChange }: ChallengePostCardProps) => {
  const { user } = useAuth();
  const [isJoining, setIsJoining] = useState(false);
  const [isJoined, setIsJoined] = useState(challenge.is_joined || false);
  const [participantCount, setParticipantCount] = useState(challenge.participant_count);

  const handleJoinChallenge = async () => {
    if (!user) {
      toast.error("יש להתחבר כדי להשתתף באתגר");
      return;
    }

    setIsJoining(true);
    try {
      if (isJoined) {
        await supabase
          .from("challenge_participants")
          .delete()
          .eq("challenge_id", challenge.id)
          .eq("user_id", user.id);

        setIsJoined(false);
        setParticipantCount(prev => Math.max(0, prev - 1));
        toast.success("יצאת מהאתגר");
      } else {
        await supabase
          .from("challenge_participants")
          .insert({
            challenge_id: challenge.id,
            user_id: user.id
          });

        setIsJoined(true);
        setParticipantCount(prev => prev + 1);
        toast.success("הצטרפת לאתגר! 🎉 צברת 10 נקודות");
      }
      
      onJoinChange?.();
    } catch (error) {
      toast.error("שגיאה בעדכון האתגר");
    } finally {
      setIsJoining(false);
    }
  };

  const challengeImage = challenge.cover_image_url || getDefaultImage(challenge.hashtag);

  return (
    <motion.div 
      className="bg-card border border-border rounded-xl overflow-hidden mx-3 my-2 shadow-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Challenge Image */}
      <div className="relative select-none">
        <img
          src={challengeImage}
          alt={challenge.title_he}
          className="w-full aspect-[16/9] object-cover"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white/80 text-xs font-medium bg-white/20 px-2 py-0.5 rounded-full">
                  #{challenge.hashtag}
                </span>
              </div>
              <h3 className="text-white font-semibold text-base mb-1">
                {challenge.title_he}
              </h3>
              {challenge.description_he && (
                <p className="text-white/80 text-xs line-clamp-2">
                  {challenge.description_he}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section with rewards explanation and join button */}
      <div className="p-3 bg-card">
        {/* Rewards explanation */}
        <div className="flex items-center gap-4 mb-3 p-2 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span>+10 נקודות להצטרפות</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Gift className="w-3.5 h-3.5 text-primary" />
            <span>+50 נקודות לפרסום</span>
          </div>
        </div>

        {/* Join section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{participantCount} משתתפים</span>
          </div>
          
          <motion.button
            onClick={handleJoinChallenge}
            disabled={isJoining}
            className={cn(
              "font-medium text-sm px-5 py-2 rounded-full transition-all",
              isJoined 
                ? "bg-primary/10 text-primary border border-primary/20" 
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
            whileTap={{ scale: 0.97 }}
          >
            {isJoining ? "..." : isJoined ? "✓ משתתף/ת" : "הצטרפו לאתגר"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};
