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
    <motion.article
      className="bg-white border-b border-[#DBDBDB]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header - Instagram style */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2.5">
          <Avatar className="w-8 h-8 ring-2 ring-gradient-to-tr from-petid-blue to-petid-gold ring-offset-2">
            <AvatarImage src="https://api.dicebear.com/7.x/bottts/svg?seed=petid-shop" />
            <AvatarFallback className="bg-gradient-to-tr from-petid-blue to-petid-gold text-white text-xs">
              🛒
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-[#262626] text-sm">Petid חנות</p>
              <Badge className="bg-petid-blue/20 text-petid-blue-dark text-[10px] px-1.5 py-0 h-4 border-0">
                חנות
              </Badge>
            </div>
          </div>
        </div>
        <button className="text-[#262626]">
          <MoreVertical className="w-5 h-5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Image - Instagram style square */}
      <div className="relative aspect-square">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover"
        />
        
        {/* Sale badge */}
        {product.hasSale && (
          <div className="absolute top-3 left-3 bg-[#ED4956] text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
            <Tag className="w-3 h-3" />
            מבצע
          </div>
        )}
        
        {/* Subtle gradient at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent h-24 pointer-events-none" />
        
        {/* Product info overlay */}
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <h3 className="text-lg font-bold">{product.title}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold">{product.price}</span>
            {product.originalPrice && (
              <span className="text-sm line-through opacity-70">{product.originalPrice}</span>
            )}
          </div>
        </div>
      </div>

      {/* CTA Button - Between image and actions */}
      <button
        onClick={handleAddToCart}
        className={`w-full transition-all flex items-center justify-between px-4 py-3.5 ${
          showAdded 
            ? 'bg-[#00C853]' 
            : 'bg-gradient-to-r from-[#0095F6] to-[#1877F2] hover:from-[#1877F2] hover:to-[#0095F6]'
        }`}
      >
        <div className="flex items-center gap-2">
          <ChevronLeft className="w-5 h-5 text-white" />
          <span className="text-white text-[15px] font-bold tracking-wide">
            {showAdded ? "נוסף לסל ✓" : `קנה עכשיו • ${product.price}`}
          </span>
        </div>
        <ShoppingBag className="w-5 h-5 text-white" />
      </button>

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
            <button className="p-1" onClick={() => navigate(`/product/${product.id}`)}>
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

        {/* Caption - Instagram style */}
        <div className="space-y-1 pb-3">
          <p className="text-[#262626] text-sm">
            <span className="font-semibold">Petid חנות</span>{" "}
            🛍️ {product.description || product.title}
          </p>
          
          {/* Tags */}
          <p className="text-[#0095F6] text-xs">
            #חיותמחמד #מוצריםלחיות #Petid
          </p>

          {/* Time */}
          <p className="text-[#8E8E8E] text-[10px] uppercase pt-1">
            ממומן
          </p>
        </div>
      </div>
    </motion.article>
  );
};