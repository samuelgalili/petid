import { useState } from "react";
import { Heart, MessageCircle, Send, Bookmark, MoreVertical, Users, Trophy, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

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
  return happySmileImg;
};

export const ChallengePostCard = ({ challenge, gradientIndex = 0, onJoinChange }: ChallengePostCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(false);
  const [isJoined, setIsJoined] = useState(challenge.is_joined || false);
  const [participantCount, setParticipantCount] = useState(challenge.participant_count);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

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

  const challengeImage = challenge.cover_image_url || getDefaultImage(challenge.hashtag);

  return (
    <motion.article
      className="bg-white border-b border-[#DBDBDB]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header - Instagram style */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2.5">
          <Avatar className="w-8 h-8">
            <AvatarImage src="https://api.dicebear.com/7.x/bottts/svg?seed=petid-challenge" />
            <AvatarFallback className="bg-gradient-to-tr from-purple-500 to-pink-500 text-white text-xs">
              🏆
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-[#262626] text-sm">Petid אתגרים</p>
              <Badge className="bg-purple-500/20 text-purple-700 text-[10px] px-1.5 py-0 h-4 border-0">
                אתגר
              </Badge>
            </div>
          </div>
        </div>
        <button className="text-[#262626]">
          <MoreVertical className="w-5 h-5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Image - Instagram style square */}
      <div className="relative aspect-square">
        <img
          src={challengeImage}
          alt={challenge.title_he}
          className="w-full h-full object-cover"
        />
        
        {/* Hashtag badge */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[#262626] text-xs font-medium px-2.5 py-1 rounded-full">
          #{challenge.hashtag}
        </div>
        
        {/* Participants badge */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-[#262626] text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
          <Users className="w-3 h-3" />
          {participantCount}
        </div>
        
        {/* Subtle gradient at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent h-28 pointer-events-none" />
        
        {/* Challenge info overlay */}
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <h3 className="text-xl font-bold mb-1">{challenge.title_he}</h3>
          {challenge.description_he && (
            <p className="text-sm opacity-90 line-clamp-2">{challenge.description_he}</p>
          )}
        </div>
      </div>

      {/* Actions - Instagram style */}
      <div className="px-3 pt-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setIsLiked(!isLiked)}
              whileTap={{ scale: 0.8 }}
              className="p-1"
            >
              <Heart className={`w-6 h-6 ${isLiked ? 'fill-[#ED4956] text-[#ED4956]' : 'text-[#262626]'}`} strokeWidth={1.5} />
            </motion.button>
            <button className="p-1">
              <MessageCircle className="w-6 h-6 text-[#262626]" strokeWidth={1.5} />
            </button>
            <button className="p-1">
              <Send className="w-6 h-6 text-[#262626]" strokeWidth={1.5} />
            </button>
          </div>
          <motion.button
            onClick={() => setIsSaved(!isSaved)}
            whileTap={{ scale: 0.8 }}
            className="p-1"
          >
            <Bookmark className={`w-6 h-6 ${isSaved ? 'fill-[#262626]' : ''} text-[#262626]`} strokeWidth={1.5} />
          </motion.button>
        </div>

        {/* Participants count */}
        <p className="text-sm text-[#262626] font-semibold mb-1">
          {participantCount} משתתפים
        </p>

        {/* Caption */}
        <p className="text-[#262626] text-sm mb-2">
          <span className="font-semibold">Petid אתגרים</span>{" "}
          🏆 הצטרפו לאתגר #{challenge.hashtag} ושתפו תמונות!
        </p>
      </div>

      {/* CTA Button - Instagram style */}
      <button
        onClick={handleJoinChallenge}
        disabled={isJoining}
        className={`w-full transition-colors flex items-center justify-between px-4 py-3 ${
          isJoined ? 'bg-[#00C853]' : 'bg-[#0095F6] hover:bg-[#1877F2]'
        }`}
      >
        <Trophy className="w-5 h-5 text-white" />
        <div className="flex items-center gap-2">
          <span className="text-white text-[15px] font-semibold">
            {isJoining ? "..." : isJoined ? "משתתף/ת ✓" : "להצטרפות"}
          </span>
          <ChevronLeft className="w-5 h-5 text-white" />
        </div>
      </button>
    </motion.article>
  );
};
