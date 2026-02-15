/**
 * Emergency Category - First aid category button + AI crisis instructions
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface EmergencyCategoryProps {
  emoji: string;
  title: string;
  subtitle: string;
  prompt: string;
  petName: string;
  petBreed?: string | null;
  petType?: string;
}

export const EmergencyCategory = ({
  emoji,
  title,
  subtitle,
  prompt,
  petName,
  petBreed,
  petType,
}: EmergencyCategoryProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [instructions, setInstructions] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCrisisInstructions = async () => {
    if (instructions) {
      setIsOpen(!isOpen);
      return;
    }
    setIsOpen(true);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          messages: [
            {
              role: "user",
              content: `🚨 חירום: ${prompt}. תן בדיוק 3 נקודות פעולה מיידיות בזמן שאני בדרך לווטרינר. קצר וישיר.`,
            },
          ],
          userContext: {
            pets: [
              {
                name: petName,
                type: petType || "dog",
                breed: petBreed || null,
              },
            ],
            selectedPetName: petName,
          },
        },
      });

      if (error) throw error;

      // Handle streaming response
      if (typeof data === "string") {
        setInstructions(data);
      } else if (data?.content) {
        setInstructions(data.content);
      } else if (data?.role === "assistant") {
        setInstructions(data.content);
      } else {
        setInstructions(
          "1. הרגע/י את החיה.\n2. אל תנסה/י לטפל לבד.\n3. פנה/י לווטרינר חירום מיידית: *3939"
        );
      }
    } catch (err) {
      console.error("Crisis instructions error:", err);
      setInstructions(
        "1. הרגע/י את החיה ואת עצמך.\n2. אל תנסה/י לגרום להקאה ללא הנחיה.\n3. פנה/י מיידית לווטרינר חירום: *3939"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-border/30 rounded-xl overflow-hidden bg-card">
      <button
        onClick={fetchCrisisInstructions}
        className="w-full flex items-center gap-3 p-3.5 text-right hover:bg-muted/30 transition-colors"
        dir="rtl"
      >
        <span className="text-2xl flex-shrink-0">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        </div>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />
        ) : isOpen ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && instructions && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border/20" dir="rtl">
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                <p className="text-xs font-semibold text-destructive mb-2">
                  ⚡ פעולות מיידיות — בזמן שאתה בדרך לווטרינר:
                </p>
                <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                  {instructions
                    .replace(/\[SUGGESTIONS:[^\]]*\]/g, "")
                    .replace(/\[ACTION:[^\]]*\]/g, "")
                    .trim()}
                </div>
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="w-full mt-3 gap-2"
                onClick={() =>
                  (window.location.href = "tel:*3939")
                }
              >
                📞 התקשר לחירום עכשיו — *3939
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
