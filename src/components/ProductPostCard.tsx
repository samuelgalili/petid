import { motion } from "framer-motion";
import { ShoppingBag, Heart, MessageCircle, Send, Bookmark, MoreVertical, Tag, ChevronLeft } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { useState } from "react";

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
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showAdded, setShowAdded] = useState(false);

  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.title,
      price: parseFloat(product.price.replace('₪', '')),
      image: product.image,
      quantity: 1,
    });
    setShowAdded(true);
    toast.success(`${product.title} נוסף לסל 🛒`);
    setTimeout(() => setShowAdded(false), 1500);
  };

  return (
    <article className="bg-card rounded-2xl shadow-card mx-2 my-1 overflow-hidden border border-border/20 dark:border-border/10">
      {/* Header - Instagram style */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8 ring-[1.5px] ring-blue-500 ring-offset-[1.5px] ring-offset-white">
            <AvatarImage src="https://api.dicebear.com/7.x/bottts/svg?seed=petid-shop" />
            <AvatarFallback className="bg-gradient-to-tr from-petid-blue to-petid-gold text-white text-xs">
              🛒
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-900 text-[14px]">Petid חנות</span>
            <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0 h-4 border-0 font-medium">
              חנות
            </Badge>
          </div>
        </div>
        <button className="text-neutral-900 p-1 -m-1 focus:outline-none">
          <MoreVertical className="w-6 h-6" strokeWidth={1.25} />
        </button>
      </div>

      {/* Image - Instagram style square */}
      <div className="relative aspect-square">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
        />
        
        {/* Sale badge */}
        {product.hasSale && (
          <div className="absolute top-3 left-3 bg-[#ED4956] text-white text-[12px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
            <Tag className="w-3.5 h-3.5" />
            מבצע
          </div>
        )}
        
        {/* Subtle gradient at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent h-28 pointer-events-none" />
        
        {/* Product info overlay */}
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <h3 className="text-xl font-bold tracking-tight">{product.title}</h3>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-lg font-bold tabular-nums">{product.price}</span>
            {product.originalPrice && (
              <span className="text-[14px] line-through opacity-75 tabular-nums">{product.originalPrice}</span>
            )}
          </div>
        </div>
      </div>

      {/* CTA Button - Between image and actions */}
      <motion.button
        onClick={handleAddToCart}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className={`w-full transition-all flex items-center justify-between px-4 py-3.5 active:opacity-80 ${
          showAdded 
            ? 'bg-success' 
            : 'bg-primary'
        }`}
      >
        <motion.div animate={showAdded ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.3 }}>
          <ShoppingBag className="w-5 h-5 text-primary-foreground" />
        </motion.div>
        <div className="flex items-center gap-2">
          <span className="text-primary-foreground text-[15px] font-semibold">
            {showAdded ? "נוסף לסל ✓" : "לרכישה"}
          </span>
          <motion.div animate={{ x: [0, -4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <ChevronLeft className="w-5 h-5 text-primary-foreground" />
          </motion.div>
        </div>
      </motion.button>

      {/* Actions - Instagram style */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className="p-0.5 active:opacity-50 transition-opacity focus:outline-none"
            >
              <Heart className={`w-7 h-7 ${isLiked ? 'fill-[#ED4956] text-[#ED4956]' : 'text-neutral-900'}`} strokeWidth={1.25} />
            </button>
            <button className="p-0.5 active:opacity-50 transition-opacity focus:outline-none" onClick={() => navigate(`/product/${product.id}`)}>
              <MessageCircle className="w-7 h-7 text-neutral-900" strokeWidth={1.25} />
            </button>
            <button className="p-0.5 active:opacity-50 transition-opacity focus:outline-none">
              <Send className="w-7 h-7 text-neutral-900" strokeWidth={1.25} />
            </button>
          </div>
          <button
            onClick={() => setIsSaved(!isSaved)}
            className="p-0.5 active:opacity-50 transition-opacity focus:outline-none"
          >
            <Bookmark className={`w-7 h-7 ${isSaved ? 'fill-neutral-900' : ''} text-neutral-900`} strokeWidth={1.25} />
          </button>
        </div>

        {/* Caption - Instagram style */}
        <div className="space-y-1.5 pb-3">
          <p className="text-neutral-900 text-[14px] leading-[1.35]">
            <span className="font-bold">Petid חנות</span>{" "}
            🛍️ {product.description || product.title}
          </p>
          
          {/* Tags */}
          <p className="text-[#0095F6] text-[13px]">
            #חיותמחמד #מוצריםלחיות #Petid
          </p>

          {/* Time */}
          <p className="text-neutral-400 text-[11px] pt-0.5">
            ממומן
          </p>
        </div>
      </div>

    </article>
  );
};