import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, MessageCircle, Send, Share2 } from "lucide-react";
import { toast } from "sonner";

interface QuickShareSheetProps {
  open: boolean;
  onClose: () => void;
  postId: string;
  caption?: string;
}

export const QuickShareSheet = ({ open, onClose, postId, caption }: QuickShareSheetProps) => {
  const shareUrl = `${window.location.origin}/post/${postId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("הקישור הועתק");
    onClose();
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PetID',
          text: caption || 'צפה בפוסט הזה!',
          url: shareUrl,
        });
      } catch (e) {
        if ((e as Error).name !== 'AbortError') handleCopy();
      }
    } else {
      handleCopy();
    }
    onClose();
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(caption ? `${caption}\n${shareUrl}` : shareUrl)}`, '_blank');
    onClose();
  };

  const handleTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(caption || '')}`, '_blank');
    onClose();
  };

  const actions = [
    { icon: Copy, label: "העתק קישור", onClick: handleCopy, color: "text-foreground" },
    { icon: Send, label: "WhatsApp", onClick: handleWhatsApp, color: "text-green-500" },
    { icon: MessageCircle, label: "Telegram", onClick: handleTelegram, color: "text-blue-500" },
    { icon: Share2, label: "שיתוף", onClick: handleNativeShare, color: "text-foreground" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-[10000]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-[10001] bg-card rounded-t-3xl p-5 pb-[calc(env(safe-area-inset-bottom)+80px)] border-t border-border/30 shadow-2xl"
            dir="rtl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-foreground">שיתוף</h3>
              <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex justify-around">
              {actions.map((action) => (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className="flex flex-col items-center gap-2 p-3"
                >
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <action.icon className={`w-5 h-5 ${action.color}`} />
                  </div>
                  <span className="text-xs text-muted-foreground">{action.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
