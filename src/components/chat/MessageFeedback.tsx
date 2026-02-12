import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, ThumbsDown, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MessageFeedbackProps {
  messageContent: string;
  messageIndex: number;
}

export const MessageFeedback = ({ messageContent, messageIndex }: MessageFeedbackProps) => {
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleRate = async (value: "up" | "down") => {
    setRating(value);
    if (value === "down") {
      setShowComment(true);
      return;
    }
    await submitFeedback(value, "");
  };

  const submitFeedback = async (ratingVal: "up" | "down", commentVal: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase as any).from("chat_message_feedback").insert({
        user_id: user.id,
        message_content: messageContent.substring(0, 2000),
        rating: ratingVal,
        comment: commentVal || null,
      });
      setSubmitted(true);
      setShowComment(false);
    } catch (e) {
      console.error("Feedback error:", e);
    }
  };

  if (submitted) {
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-[10px] text-muted-foreground"
      >
        תודה על המשוב! 🐾
      </motion.span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleRate("up")}
          className={`p-1 rounded-full transition-colors ${rating === "up" ? "text-primary bg-primary/10" : "text-muted-foreground/50 hover:text-muted-foreground"}`}
        >
          <ThumbsUp className="w-3 h-3" />
        </button>
        <button
          onClick={() => handleRate("down")}
          className={`p-1 rounded-full transition-colors ${rating === "down" ? "text-destructive bg-destructive/10" : "text-muted-foreground/50 hover:text-muted-foreground"}`}
        >
          <ThumbsDown className="w-3 h-3" />
        </button>
      </div>

      <AnimatePresence>
        {showComment && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1.5"
          >
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="מה אפשר לשפר?"
              className="text-xs px-2 py-1 rounded-lg border border-border/50 bg-card flex-1 min-w-0"
              dir="rtl"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") submitFeedback("down", comment);
              }}
            />
            <button
              onClick={() => submitFeedback("down", comment)}
              className="p-1 rounded-full text-primary hover:bg-primary/10 transition-colors"
            >
              <Send className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
