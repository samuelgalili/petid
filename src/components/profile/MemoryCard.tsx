/**
 * MemoryCard — Lifestyle section showing latest purchase + latest social post side-by-side.
 * Glassmorphism cards, floating animation, scrapbook feel.
 */
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag, Heart, ImageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MemoryCardProps {
  petId: string;
  petName: string;
}

export const MemoryCard = ({ petId, petName }: MemoryCardProps) => {
  const navigate = useNavigate();

  // Fetch latest social post by user
  const { data: latestPost } = useQuery({
    queryKey: ["memory-post", petId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("posts")
        .select("id, image_url, caption, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch latest high-safety product purchased (from orders)
  const { data: latestProduct } = useQuery({
    queryKey: ["memory-product", petId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: order } = await supabase
        .from("orders")
        .select("id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!order) return null;
      const { data: item } = await supabase
        .from("order_items")
        .select("product_name, product_image, quantity")
        .eq("order_id", order.id)
        .limit(1)
        .maybeSingle();
      return item;
    },
    staleTime: 1000 * 60 * 5,
  });

  if (!latestPost && !latestProduct) return null;

  return (
    <div className="mx-4 mb-4" dir="rtl">
      <div className="flex items-center gap-2 mb-2.5">
        <Heart className="w-4 h-4 text-primary" strokeWidth={1.5} />
        <span className="text-xs font-bold text-foreground">זכרונות של {petName}</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {/* Latest Post */}
        {latestPost && (
          <motion.button
            onClick={() => navigate(`/post/${latestPost.id}`)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, translateY: [0, -2, 0] }}
            transition={{ 
              opacity: { duration: 0.3 },
              translateY: { duration: 4, repeat: Infinity, ease: "easeInOut" },
            }}
            className="relative rounded-2xl overflow-hidden border border-border/20 bg-card/80 backdrop-blur-xl aspect-square group"
          >
            {latestPost.image_url ? (
              <img src={latestPost.image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted/40">
                <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            <div className="absolute bottom-2 right-2 left-2">
              <p className="text-[10px] font-medium text-foreground truncate">
                {latestPost.caption?.slice(0, 40) || "פוסט אחרון"}
              </p>
              <p className="text-[9px] text-muted-foreground">📸 רגע אחרון</p>
            </div>
          </motion.button>
        )}

        {/* Latest Product */}
        {latestProduct && (
          <motion.button
            onClick={() => navigate("/order-history")}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, translateY: [0, -2, 0] }}
            transition={{ 
              opacity: { duration: 0.3, delay: 0.1 },
              translateY: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 },
            }}
            className="relative rounded-2xl overflow-hidden border border-border/20 bg-card/80 backdrop-blur-xl aspect-square group"
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
              <p className="text-[9px] text-muted-foreground">🛍️ רכישה אחרונה</p>
            </div>
          </motion.button>
        )}

        {/* Fallback if only one exists */}
        {!latestPost && latestProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-dashed border-border/30 aspect-square flex flex-col items-center justify-center gap-1.5 bg-muted/20"
          >
            <Heart className="w-6 h-6 text-muted-foreground/30" />
            <span className="text-[10px] text-muted-foreground/50">שתפו רגע ראשון</span>
          </motion.div>
        )}
        {latestPost && !latestProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-dashed border-border/30 aspect-square flex flex-col items-center justify-center gap-1.5 bg-muted/20"
          >
            <ShoppingBag className="w-6 h-6 text-muted-foreground/30" />
            <span className="text-[10px] text-muted-foreground/50">גלו את החנות</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};
