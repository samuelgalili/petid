import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Tag, Check, Heart, Eye, Sparkles, Star } from "lucide-react";
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
  const [isHovered, setIsHovered] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Highlight CTA button after 1 second
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCtaHighlight(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    setIsHovered(true);
    hoverTimeoutRef.current = setTimeout(() => {
      setShowQuickActions(true);
    }, 800);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setShowQuickActions(false);
  };

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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <motion.div 
            className="relative"
            animate={{ scale: isHovered ? 1.05 : 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-petid-gold to-amber-500 p-[2px]">
              <div className="w-full h-full rounded-full bg-white" />
            </div>
            <Avatar className="w-10 h-10 relative border-2 border-white">
              <AvatarImage 
                src="https://api.dicebear.com/7.x/bottts/svg?seed=petid-shop" 
                alt="Petid חנות" 
              />
              <AvatarFallback className="bg-gradient-to-tr from-petid-gold to-amber-500 text-white">
                🛒
              </AvatarFallback>
            </Avatar>
          </motion.div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-foreground">Petid חנות</p>
              <Badge className="bg-petid-gold/20 text-petid-blue-dark text-[10px] px-2 py-0 h-5 border-0 font-semibold">
                חנות
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">ממולץ עבורך</p>
          </div>
        </div>
      </div>

      {/* Image with CTA strip */}
      <motion.div 
        className="relative aspect-[3/4] overflow-hidden cursor-pointer"
        animate={{ scale: isHovered ? 1.02 : 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="w-full h-full"
          animate={{ scale: isHovered ? 1.08 : 1 }}
          transition={{ duration: 0.4 }}
        >
          <OptimizedImage
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        </motion.div>
        
        {/* Hover overlay with blur */}
        <motion.div
          className="absolute inset-0 bg-black/10 backdrop-blur-[1px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        />
        
        {/* Sale badge with animation */}
        {product.hasSale && (
          <motion.div 
            className="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg"
            initial={{ scale: 0, rotate: -20 }}
            animate={{ 
              scale: 1, 
              rotate: 0,
              boxShadow: isHovered ? "0 8px 24px rgba(239, 68, 68, 0.4)" : "0 4px 12px rgba(239, 68, 68, 0.2)"
            }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Tag className="w-3 h-3" />
            מבצע חם!
          </motion.div>
        )}

        {/* Quick action buttons - appear on hover after delay */}
        <AnimatePresence>
          {showQuickActions && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-3 right-3 flex flex-col gap-2"
            >
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLiked(!isLiked);
                  if (!isLiked) toast.success("נוסף למועדפים ❤️");
                }}
                className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0 }}
              >
                <Heart 
                  className={`w-5 h-5 transition-colors ${isLiked ? 'text-red-500 fill-red-500' : 'text-gray-700'}`} 
                />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/product/${product.id}`);
                }}
                className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Eye className="w-5 h-5 text-gray-700" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rating badge */}
        <motion.div
          className="absolute top-3 right-3"
          initial={{ opacity: 1 }}
          animate={{ opacity: showQuickActions ? 0 : 1 }}
        >
          <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm">
            <Star className="w-3.5 h-3.5 text-petid-gold fill-petid-gold" />
            <span className="text-xs font-semibold text-foreground">4.8</span>
          </div>
        </motion.div>

        {/* Gradient overlay at bottom */}
        <div className="absolute bottom-10 left-0 right-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent h-32 pointer-events-none" />
        
        {/* Price overlay with enhanced styling */}
        <motion.div 
          className="absolute bottom-14 left-3 right-3 text-white"
          animate={{ y: isHovered ? -5 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.h3 
            className="text-lg font-bold mb-1"
            animate={{ scale: isHovered ? 1.02 : 1 }}
          >
            {product.title}
          </motion.h3>
          <div className="flex items-baseline gap-2">
            <motion.span 
              className="text-xl font-black"
              animate={{ 
                scale: isHovered ? 1.1 : 1,
                textShadow: isHovered ? "0 2px 10px rgba(247, 191, 0, 0.5)" : "none"
              }}
            >
              {product.price}
            </motion.span>
            {product.originalPrice && (
              <motion.span 
                className="text-sm line-through opacity-70"
                animate={{ x: isHovered ? 5 : 0 }}
              >
                {product.originalPrice}
              </motion.span>
            )}
            {product.hasSale && (
              <motion.span
                className="text-xs bg-petid-gold text-petid-blue-dark px-2 py-0.5 rounded-full font-bold"
                initial={{ scale: 0 }}
                animate={{ scale: isHovered ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                חסכון!
              </motion.span>
            )}
          </div>
        </motion.div>

        {/* Sparkle effect on hover */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
            >
              <Sparkles className="w-8 h-8 text-white/30" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA Strip at bottom of image */}
        <motion.button
          ref={buttonRef}
          onClick={handleAddToCart}
          className="absolute bottom-3 left-3 right-3 py-3 px-4 flex items-center justify-between cursor-pointer overflow-hidden rounded-2xl backdrop-blur-md"
          initial={{ backgroundColor: "rgba(0, 0, 0, 0.4)", scale: 0.95, opacity: 0 }}
          animate={{ 
            backgroundColor: showAddedAnimation 
              ? "rgba(0, 200, 83, 0.95)" 
              : showCtaHighlight 
                ? "rgba(247, 191, 0, 1)" 
                : "rgba(0, 0, 0, 0.5)",
            scale: 1,
            opacity: 1,
            boxShadow: showCtaHighlight 
              ? "0 8px 32px rgba(247, 191, 0, 0.4)" 
              : "0 4px 16px rgba(0, 0, 0, 0.2)"
          }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-3">
            <motion.div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              animate={{ 
                backgroundColor: showCtaHighlight ? "#262626" : "rgba(255, 255, 255, 0.2)",
                scale: showAddedAnimation ? [1, 1.2, 1] : showCtaHighlight ? [1, 1.05, 1] : 1,
                rotate: showAddedAnimation ? [0, 10, -10, 0] : 0
              }}
              transition={{ 
                duration: showCtaHighlight ? 2 : 0.5,
                repeat: showCtaHighlight && !showAddedAnimation ? Infinity : 0,
                repeatType: "reverse"
              }}
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
                    <Check className="w-5 h-5 text-white" strokeWidth={3} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="bag"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <ShoppingBag className={`w-5 h-5 ${showCtaHighlight ? 'text-[#F7BF00]' : 'text-white'}`} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            <div className="flex flex-col items-start">
              <AnimatePresence mode="wait">
                {showAddedAnimation ? (
                  <motion.span 
                    key="added"
                    className="text-base font-bold text-white"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    נוסף לסל! ✓
                  </motion.span>
                ) : (
                  <motion.span 
                    key="add"
                    className="text-base font-bold"
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
              <motion.span 
                className="text-xs"
                animate={{ 
                  color: showCtaHighlight ? "rgba(38, 38, 38, 0.7)" : "rgba(255, 255, 255, 0.7)"
                }}
              >
                משלוח מהיר
              </motion.span>
            </div>
          </div>
          <motion.div 
            className="flex items-center gap-1"
            animate={{ 
              scale: showAddedAnimation ? [1, 1.2, 1] : 1,
            }}
          >
            <motion.span 
              className="text-xl font-black"
              animate={{ 
                color: showCtaHighlight ? "#262626" : "#FFFFFF"
              }}
            >
              {product.price}
            </motion.span>
            <motion.span
              className="text-lg"
              animate={{
                x: showCtaHighlight ? [0, -4, 0] : 0,
                color: showCtaHighlight ? "#262626" : "#FFFFFF"
              }}
              transition={{
                duration: 1,
                repeat: showCtaHighlight ? Infinity : 0,
                repeatType: "reverse"
              }}
            >
              ←
            </motion.span>
          </motion.div>
          
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
      </motion.div>

      {/* Caption area */}
      <motion.div 
        className="p-3 space-y-2"
        animate={{ backgroundColor: isHovered ? "rgba(247, 191, 0, 0.05)" : "transparent" }}
        transition={{ duration: 0.2 }}
      >
        {/* Description */}
        {product.description && (
          <p className="text-sm text-foreground leading-relaxed line-clamp-2" dir="rtl">
            <span className="font-semibold">Petid חנות</span>{" "}
            🛍️ {product.description}
          </p>
        )}

        {/* Hashtags */}
        <p className="text-xs text-petid-blue" dir="rtl">
          #חיותמחמד #מוצריםלחיות #Petid #קניות
        </p>
      </motion.div>
    </motion.article>
  );
};