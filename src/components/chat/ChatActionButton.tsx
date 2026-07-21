import { motion } from "framer-motion";
import { Calendar, Upload, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ChatActionButtonProps {
  actionTag: string;
  onAction?: (action: string) => void;
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  "SHOW_CALENDAR": { label: "בחירת תאריך", icon: Calendar, color: "bg-primary/10 text-primary border-primary/20" },
  "UPLOAD_DOCUMENT": { label: "העלה מסמך", icon: Upload, color: "bg-primary/10 text-primary border-primary/20" },
  "UPLOAD_PHOTO": { label: "העלה תמונה", icon: Camera, color: "bg-primary/10 text-primary border-primary/20" },
};

export const ChatActionButton = ({ actionTag, onAction }: ChatActionButtonProps) => {
  const navigate = useNavigate();
  const config = ACTION_CONFIG[actionTag];
  if (!config) return null;

  const Icon = config.icon;

  const handleClick = () => {
    if (onAction) {
      onAction(actionTag);
      return;
    }

    // Default navigation is only used outside the main Chat page.
    switch (actionTag) {
      case "UPLOAD_DOCUMENT":
        navigate("/documents");
        break;
      case "UPLOAD_PHOTO":
        navigate("/chat");
        break;
      default:
        break;
    }
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.97 }}
      onClick={handleClick}
      className={`inline-flex min-h-11 items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${config.color} hover:opacity-80`}
    >
      <Icon className="w-4 h-4" />
      {config.label}
    </motion.button>
  );
};

// Extract action tags from message content
export function extractActionTags(content: string): string[] {
  const matches = content.match(/\[ACTION:([^\]]+)\]/g);
  if (!matches) return [];
  return matches.map(m => m.replace("[ACTION:", "").replace("]", ""));
}

// Clean action tags from display text
export function cleanActionTags(content: string): string {
  return content.replace(/\[ACTION:[^\]]+\]/g, "").replace(/\[PRODUCTS:[^\]]+\]/g, "").replace(/\[SUGGESTIONS:[^\]]+\]/g, "").replace(/\[ACTION:SHOW_TRAINING_OPTIONS:[^\]]+\]/g, "").trim();
}
