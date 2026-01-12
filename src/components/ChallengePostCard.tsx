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
    <article className="bg-white">
      {/* Header - Instagram style */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8 ring-[1.5px] ring-purple-500 ring-offset-[1.5px] ring-offset-white">
            <AvatarImage src="https://api.dicebear.com/7.x/bottts/svg?seed=petid-challenge" />
            <AvatarFallback className="bg-gradient-to-tr from-purple-500 to-pink-500 text-white text-xs">
              🏆
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-900 text-[14px]">Petid אתגרים</span>
            <Badge className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0 h-4 border-0 font-medium">
              אתגר
            </Badge>
          </div>
        </div>
        <button className="text-neutral-900 p-1 -m-1 focus:outline-none">
          <MoreVertical className="w-6 h-6" strokeWidth={1.25} />
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
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-neutral-900 text-[12px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
          #{challenge.hashtag}
        </div>
        
        {/* Participants badge */}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm text-neutral-900 text-[12px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
          <Users className="w-3.5 h-3.5" />
          {participantCount}
        </div>
        
        {/* Subtle gradient at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/55 to-transparent h-32 pointer-events-none" />
        
        {/* Challenge info overlay */}
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h3 className="text-xl font-bold tracking-tight mb-1">{challenge.title_he}</h3>
          {challenge.description_he && (
            <p className="text-[14px] opacity-95 line-clamp-2">{challenge.description_he}</p>
          )}
        </div>
      </div>

      {/* Actions - Instagram style */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className="p-0.5 active:opacity-50 transition-opacity focus:outline-none"
            >
              <Heart className={`w-7 h-7 ${isLiked ? 'fill-[#ED4956] text-[#ED4956]' : 'text-neutral-900'}`} strokeWidth={1.25} />
            </button>
            <button className="p-0.5 active:opacity-50 transition-opacity focus:outline-none">
              <MessageCircle className="w-7 h-7 text-neutral-900" strokeWidth={1.25} />
            </button>
            <button className="p-0.5 active:opacity-50 transition-opacity focus:outline-none">
              <Send className="w-7 h-7 text-neutral-900" strokeWidth={1.25} />
            </button>
          </div>
          <button
            onClick={() => setIsSaved(!isSaved)}
            className="p-0.5 active:opacity-50 transition-opacity focus:outline-none"
          >
            <Bookmark className={`w-7 h-7 ${isSaved ? 'fill-neutral-900' : ''} text-neutral-900`} strokeWidth={1.25} />
          </button>
        </div>

        {/* Participants count */}
        <p className="text-[14px] text-neutral-900 font-semibold mb-1.5 tabular-nums">
          {participantCount} משתתפים
        </p>

        {/* Caption */}
        <p className="text-neutral-900 text-[14px] leading-[1.35] mb-2">
          <span className="font-bold">Petid אתגרים</span>{" "}
          🏆 הצטרפו לאתגר #{challenge.hashtag} ושתפו תמונות!
        </p>
      </div>

      {/* CTA Button - Instagram style */}
      <button
        onClick={handleJoinChallenge}
        disabled={isJoining}
        className={`w-full transition-colors flex items-center justify-between px-4 py-3.5 active:opacity-80 ${
          isJoined 
            ? 'bg-emerald-500' 
            : 'bg-gradient-to-r from-purple-500 to-pink-500'
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

      {/* Post Divider */}
      <div className="h-[1px] bg-neutral-100" />
    </article>
  );
};
