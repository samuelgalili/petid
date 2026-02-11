import { useState } from "react";
import { Heart, MessageCircle, Share2, Users, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { haptic } from "@/lib/haptics";

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

const getDefaultImage = (hashtag: string): string => {
  const h = hashtag.toLowerCase();
  if (h.includes('טיול') || h.includes('בוקר') || h.includes('הליכה')) return morningWalkImg;
  if (h.includes('פינה') || h.includes('נעימה') || h.includes('מנוחה') || h.includes('שינה')) return cozyCornerImg;
  return happySmileImg;
};

const formatCount = (count: number): string => {
  if (!count) return '0';
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return count.toString();
};

const sidebarStagger = {
  hidden: { opacity: 0, x: 20 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: 0.2 + i * 0.07, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

export const ChallengePostCard = ({ challenge, gradientIndex = 0, onJoinChange }: ChallengePostCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isJoining, setIsJoining] = useState(false);
  const [isJoined, setIsJoined] = useState(challenge.is_joined || false);
  const [participantCount, setParticipantCount] = useState(challenge.participant_count);
  const [isLiked, setIsLiked] = useState(false);

  const handleJoinChallenge = async () => {
    if (!user) { toast.error("יש להתחבר כדי להשתתף באתגר"); return; }
    setIsJoining(true);
    try {
      if (isJoined) {
        await supabase.from("challenge_participants").delete().eq("challenge_id", challenge.id).eq("user_id", user.id);
        setIsJoined(false); setParticipantCount(prev => Math.max(0, prev - 1));
        toast.success("יצאת מהאתגר");
      } else {
        await supabase.from("challenge_participants").insert({ challenge_id: challenge.id, user_id: user.id });
        setIsJoined(true); setParticipantCount(prev => prev + 1);
        toast.success("הצטרפת לאתגר! 🎉");
      }
      onJoinChange?.();
    } catch { toast.error("שגיאה בעדכון האתגר"); }
    finally { setIsJoining(false); }
  };

  const handleShare = async () => {
    haptic("light");
    const url = `${window.location.origin}/challenge/${challenge.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: challenge.title_he, url }); } catch { /* cancelled */ }
    } else { navigator.clipboard.writeText(url); toast.success("הקישור הועתק"); }
  };

  const challengeImage = challenge.cover_image_url || getDefaultImage(challenge.hashtag);

  return (
    <article className="relative w-full aspect-[9/16] max-w-[calc((100vh-180px)*9/16)] mx-auto rounded-2xl overflow-hidden my-1">
      {/* Full-bleed image */}
      <div className="absolute inset-0 bg-black">
        <img src={challengeImage} alt={challenge.title_he} className="w-full h-full object-cover" />
      </div>

      {/* Gradients */}
      <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none z-[5]" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 to-transparent pointer-events-none z-[5]" />

      {/* Top badges */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <span className="bg-white/95 backdrop-blur-sm text-neutral-900 text-[12px] font-semibold px-2.5 py-1 rounded-full shadow-sm">#{challenge.hashtag}</span>
      </div>
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white/95 backdrop-blur-sm text-neutral-900 text-[12px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
        <Users className="w-3.5 h-3.5" /> {formatCount(participantCount)}
      </div>

      {/* RIGHT SIDEBAR */}
      <motion.div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-6 z-10" initial="hidden" animate="visible">
        {/* Challenge Avatar */}
        <motion.div custom={0} variants={sidebarStagger} className="relative mb-1">
          <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden shadow-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-white" />
          </div>
        </motion.div>

        {/* Like */}
        <motion.button custom={1} variants={sidebarStagger} whileTap={{ scale: 0.8 }} onClick={() => { haptic("light"); setIsLiked(!isLiked); }} className="flex flex-col items-center gap-1">
          <Heart className={`w-8 h-8 drop-shadow-lg ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-white'}`} strokeWidth={1.5} />
          <span className="text-white text-[14px] font-semibold drop-shadow-md">אהבתי</span>
        </motion.button>

        {/* Comment */}
        <motion.button custom={2} variants={sidebarStagger} whileTap={{ scale: 0.8 }} onClick={() => navigate(`/challenge/${challenge.id}`)} className="flex flex-col items-center gap-1">
          <MessageCircle className="w-8 h-8 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white text-[14px] font-semibold drop-shadow-md">פרטים</span>
        </motion.button>

        {/* Share */}
        <motion.button custom={3} variants={sidebarStagger} whileTap={{ scale: 0.8 }} onClick={handleShare} className="flex flex-col items-center gap-1">
          <Share2 className="w-8 h-8 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white text-[14px] font-semibold drop-shadow-md">שתף</span>
        </motion.button>

        {/* CTA — Join */}
        <motion.button custom={4} variants={sidebarStagger} whileTap={{ scale: 0.9 }} onClick={handleJoinChallenge} disabled={isJoining} className="relative rounded-xl w-16 h-11 flex items-center justify-center shadow-xl" style={{ backgroundColor: isJoined ? '#22c55e' : '#FF8C42' }}>
          <motion.div className="absolute inset-0 rounded-xl" style={{ backgroundColor: isJoined ? '#22c55e' : '#FF8C42' }} animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
          <span className="text-white text-[11px] font-bold relative z-10">{isJoining ? "..." : isJoined ? "✓" : "הצטרף"}</span>
        </motion.button>
      </motion.div>

      {/* BOTTOM-LEFT INFO */}
      <div className="absolute bottom-7 left-4 right-20 z-10 text-white" dir="rtl">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-purple-500/80 rounded-full px-3 py-1 text-[12px] font-bold">אתגר</span>
          <span className="bg-white/20 backdrop-blur-md rounded-full px-3 py-1 text-[14px] font-medium">
            {formatCount(participantCount)} משתתפים
          </span>
        </div>

        <p className="font-semibold text-[18px] drop-shadow-md mb-1">🏆 {challenge.title_he}</p>
        {challenge.description_he && <p className="text-[16px] leading-snug line-clamp-2 drop-shadow-sm">{challenge.description_he}</p>}
      </div>
    </article>
  );
};
