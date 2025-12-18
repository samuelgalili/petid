import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Tag, Check } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { useState, useRef, useEffect } from "react";

interface Product {
  id: string;
  title: string;
  price: string;
  originalPrice?: string;
  image: string;
  description?: string;
  hasSale?: boolean;
}

interface ProductPostCardProps {
  product: Product;
}

export const ProductPostCard = ({ product }: ProductPostCardProps) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [showAddedAnimation, setShowAddedAnimation] = useState(false);
  const [showCtaHighlight, setShowCtaHighlight] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Highlight CTA button after 1 second
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCtaHighlight(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleShopClick = () => {
    navigate('/shop');
  };

  const triggerConfetti = () => {
    // Get button position for origin
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;

      // Shopping bag themed confetti
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { x, y },
        colors: ['#F7BF00', '#F4B400', '#FFD700', '#FFA500', '#FF8C00'],
        shapes: ['circle', 'square'],
        gravity: 0.8,
        scalar: 0.9,
        drift: 0,
        ticks: 150,
      });

      // Second burst with different angle
      setTimeout(() => {
        confetti({
          particleCount: 30,
          spread: 80,
          origin: { x, y: y - 0.05 },
          colors: ['#F7BF00', '#FFD700', '#FFED4A', '#FFF3B0'],
          shapes: ['circle'],
          gravity: 1,
          scalar: 0.7,
          startVelocity: 25,
        });
      }, 100);
    }
  };

  const handleAddToCart = () => {
    setShowAddedAnimation(true);
    triggerConfetti();
    
    addToCart({
      id: product.id,
      name: product.title,
      price: parseFloat(product.price.replace('₪', '')),
      image: product.image,
      quantity: 1,
    });
    
    toast.success(`${product.title} נוסף לסל 🛒`);
    
    setTimeout(() => setShowAddedAnimation(false), 1500);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white border-b border-gray-100"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#F7BF00] to-[#F4B400] p-[2px]">
              <div className="w-full h-full rounded-full bg-white" />
            </div>
            <Avatar className="w-10 h-10 relative border-2 border-white">
              <AvatarImage 
                src="https://api.dicebear.com/7.x/bottts/svg?seed=petid-shop" 
                alt="Petid חנות" 
              />
              <AvatarFallback className="bg-gradient-to-tr from-[#F7BF00] to-[#F4B400] text-white">
                🛒
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-[#262626]">Petid חנות</p>
              <Badge className="bg-[#F7BF00] text-[#262626] text-[10px] px-2 py-0 h-5 border-0 font-semibold">
                חנות
              </Badge>
            </div>
            <p className="text-xs text-[#8E8E8E]">ממולץ עבורך</p>
          </div>
        </div>
      </div>

      {/* Image with CTA strip */}
      <div className="relative aspect-square overflow-hidden">
        <OptimizedImage
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover"
        />
        
        {/* Sale badge */}
        {product.hasSale && (
          <div className="absolute top-3 left-3 bg-[#C8102E] text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Tag className="w-3 h-3" />
            מבצע
          </div>
        )}

        {/* Gradient overlay at bottom */}
        <div className="absolute bottom-10 left-0 right-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent h-24 pointer-events-none" />
        
        {/* Price overlay */}
        <div className="absolute bottom-14 left-3 right-3 text-white">
          <h3 className="text-lg font-bold mb-1">{product.title}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black">{product.price}</span>
            {product.originalPrice && (
              <span className="text-sm line-through opacity-70">{product.originalPrice}</span>
            )}
          </div>
        </div>

        {/* CTA Strip at bottom of image */}
        <motion.button
          ref={buttonRef}
          onClick={handleAddToCart}
          className="absolute bottom-0 left-0 right-0 py-2.5 px-4 flex items-center justify-between cursor-pointer overflow-hidden"
          initial={{ backgroundColor: "rgba(255, 255, 255, 0)" }}
          animate={{ 
            backgroundColor: showAddedAnimation 
              ? "rgba(247, 191, 0, 0.3)" 
              : showCtaHighlight 
                ? "rgba(247, 191, 0, 0.95)" 
                : "rgba(255, 255, 255, 0)"
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-2">
            <motion.div 
              className="w-6 h-6 rounded-full flex items-center justify-center"
              animate={{ 
                backgroundColor: showCtaHighlight ? "#262626" : "#F7BF00",
                scale: showAddedAnimation ? [1, 1.3, 1] : 1,
                rotate: showAddedAnimation ? [0, 10, -10, 0] : 0
              }}
              transition={{ duration: 0.5 }}
            >
              <AnimatePresence mode="wait">
                {showAddedAnimation ? (
                  <motion.div
                    key="check"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Check className={`w-3.5 h-3.5 ${showCtaHighlight ? 'text-[#F7BF00]' : 'text-[#262626]'}`} strokeWidth={3} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="bag"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <ShoppingBag className={`w-3.5 h-3.5 ${showCtaHighlight ? 'text-[#F7BF00]' : 'text-[#262626]'}`} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            <AnimatePresence mode="wait">
              {showAddedAnimation ? (
                <motion.span 
                  key="added"
                  className="text-sm font-semibold text-[#00C853]"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  נוסף לסל! ✓
                </motion.span>
              ) : (
                <motion.span 
                  key="add"
                  className="text-sm font-bold"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    color: showCtaHighlight ? "#262626" : "#FFFFFF"
                  }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  הוסף לסל
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <motion.span 
            className="text-sm font-bold"
            animate={{ 
              scale: showAddedAnimation ? [1, 1.2, 1] : 1,
              color: showCtaHighlight ? "#262626" : "#F7BF00"
            }}
          >
            {product.price} ←
          </motion.span>
          
          {/* Success ripple effect */}
          <AnimatePresence>
            {showAddedAnimation && (
              <motion.div
                className="absolute inset-0 bg-[#F7BF00]/20"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                style={{ borderRadius: "50%", transformOrigin: "center" }}
              />
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Caption area */}
      <div className="p-3 space-y-2">
        {/* Description */}
        {product.description && (
          <p className="text-sm text-[#262626] leading-relaxed line-clamp-2" dir="rtl">
            <span className="font-semibold">Petid חנות</span>{" "}
            🛍️ {product.description}
          </p>
        )}

        {/* Hashtags */}
        <p className="text-xs text-[#0095F6]" dir="rtl">
          #חיותמחמד #מוצריםלחיות #Petid #קניות
        </p>
      </div>
    </motion.article>
  );
};