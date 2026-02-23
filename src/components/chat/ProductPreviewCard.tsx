import { motion } from "framer-motion";
import { ShieldCheck, ExternalLink, Plus } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface ProductPreviewCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    sale_price?: number;
    image_url: string;
    safeScore?: number;
  };
  isSender?: boolean;
}

export const ProductPreviewCard = ({ product, isSender = false }: ProductPreviewCardProps) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const score = product.safeScore ?? Math.floor(Math.random() * 15 + 85);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`max-w-[75%] rounded-2xl overflow-hidden border border-border/40 shadow-sm backdrop-blur-md ${
        isSender ? "mr-0 ml-auto bg-primary/5" : "ml-0 mr-auto bg-card/70"
      }`}
    >
      {/* Image */}
      <div
        className="h-32 bg-muted/30 flex items-center justify-center p-3 relative cursor-pointer"
        onClick={() => navigate(`/product/${product.id}`)}
      >
        <OptimizedImage
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-contain"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/product/${product.id}`);
          }}
          className="absolute top-2 left-2 w-7 h-7 rounded-full bg-background/90 shadow-sm flex items-center justify-center"
        >
          <ExternalLink className="w-3.5 h-3.5 text-foreground" />
        </button>
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="text-sm font-medium text-foreground line-clamp-2 mb-2">{product.name}</h4>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-primary">
              ₪{product.sale_price || product.price}
            </span>
            {/* SafeScore badge */}
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
              <ShieldCheck className="h-3 w-3 text-green-500" />
              <span className="text-[10px] font-bold text-green-600">{score}</span>
            </div>
          </div>
          <button
            onClick={() => {
              addToCart({
                id: product.id,
                name: product.name,
                price: product.sale_price || product.price,
                image: product.image_url,
              });
              toast.success("נוסף לסל 🛒");
            }}
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center active:scale-90 transition-transform shadow-md"
          >
            <Plus className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
