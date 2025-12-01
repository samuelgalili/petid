import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ProductCard, PromoCard } from "./ProductCard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ComponentErrorFallback } from "@/components/ComponentErrorFallback";
import dogFoodImg from "@/assets/products/dog-food.jpg";
import dogTreatsImg from "@/assets/products/dog-treats.jpg";
import dogToysImg from "@/assets/products/dog-toys.jpg";
import catFoodImg from "@/assets/products/cat-food.jpg";
import petVitaminsImg from "@/assets/products/pet-vitamins.jpg";
import fleaTreatmentImg from "@/assets/products/flea-treatment.jpg";
import dogSnacksImg from "@/assets/products/dog-snacks.jpg";
import petBedImg from "@/assets/products/pet-bed.jpg";
import petCollarImg from "@/assets/products/pet-collar.jpg";

export const ProductCarousel = () => {
  const navigate = useNavigate();

  return (
    <ErrorBoundary
      fallback={<ComponentErrorFallback componentName="מוצרים מומלצים" />}
      onReset={() => window.location.reload()}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="mb-6 px-4"
      >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-gray-900 font-jakarta">מוצרים מומלצים</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/shop')}
          className="text-[#FFD700] hover:text-[#F4C542] font-jakarta text-sm font-bold"
        >
          צפה בהכל ←
        </Button>
      </div>

      {/* 3-Column Grid with Mixed Product and Promo Cards */}
      <div className="grid grid-cols-3 gap-2">
        {/* Row 1 - Yellow Products */}
        <ProductCard
          image={dogFoodImg}
          title="Premium Food"
          price="₪27.90"
          bgColor="bg-[#FFC107]"
          index={0}
          onClick={() => navigate('/shop')}
        />
        
        <ProductCard
          image={dogTreatsImg}
          title="Pet Treats"
          price="₪10"
          bgColor="bg-[#FFC107]"
          index={1}
          onClick={() => navigate('/shop')}
        />

        <PromoCard
          image={petBedImg}
          title="Refreshing Sale"
          subtitle="Special offers"
          bgColor="bg-[#FFD700]"
          textColor="text-gray-900"
          index={0}
          badgeText="petid"
          onClick={() => navigate('/rewards')}
        />

        {/* Row 2 - Red Products */}
        <ProductCard
          image={dogToysImg}
          title="Pet Toys"
          price="₪4.90"
          bgColor="bg-[#F44336]"
          index={2}
          hasSaleBadge
          onClick={() => navigate('/shop')}
        />
        
        <ProductCard
          image={catFoodImg}
          title="Cat Food"
          price="₪1.90"
          bgColor="bg-[#F44336]"
          index={3}
          hasSaleBadge
          onClick={() => navigate('/shop')}
        />

        {/* Row 3 - More Yellow Products */}
        <ProductCard
          image={petVitaminsImg}
          title="Pet Vitamins"
          price="₪145"
          bgColor="bg-[#FFC107]"
          index={4}
          onClick={() => navigate('/shop')}
        />
        
        <ProductCard
          image={fleaTreatmentImg}
          title="Healthcare"
          price="₪89"
          bgColor="bg-[#FFC107]"
          index={5}
          onClick={() => navigate('/shop')}
        />

        <PromoCard
          image={petCollarImg}
          title="Special Deals"
          subtitle="Limited time"
          bgColor="bg-[#F44336]"
          textColor="text-white"
          index={1}
          badgeText="SALE"
          onClick={() => navigate('/shop')}
        />

        {/* Row 4 - More Products */}
        <ProductCard
          image={dogSnacksImg}
          title="Pet Snacks"
          price="₪101"
          bgColor="bg-[#FFC107]"
          index={6}
          onClick={() => navigate('/shop')}
        />
        
        <ProductCard
          image={petBedImg}
          title="Pet Bed"
          price="₪208"
          bgColor="bg-[#FFC107]"
          index={7}
          onClick={() => navigate('/shop')}
        />
      </div>

      {/* View More Button */}
      <Button
        onClick={() => navigate('/shop')}
        className="w-full mt-4 bg-[#FFD700] hover:bg-[#F4C542] text-gray-900 font-jakarta font-bold py-3 rounded-2xl shadow-md"
      >
        צפה בכל המוצרים
      </Button>
    </motion.div>
    </ErrorBoundary>
  );
};
