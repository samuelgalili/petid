import { motion, AnimatePresence } from "framer-motion";
import { Heart, Calendar, Ruler, PawPrint, ShoppingBag, BookOpen, Sparkles, ChevronLeft } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";

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
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.95
  },
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
  hidden: {
    opacity: 0,
    x: -20
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4
    }
  }
};
const imageVariants = {
  hidden: {
    opacity: 0,
    scale: 1.1
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const
    }
  }
};
const overlayVariants = {
  hidden: {
    opacity: 0,
    y: 20
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      delay: 0.3
    }
  }
};
const ctaVariants = {
  hidden: {
    opacity: 0,
    y: 20
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      delay: 0.4
    }
  }
};
const badgeVariants = {
  hidden: {
    opacity: 0,
    scale: 0
  },
  visible: {
    opacity: 1,
    scale: 1
  }
};
export const AdoptionPostCard = ({
  pet,
  getTimeAgo
}: AdoptionPostCardProps) => {
  const navigate = useNavigate();
  const [showCTA, setShowCTA] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setShowCTA(true);
    }, 1000);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setShowCTA(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const ctaActions = [
    { icon: PawPrint, label: "אימוץ", color: "from-petid-blue to-petid-blue-dark", onClick: () => navigate('/adoption') },
    { icon: ShoppingBag, label: "חנות", color: "from-petid-gold to-amber-500", onClick: () => navigate('/shop') },
    { icon: BookOpen, label: "מידע", color: "from-emerald-500 to-green-600", onClick: () => navigate('/adoption') },
  ];

  return <motion.article variants={cardVariants} initial="hidden" animate="visible" whileInView="visible" viewport={{
    once: true,
    margin: "-50px"
  }} className="bg-white border-b border-gray-100 overflow-hidden">
      {/* Header - Clean minimal design */}
      <motion.div variants={headerVariants} className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Avatar with subtle gradient ring */}
          <motion.div className="relative" initial={{
          scale: 0.8,
          opacity: 0
        }} animate={{
          scale: 1,
          opacity: 1
        }} transition={{
          type: "spring" as const,
          stiffness: 200,
          delay: 0.1
        }}>
            <div className="absolute -inset-0.5 rounded-full bg-gradient-to-tr from-petid-blue to-petid-gold opacity-60" />
            <Avatar className="w-9 h-9 relative ring-2 ring-white">
              <AvatarImage src="https://api.dicebear.com/7.x/bottts/svg?seed=petid-adoption" alt="Petid אימוץ" />
              <AvatarFallback className="bg-gradient-to-tr from-petid-blue to-petid-gold text-white text-sm">
                🐾
              </AvatarFallback>
            </Avatar>
          </motion.div>
          
          <div className="text-right space-y-0.5">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-[13px] text-foreground">Petid אימוץ</p>
              <Badge variant="secondary" className="bg-petid-gold/15 text-petid-blue-dark text-[10px] px-1.5 py-0 h-4 border-0 font-medium">
                אימוץ
              </Badge>
            </div>
            
          </div>
        </div>
      </motion.div>

      {/* Image with CTA strip */}
      <motion.div 
        className="relative aspect-square overflow-hidden cursor-pointer" 
        variants={imageVariants}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseEnter}
        onTouchEnd={handleMouseLeave}
      >
        <motion.div initial={{
        scale: 1.2
      }} animate={{
        scale: 1
      }} transition={{
        duration: 0.8,
        ease: "easeOut" as const
      }} className="w-full h-full">
          <OptimizedImage src={pet.image_url || "/placeholder.svg"} alt={pet.name} className="w-full h-full object-cover" />
        </motion.div>

        {/* Delayed CTA Bar - appears after 1 second hover */}
        <AnimatePresence>
          {showCTA && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute bottom-12 left-3 right-3 z-20"
            >
              <div className="bg-gradient-to-r from-petid-blue via-petid-gold to-petid-blue p-[2px] rounded-2xl shadow-lg shadow-petid-blue/30">
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3">
                  <div className="flex items-center justify-center gap-4">
                    {ctaActions.map((action, index) => (
                      <motion.button
                        key={action.label}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          action.onClick();
                        }}
                        className="flex flex-col items-center gap-1 group"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow`}>
                          <action.icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-[11px] font-semibold text-foreground">{action.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Sparkle indicator */}
              <motion.div
                className="absolute -top-2 left-1/2 -translate-x-1/2"
                animate={{ 
                  y: [0, -3, 0],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Sparkles className="w-4 h-4 text-petid-gold" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Gradient overlay at bottom */}
        <motion.div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent h-36 pointer-events-none" initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        delay: 0.3
      }} />
        
        {/* Pet info overlay */}
        <motion.div variants={overlayVariants} initial="hidden" animate="visible" className="absolute bottom-14 left-3 right-3 text-white">
          <motion.h3 className="text-xl font-bold mb-1" initial={{
          opacity: 0,
          y: 10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          delay: 0.4
        }}>
            {pet.name}
          </motion.h3>
          <motion.div className="flex items-center gap-3 text-sm" initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} transition={{
          delay: 0.5
        }}>
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

        {/* Heart icon floating */}
        <motion.div className="absolute top-3 right-3" initial={{
        scale: 0,
        opacity: 0
      }} animate={{
        scale: 1,
        opacity: 1
      }} transition={{
        type: "spring" as const,
        stiffness: 300,
        delay: 0.5
      }} whileHover={{
        scale: 1.2
      }} whileTap={{
        scale: 0.9
      }}>
          <motion.div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg" animate={{
          boxShadow: ["0 4px 6px -1px rgba(0, 0, 0, 0.1)", "0 10px 15px -3px rgba(237, 73, 86, 0.3)", "0 4px 6px -1px rgba(0, 0, 0, 0.1)"]
        }} transition={{
          duration: 2,
          repeat: Infinity
        }}>
            <Heart className="w-5 h-5 text-[#ED4956]" fill="#ED4956" />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Instagram Sponsored-style CTA Bar */}
      <motion.button
        onClick={handleAdoptClick}
        className="w-full bg-[#1A1A1A] hover:bg-[#262626] transition-colors flex items-center justify-between px-4 py-3"
        whileTap={{ scale: 0.99 }}
      >
        <span className="text-white text-[15px] font-medium">אמץ עכשיו</span>
        <ChevronLeft className="w-5 h-5 text-white" />
      </motion.button>

      {/* Instagram-style Action Bar - Below CTA */}
      <div className="px-3 pt-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <motion.button 
              onClick={handleAdoptClick}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.8 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="p-1 rounded-full hover:bg-red-50 transition-colors duration-200"
            >
              <Heart className="w-6 h-6 text-[#ED4956]" fill="#ED4956" />
            </motion.button>
            
            <motion.button 
              className="text-[#262626] p-1 rounded-full hover:bg-blue-50 transition-colors duration-200"
              onClick={() => navigate('/adoption')}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.8 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <PawPrint className="w-6 h-6" strokeWidth={1.5} />
            </motion.button>
            
            <motion.button 
              className="text-[#262626] p-1 rounded-full hover:bg-amber-50 transition-colors duration-200"
              onClick={() => navigate('/shop')}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.8 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              <ShoppingBag className="w-6 h-6" strokeWidth={1.5} />
            </motion.button>
          </div>
          
          <motion.button 
            className="text-[#262626] p-1 rounded-full hover:bg-gray-100 transition-colors duration-200"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.8 }}
          >
            <BookOpen className="w-6 h-6" strokeWidth={1.5} />
          </motion.button>
        </div>
      </div>

      {/* Caption area */}
      <motion.div className="px-3 pb-3 space-y-3" initial={{
      opacity: 0,
      y: 10
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      delay: 0.5
    }}>
        {/* Tags */}
        <motion.div className="flex flex-wrap gap-2" initial="hidden" animate="visible" variants={{
        visible: {
          transition: {
            staggerChildren: 0.05,
            delayChildren: 0.6
          }
        }
      }}>
          <motion.div variants={badgeVariants}>
            <Badge variant="outline" className="text-[#0095F6] border-[#0095F6]/30 bg-[#0095F6]/5 text-xs">
              {pet.breed || pet.type}
            </Badge>
          </motion.div>
          {pet.is_vaccinated && <motion.div variants={badgeVariants}>
              <Badge variant="outline" className="text-[#00C853] border-[#00C853]/30 bg-[#00C853]/5 text-xs">
                ✓ מחוסן
              </Badge>
            </motion.div>}
          {pet.is_neutered && <motion.div variants={badgeVariants}>
              <Badge variant="outline" className="text-[#00C853] border-[#00C853]/30 bg-[#00C853]/5 text-xs">
                ✓ מסורס
              </Badge>
            </motion.div>}
          {pet.gender && <motion.div variants={badgeVariants}>
              <Badge variant="outline" className="text-[#8E8E8E] border-[#8E8E8E]/30 text-xs">
                {pet.gender === 'זכר' ? '♂️' : '♀️'} {pet.gender}
              </Badge>
            </motion.div>}
        </motion.div>

        {/* Description */}
        {pet.description && <motion.p className="text-sm text-[#262626] leading-relaxed line-clamp-3" dir="rtl" initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        delay: 0.7
      }}>
            <span className="font-semibold">Petid אימוץ</span>{" "}
            🐾 {pet.name} מחפש/ת בית חם! {pet.description}
          </motion.p>}

        {/* Special needs */}
        {pet.special_needs && <motion.p className="text-xs text-[#8E8E8E] bg-[#FFF3E0] p-2 rounded-lg" dir="rtl" initial={{
        opacity: 0,
        x: -10
      }} animate={{
        opacity: 1,
        x: 0
      }} transition={{
        delay: 0.8
      }}>
            💡 צרכים מיוחדים: {pet.special_needs}
          </motion.p>}

        {/* Hashtags */}
        <motion.p className="text-xs text-[#0095F6]" dir="rtl" initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        delay: 0.9
      }}>
          #אימוץ #{pet.type === 'כלב' ? 'כלבים' : 'חתולים'} #תןביתחם #Petid
        </motion.p>
      </motion.div>
    </motion.article>;
};