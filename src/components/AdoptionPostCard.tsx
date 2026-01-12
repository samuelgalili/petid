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
    <article className="bg-white">
      {/* Header - Instagram style */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8 ring-[1.5px] ring-amber-500 ring-offset-[1.5px] ring-offset-white">
            <AvatarImage src="https://api.dicebear.com/7.x/bottts/svg?seed=petid-adoption" />
            <AvatarFallback className="bg-gradient-to-tr from-petid-blue to-petid-gold text-white text-xs">
              🐾
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-900 text-[14px]">Petid אימוץ</span>
            <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0 h-4 border-0 font-medium">
              אימוץ
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
          src={pet.image_url || "/placeholder.svg"}
          alt={pet.name}
          className="w-full h-full object-cover"
        />
        
        {/* Subtle gradient at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent h-28 pointer-events-none" />
        
        {/* Pet name overlay */}
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h3 className="text-xl font-bold tracking-tight">{pet.name}</h3>
          <p className="text-[14px] opacity-95">{getAgeString(pet.age_years, pet.age_months)} • {pet.size}</p>
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
            <button className="p-0.5 active:opacity-50 transition-opacity focus:outline-none" onClick={() => navigate('/adoption')}>
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

        {/* Caption - Instagram style */}
        <div className="space-y-1.5 pb-1">
          <p className="text-neutral-900 text-[14px] leading-[1.35]">
            <span className="font-bold">Petid אימוץ</span>{" "}
            🐾 {pet.name} מחפש/ת בית חם! {pet.description}
          </p>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[#0095F6] text-[13px]">#{pet.breed || pet.type}</span>
            {pet.is_vaccinated && <span className="text-[#0095F6] text-[13px]">#מחוסן</span>}
            {pet.is_neutered && <span className="text-[#0095F6] text-[13px]">#מסורס</span>}
            <span className="text-[#0095F6] text-[13px]">#אימוץ</span>
          </div>

          {/* Time */}
          <p className="text-neutral-400 text-[11px] pt-1">
            {pet.created_at ? getTimeAgo(pet.created_at) : "עכשיו"}
          </p>
        </div>
      </div>

      {/* CTA Button - Instagram style */}
      <button
        onClick={() => navigate('/adoption')}
        className="w-full bg-gradient-to-r from-amber-500 to-amber-400 active:opacity-80 transition-opacity flex items-center justify-between px-4 py-3.5"
      >
        <PawPrint className="w-5 h-5 text-white" />
        <div className="flex items-center gap-2">
          <span className="text-white text-[15px] font-semibold">לאימוץ</span>
          <ChevronLeft className="w-5 h-5 text-white" />
        </div>
      </button>

      {/* Post Divider */}
      <div className="h-[1px] bg-neutral-100" />
    </article>
  );
};