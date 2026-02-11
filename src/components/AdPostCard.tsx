import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Send, Bookmark, Megaphone, ChevronLeft } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { PostOptionsMenu } from "@/components/post/PostOptionsMenu";

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

export const AdPostCard = ({ ad }: AdPostCardProps) => {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  return (
    <motion.article
      className="bg-card border-b border-border"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header - Instagram style */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2.5">
          <Avatar className="w-8 h-8">
            <AvatarImage src="https://api.dicebear.com/7.x/bottts/svg?seed=petid-ads" />
            <AvatarFallback className="bg-gradient-to-tr from-blue-500 to-cyan-400 text-white text-xs">
              📢
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-[#262626] text-sm">Petid</p>
              <Badge className="bg-[#8E8E8E]/20 text-[#8E8E8E] text-[10px] px-1.5 py-0 h-4 border-0">
                ממומן
              </Badge>
            </div>
          </div>
        </div>
        <PostOptionsMenu
          copyLink={`${window.location.origin}${ad.link}`}
          hideLabel="הסתר מודעה"
          hideToast="המודעה הוסתרה"
          reportLabel="דווח על מודעה"
        />
      </div>

      {/* Image - supports portrait (9:16), landscape (16:9), square (1:1) */}
      <div className={`relative ${
        ad.format === 'portrait' ? 'aspect-[9/16]' : 
        ad.format === 'landscape' ? 'aspect-video' : 
        'aspect-square'
      }`}>
        <img
          src={ad.image}
          alt={ad.title}
          className="w-full h-full object-cover"
        />
        
        {/* Badge */}
        {ad.badge && (
          <div className={`absolute top-3 left-3 bg-gradient-to-r ${ad.gradient} text-white text-xs font-semibold px-2.5 py-1 rounded-full`}>
            {ad.badge}
          </div>
        )}
        
        {/* Subtle gradient at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent h-28 pointer-events-none" />
        
        {/* Ad info overlay */}
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <h3 className="text-xl font-bold mb-1">{ad.title}</h3>
          <p className="text-sm opacity-90">{ad.subtitle}</p>
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

        {/* Caption */}
        <div className="space-y-1 pb-2">
          <p className="text-[#262626] text-sm">
            <span className="font-semibold">Petid</span>{" "}
            {ad.subtitle}
          </p>
        </div>
      </div>

      {/* CTA Button - Instagram style */}
      <button
        onClick={() => navigate(ad.link)}
        className="w-full bg-[#0095F6] hover:bg-[#1877F2] transition-colors flex items-center justify-between px-4 py-3"
      >
        <Megaphone className="w-5 h-5 text-white" />
        <div className="flex items-center gap-2">
          <span className="text-white text-[15px] font-semibold">{ad.cta}</span>
          <ChevronLeft className="w-5 h-5 text-white" />
        </div>
      </button>
    </motion.article>
  );
};
