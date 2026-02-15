/**
 * FeedPollCard — Behavioral Data Collector (V67).
 * Generates preference tags from votes, alternates multi-pet polls,
 * and shows post-vote product carousel based on behavioral profile.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Check, Sparkles, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

/* ─── Tag mapping: each option maps to a preference tag + category ─── */
interface TagMapping {
  tag: string;
  category: string;
}

interface PollTemplate {
  key: string;
  petType: "dog" | "cat" | "both";
  question: string;
  options: string[];
  productCategory: string;
  tagMap: TagMapping[];
}

const POLL_TEMPLATES: PollTemplate[] = [
  // ── Dog polls ──
  {
    key: "favorite_activity",
    petType: "dog",
    question: "מה {name} הכי אוהב/ת? 🎾",
    options: ["משחקים בחוץ", "שינה על הספה", "אוכל!", "ללכת לטיולים"],
    productCategory: "toys",
    tagMap: [
      { tag: "High Energy", category: "energy_level" },
      { tag: "Indoor", category: "energy_level" },
      { tag: "Food Motivated", category: "motivation" },
      { tag: "Outdoor Explorer", category: "energy_level" },
    ],
  },
  {
    key: "vet_reaction",
    petType: "dog",
    question: "איך {name} מגיב/ה לוטרינר? 🏥",
    options: ["רועד/ת מפחד", "שקט/ה ואמיץ/ה", "מנסה לברוח", "אוהב/ת את הוטרינר"],
    productCategory: "health",
    tagMap: [
      { tag: "Anxiety Prone", category: "temperament" },
      { tag: "Calm Temperament", category: "temperament" },
      { tag: "Escape Artist", category: "temperament" },
      { tag: "Social", category: "temperament" },
    ],
  },
  {
    key: "favorite_time",
    petType: "dog",
    question: "מה השעה האהובה על {name}? ⏰",
    options: ["בוקר - טיול!", "צהריים - נמנום", "ערב - משחקים", "לילה - לישון"],
    productCategory: "accessories",
    tagMap: [
      { tag: "Morning Active", category: "routine" },
      { tag: "Nap Lover", category: "routine" },
      { tag: "Evening Player", category: "routine" },
      { tag: "Night Sleeper", category: "routine" },
    ],
  },
  {
    key: "food_thief",
    petType: "dog",
    question: "האם {name} גונב/ת אוכל מהשולחן? 🍕",
    options: ["תמיד!", "רק כשלא רואים", "אף פעם", "אני נותן/ת לו/לה"],
    productCategory: "food",
    tagMap: [
      { tag: "Food Obsessed", category: "motivation" },
      { tag: "Sneaky Eater", category: "motivation" },
      { tag: "Disciplined", category: "motivation" },
      { tag: "Spoiled", category: "motivation" },
    ],
  },
  {
    key: "dog_flavor",
    petType: "dog",
    question: "איזה טעם {name} הכי אוהב/ת? 🍖",
    options: ["עוף", "בקר", "דגים", "טלה"],
    productCategory: "food",
    tagMap: [
      { tag: "Prefers Chicken", category: "food_preference" },
      { tag: "Prefers Beef", category: "food_preference" },
      { tag: "Prefers Fish", category: "food_preference" },
      { tag: "Prefers Lamb", category: "food_preference" },
    ],
  },
  // ── Cat polls ──
  {
    key: "cat_nap_spot",
    petType: "cat",
    question: "איפה {name} הכי אוהב/ת לישון? 😴",
    options: ["על המיטה שלי", "בקופסה", "על החלון", "על הרצפה"],
    productCategory: "accessories",
    tagMap: [
      { tag: "Bed Sleeper", category: "routine" },
      { tag: "Box Lover", category: "routine" },
      { tag: "Window Watcher", category: "routine" },
      { tag: "Floor Dweller", category: "routine" },
    ],
  },
  {
    key: "cat_play",
    petType: "cat",
    question: "מה הצעצוע האהוב על {name}? 🐭",
    options: ["עכבר צעצוע", "כדור עם פעמון", "נוצה על חוט", "קופסת קרטון"],
    productCategory: "toys",
    tagMap: [
      { tag: "Hunter Instinct", category: "play_style" },
      { tag: "Sound Motivated", category: "play_style" },
      { tag: "Feather Chaser", category: "play_style" },
      { tag: "Box Explorer", category: "play_style" },
    ],
  },
  {
    key: "cat_flavor",
    petType: "cat",
    question: "איזה טעם {name} מעדיפ/ה? 🐟",
    options: ["טונה", "עוף", "סלמון", "בקר"],
    productCategory: "food",
    tagMap: [
      { tag: "Prefers Tuna", category: "food_preference" },
      { tag: "Prefers Chicken", category: "food_preference" },
      { tag: "Prefers Salmon", category: "food_preference" },
      { tag: "Prefers Beef", category: "food_preference" },
    ],
  },
  // ── Both ──
  {
    key: "mirror_bark",
    petType: "both",
    question: "גם {name} מגיב/ה למראה? 🪞",
    options: ["כל יום!", "רק לפעמים", "אף פעם", "לא מעניין אותו/ה"],
    productCategory: "toys",
    tagMap: [
      { tag: "Self Aware", category: "behavior" },
      { tag: "Curious", category: "behavior" },
      { tag: "Indifferent", category: "behavior" },
      { tag: "Calm", category: "behavior" },
    ],
  },
];

/* ─── Types ─── */
interface Pet {
  id: string;
  name: string;
  pet_type: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
}

/* ─── Helpers ─── */
const getPollsForPet = (petType: string): PollTemplate[] => {
  const type = petType?.toLowerCase().includes("cat") ? "cat" : "dog";
  return POLL_TEMPLATES.filter((p) => p.petType === type || p.petType === "both");
};

const getStoredPetIndex = (): number => {
  try {
    return parseInt(localStorage.getItem("petid_poll_pet_idx") || "0", 10);
  } catch {
    return 0;
  }
};

export const FeedPollCard = () => {
  const navigate = useNavigate();
  const [pets, setPets] = useState<Pet[]>([]);
  const [activePet, setActivePet] = useState<Pet | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [votes, setVotes] = useState<number[]>([]);
  const [poll, setPoll] = useState<PollTemplate | null>(null);
  const [showProducts, setShowProducts] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [pulseIndex, setPulseIndex] = useState<number | null>(null);

  // ── Init: load all pets, alternate active pet ──
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: userPets } = await (supabase as any)
        .from("pets")
        .select("id, name, pet_type")
        .eq("user_id", user.id)
        .eq("archived", false)
        .order("created_at", { ascending: false });

      if (!userPets?.length) return;
      setPets(userPets);

      // Multi-pet alternation via localStorage index
      const idx = getStoredPetIndex() % userPets.length;
      const pet = userPets[idx];
      setActivePet(pet);

      // Advance index for next render
      localStorage.setItem("petid_poll_pet_idx", String(idx + 1));

      // Pick a random species-appropriate poll
      const available = getPollsForPet(pet.pet_type);
      const randomPoll = available[Math.floor(Math.random() * available.length)];
      setPoll(randomPoll);
      setVotes(randomPoll.options.map(() => Math.floor(Math.random() * 50) + 10));

      // Check if already voted
      const { data: existingVote } = await (supabase as any)
        .from("pet_poll_votes")
        .select("selected_option")
        .eq("user_id", user.id)
        .eq("pet_id", pet.id)
        .eq("poll_key", randomPoll.key)
        .maybeSingle();

      if (existingVote) {
        setSelectedOption(existingVote.selected_option);
      }
    };
    init();
  }, []);

  const fetchProducts = useCallback(async (category: string) => {
    const { data } = await (supabase as any)
      .from("business_products")
      .select("id, name, price, image_url")
      .eq("in_stock", true)
      .ilike("category", `%${category}%`)
      .limit(6);
    setProducts(data || []);
  }, []);

  if (!activePet || !poll) return null;

  const question = poll.question.replace("{name}", activePet.name);
  const totalVotes = votes.reduce((a, b) => a + b, 0) + (selectedOption !== null ? 1 : 0);

  const handleVote = async (index: number) => {
    if (selectedOption !== null) return;

    // Pulse
    setPulseIndex(index);
    setTimeout(() => setPulseIndex(null), 600);

    setSelectedOption(index);
    setVotes((prev) => prev.map((v, i) => (i === index ? v + 1 : v)));

    if (!userId || !activePet) return;

    // 1. Save vote
    try {
      await (supabase as any).from("pet_poll_votes").upsert(
        {
          user_id: userId,
          pet_id: activePet.id,
          poll_key: poll.key,
          selected_option: index,
          selected_text: poll.options[index],
          pet_type: activePet.pet_type,
        },
        { onConflict: "user_id,pet_id,poll_key" }
      );
    } catch (e) {
      console.error("Poll vote save error:", e);
    }

    // 2. Save behavioral preference tag
    const tagMapping = poll.tagMap[index];
    if (tagMapping) {
      try {
        await (supabase as any).from("pet_preference_tags").upsert(
          {
            pet_id: activePet.id,
            user_id: userId,
            tag: tagMapping.tag,
            category: tagMapping.category,
            source_poll_key: poll.key,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "pet_id,category,source_poll_key" }
        );
      } catch (e) {
        console.error("Tag save error:", e);
      }
    }

    // 3. AI Insight toast
    toast(`הבנתי! אני אעדכן את החנות של ${activePet.name} בהתאם 🧠`, {
      icon: <Sparkles className="w-4 h-4 text-primary" />,
      duration: 3000,
    });

    // 4. Post-vote product carousel
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
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-primary" strokeWidth={1.5} />
          </div>
          <span className="text-sm font-bold text-foreground">סקר קהילתי</span>
        </div>

        {/* Pet-name subtitle */}
        <p className="text-xs text-muted-foreground mb-5 text-center">
          עזרו לנו ללמוד עוד על ההרגלים של {activePet.name} 🐾
        </p>

        {/* Multi-pet indicator */}
        {pets.length > 1 && (
          <div className="flex items-center gap-1.5 mb-4">
            {pets.map((p) => (
              <span
                key={p.id}
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-all ${
                  p.id === activePet.id
                    ? "bg-primary/15 text-primary"
                    : "bg-muted/50 text-muted-foreground"
                }`}
              >
                {p.name}
              </span>
            ))}
          </div>
        )}

        {/* Question */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl font-black text-foreground text-center mb-6 max-w-xs leading-relaxed"
        >
          {question}
        </motion.h2>

        {/* Poll options / Products */}
        <AnimatePresence mode="wait">
          {!showProducts ? (
            <motion.div
              key="poll"
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xs space-y-3"
            >
              {poll.options.map((option, i) => {
                const isSelected = selectedOption === i;
                const percentage =
                  selectedOption !== null ? Math.round((votes[i] / totalVotes) * 100) : 0;
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVote(i);
                    }}
                    disabled={selectedOption !== null}
                    className="relative w-full py-3 px-4 rounded-xl border text-sm font-semibold text-right overflow-hidden transition-all"
                    style={{
                      borderColor: isSelected
                        ? "hsl(var(--primary))"
                        : "hsl(var(--border) / 0.4)",
                      background: isSelected
                        ? "hsl(var(--primary) / 0.08)"
                        : "hsl(var(--card))",
                      boxShadow: isPulsing
                        ? "0 0 20px hsl(var(--primary) / 0.3)"
                        : "none",
                    }}
                  >
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
                          <span className="text-xs text-muted-foreground font-bold">
                            {percentage}%
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-primary" />}
                        </div>
                      )}
                    </div>
                  </motion.button>
                );
              })}

              {/* Tag preview after voting */}
              {selectedOption !== null && poll.tagMap[selectedOption] && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center justify-center gap-1.5 mt-2"
                >
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className="text-[11px] text-primary font-medium">
                    +{poll.tagMap[selectedOption].tag}
                  </span>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="products"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-xs"
            >
              <div className="flex items-center gap-2 mb-3">
                <ShoppingBag className="w-4 h-4 text-primary" strokeWidth={1.5} />
                <span className="text-sm font-bold text-foreground">
                  מומלץ עבור {activePet.name}
                </span>
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
                        <p className="text-xs font-semibold text-foreground truncate">
                          {product.name}
                        </p>
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
