/**
 * ConsultAIButton — "Is this relevant to my pet?" overlay button on feed posts
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ConsultAIButtonProps {
  postCaption: string | null;
  petName?: string;
  petBreed?: string | null;
  petType?: string;
}

export const ConsultAIButton = ({ postCaption, petName, petBreed, petType }: ConsultAIButtonProps) => {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleConsult = async () => {
    if (answer) { setOpen(true); return; }
    setOpen(true);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          messages: [
            {
              role: "user",
              content: `ראיתי פוסט בנושא: "${postCaption || "תוכן כללי על חיות מחמד"}". האם זה רלוונטי ל${petName || "החיה שלי"}? תענה בקצרה — 2 משפטים מקסימום.`,
            },
          ],
          userContext: {
            pets: [{ name: petName || "החיה", type: petType || "dog", breed: petBreed || null }],
            selectedPetName: petName || "החיה",
          },
        },
      });

      if (error) throw error;

      let text = typeof data === "string" ? data : data?.content || data?.choices?.[0]?.message?.content || "לא הצלחתי לנתח. נסה שוב.";
      // Clean tags
      text = text.replace(/\[SUGGESTIONS:[^\]]*\]/g, "").replace(/\[ACTION:[^\]]*\]/g, "").trim();
      setAnswer(text);
    } catch (err) {
      console.error("Consult AI error:", err);
      setAnswer("לא הצלחתי לנתח כרגע. נסה שוב מאוחר יותר.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={handleConsult}
        className="flex flex-col items-center gap-1"
        aria-label="שאל את PetAI"
      >
        <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)', boxShadow: '0 2px 8px rgba(139,92,246,0.4)' }}
        >
          <Sparkles className="w-[18px] h-[18px] text-white" strokeWidth={2} />
        </div>
        <span className="text-[11px] text-white font-semibold" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
          AI
        </span>
      </button>

      {/* Answer Overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-24 left-3 right-3 z-50"
          >
            <div className="bg-background/95 backdrop-blur-xl border border-border/40 rounded-2xl p-4 shadow-2xl" dir="rtl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">PetAI</span>
                </div>
                <button onClick={() => setOpen(false)} className="p-1 hover:bg-muted rounded-full">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
              {loading ? (
                <div className="flex items-center gap-2 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">מנתח רלוונטיות ל{petName}...</span>
                </div>
              ) : (
                <p className="text-sm text-foreground leading-relaxed">{answer}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
