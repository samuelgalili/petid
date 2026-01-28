import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface StoryPollProps {
  pollId: string;
  question: string;
  optionA: string;
  optionB: string;
  optionACount: number;
  optionBCount: number;
  onVote?: () => void;
}

export const StoryPoll = ({ 
  pollId, 
  question, 
  optionA, 
  optionB, 
  optionACount: initialACount, 
  optionBCount: initialBCount,
  onVote 
}: StoryPollProps) => {
  const { user } = useAuth();
  const [voted, setVoted] = useState<'a' | 'b' | null>(null);
  const [optionACount, setOptionACount] = useState(initialACount);
  const [optionBCount, setOptionBCount] = useState(initialBCount);
  const [loading, setLoading] = useState(false);

  const totalVotes = optionACount + optionBCount;
  const percentA = totalVotes > 0 ? Math.round((optionACount / totalVotes) * 100) : 50;
  const percentB = totalVotes > 0 ? Math.round((optionBCount / totalVotes) * 100) : 50;

  // Check if user already voted
  useEffect(() => {
    const checkVote = async () => {
      if (!user) return;
      
      // Use any to bypass type system since types aren't updated yet
      const { data } = await (supabase
        .from("story_poll_votes") as any)
        .select("selected_option")
        .eq("poll_id", pollId)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data && data.selected_option) {
        setVoted(data.selected_option as 'a' | 'b');
      }
    };
    
    checkVote();
  }, [pollId, user]);

  const handleVote = async (option: 'a' | 'b') => {
    if (!user) {
      toast.error("יש להתחבר כדי להצביע");
      return;
    }

    if (voted) return;

    setLoading(true);
    try {
      await supabase.rpc('vote_on_poll', {
        poll_id_param: pollId,
        option_param: option
      });

      setVoted(option);
      if (option === 'a') {
        setOptionACount(prev => prev + 1);
      } else {
        setOptionBCount(prev => prev + 1);
      }
      onVote?.();
    } catch (error) {
      console.error("Vote error:", error);
      toast.error("שגיאה בהצבעה");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute bottom-32 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl" dir="rtl">
      {/* Question */}
      <p className="text-center font-bold text-lg text-neutral-900 mb-4">
        {question}
      </p>

      {/* Options */}
      <div className="space-y-2">
        {/* Option A */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => handleVote('a')}
          disabled={loading || !!voted}
          className="relative w-full h-12 rounded-xl overflow-hidden border-2 border-primary"
        >
          {voted && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentA}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute inset-y-0 right-0 bg-primary/20"
            />
          )}
          <div className="relative z-10 flex items-center justify-between px-4 h-full">
            <span className="font-medium text-neutral-900">{optionA}</span>
            {voted && (
              <span className="font-bold text-primary">{percentA}%</span>
            )}
          </div>
          {voted === 'a' && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
          )}
        </motion.button>

        {/* Option B */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => handleVote('b')}
          disabled={loading || !!voted}
          className="relative w-full h-12 rounded-xl overflow-hidden border-2 border-secondary"
        >
          {voted && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentB}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="absolute inset-y-0 right-0 bg-secondary/20"
            />
          )}
          <div className="relative z-10 flex items-center justify-between px-4 h-full">
            <span className="font-medium text-neutral-900">{optionB}</span>
            {voted && (
              <span className="font-bold text-secondary">{percentB}%</span>
            )}
          </div>
          {voted === 'b' && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-secondary rounded-full flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
          )}
        </motion.button>
      </div>

      {/* Vote count */}
      {voted && (
        <p className="text-center text-xs text-muted-foreground mt-3">
          {totalVotes} הצבעות
        </p>
      )}
    </div>
  );
};
