import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot } from "lucide-react";
import { format } from "date-fns";

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
  const formatTime = (ts: string) => format(new Date(ts), "HH:mm");

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 380,
        damping: 22,
        delay: index * 0.012,
      }}
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
                <AvatarFallback className="bg-gradient-to-br from-primary/60 to-accent/60 text-primary-foreground text-xs">
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
          className={`px-4 py-2.5 backdrop-blur-xl ${
            isSender
              ? "bg-gradient-to-br from-primary/95 to-primary/80 text-primary-foreground rounded-[20px] rounded-br-[6px] shadow-lg shadow-primary/15 border border-primary/20"
              : "bg-card/60 border border-border/30 text-foreground rounded-[20px] rounded-bl-[6px] shadow-sm backdrop-saturate-150"
          }`}
        >
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </p>
        </div>

        {/* Timestamp + Read receipt (two paws) */}
        {isLastInGroup && timestamp && (
          <div className={`flex items-center gap-1.5 mt-1 ${isSender ? "justify-end pr-1" : "justify-start pl-1"}`}>
            <span className="text-[10px] text-muted-foreground">
              {formatTime(timestamp)}
            </span>
            {isSender && (
              <div className="flex items-center gap-[1px]">
                <span className={`text-[9px] transition-colors duration-300 ${isRead ? "text-green-500" : "text-muted-foreground/40"}`}>
                  🐾
                </span>
                <span className={`text-[9px] transition-colors duration-300 ${isRead ? "text-green-500" : "text-muted-foreground/40"}`}>
                  🐾
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
