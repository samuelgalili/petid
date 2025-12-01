import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useNavigate } from "react-router-dom";

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="mb-6 px-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-gray-900 font-jakarta">מבצעים בלעדיים</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/rewards')}
          className="text-primary hover:text-primary/80 font-jakarta text-sm font-bold"
        >
          צפה בהכל ←
        </Button>
      </div>

      <Carousel
        opts={{
          align: "start",
          loop: true
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {offers.length > 0 ? (
            offers.map((offer, index) => (
              <CarouselItem key={offer.id} className="pl-2 md:pl-4 basis-[85%] md:basis-1/2 lg:basis-1/3">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.55 + index * 0.05 }}
                  className="bg-gradient-to-br rounded-2xl p-5 shadow-lg h-44 flex flex-col justify-between"
                  style={{
                    backgroundImage: `linear-gradient(to bottom right, ${offer.gradient_from}, ${offer.gradient_to})`
                  }}
                >
                  <div>
                    <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full mb-2">
                      {offer.badge_text}
                    </span>
                    <h3 className="text-2xl font-extrabold text-white mb-1 font-jakarta">
                      {offer.title}
                    </h3>
                    <p className="text-sm text-white/90 font-jakarta">{offer.subtitle}</p>
                  </div>
                  <Button
                    onClick={() => navigate(offer.button_link)}
                    className={`bg-white text-${offer.button_color} text-sm font-bold py-2 px-4 rounded-xl hover:bg-opacity-90 transition-colors font-jakarta shadow-md`}
                    style={{ color: `var(--${offer.button_color})` }}
                  >
                    {offer.button_text}
                  </Button>
                </motion.div>
              </CarouselItem>
            ))
          ) : (
            // Fallback loading state or empty state
            <CarouselItem className="pl-2 md:pl-4 basis-[85%]">
              <div className="bg-gray-100 rounded-2xl p-5 h-44 flex items-center justify-center">
                <p className="text-gray-500 font-jakarta">Loading offers...</p>
              </div>
            </CarouselItem>
          )}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex -left-4" />
        <CarouselNext className="hidden md:flex -right-4" />
      </Carousel>
    </motion.div>
  );
};
