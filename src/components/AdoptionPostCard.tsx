import { motion } from "framer-motion";
import { Heart, MessageCircle, Send, Bookmark, MoreVertical, PawPrint, ChevronLeft } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

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

export const AdoptionPostCard = ({ pet, getTimeAgo }: AdoptionPostCardProps) => {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const getAgeString = (years: number | null, months: number | null) => {
    if (!years && !months) return "גיל לא ידוע";
    const parts = [];
    if (years) parts.push(`${years} שנ${years === 1 ? "ה" : "ים"}`);
    if (months) parts.push(`${months} חודש${months === 1 ? "" : "ים"}`);
    return parts.join(" ו");
  };

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
          <Avatar className="w-8 h-8 ring-2 ring-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 ring-offset-2">
            <AvatarImage src="https://api.dicebear.com/7.x/bottts/svg?seed=petid-adoption" />
            <AvatarFallback className="bg-gradient-to-tr from-petid-blue to-petid-gold text-white text-xs">
              🐾
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-[#262626] text-sm">Petid אימוץ</p>
              <Badge className="bg-petid-gold/20 text-petid-blue-dark text-[10px] px-1.5 py-0 h-4 border-0">
                אימוץ
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
          src={pet.image_url || "/placeholder.svg"}
          alt={pet.name}
          className="w-full h-full object-cover"
        />
        
        {/* Subtle gradient at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent h-24 pointer-events-none" />
        
        {/* Pet name overlay */}
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <h3 className="text-lg font-bold">{pet.name}</h3>
          <p className="text-sm opacity-90">{getAgeString(pet.age_years, pet.age_months)} • {pet.size}</p>
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
            <button className="p-1" onClick={() => navigate('/adoption')}>
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

        {/* Caption - Instagram style */}
        <div className="space-y-1 pb-2">
          <p className="text-[#262626] text-sm">
            <span className="font-semibold">Petid אימוץ</span>{" "}
            🐾 {pet.name} מחפש/ת בית חם! {pet.description}
          </p>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-1 pt-1">
            <span className="text-[#0095F6] text-xs">#{pet.breed || pet.type}</span>
            {pet.is_vaccinated && <span className="text-[#0095F6] text-xs">#מחוסן</span>}
            {pet.is_neutered && <span className="text-[#0095F6] text-xs">#מסורס</span>}
            <span className="text-[#0095F6] text-xs">#אימוץ</span>
          </div>

          {/* Time */}
          <p className="text-[#8E8E8E] text-[10px] uppercase pt-1">
            {pet.created_at ? getTimeAgo(pet.created_at) : "עכשיו"}
          </p>
        </div>
      </div>

      {/* CTA Button - Instagram style */}
      <button
        onClick={() => navigate('/adoption')}
        className="w-full bg-[#0095F6] hover:bg-[#1877F2] transition-colors flex items-center justify-center gap-2 px-4 py-3"
      >
        <PawPrint className="w-5 h-5 text-white" />
        <span className="text-white text-[15px] font-semibold">אמץ עכשיו</span>
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>
    </motion.article>
  );
};