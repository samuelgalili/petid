import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Megaphone, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FeedAd {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  cta: string;
  link: string;
  gradient: string;
  badge?: string;
}

interface AdPostCardProps {
  ad: FeedAd;
}

export const AdPostCard = ({ ad }: AdPostCardProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 mx-4 mb-4"
    >
      {/* Sponsored Label */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50/80">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-500 font-medium">ממומן</span>
        </div>
        {ad.badge && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${ad.gradient} text-white`}>
            {ad.badge}
          </span>
        )}
      </div>

      {/* Ad Image */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={ad.image}
          alt={ad.title}
          className="w-full h-full object-cover"
        />
        <div className={`absolute inset-0 bg-gradient-to-t ${ad.gradient} opacity-40`} />
        
        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-white" />
              <h3 className="text-xl font-bold text-white drop-shadow-lg">
                {ad.title}
              </h3>
            </div>
            <p className="text-white/90 text-sm mb-3 drop-shadow">
              {ad.subtitle}
            </p>
          </motion.div>
        </div>
      </div>

      {/* CTA Button */}
      <div className="p-4">
        <Button
          onClick={() => navigate(ad.link)}
          className={`w-full bg-gradient-to-r ${ad.gradient} hover:opacity-90 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2`}
        >
          {ad.cta}
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};
