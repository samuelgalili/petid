import { motion } from "framer-motion";
import { Heart, MessageCircle, Share2, PawPrint, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { haptic } from "@/lib/haptics";
import { toast } from "sonner";

interface AdoptionPet {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  age_years: number | null;
  age_months: number | null;
  gender: string | null;
  size: string;
  description: string | null;
  special_needs: string | null;
  is_vaccinated: boolean;
  is_neutered: boolean;
  image_url: string | null;
  status: string;
  created_at: string | null;
}

interface AdoptionPostCardProps {
  pet: AdoptionPet;
  getTimeAgo: (dateString: string) => string;
}

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

const getAgeString = (years: number | null, months: number | null) => {
  if (!years && !months) return "גיל לא ידוע";
  const parts = [];
  if (years) parts.push(`${years} שנ${years === 1 ? "ה" : "ים"}`);
  if (months) parts.push(`${months} חודש${months === 1 ? "" : "ים"}`);
  return parts.join(" ו");
};

export const AdoptionPostCard = ({ pet, getTimeAgo }: AdoptionPostCardProps) => {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);

  const handleShare = async () => {
    haptic("light");
    const url = `${window.location.origin}/adoption/${pet.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: `${pet.name} מחפש בית`, url }); } catch { /* cancelled */ }
    } else { navigator.clipboard.writeText(url); toast.success("הקישור הועתק"); }
  };

  return (
    <article className="relative w-full aspect-[9/16] max-w-[calc((100vh-180px)*9/16)] mx-auto rounded-2xl overflow-hidden my-1">
      {/* Full-bleed image */}
      <div className="absolute inset-0 bg-black">
        <img src={pet.image_url || "/placeholder.svg"} alt={pet.name} className="w-full h-full object-cover" />
      </div>

      {/* Gradients */}
      <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none z-[5]" />
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 to-transparent pointer-events-none z-[5]" />

      {/* RIGHT SIDEBAR */}
      <motion.div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-6 z-10" initial="hidden" animate="visible">
        {/* Avatar */}
        <motion.div custom={0} variants={sidebarStagger} className="relative mb-1">
          <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden shadow-lg bg-amber-500 flex items-center justify-center">
            <PawPrint className="w-6 h-6 text-white" />
          </div>
        </motion.div>

        {/* Like */}
        <motion.button custom={1} variants={sidebarStagger} whileTap={{ scale: 0.8 }} onClick={() => { haptic("light"); setIsLiked(!isLiked); }} className="flex flex-col items-center gap-1">
          <Heart className={`w-8 h-8 drop-shadow-lg ${isLiked ? 'fill-rose-500 text-rose-500' : 'text-white'}`} strokeWidth={1.5} />
          <span className="text-white text-[14px] font-semibold drop-shadow-md">אהבתי</span>
        </motion.button>

        {/* Comment */}
        <motion.button custom={2} variants={sidebarStagger} whileTap={{ scale: 0.8 }} onClick={() => navigate('/adoption')} className="flex flex-col items-center gap-1">
          <MessageCircle className="w-8 h-8 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white text-[14px] font-semibold drop-shadow-md">פרטים</span>
        </motion.button>

        {/* Share */}
        <motion.button custom={3} variants={sidebarStagger} whileTap={{ scale: 0.8 }} onClick={handleShare} className="flex flex-col items-center gap-1">
          <Share2 className="w-8 h-8 text-white drop-shadow-lg" strokeWidth={1.5} />
          <span className="text-white text-[14px] font-semibold drop-shadow-md">שתף</span>
        </motion.button>

        {/* CTA — Adoption */}
        <motion.button custom={4} variants={sidebarStagger} whileTap={{ scale: 0.9 }} onClick={() => navigate('/adoption')} className="relative rounded-xl w-16 h-11 flex items-center justify-center shadow-xl" style={{ backgroundColor: '#FF8C42' }}>
          <motion.div className="absolute inset-0 rounded-xl" style={{ backgroundColor: '#FF8C42' }} animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
          <span className="text-white text-[11px] font-bold relative z-10">אמץ</span>
        </motion.button>
      </motion.div>

      {/* BOTTOM-LEFT INFO */}
      <div className="absolute bottom-7 left-4 right-20 z-10 text-white" dir="rtl">
        {/* Glassmorphism badges */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="bg-white/20 backdrop-blur-md rounded-full px-3 py-1 text-[14px] font-medium">
            {getAgeString(pet.age_years, pet.age_months)}
          </span>
          <span className="bg-white/20 backdrop-blur-md rounded-full px-3 py-1 text-[14px] font-medium">
            {pet.size}
          </span>
          {pet.gender && (
            <span className="bg-white/20 backdrop-blur-md rounded-full px-3 py-1 text-[14px] font-medium">
              {pet.gender === 'male' ? '♂️ זכר' : '♀️ נקבה'}
            </span>
          )}
          <span className="bg-amber-500/80 rounded-full px-3 py-1 text-[12px] font-bold">לאימוץ</span>
        </div>

        <p className="font-semibold text-[18px] drop-shadow-md mb-1">🐾 {pet.name}</p>
        {pet.description && <p className="text-[16px] leading-snug line-clamp-2 drop-shadow-sm">{pet.description}</p>}
      </div>
    </article>
  );
};
