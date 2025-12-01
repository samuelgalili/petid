import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface StoryReplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  storyOwnerId: string;
  storyOwnerName?: string;
}

export const StoryReplyDialog = ({
  open,
  onOpenChange,
  storyId,
  storyOwnerId,
  storyOwnerName,
}: StoryReplyDialogProps) => {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendReply = async () => {
    if (!user || !message.trim()) {
      toast.error("נא להזין הודעה");
      return;
    }

    setSending(true);

    try {
      const { error } = await supabase.from("story_replies").insert({
        story_id: storyId,
        sender_id: user.id,
        receiver_id: storyOwnerId,
        message: message.trim(),
      });

      if (error) throw error;

      toast.success("התגובה נשלחה בהצלחה!");
      setMessage("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error sending reply:", error);
      toast.error("שגיאה בשליחת התגובה");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md font-jakarta" dir="rtl">
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">שלח תגובה</h2>
            {storyOwnerName && (
              <p className="text-sm text-gray-600">
                תגובה לסטורי של {storyOwnerName}
              </p>
            )}
          </div>

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="כתוב את התגובה שלך..."
            className="min-h-[120px] resize-none"
            dir="rtl"
            maxLength={500}
          />

          <div className="text-xs text-gray-500 text-left">
            {message.length}/500
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              ביטול
            </Button>
            <Button
              className="flex-1 bg-blue-500 hover:bg-blue-600"
              onClick={handleSendReply}
              disabled={sending || !message.trim()}
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  שולח...
                </>
              ) : (
                "שלח תגובה"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
