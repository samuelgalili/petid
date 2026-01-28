import { motion } from "framer-motion";
import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ShareToStoryButtonProps {
  postId: string;
  imageUrl: string;
  caption?: string;
}

export const ShareToStoryButton = ({ postId, imageUrl, caption }: ShareToStoryButtonProps) => {
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleShareToStory = async () => {
    if (!user) {
      toast.error("יש להתחבר כדי לשתף לסטורי");
      return;
    }

    setLoading(true);
    try {
      // Create a story with the post image
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await supabase.from("stories").insert({
        user_id: user.id,
        media_url: imageUrl,
        media_type: "image",
        caption: caption ? `שיתוף: ${caption.slice(0, 100)}...` : undefined,
        expires_at: expiresAt.toISOString(),
      });

      toast.success("הפוסט שותף בסטורי שלך!");
      setShowDialog(false);
    } catch (error) {
      console.error("Share to story error:", error);
      toast.error("שגיאה בשיתוף לסטורי");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowDialog(true)}
        className="flex items-center gap-2 w-full px-3 py-2 text-right hover:bg-muted rounded-md transition-colors"
      >
        <PlusCircle className="w-5 h-5" />
        <span className="text-sm">שתף לסטורי</span>
      </motion.button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-xs" dir="rtl">
          <DialogHeader>
            <DialogTitle>שתף לסטורי שלך</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="aspect-square rounded-xl overflow-hidden bg-muted">
              <img 
                src={imageUrl} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
            </div>
            
            <p className="text-sm text-muted-foreground text-center">
              הפוסט יופיע בסטורי שלך ל-24 שעות
            </p>
            
            <div className="flex gap-2">
              <Button
                onClick={handleShareToStory}
                disabled={loading}
                className="flex-1"
              >
                {loading ? "משתף..." : "שתף לסטורי"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                ביטול
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
