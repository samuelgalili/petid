import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Users, Hash, Trophy, Sparkles, Clock, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

const GRADIENT_VARIANTS = [
  "from-orange-500 via-pink-500 to-purple-600",
  "from-blue-500 via-cyan-400 to-teal-500",
  "from-emerald-500 via-green-400 to-lime-500",
  "from-violet-600 via-purple-500 to-fuchsia-500",
  "from-rose-500 via-red-400 to-orange-500",
];

export const ChallengePostCard = ({ challenge, gradientIndex = 0, onJoinChange }: ChallengePostCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
        // Leave challenge
        await supabase
          .from("challenge_participants")
          .delete()
          .eq("challenge_id", challenge.id)
          .eq("user_id", user.id);

        setIsJoined(false);
        setParticipantCount(prev => Math.max(0, prev - 1));
        toast.success("יצאת מהאתגר");
      } else {
        // Join challenge
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

  const getTimeRemaining = (endsAt: string | null) => {
    if (!endsAt) return null;
    const end = new Date(endsAt);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return "הסתיים";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} ימים`;
    if (hours > 0) return `${hours} שעות`;
    return "פחות משעה";
  };

  const gradient = GRADIENT_VARIANTS[gradientIndex % GRADIENT_VARIANTS.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border-b border-gray-100"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={cn(
              "w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center shadow-lg",
              gradient
            )}>
              <Flame className="w-5 h-5 text-white" />
            </div>
            <motion.div
              className="absolute -top-0.5 -right-0.5"
              animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            </motion.div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">אתגר פעיל</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-orange-100 text-orange-600 border-0">
                <Flame className="w-2.5 h-2.5 mr-0.5" />
                חם
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Hash className="w-3 h-3" />
              {challenge.hashtag}
            </span>
          </div>
        </div>
        {challenge.ends_at && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
            <Clock className="w-3 h-3" />
            <span>{getTimeRemaining(challenge.ends_at)}</span>
          </div>
        )}
      </div>

      {/* Cover Image */}
      <div className={cn(
        "relative aspect-[2/1] bg-gradient-to-br overflow-hidden",
        gradient
      )}>
        {challenge.cover_image_url ? (
          <img
            src={challenge.cover_image_url}
            alt={challenge.title_he}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="text-white/30"
            >
              <Trophy className="w-24 h-24" />
            </motion.div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        
        {/* Title overlay */}
        <div className="absolute bottom-4 right-4 left-4">
          <h3 className="text-xl font-bold text-white drop-shadow-lg">
            {challenge.title_he}
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-3">
        {/* Description */}
        {challenge.description_he && (
          <p className="text-sm text-foreground/80 leading-relaxed">
            {challenge.description_he}
          </p>
        )}

        {/* Stats & CTA */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="font-medium">{participantCount}</span>
              <span>משתתפים</span>
            </div>
          </div>

          <Button
            onClick={handleJoinChallenge}
            disabled={isJoining}
            className={cn(
              "rounded-full px-6 font-semibold transition-all duration-200",
              isJoined 
                ? "bg-green-500 hover:bg-green-600 text-white" 
                : "bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 shadow-md"
            )}
          >
            {isJoining ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
              />
            ) : isJoined ? (
              <>
                <Trophy className="w-4 h-4 mr-2" />
                משתתף/ת
              </>
            ) : (
              <>
                הצטרפו לאתגר
                <ChevronLeft className="w-4 h-4 mr-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
