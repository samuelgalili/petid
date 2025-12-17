import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ProductCard, PromoCard } from "./ProductCard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ComponentErrorFallback } from "@/components/ComponentErrorFallback";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { Gift, Tag, Percent } from "lucide-react";
import dogFoodImg from "@/assets/products/dog-food.jpg";
import dogTreatsImg from "@/assets/products/dog-treats.jpg";
import dogToysImg from "@/assets/products/dog-toys.jpg";
import catFoodImg from "@/assets/products/cat-food.jpg";
import petVitaminsImg from "@/assets/products/pet-vitamins.jpg";
import fleaTreatmentImg from "@/assets/products/flea-treatment.jpg";
import dogSnacksImg from "@/assets/products/dog-snacks.jpg";
import petBedImg from "@/assets/products/pet-bed.jpg";

const products = [
  { id: "1", image: dogFoodImg, title: "מזון פרימיום", price: "₪27.90", originalPrice: "₪34.90", hasSale: true },
  { id: "2", image: dogTreatsImg, title: "חטיפים לכלבים", price: "₪19.90" },
  { id: "3", image: dogToysImg, title: "צעצועים", price: "₪14.90", originalPrice: "₪24.90", hasSale: true },
  { id: "4", image: catFoodImg, title: "מזון לחתולים", price: "₪21.90" },
  { id: "5", image: petVitaminsImg, title: "ויטמינים", price: "₪45.00" },
  { id: "6", image: fleaTreatmentImg, title: "טיפול פרעושים", price: "₪89.00" },
  { id: "7", image: dogSnacksImg, title: "חטיפי בריאות", price: "₪32.00" },
  { id: "8", image: petBedImg, title: "מיטה מפנקת", price: "₪208.00", originalPrice: "₪259.00", hasSale: true },
];

export const ProductCarousel = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const handleAddToCart = (product: typeof products[0]) => {
    addToCart({
      id: product.id,
      name: product.title,
      price: parseFloat(product.price.replace('₪', '')),
      image: product.image,
    });
    toast.success(`${product.title} נוסף לעגלה`);
  };

  return (
    <ErrorBoundary
      fallback={<ComponentErrorFallback componentName="מוצרים מומלצים" />}
      onReset={() => window.location.reload()}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6 px-4"
      >
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-foreground font-jakarta">מוצרים מומלצים</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/shop')}
            className="text-icon-blue hover:text-icon-blue-dark font-jakarta text-sm font-bold p-0 h-auto"
          >
            לכל המוצרים ←
          </Button>
        </div>

        {/* Products Grid - Yellow Style */}
        <div className="grid grid-cols-3 gap-3">
          {/* First row - 2 products + promo */}
          <ProductCard
            image={products[0].image}
            title={products[0].title}
            price={products[0].price}
            originalPrice={products[0].originalPrice}
            index={0}
            hasSaleBadge={products[0].hasSale}
            onClick={() => navigate('/shop')}
            onAddToCart={() => handleAddToCart(products[0])}
          />
          
          <ProductCard
            image={products[1].image}
            title={products[1].title}
            price={products[1].price}
            index={1}
            onClick={() => navigate('/shop')}
            onAddToCart={() => handleAddToCart(products[1])}
          />

          <PromoCard
            title="מבצעי השבוע"
            subtitle="עד 50% הנחה"
            bgColor="yellow"
            index={0}
            icon={<Tag className="w-8 h-8 text-neutral-dark" />}
            onClick={() => navigate('/deals')}
          />

          {/* Second row - 2 products */}
          <ProductCard
            image={products[2].image}
            title={products[2].title}
            price={products[2].price}
            originalPrice={products[2].originalPrice}
            index={2}
            hasSaleBadge={products[2].hasSale}
            onClick={() => navigate('/shop')}
            onAddToCart={() => handleAddToCart(products[2])}
          />
          
          <ProductCard
            image={products[3].image}
            title={products[3].title}
            price={products[3].price}
            index={3}
            onClick={() => navigate('/shop')}
            onAddToCart={() => handleAddToCart(products[3])}
          />

          {/* Third row - 2 products + promo */}
          <ProductCard
            image={products[4].image}
            title={products[4].title}
            price={products[4].price}
            index={4}
            onClick={() => navigate('/shop')}
            onAddToCart={() => handleAddToCart(products[4])}
          />
          
          <ProductCard
            image={products[5].image}
            title={products[5].title}
            price={products[5].price}
            index={5}
            onClick={() => navigate('/shop')}
            onAddToCart={() => handleAddToCart(products[5])}
          />

          <PromoCard
            title="הטבות מועדון"
            subtitle="בלעדי לחברים"
            bgColor="red"
            index={1}
            icon={<Gift className="w-8 h-8 text-white" />}
            onClick={() => navigate('/rewards')}
          />

          {/* Fourth row - 2 more products */}
          <ProductCard
            image={products[6].image}
            title={products[6].title}
            price={products[6].price}
            index={6}
            onClick={() => navigate('/shop')}
            onAddToCart={() => handleAddToCart(products[6])}
          />
          
          <ProductCard
            image={products[7].image}
            title={products[7].title}
            price={products[7].price}
            originalPrice={products[7].originalPrice}
            index={7}
            hasSaleBadge={products[7].hasSale}
            onClick={() => navigate('/shop')}
            onAddToCart={() => handleAddToCart(products[7])}
          />
        </div>

        {/* CTA Button */}
        <Button
          onClick={() => navigate('/shop')}
          className="w-full mt-4 btn-primary font-jakarta font-bold py-3 rounded-2xl"
        >
          צפה בכל המוצרים
        </Button>
      </motion.div>
    </ErrorBoundary>
  );
};
