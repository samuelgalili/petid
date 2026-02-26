import { motion } from "framer-motion";
import { ShoppingBag, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  price?: number | null;
  sale_price?: number | null;
  image_url?: string | null;
  category?: string | null;
}

interface ChatProductCardsProps {
  products: Product[];
}

export const ChatProductCards = ({ products }: ChatProductCardsProps) => {
  const navigate = useNavigate();

  if (!products.length) return null;

  return (
    <div className="mt-3">
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {products.map((product, index) => (
          <motion.button
            key={product.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => navigate(`/product/${product.id}`)}
            className="flex-shrink-0 w-36 bg-card border border-border/40 rounded-2xl overflow-hidden text-right hover:shadow-md transition-shadow"
          >
            {product.image_url ? (
              <div className="w-full h-24 bg-muted">
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="w-full h-24 bg-muted/50 flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 text-muted-foreground/30" />
              </div>
            )}
            <div className="p-2.5">
              <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight mb-1.5">
                {product.name}
              </p>
              <div className="flex items-center gap-1.5">
                {product.sale_price ? (
                  <>
                    <span className="text-sm font-bold text-primary">₪{product.sale_price}</span>
                    <span className="text-[10px] text-muted-foreground line-through">₪{product.price}</span>
                  </>
                ) : product.price ? (
                  <span className="text-sm font-bold text-foreground">₪{product.price}</span>
                ) : null}
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Medical disclaimer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-start gap-2 mt-2.5 px-1"
        dir="rtl"
      >
        <Stethoscope className="w-3.5 h-3.5 text-muted-foreground/60 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
        <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
          המלצה בלבד — יש להתייעץ עם וטרינר לפני שינוי תזונה או תוספי מזון.
        </p>
      </motion.div>
    </div>
  );
};
