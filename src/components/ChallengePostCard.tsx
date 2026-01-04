import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Users, Trophy, ChevronLeft, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { OptimizedImage } from "@/components/OptimizedImage";

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

export const ChallengePostCard = ({ challenge, gradientIndex = 0, onJoinChange }: ChallengePostCardProps) => {
  const { user } = useAuth();
  const [isJoining, setIsJoining] = useState(false);
  const [isJoined, setIsJoined] = useState(challenge.is_joined || false);
  const [participantCount, setParticipantCount] = useState(challenge.participant_count);
  const [ctaRevealed, setCtaRevealed] = useState(false);

  // Reveal CTA after 1 second
  useEffect(() => {
    const timer = setTimeout(() => {
      setCtaRevealed(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

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
        toast.success("הצטרפת לאתגר! 🎉");
      }
      
      onJoinChange?.();
    } catch (error) {
      toast.error("שגיאה בעדכון האתגר");
    } finally {
      setIsJoining(false);
    }
  };

  const getTimeAgo = () => {
    return "אתגר פעיל";
  };

  return (
    <motion.div 
      className="bg-card border-b border-border"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Post Header - Same as PostCard */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Avatar className="w-8 h-8 ring-2 ring-border/50">
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-primary text-xs font-medium">
                <Trophy className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
          </motion.div>
          <div className="flex flex-col">
            <p className="font-semibold text-foreground text-[13px] leading-tight">#{challenge.hashtag}</p>
            <p className="text-[11px] text-muted-foreground">{getTimeAgo()}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          <span className="font-medium">{participantCount}</span>
        </div>
      </div>

      {/* Post Image - Softer gradient background */}
      <div className="relative select-none">
        {challenge.cover_image_url ? (
          <OptimizedImage
            src={challenge.cover_image_url}
            alt={challenge.title_he}
            className="w-full aspect-[4/3]"
            objectFit="cover"
            sizes="(max-width: 768px) 100vw, 672px"
          />
        ) : (
          <div className="w-full aspect-[4/3] bg-gradient-to-br from-muted via-muted/80 to-muted/60 flex items-center justify-center">
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.15, 0.25, 0.15]
              }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="text-foreground/20"
            >
              <Trophy className="w-20 h-20" />
            </motion.div>
          </div>
        )}
        
        {/* Soft overlay with content */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/95 via-background/80 to-transparent pt-12 pb-4 px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex flex-col min-w-0">
                <span className="text-foreground font-medium text-sm truncate">
                  {challenge.title_he}
                </span>
                <span className="text-muted-foreground text-xs">
                  {participantCount} משתתפים
                </span>
              </div>
            </div>
            
            <motion.button
              onClick={handleJoinChallenge}
              disabled={isJoining}
              className={cn(
                "font-medium text-xs px-4 py-2 rounded-full transition-all border",
                isJoined 
                  ? "bg-primary/10 text-primary border-primary/20" 
                  : "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
              )}
              whileTap={{ scale: 0.97 }}
            >
              {isJoining ? "..." : isJoined ? "✓ משתתף/ת" : "הצטרפו"}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
