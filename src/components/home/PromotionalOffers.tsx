import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Sparkles } from "lucide-react";

interface PromotionalOffer {
  id: string;
  title: string;
  subtitle: string;
  badge_text: string;
  gradient_from: string;
  gradient_to: string;
  button_text: string;
  button_link: string;
  button_color: string;
}

interface PromotionalOffersProps {
  offers: PromotionalOffer[];
}

export const PromotionalOffers = ({ offers }: PromotionalOffersProps) => {
  const navigate = useNavigate();

  if (offers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Carousel
        opts={{
          align: "start",
          loop: true
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-3">
          {offers.map((offer, index) => (
            <CarouselItem key={offer.id} className="pl-3 basis-[92%]">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + index * 0.05 }}
                onClick={() => navigate(offer.button_link)}
                className="bg-white border border-border rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Left side - Icon */}
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${offer.gradient_from}20, ${offer.gradient_to}30)`
                    }}
                  >
                    <Sparkles 
                      className="w-5 h-5" 
                      style={{ color: offer.gradient_from }}
                      strokeWidth={1.5}
                    />
                  </div>

                  {/* Center - Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: `linear-gradient(135deg, ${offer.gradient_from}, ${offer.gradient_to})`,
                          color: 'white'
                        }}
                      >
                        {offer.badge_text}
                      </span>
                    </div>
                    <h3 
                      className="text-base font-bold text-foreground leading-tight mb-0.5 truncate"
                    >
                      {offer.title}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {offer.subtitle}
                    </p>
                  </div>

                  {/* Right side - Arrow */}
                  <div className="flex-shrink-0">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"
                      style={{
                        background: `linear-gradient(135deg, ${offer.gradient_from}, ${offer.gradient_to})`
                      }}
                    >
                      <ChevronLeft className="w-4 h-4 text-white" strokeWidth={2} />
                    </div>
                  </div>
                </div>
              </motion.div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </motion.div>
  );
};