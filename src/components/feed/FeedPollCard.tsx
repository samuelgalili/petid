/**
 * FeedPollCard — AI-generated interactive poll using the pet's name.
 * Injected every 5th video to boost engagement.
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Pre-defined poll templates — pet name is injected dynamically
const POLL_TEMPLATES = [
  {
    question: "גם {name} נובח/ת על המראה? 🪞",
    options: ["כל יום!", "רק לפעמים", "אף פעם", "יש לי חתול 😹"],
  },
  {
    question: "מה {name} הכי אוהב/ת? 🎾",
    options: ["משחקים בחוץ", "שינה על הספה", "אוכל!", "ללכת לטיולים"],
  },
  {
    question: "איך {name} מגיב/ה לוטרינר? 🏥",
    options: ["רועד/ת מפחד", "שקט/ה ואמיץ/ה", "מנסה לברוח", "אוהב/ת את הוטרינר"],
  },
  {
    question: "מה השעה האהובה על {name}? ⏰",
    options: ["בוקר - טיול!", "צהריים - נמנום", "ערב - משחקים", "לילה - לישון"],
  },
  {
    question: "האם {name} גונב/ת אוכל מהשולחן? 🍕",
    options: ["תמיד!", "רק כשלא רואים", "אף פעם", "אני נותן/ת לו/לה"],
  },
];

export const FeedPollCard = () => {
  const [petName, setPetName] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [votes, setVotes] = useState<number[]>([]);
  const [pollIndex, setPollIndex] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: pets } = await (supabase as any)
        .from("pets")
        .select("name")
        .eq("user_id", user.id)
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(1);

      setPetName(pets?.[0]?.name || null);
    };
    fetch();

    // Random poll
    setPollIndex(Math.floor(Math.random() * POLL_TEMPLATES.length));
    // Random initial votes
    setVotes(POLL_TEMPLATES[0].options.map(() => Math.floor(Math.random() * 50) + 10));
  }, []);

  if (!petName) return null;

  const poll = POLL_TEMPLATES[pollIndex];
  const question = poll.question.replace("{name}", petName);
  const totalVotes = votes.reduce((a, b) => a + b, 0) + (selectedOption !== null ? 1 : 0);

  const handleVote = (index: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(index);
    setVotes((prev) => prev.map((v, i) => (i === index ? v + 1 : v)));
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
        <div className="flex items-center gap-2 mb-5">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-primary" strokeWidth={1.5} />
          </div>
          <span className="text-sm font-bold text-foreground">סקר קהילתי</span>
        </div>

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
        <div className="w-full max-w-xs space-y-3">
          {poll.options.map((option, i) => {
            const isSelected = selectedOption === i;
            const percentage = selectedOption !== null ? Math.round((votes[i] / totalVotes) * 100) : 0;

            return (
              <motion.button
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i + 0.3 }}
                onClick={(e) => { e.stopPropagation(); handleVote(i); }}
                disabled={selectedOption !== null}
                className="relative w-full py-3 px-4 rounded-xl border text-sm font-semibold text-right overflow-hidden transition-all"
                style={{
                  borderColor: isSelected ? "hsl(var(--primary))" : "hsl(var(--border) / 0.4)",
                  background: isSelected ? "hsl(var(--primary) / 0.08)" : "hsl(var(--card))",
                }}
              >
                {/* Progress bar */}
                {selectedOption !== null && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                    className="absolute inset-y-0 right-0 rounded-xl"
                    style={{ background: isSelected ? "hsl(var(--primary) / 0.12)" : "hsl(var(--muted) / 0.5)" }}
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
        </div>

        {/* Vote count */}
        {selectedOption !== null && (
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
