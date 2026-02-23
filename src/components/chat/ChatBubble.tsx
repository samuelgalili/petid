import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, Check } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { he } from "date-fns/locale";

interface ChatBubbleProps {
  content: string;
  isSender: boolean;
  showAvatar: boolean;
  avatarUrl?: string | null;
  avatarFallback?: string;
  isAI?: boolean;
  isRead?: boolean;
  timestamp?: string;
  isLastInGroup?: boolean;
  index?: number;
}

export const ChatBubble = ({
  content,
  isSender,
  showAvatar,
  avatarUrl,
  avatarFallback = "?",
  isAI,
  isRead,
  timestamp,
  isLastInGroup,
  index = 0,
}: ChatBubbleProps) => {
  const formatTime = (ts: string) => {
    const date = new Date(ts);
    return format(date, "HH:mm");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.015 }}
      className={`flex items-end gap-2 ${isLastInGroup ? "mb-3" : "mb-0.5"} ${isSender ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar slot */}
      {!isSender && (
        <div className="w-7 flex-shrink-0 self-end">
          {showAvatar && (
            isAI ? (
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
            )
          )}
        </div>
      )}

      <div className="flex flex-col max-w-[75%]">
        {/* Glassmorphism bubble */}
        <div
          className={`px-4 py-2.5 backdrop-blur-md ${
            isSender
              ? "bg-primary/90 text-primary-foreground rounded-[20px] rounded-br-[6px] shadow-lg shadow-primary/10"
              : "bg-card/70 border border-border/40 text-foreground rounded-[20px] rounded-bl-[6px] shadow-sm"
          }`}
        >
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </p>
        </div>

        {/* Timestamp + Read receipt */}
        {isLastInGroup && timestamp && (
          <div className={`flex items-center gap-1 mt-1 ${isSender ? "justify-end pr-1" : "justify-start pl-1"}`}>
            <span className="text-[10px] text-muted-foreground">
              {formatTime(timestamp)}
            </span>
            {isSender && (
              <div className="flex items-center -space-x-1">
                {/* Double paw read receipt */}
                <span className={`text-[10px] ${isRead ? "text-primary" : "text-muted-foreground/50"}`}>
                  🐾
                </span>
                {isRead && (
                  <span className="text-[10px] text-primary">
                    🐾
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
