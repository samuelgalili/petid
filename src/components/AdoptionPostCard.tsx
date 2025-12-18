import { motion } from "framer-motion";
import { Heart, Calendar, Ruler } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      duration: 0.5, 
      ease: "easeOut" as const,
      staggerChildren: 0.1
    }
  }
};

const headerVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4 } }
};

const imageVariants = {
  hidden: { opacity: 0, scale: 1.1 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.6, ease: "easeOut" as const }
  }
};

const overlayVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.3 } }
};

const ctaVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.4 } }
};

const badgeVariants = {
  hidden: { opacity: 0, scale: 0 },
  visible: { opacity: 1, scale: 1 }
};

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
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className="bg-white border-b border-gray-100 overflow-hidden"
    >
      {/* Header with Instagram gradient accent */}
      <motion.div 
        variants={headerVariants}
        className="flex items-center justify-between p-3"
      >
        <div className="flex items-center gap-3">
          {/* Instagram-style gradient ring */}
          <motion.div 
            className="relative"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring" as const, stiffness: 200, delay: 0.1 }}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-petid-gold via-petid-blue to-petid-gold-dark p-[2px]">
              <div className="w-full h-full rounded-full bg-white" />
            </div>
            <Avatar className="w-10 h-10 relative border-2 border-white">
              <AvatarImage 
                src="https://api.dicebear.com/7.x/bottts/svg?seed=petid-adoption" 
                alt="Petid אימוץ" 
              />
              <AvatarFallback className="bg-gradient-to-tr from-petid-blue to-petid-gold text-white">
                🐾
              </AvatarFallback>
            </Avatar>
          </motion.div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-[#262626]">Petid אימוץ</p>
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Badge className="bg-gradient-to-r from-petid-blue via-petid-gold to-petid-blue text-white text-[10px] px-2 py-0 h-5 border-0">
                  אימוץ
                </Badge>
              </motion.div>
            </div>
            <p className="text-xs text-[#8E8E8E]">
              {pet.created_at ? getTimeAgo(pet.created_at) : "לאחרונה"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Image with CTA strip */}
      <motion.div 
        className="relative aspect-square overflow-hidden"
        variants={imageVariants}
      >
        <motion.div
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" as const }}
          className="w-full h-full"
        >
          <OptimizedImage
            src={pet.image_url || "/placeholder.svg"}
            alt={pet.name}
            className="w-full h-full object-cover"
          />
        </motion.div>
        
        {/* Gradient overlay at bottom */}
        <motion.div 
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent h-36 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        />
        
        {/* Pet info overlay */}
        <motion.div 
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          className="absolute bottom-14 left-3 right-3 text-white"
        >
          <motion.h3 
            className="text-xl font-bold mb-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {pet.name}
          </motion.h3>
          <motion.div 
            className="flex items-center gap-3 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {getAgeString(pet.age_years, pet.age_months)}
            </span>
            <span className="flex items-center gap-1">
              <Ruler className="w-3.5 h-3.5" />
              {pet.size}
            </span>
          </motion.div>
        </motion.div>

        {/* CTA Strip at bottom of image */}
        <motion.button
          variants={ctaVariants}
          initial="hidden"
          animate="visible"
          onClick={handleAdoptClick}
          className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm py-2.5 px-4 flex items-center justify-between cursor-pointer hover:bg-white transition-colors"
          whileTap={{ scale: 0.99 }}
          whileHover={{ backgroundColor: "rgba(255,255,255,1)" }}
        >
          <div className="flex items-center gap-2">
            <motion.div 
              className="w-6 h-6 rounded-full bg-gradient-to-tr from-petid-blue via-petid-gold to-petid-blue flex items-center justify-center"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Heart className="w-3.5 h-3.5 text-white" fill="white" />
            </motion.div>
            <span className="text-sm font-semibold text-[#262626]">אמץ את {pet.name}</span>
          </div>
          <motion.span 
            className="text-petid-blue text-sm font-semibold"
            whileHover={{ x: -3 }}
          >
            לאימוץ ←
          </motion.span>
        </motion.button>

        {/* Heart icon floating */}
        <motion.div 
          className="absolute top-3 right-3"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring" as const, stiffness: 300, delay: 0.5 }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        >
          <motion.div 
            className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg"
            animate={{ 
              boxShadow: [
                "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                "0 10px 15px -3px rgba(237, 73, 86, 0.3)",
                "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Heart className="w-5 h-5 text-[#ED4956]" fill="#ED4956" />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Caption area */}
      <motion.div 
        className="p-3 space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        {/* Tags */}
        <motion.div 
          className="flex flex-wrap gap-2"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: 0.05, delayChildren: 0.6 } }
          }}
        >
          <motion.div variants={badgeVariants}>
            <Badge variant="outline" className="text-[#0095F6] border-[#0095F6]/30 bg-[#0095F6]/5 text-xs">
              {pet.breed || pet.type}
            </Badge>
          </motion.div>
          {pet.is_vaccinated && (
            <motion.div variants={badgeVariants}>
              <Badge variant="outline" className="text-[#00C853] border-[#00C853]/30 bg-[#00C853]/5 text-xs">
                ✓ מחוסן
              </Badge>
            </motion.div>
          )}
          {pet.is_neutered && (
            <motion.div variants={badgeVariants}>
              <Badge variant="outline" className="text-[#00C853] border-[#00C853]/30 bg-[#00C853]/5 text-xs">
                ✓ מסורס
              </Badge>
            </motion.div>
          )}
          {pet.gender && (
            <motion.div variants={badgeVariants}>
              <Badge variant="outline" className="text-[#8E8E8E] border-[#8E8E8E]/30 text-xs">
                {pet.gender === 'זכר' ? '♂️' : '♀️'} {pet.gender}
              </Badge>
            </motion.div>
          )}
        </motion.div>

        {/* Description */}
        {pet.description && (
          <motion.p 
            className="text-sm text-[#262626] leading-relaxed line-clamp-3" 
            dir="rtl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <span className="font-semibold">Petid אימוץ</span>{" "}
            🐾 {pet.name} מחפש/ת בית חם! {pet.description}
          </motion.p>
        )}

        {/* Special needs */}
        {pet.special_needs && (
          <motion.p 
            className="text-xs text-[#8E8E8E] bg-[#FFF3E0] p-2 rounded-lg" 
            dir="rtl"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            💡 צרכים מיוחדים: {pet.special_needs}
          </motion.p>
        )}

        {/* Hashtags */}
        <motion.p 
          className="text-xs text-[#0095F6]" 
          dir="rtl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          #אימוץ #{pet.type === 'כלב' ? 'כלבים' : 'חתולים'} #תןביתחם #Petid
        </motion.p>
      </motion.div>
    </motion.article>
  );
};