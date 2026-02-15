/**
 * FeedPollCard — Smart Interactive Poll with AI insights,
 * post-vote product carousel, and pet behavioral profiling.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Check, Sparkles, ShoppingBag, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// Poll templates — {name} replaced dynamically
const POLL_TEMPLATES = [
  {
    key: "mirror_bark",
    question: "גם {name} נובח/ת על המראה? 🪞",
    options: ["כל יום!", "רק לפעמים", "אף פעם", "יש לי חתול 😹"],
    productCategory: "toys",
  },
  {
    key: "favorite_activity",
    question: "מה {name} הכי אוהב/ת? 🎾",
    options: ["משחקים בחוץ", "שינה על הספה", "אוכל!", "ללכת לטיולים"],
    productCategory: "food",
  },
  {
    key: "vet_reaction",
    question: "איך {name} מגיב/ה לוטרינר? 🏥",
    options: ["רועד/ת מפחד", "שקט/ה ואמיץ/ה", "מנסה לברוח", "אוהב/ת את הוטרינר"],
    productCategory: "health",
  },
  {
    key: "favorite_time",
    question: "מה השעה האהובה על {name}? ⏰",
    options: ["בוקר - טיול!", "צהריים - נמנום", "ערב - משחקים", "לילה - לישון"],
    productCategory: "accessories",
  },
  {
    key: "food_thief",
    question: "האם {name} גונב/ת אוכל מהשולחן? 🍕",
    options: ["תמיד!", "רק כשלא רואים", "אף פעם", "אני נותן/ת לו/לה"],
    productCategory: "food",
  },
];

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
}

export const FeedPollCard = () => {
  const navigate = useNavigate();
  const [petName, setPetName] = useState<string | null>(null);
  const [petId, setPetId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [votes, setVotes] = useState<number[]>([]);
  const [pollIndex, setPollIndex] = useState(0);
  const [showProducts, setShowProducts] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [pulseIndex, setPulseIndex] = useState<number | null>(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: pets } = await (supabase as any)
        .from("pets")
        .select("id, name")
        .eq("user_id", user.id)
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(1);

      if (pets?.[0]) {
        setPetName(pets[0].name);
        setPetId(pets[0].id);
      }
    };
    init();

    const idx = Math.floor(Math.random() * POLL_TEMPLATES.length);
    setPollIndex(idx);
    setVotes(POLL_TEMPLATES[idx].options.map(() => Math.floor(Math.random() * 50) + 10));
  }, []);

  // Check if already voted
  useEffect(() => {
    if (!userId || !petId) return;
    const poll = POLL_TEMPLATES[pollIndex];
    (supabase as any)
      .from("pet_poll_votes")
      .select("selected_option")
      .eq("user_id", userId)
      .eq("pet_id", petId)
      .eq("poll_key", poll.key)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setSelectedOption(data.selected_option);
          setAlreadyVoted(true);
        }
      });
  }, [userId, petId, pollIndex]);

  const fetchProducts = useCallback(async (category: string) => {
    const { data } = await (supabase as any)
      .from("business_products")
      .select("id, name, price, image_url")
      .eq("in_stock", true)
      .ilike("category", `%${category}%`)
      .limit(6);
    setProducts(data || []);
  }, []);

  if (!petName) return null;

  const poll = POLL_TEMPLATES[pollIndex];
  const question = poll.question.replace("{name}", petName);
  const totalVotes = votes.reduce((a, b) => a + b, 0) + (selectedOption !== null && !alreadyVoted ? 1 : 0);

  const handleVote = async (index: number) => {
    if (selectedOption !== null) return;

    // Pulse animation
    setPulseIndex(index);
    setTimeout(() => setPulseIndex(null), 600);

    setSelectedOption(index);
    setVotes((prev) => prev.map((v, i) => (i === index ? v + 1 : v)));

    // Save to database
    if (userId && petId) {
      try {
        await (supabase as any).from("pet_poll_votes").upsert({
          user_id: userId,
          pet_id: petId,
          poll_key: poll.key,
          selected_option: index,
          selected_text: poll.options[index],
        }, { onConflict: "user_id,pet_id,poll_key" });
      } catch (e) {
        console.error("Poll vote save error:", e);
      }
    }

    // AI Insight toast
    toast(
      `הבנתי! אני אעדכן את החנות של ${petName} בהתאם 🧠`,
      {
        icon: <Sparkles className="w-4 h-4 text-primary" />,
        duration: 3000,
      }
    );

    // Show product carousel after delay
    await fetchProducts(poll.productCategory);
    setTimeout(() => setShowProducts(true), 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="snap-start flex-shrink-0 w-full px-4 py-4"
      style={{ minHeight: "100dvh" }}
    >
      <div className="h-full flex flex-col items-center justify-center" dir="rtl">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-primary" strokeWidth={1.5} />
          </div>
          <span className="text-sm font-bold text-foreground">סקר קהילתי</span>
        </div>

        {/* Subtitle with pet name */}
        <p className="text-xs text-muted-foreground mb-5 text-center">
          עזרו לנו ללמוד עוד על ההרגלים של {petName} 🐾
        </p>

        {/* Question */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-black text-foreground text-center mb-6 max-w-xs leading-relaxed"
        >
          {question}
        </motion.h2>

        {/* Options */}
        <AnimatePresence mode="wait">
          {!showProducts ? (
            <motion.div
              key="poll"
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xs space-y-3"
            >
              {poll.options.map((option, i) => {
                const isSelected = selectedOption === i;
                const percentage = selectedOption !== null ? Math.round((votes[i] / totalVotes) * 100) : 0;
                const isPulsing = pulseIndex === i;

                return (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      scale: isPulsing ? [1, 1.04, 1] : 1,
                    }}
                    transition={{
                      delay: 0.1 * i + 0.3,
                      scale: { duration: 0.4, ease: "easeInOut" },
                    }}
                    onClick={(e) => { e.stopPropagation(); handleVote(i); }}
                    disabled={selectedOption !== null}
                    className="relative w-full py-3 px-4 rounded-xl border text-sm font-semibold text-right overflow-hidden transition-all"
                    style={{
                      borderColor: isSelected ? "hsl(var(--primary))" : "hsl(var(--border) / 0.4)",
                      background: isSelected ? "hsl(var(--primary) / 0.08)" : "hsl(var(--card))",
                      boxShadow: isPulsing ? "0 0 20px hsl(var(--primary) / 0.3)" : "none",
                    }}
                  >
                    {/* Progress bar */}
                    {selectedOption !== null && (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                        className="absolute inset-y-0 right-0 rounded-xl"
                        style={{
                          background: isSelected
                            ? "hsl(var(--primary) / 0.12)"
                            : "hsl(var(--muted) / 0.5)",
                        }}
                      />
                    )}

                    <div className="relative flex items-center justify-between">
                      <span className="text-foreground">{option}</span>
                      {selectedOption !== null && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground font-bold">{percentage}%</span>
                          {isSelected && <Check className="w-4 h-4 text-primary" />}
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          ) : (
            /* Post-vote product carousel */
            <motion.div
              key="products"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-xs"
            >
              <div className="flex items-center gap-2 mb-3">
                <ShoppingBag className="w-4 h-4 text-primary" strokeWidth={1.5} />
                <span className="text-sm font-bold text-foreground">מומלץ עבור {petName}</span>
              </div>

              {products.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {products.map((product) => (
                    <motion.button
                      key={product.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate(`/shop/product/${product.id}`)}
                      className="flex-shrink-0 w-28 rounded-xl border border-border/40 bg-card overflow-hidden text-right"
                    >
                      <div className="w-full h-24 bg-muted">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-semibold text-foreground truncate">{product.name}</p>
                        <p className="text-xs text-primary font-bold mt-0.5">₪{product.price}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  אין מוצרים מומלצים כרגע
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Vote count */}
        {selectedOption !== null && !showProducts && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-xs text-muted-foreground mt-4"
          >
            {totalVotes} הצבעות
          </motion.p>
        )}
      </div>
    </motion.div>
  );
};
