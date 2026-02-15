import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Search,
  Link2,
  Download,
  Flag,
  Bookmark,
  ThumbsDown,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  shareUrl: string;
  caption?: string;
}

const appActions = [
  {
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
      </svg>
    ),
    label: "WhatsApp",
    color: "bg-green-500",
    onClick: (url: string) => {
      window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, "_blank");
    },
  },
  {
    icon: <Link2 className="w-6 h-6 text-white" />,
    label: "העתק קישור",
    color: "bg-blue-600",
    onClick: async (url: string) => {
      await navigator.clipboard.writeText(url);
      toast.success("הקישור הועתק!");
    },
  },
  {
    icon: <Share2 className="w-6 h-6 text-white" />,
    label: "שיתוף",
    color: "bg-primary",
    onClick: async (url: string, caption?: string) => {
      if (navigator.share) {
        try {
          await navigator.share({ title: caption || "PetID", url });
        } catch { /* cancelled */ }
      }
    },
  },
];

const moreActions = [
  {
    icon: <Bookmark className="w-6 h-6 text-foreground" />,
    label: "שמור",
  },
  {
    icon: <Download className="w-6 h-6 text-foreground" />,
    label: "הורדה",
  },
  {
    icon: <ThumbsDown className="w-6 h-6 text-foreground" />,
    label: "לא מעוניין",
  },
  {
    icon: <Flag className="w-6 h-6 text-foreground" />,
    label: "דיווח",
  },
];

export const ShareSheet = ({ open, onClose, shareUrl, caption }: ShareSheetProps) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 z-[100]"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 z-[101] bg-background rounded-t-3xl overflow-hidden"
            dir="rtl"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <button onClick={onClose} className="p-1">
                <X className="w-6 h-6 text-foreground" />
              </button>
              <h3 className="text-base font-bold text-foreground">שליחה אל</h3>
              <Search className="w-6 h-6 text-foreground" />
            </div>

            {/* App Actions */}
            <div className="px-4 py-4">
              <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-hide">
                {appActions.map((action, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => {
                      action.onClick(shareUrl, caption);
                      onClose();
                    }}
                    className="flex flex-col items-center gap-2 min-w-[64px]"
                  >
                    <div className={`w-14 h-14 rounded-full ${action.color} flex items-center justify-center shadow-lg`}>
                      {action.icon}
                    </div>
                    <span className="text-xs font-medium text-foreground whitespace-nowrap">
                      {action.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-border/50 mx-4" />

            {/* More Actions */}
            <div className="px-4 py-4">
              <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-hide">
                {moreActions.map((action, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                    onClick={() => {
                      toast.success(`${action.label}`);
                      onClose();
                    }}
                    className="flex flex-col items-center gap-2 min-w-[64px]"
                  >
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                      {action.icon}
                    </div>
                    <span className="text-xs font-medium text-foreground whitespace-nowrap">
                      {action.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Safe area bottom */}
            <div className="h-8" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
