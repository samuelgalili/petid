import { useState } from "react";
import { MoreVertical, Flag, Ban, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface ChatHeaderMenuProps {
  userName: string;
  onBlock?: () => void;
  onReport?: () => void;
  onDelete?: () => void;
}

export const ChatHeaderMenu = ({ userName, onBlock, onReport, onDelete }: ChatHeaderMenuProps) => {
  const [open, setOpen] = useState(false);

  const actions = [
    {
      label: `דווח על ${userName}`,
      icon: Flag,
      color: "text-destructive",
      action: () => {
        onReport?.();
        toast.success("הדיווח נשלח. צוות PetID יבדוק את הפנייה.");
        setOpen(false);
      },
    },
    {
      label: `חסום את ${userName}`,
      icon: Ban,
      color: "text-destructive",
      action: () => {
        onBlock?.();
        toast.success(`${userName} נחסם/ה. לא תקבל/י ממנו/ה הודעות.`);
        setOpen(false);
      },
    },
    {
      label: "מחק שיחה",
      icon: Trash2,
      color: "text-muted-foreground",
      action: () => {
        onDelete?.();
        setOpen(false);
      },
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-full hover:bg-muted active:scale-90 transition-all"
      >
        <MoreVertical className="h-5 w-5 text-foreground" strokeWidth={1.5} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -8 }}
              className="absolute top-full left-0 mt-1 w-52 bg-card/95 backdrop-blur-xl rounded-2xl shadow-xl border border-border/40 overflow-hidden z-50"
            >
              {actions.map((item, i) => (
                <button
                  key={i}
                  onClick={item.action}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-right"
                >
                  <item.icon className={`h-5 w-5 ${item.color}`} strokeWidth={1.5} />
                  <span className={`text-sm font-medium ${item.color}`}>{item.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
