/**
 * MemoryCard — Lifestyle section showing latest purchase.
 * Glassmorphism cards, floating animation, scrapbook feel.
 */
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, getShopOrders } from "@/lib/mipoApi";

interface MemoryCardProps {
  petId: string;
  petName: string;
}

export const MemoryCard = ({ petId, petName }: MemoryCardProps) => {
  const navigate = useNavigate();

  const { data: latestProduct } = useQuery({
    queryKey: ["memory-product", petId],
    queryFn: async () => {
      const auth = await getCurrentUser();
      const email = auth?.user.email || auth?.profile?.email;
      if (!email) return null;
      const orders = await getShopOrders({ email });
      const latestOrder = orders[0];
      return latestOrder?.items?.[0] || latestOrder?.order_items?.[0] || null;
    },
    staleTime: 1000 * 60 * 5,
  });

  if (!latestProduct) return null;

  return (
    <div className="mx-4 mb-4" dir="rtl">
      <div className="flex items-center gap-2 mb-2.5">
        <Heart className="w-4 h-4 text-primary" strokeWidth={1.5} />
        <span className="text-xs font-bold text-foreground">זכרונות של {petName}</span>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        <motion.button
          onClick={() => navigate("/order-history")}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, translateY: [0, -2, 0] }}
          transition={{
            opacity: { duration: 0.3, delay: 0.1 },
            translateY: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
          }}
          className="relative rounded-2xl overflow-hidden border border-border/20 bg-card/80 backdrop-blur-xl aspect-[2/1] group"
        >
          {latestProduct.product_image ? (
            <img src={latestProduct.product_image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/40">
              <ShoppingBag className="w-8 h-8 text-muted-foreground/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <div className="absolute bottom-2 right-2 left-2">
            <p className="text-[10px] font-medium text-foreground truncate">
              {latestProduct.product_name || "מוצר אחרון"}
            </p>
            <p className="text-[9px] text-muted-foreground">רכישה אחרונה</p>
          </div>
        </motion.button>
      </div>
    </div>
  );
};
