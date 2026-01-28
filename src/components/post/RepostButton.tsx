import { Repeat2 } from "lucide-react";
import { motion } from "framer-motion";
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
import { Textarea } from "@/components/ui/textarea";

interface RepostButtonProps {
  postId: string;
  isReposted?: boolean;
  onRepost?: () => void;
}

export const RepostButton = ({ postId, isReposted = false, onRepost }: RepostButtonProps) => {
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const [reposted, setReposted] = useState(isReposted);

  const handleRepost = async () => {
    if (!user) {
      toast.error("יש להתחבר כדי לשתף מחדש");
      return;
    }

    setLoading(true);
    try {
      if (reposted) {
        // Remove repost
        await (supabase
          .from("reposts") as any)
          .delete()
          .eq("user_id", user.id)
          .eq("original_post_id", postId);
        
        setReposted(false);
        toast.success("השיתוף הוסר");
      } else {
        // Add repost
        await (supabase
          .from("reposts") as any)
          .insert({
            user_id: user.id,
            original_post_id: postId,
            caption: caption || null
          });
        
        setReposted(true);
        toast.success("הפוסט שותף בפיד שלך!");
        onRepost?.();
      }
      setShowDialog(false);
      setCaption("");
    } catch (error: any) {
      console.error("Repost error:", error);
      toast.error("שגיאה בשיתוף הפוסט");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          if (reposted) {
            handleRepost(); // Remove directly
          } else {
            setShowDialog(true);
          }
        }}
        className="flex items-center gap-1"
      >
        <Repeat2 
          className={`w-[24px] h-[24px] ${reposted ? 'text-green-500' : 'text-neutral-900'}`}
          strokeWidth={1.5}
        />
      </motion.button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>שתף מחדש בפיד שלך</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea
              placeholder="הוסף הודעה (אופציונלי)..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-[80px]"
              maxLength={280}
            />
            
            <div className="flex gap-2">
              <Button
                onClick={handleRepost}
                disabled={loading}
                className="flex-1"
              >
                {loading ? "משתף..." : "שתף עכשיו"}
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
