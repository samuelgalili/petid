import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot } from "lucide-react";

interface TypingIndicatorProps {
  isAI?: boolean;
  avatarUrl?: string | null;
  avatarFallback?: string;
}

export const TypingIndicator = ({ isAI, avatarUrl, avatarFallback = "?" }: TypingIndicatorProps) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex items-end gap-2 mb-2"
  >
    {isAI ? (
      <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-accent p-[1.5px]">
        <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      </div>
    ) : (
      <Avatar className="h-7 w-7">
        <AvatarImage src={avatarUrl || undefined} />
        <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xs">
          {avatarFallback}
        </AvatarFallback>
      </Avatar>
    )}
    <div className="bg-card/70 backdrop-blur-md border border-border/40 rounded-full px-4 py-3">
      <div className="flex gap-1">
        <motion.span
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
          className="w-2 h-2 bg-muted-foreground rounded-full"
        />
        <motion.span
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
          className="w-2 h-2 bg-muted-foreground rounded-full"
        />
        <motion.span
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
          className="w-2 h-2 bg-muted-foreground rounded-full"
        />
      </div>
    </div>
  </motion.div>
);
