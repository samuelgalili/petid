import { motion } from "framer-motion";
import { Calendar, Shield, GraduationCap, Upload, Hotel, Truck, Camera, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ChatActionButtonProps {
  actionTag: string;
  onAction?: (action: string) => void;
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  "SHOW_CALENDAR": { label: "בחר תאריך", icon: Calendar, color: "bg-primary/10 text-primary border-primary/20" },
  "CONFIRM_BOOKING": { label: "אשר והמשך", icon: Calendar, color: "bg-success/10 text-success border-success/20" },
  "INSURANCE_LINK": { label: "המשך לביטוח", icon: Shield, color: "bg-primary/10 text-primary border-primary/20" },
  "SHOW_INSURANCE_PLANS": { label: "הצג תוכניות ביטוח", icon: Shield, color: "bg-[hsl(210,90%,45%)]/10 text-[hsl(210,90%,45%)] border-[hsl(210,90%,45%)]/20" },
  "SHOW_INSURANCE_CALLBACK": { label: "השאר פרטים לנציג", icon: Phone, color: "bg-[hsl(210,90%,45%)]/10 text-[hsl(210,90%,45%)] border-[hsl(210,90%,45%)]/20" },
  "SCHEDULE_TRAINING": { label: "תאם מפגש אילוף", icon: GraduationCap, color: "bg-primary/10 text-primary border-primary/20" },
  "UPLOAD_DOCUMENT": { label: "העלה מסמך", icon: Upload, color: "bg-primary/10 text-primary border-primary/20" },
  "SHOW_BOARDING_OPTIONS": { label: "הצג פנסיונים", icon: Hotel, color: "bg-primary/10 text-primary border-primary/20" },
  "ORDER_STATUS": { label: "בדוק סטטוס הזמנה", icon: Truck, color: "bg-primary/10 text-primary border-primary/20" },
  "UPLOAD_PHOTO": { label: "העלה תמונה", icon: Camera, color: "bg-primary/10 text-primary border-primary/20" },
  "ESCALATE": { label: "דבר עם נציג", icon: Phone, color: "bg-destructive/10 text-destructive border-destructive/20" },
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

    // Default navigation for some actions
    switch (actionTag) {
      case "UPLOAD_DOCUMENT":
        navigate("/documents");
        break;
      case "UPLOAD_PHOTO":
        navigate("/photos");
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
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${config.color} hover:opacity-80`}
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
