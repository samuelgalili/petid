import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface MessageReactionsProps {
  reactions: { emoji: string; user_id: string; id: string }[];
  onAddReaction: (emoji: string) => void;
  onRemoveReaction: (reactionId: string) => void;
  currentUserId?: string;
}

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  onAddReaction,
  onRemoveReaction,
  currentUserId
}) => {
  const [open, setOpen] = useState(false);

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, typeof reactions>);

  const handleReactionClick = (emoji: string) => {
    const existingReaction = reactions.find(
      r => r.emoji === emoji && r.user_id === currentUserId
    );

    if (existingReaction) {
      onRemoveReaction(existingReaction.id);
    } else {
      onAddReaction(emoji);
    }
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Display existing reactions */}
      {Object.entries(groupedReactions).map(([emoji, emojiReactions]) => {
        const userReacted = emojiReactions.some(r => r.user_id === currentUserId);
        return (
          <motion.button
            key={emoji}
            whileTap={{ scale: 0.9 }}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
              userReacted
                ? 'bg-primary/20 border border-primary'
                : 'bg-muted border border-transparent'
            )}
            onClick={() => handleReactionClick(emoji)}
          >
            <span>{emoji}</span>
            <span className="font-medium">{emojiReactions.length}</span>
          </motion.button>
        );
      })}

      {/* Add reaction button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <SmilePlus className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="flex gap-1">
            {QUICK_REACTIONS.map(emoji => (
              <motion.button
                key={emoji}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                className="text-xl p-1 hover:bg-muted rounded"
                onClick={() => handleReactionClick(emoji)}
              >
                {emoji}
              </motion.button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default MessageReactions;
