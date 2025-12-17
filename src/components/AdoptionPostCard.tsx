import { motion } from "framer-motion";
import { Heart, MessageCircle, Share2, MapPin, Calendar, Ruler } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useNavigate } from "react-router-dom";

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

  const getAgeString = (years: number | null, months: number | null) => {
    if (!years && !months) return "גיל לא ידוע";
    const parts = [];
    if (years) parts.push(`${years} שנ${years === 1 ? "ה" : "ים"}`);
    if (months) parts.push(`${months} חודש${months === 1 ? "" : "ים"}`);
    return parts.join(" ו");
  };

  const handleAdoptClick = () => {
    navigate('/adoption');
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white border-b border-gray-100"
    >
      {/* Header with Instagram gradient accent */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          {/* Instagram-style gradient ring */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-[2px]">
              <div className="w-full h-full rounded-full bg-white" />
            </div>
            <Avatar className="w-10 h-10 relative border-2 border-white">
              <AvatarImage 
                src="https://api.dicebear.com/7.x/bottts/svg?seed=petid-adoption" 
                alt="Petid אימוץ" 
              />
              <AvatarFallback className="bg-gradient-to-tr from-[#F58529] to-[#DD2A7B] text-white">
                🐾
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-[#262626]">Petid אימוץ</p>
              <Badge className="bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white text-[10px] px-2 py-0 h-5 border-0">
                אימוץ
              </Badge>
            </div>
            <p className="text-xs text-[#8E8E8E]">
              {pet.created_at ? getTimeAgo(pet.created_at) : "לאחרונה"}
            </p>
          </div>
        </div>
      </div>

      {/* Image with gradient overlay */}
      <div className="relative aspect-square overflow-hidden">
        <OptimizedImage
          src={pet.image_url || "/placeholder.svg"}
          alt={pet.name}
          className="w-full h-full object-cover"
        />
        
        {/* Gradient overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent h-32 pointer-events-none" />
        
        {/* Pet info overlay */}
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <h3 className="text-xl font-bold mb-1">{pet.name}</h3>
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {getAgeString(pet.age_years, pet.age_months)}
            </span>
            <span className="flex items-center gap-1">
              <Ruler className="w-3.5 h-3.5" />
              {pet.size}
            </span>
          </div>
        </div>

        {/* Heart icon floating */}
        <motion.div 
          className="absolute top-3 right-3"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
            <Heart className="w-5 h-5 text-[#ED4956]" fill="#ED4956" />
          </div>
        </motion.div>
      </div>

      {/* Caption area */}
      <div className="p-3 space-y-3">
        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-[#0095F6] border-[#0095F6]/30 bg-[#0095F6]/5 text-xs">
            {pet.breed || pet.type}
          </Badge>
          {pet.is_vaccinated && (
            <Badge variant="outline" className="text-[#00C853] border-[#00C853]/30 bg-[#00C853]/5 text-xs">
              ✓ מחוסן
            </Badge>
          )}
          {pet.is_neutered && (
            <Badge variant="outline" className="text-[#00C853] border-[#00C853]/30 bg-[#00C853]/5 text-xs">
              ✓ מסורס
            </Badge>
          )}
          {pet.gender && (
            <Badge variant="outline" className="text-[#8E8E8E] border-[#8E8E8E]/30 text-xs">
              {pet.gender === 'זכר' ? '♂️' : '♀️'} {pet.gender}
            </Badge>
          )}
        </div>

        {/* Description */}
        {pet.description && (
          <p className="text-sm text-[#262626] leading-relaxed line-clamp-3" dir="rtl">
            <span className="font-semibold">Petid אימוץ</span>{" "}
            🐾 {pet.name} מחפש/ת בית חם! {pet.description}
          </p>
        )}

        {/* Special needs */}
        {pet.special_needs && (
          <p className="text-xs text-[#8E8E8E] bg-[#FFF3E0] p-2 rounded-lg" dir="rtl">
            💡 צרכים מיוחדים: {pet.special_needs}
          </p>
        )}

        {/* CTA Button - Instagram style */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={handleAdoptClick}
            className="w-full bg-[#0095F6] hover:bg-[#1877F2] text-white font-semibold rounded-lg h-10 transition-colors text-sm"
          >
            אמץ את {pet.name}
          </Button>
        </motion.div>

        {/* Hashtags */}
        <p className="text-xs text-[#0095F6]" dir="rtl">
          #אימוץ #{pet.type === 'כלב' ? 'כלבים' : 'חתולים'} #תןביתחם #Petid
        </p>
      </div>
    </motion.article>
  );
};
