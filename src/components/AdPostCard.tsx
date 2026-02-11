import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Share2, Megaphone } from "lucide-react";
import { useState } from "react";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface FeedAd {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  cta: string;
  link: string;
  gradient: string;
  badge?: string;
  format?: 'portrait' | 'landscape' | 'square';
}

interface AdPostCardProps {
  ad: FeedAd;
}

const sidebarStagger = {
  hidden: { opacity: 0, x: 20 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: 0.2 + i * 0.07, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

export const AdPostCard = ({ ad }: AdPostCardProps) => {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);

  const handleShare = async () => {
    haptic("light");
    const url = `${window.location.origin}${ad.link}`;
    if (navigator.share) {
      try { await navigator.share({ title: ad.title, url }); } catch { /* cancelled */ }
    } else { navigator.clipboard.writeText(url); toast.success("הקישור הועתק"); }
  };

  return (
    <article className="relative w-full aspect-[9/16] max-w-[calc((100vh-180px)*9/16)] mx-auto rounded-2xl overflow-hidden my-1">
      {/* Full-bleed image */}
      <div className="absolute inset-0 bg-black">
        <img src={ad.image} alt={ad.title} className="w-full h-full object-cover" />
      </div>

      {/* Gradients */}
      <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none z-[5]" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 to-transparent pointer-events-none z-[5]" />

      {/* Badge */}
      {ad.badge && (
        <div className={`absolute top-3 left-3 z-10 bg-gradient-to-r ${ad.gradient} text-white text-xs font-semibold px-2.5 py-1 rounded-full`}>
          {ad.badge}
        </div>
      )}
      <div className="absolute top-3 right-3 z-10">
        <span className="bg-white/20 backdrop-blur-md rounded-full px-3 py-1 text-white text-[11px] font-medium">ממומן</span>
      </div>

      {/* RIGHT SIDEBAR */}
      <motion.div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-6 z-10" initial="hidden" animate="visible">
        {/* Ad Avatar */}
        <motion.div custom={0} variants={sidebarStagger} className="relative mb-1">
          <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden shadow-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <Megaphone className="w-6 h-6 text-white" />
          </div>
        </motion.div>

        {/* Like */}
        <motion.button custom={1} variants={sidebarStagger} whileTap={{ scale: 0.8 }} onClick={() => { haptic("light"); setIsLiked(!isLiked); }} className="flex flex-col items-center gap-1">
          <Heart className={`w-8 h-8 drop-shadow-lg ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-white'}`} strokeWidth={1.5} />
          <span className="text-white text-[14px] font-semibold drop-shadow-md">אהבתי</span>
        </motion.button>

        {/* Comment */}
        <motion.button custom={2} variants={sidebarStagger} whileTap={{ scale: 0.8 }} onClick={() => navigate(ad.link)} className="flex flex-col items-center gap-1">
          <MessageCircle className="w-8 h-8 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white text-[14px] font-semibold drop-shadow-md">פרטים</span>
        </motion.button>

        {/* Share */}
        <motion.button custom={3} variants={sidebarStagger} whileTap={{ scale: 0.8 }} onClick={handleShare} className="flex flex-col items-center gap-1">
          <Share2 className="w-8 h-8 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white text-[14px] font-semibold drop-shadow-md">שתף</span>
        </motion.button>

        {/* CTA */}
        <motion.button custom={4} variants={sidebarStagger} whileTap={{ scale: 0.9 }} onClick={() => navigate(ad.link)} className="relative rounded-xl w-16 h-11 flex items-center justify-center shadow-xl" style={{ backgroundColor: '#FF8C42' }}>
          <motion.div className="absolute inset-0 rounded-xl" style={{ backgroundColor: '#FF8C42' }} animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
          <span className="text-white text-[10px] font-bold relative z-10">{ad.cta}</span>
        </motion.button>
      </motion.div>

      {/* BOTTOM-LEFT INFO */}
      <div className="absolute bottom-7 left-4 right-20 z-10 text-white" dir="rtl">
        <p className="font-semibold text-[18px] drop-shadow-md mb-1">{ad.title}</p>
        <p className="text-[16px] leading-snug line-clamp-2 drop-shadow-sm">{ad.subtitle}</p>
      </div>
    </article>
  );
};
