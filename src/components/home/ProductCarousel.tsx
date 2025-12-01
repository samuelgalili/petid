import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
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
        {/* Product 1 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.65 }}
          className="rounded-2xl overflow-hidden shadow-md"
        >
          <div className="bg-[#FFC107] p-3 flex items-center justify-center h-28">
            <img src={dogFoodImg} alt="Premium Food" className="w-full h-full object-cover rounded-lg" />
          </div>
          <div className="bg-white p-2">
            <h3 className="text-xs font-bold text-gray-900 font-jakarta truncate">Premium Food</h3>
            <p className="text-lg font-extrabold text-[#F44336]">₪27.90</p>
          </div>
        </motion.div>

        {/* Product 2 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="rounded-2xl overflow-hidden shadow-md"
        >
          <div className="bg-[#FFC107] p-3 flex items-center justify-center h-28">
            <img src={dogTreatsImg} alt="Premium Treats" className="w-full h-full object-cover rounded-lg" />
          </div>
          <div className="bg-white p-2">
            <h3 className="text-xs font-bold text-gray-900 font-jakarta truncate">Pet Treats</h3>
            <p className="text-lg font-extrabold text-[#F44336]">₪10</p>
          </div>
        </motion.div>

        {/* Promo Card 1 - Tall Yellow */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.75 }}
          className="rounded-2xl overflow-hidden shadow-lg row-span-2 bg-[#FFD700] p-4 flex flex-col items-center justify-center relative cursor-pointer"
          onClick={() => navigate('/rewards')}
        >
          <div className="absolute top-2 right-2 text-white opacity-50">
            <div className="w-2 h-2 bg-white rounded-full mb-1"></div>
            <div className="w-1 h-1 bg-white rotate-45"></div>
          </div>
          <div className="absolute top-3 right-6">
            <div className="w-1.5 h-1.5 bg-pink-500 rotate-45"></div>
          </div>
          <img src={petBedImg} alt="Summer Sale" className="w-20 h-20 object-contain mb-2" />
          <h3 className="text-sm font-extrabold text-gray-900 font-jakarta text-center">Refreshing Sale</h3>
          <p className="text-xs text-gray-700 font-jakarta mt-1">Special offers</p>
          <div className="absolute bottom-3 left-3">
            <div className="text-[#E53935] font-extrabold text-xs">petid</div>
          </div>
        </motion.div>

        {/* Row 2 - Red Products */}
        {/* Product 3 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          className="rounded-2xl overflow-hidden shadow-md"
        >
          <div className="bg-[#F44336] p-3 flex items-center justify-center h-28 relative">
            <div className="absolute top-2 left-2 bg-white text-[#F44336] text-[8px] font-bold px-2 py-0.5 rounded-full">
              SALE
            </div>
            <img src={dogToysImg} alt="Toys" className="w-full h-full object-cover rounded-lg" />
          </div>
          <div className="bg-white p-2">
            <h3 className="text-xs font-bold text-gray-900 font-jakarta truncate">Pet Toys</h3>
            <p className="text-lg font-extrabold text-[#F44336]">₪4.90</p>
          </div>
        </motion.div>

        {/* Product 4 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.85 }}
          className="rounded-2xl overflow-hidden shadow-md"
        >
          <div className="bg-[#F44336] p-3 flex items-center justify-center h-28 relative">
            <div className="absolute top-2 left-2 bg-white text-[#F44336] text-[8px] font-bold px-2 py-0.5 rounded-full">
              SALE
            </div>
            <img src={catFoodImg} alt="Cat Food" className="w-full h-full object-cover rounded-lg" />
          </div>
          <div className="bg-white p-2">
            <h3 className="text-xs font-bold text-gray-900 font-jakarta truncate">Cat Food</h3>
            <p className="text-lg font-extrabold text-[#F44336]">₪1.90</p>
          </div>
        </motion.div>

        {/* Row 3 - More Yellow Products */}
        {/* Product 5 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9 }}
          className="rounded-2xl overflow-hidden shadow-md"
        >
          <div className="bg-[#FFC107] p-3 flex items-center justify-center h-28">
            <img src={petVitaminsImg} alt="Vitamins" className="w-full h-full object-cover rounded-lg" />
          </div>
          <div className="bg-white p-2">
            <h3 className="text-xs font-bold text-gray-900 font-jakarta truncate">Pet Vitamins</h3>
            <p className="text-lg font-extrabold text-[#F44336]">₪145</p>
          </div>
        </motion.div>

        {/* Product 6 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.95 }}
          className="rounded-2xl overflow-hidden shadow-md"
        >
          <div className="bg-[#FFC107] p-3 flex items-center justify-center h-28">
            <img src={fleaTreatmentImg} alt="Flea Treatment" className="w-full h-full object-cover rounded-lg" />
          </div>
          <div className="bg-white p-2">
            <h3 className="text-xs font-bold text-gray-900 font-jakarta truncate">Healthcare</h3>
            <p className="text-lg font-extrabold text-[#F44336]">₪89</p>
          </div>
        </motion.div>

        {/* Promo Card 2 - Tall Red */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.0 }}
          className="rounded-2xl overflow-hidden shadow-lg row-span-2 bg-[#F44336] p-4 flex flex-col items-center justify-center relative cursor-pointer"
          onClick={() => navigate('/shop')}
        >
          <div className="absolute top-2 right-2 text-white opacity-50">
            <div className="w-1 h-1 bg-white rotate-45 mb-1"></div>
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
          <img src={petCollarImg} alt="Special Deal" className="w-20 h-20 object-contain mb-2" />
          <h3 className="text-sm font-extrabold text-white font-jakarta text-center">Special Deals</h3>
          <p className="text-xs text-white/90 font-jakarta mt-1">Limited time</p>
          <div className="absolute bottom-3 right-3">
            <div className="text-white font-extrabold text-xs underline decoration-2">SALE</div>
          </div>
        </motion.div>

        {/* Row 4 - More Products */}
        {/* Product 7 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.05 }}
          className="rounded-2xl overflow-hidden shadow-md"
        >
          <div className="bg-[#FFC107] p-3 flex items-center justify-center h-28">
            <img src={dogSnacksImg} alt="Snacks" className="w-full h-full object-cover rounded-lg" />
          </div>
          <div className="bg-white p-2">
            <h3 className="text-xs font-bold text-gray-900 font-jakarta truncate">Pet Snacks</h3>
            <p className="text-lg font-extrabold text-[#F44336]">₪101</p>
          </div>
        </motion.div>

        {/* Product 8 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.1 }}
          className="rounded-2xl overflow-hidden shadow-md"
        >
          <div className="bg-[#FFC107] p-3 flex items-center justify-center h-28">
            <img src={petBedImg} alt="Pet Bed" className="w-full h-full object-cover rounded-lg" />
          </div>
          <div className="bg-white p-2">
            <h3 className="text-xs font-bold text-gray-900 font-jakarta truncate">Pet Bed</h3>
            <p className="text-lg font-extrabold text-[#F44336]">₪208</p>
          </div>
        </motion.div>
      </div>

      {/* View More Button */}
      <Button
        onClick={() => navigate('/shop')}
        className="w-full mt-4 bg-[#FFD700] hover:bg-[#F4C542] text-gray-900 font-jakarta font-bold py-3 rounded-2xl shadow-md"
      >
        צפה בכל המוצרים
      </Button>
    </motion.div>
  );
};
