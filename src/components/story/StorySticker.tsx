import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface StoryStickerProps {
  sticker: {
    id: string;
    sticker_type: 'poll' | 'question' | 'countdown' | 'mention' | 'location';
    position_x: number;
    position_y: number;
    data: any;
  };
  isOwner: boolean;
  onVote?: (optionIndex: number) => void;
  onAnswer?: (answer: string) => void;
}

const StorySticker: React.FC<StoryStickerProps> = ({ sticker, isOwner, onVote, onAnswer }) => {
  const { user } = useAuth();
  const [userVote, setUserVote] = useState<number | null>(null);
  const [votes, setVotes] = useState<Record<number, number>>({});
  const [answerText, setAnswerText] = useState('');
  const [timeLeft, setTimeLeft] = useState('');

  // Fetch poll votes
  useEffect(() => {
    if (sticker.sticker_type === 'poll') {
      const fetchVotes = async () => {
        const { data } = await supabase
          .from('story_poll_votes')
          .select('option_index, user_id')
          .eq('sticker_id', sticker.id);

        if (data) {
          const voteCounts: Record<number, number> = {};
          data.forEach(vote => {
            voteCounts[vote.option_index] = (voteCounts[vote.option_index] || 0) + 1;
            if (vote.user_id === user?.id) {
              setUserVote(vote.option_index);
            }
          });
          setVotes(voteCounts);
        }
      };
      fetchVotes();
    }
  }, [sticker.id, sticker.sticker_type, user?.id]);

  // Countdown timer
  useEffect(() => {
    if (sticker.sticker_type === 'countdown') {
      const updateTimer = () => {
        const endDate = new Date(sticker.data.endDate);
        const now = new Date();
        const diff = endDate.getTime() - now.getTime();

        if (diff <= 0) {
          setTimeLeft('הסתיים!');
          return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (days > 0) {
          setTimeLeft(`${days} ימים ${hours}:${minutes.toString().padStart(2, '0')}`);
        } else {
          setTimeLeft(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [sticker.sticker_type, sticker.data]);

  const handleVote = async (optionIndex: number) => {
    if (!user || userVote !== null) return;
    
    await supabase.from('story_poll_votes').insert({
      sticker_id: sticker.id,
      user_id: user.id,
      option_index: optionIndex
    });

    setUserVote(optionIndex);
    setVotes(prev => ({
      ...prev,
      [optionIndex]: (prev[optionIndex] || 0) + 1
    }));
  };

  const handleSubmitAnswer = async () => {
    if (!user || !answerText.trim()) return;

    await supabase.from('story_question_answers').insert({
      sticker_id: sticker.id,
      user_id: user.id,
      answer_text: answerText.trim()
    });

    setAnswerText('');
  };

  const getTotalVotes = () => Object.values(votes).reduce((a, b) => a + b, 0);

  const style = {
    position: 'absolute' as const,
    left: `${sticker.position_x}%`,
    top: `${sticker.position_y}%`,
    transform: 'translate(-50%, -50%)'
  };

  // Poll Sticker
  if (sticker.sticker_type === 'poll') {
    const totalVotes = getTotalVotes();
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={style}
        className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 min-w-[200px] shadow-lg"
      >
        <p className="font-bold text-center mb-3">{sticker.data.question}</p>
        <div className="space-y-2">
          {sticker.data.options.map((option: string, index: number) => {
            const voteCount = votes[index] || 0;
            const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
            const isSelected = userVote === index;

            return (
              <button
                key={index}
                onClick={() => handleVote(index)}
                disabled={userVote !== null}
                className={cn(
                  'w-full p-2 rounded-xl text-right relative overflow-hidden transition-all',
                  isSelected ? 'bg-primary/20 border-2 border-primary' : 'bg-gray-100 border-2 border-transparent',
                  userVote === null && 'hover:bg-gray-200'
                )}
              >
                {userVote !== null && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    className="absolute inset-y-0 right-0 bg-primary/20"
                  />
                )}
                <div className="relative flex justify-between items-center">
                  <span>{option}</span>
                  {userVote !== null && (
                    <span className="text-sm font-medium">{Math.round(percentage)}%</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        {totalVotes > 0 && (
          <p className="text-center text-xs text-gray-500 mt-2">
            {totalVotes} הצבעות
          </p>
        )}
      </motion.div>
    );
  }

  // Question Sticker
  if (sticker.sticker_type === 'question') {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={style}
        className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-4 min-w-[200px] shadow-lg"
      >
        <p className="text-white font-bold text-center mb-3">{sticker.data.question}</p>
        {!isOwner && (
          <div className="flex gap-2">
            <input
              type="text"
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="תשובה..."
              className="flex-1 bg-white/20 text-white placeholder-white/60 rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={handleSubmitAnswer}
              className="bg-white text-purple-600 font-medium px-3 py-2 rounded-lg text-sm"
            >
              שלח
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  // Countdown Sticker
  if (sticker.sticker_type === 'countdown') {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={style}
        className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-4 min-w-[150px] shadow-lg text-white text-center"
      >
        <p className="text-sm font-medium mb-1">{sticker.data.title}</p>
        <p className="text-2xl font-bold">{timeLeft}</p>
      </motion.div>
    );
  }

  return null;
};

export default StorySticker;
