import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Radio, Camera, Users, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface GoLiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GoLiveDialog = ({ open, onOpenChange }: GoLiveDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [allowComments, setAllowComments] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoLive = async () => {
    if (!user) {
      toast.error("יש להתחבר כדי לצאת לשידור");
      return;
    }

    setIsLoading(true);

    try {
      // Generate unique stream key
      const streamKey = crypto.randomUUID();

      const { data, error } = await (supabase.from("live_streams") as any)
        .insert({
          user_id: user.id,
          title: title || "שידור חי",
          description,
          stream_key: streamKey,
          is_private: isPrivate,
          allow_comments: allowComments,
          status: "live",
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("השידור החי התחיל!");
      onOpenChange(false);
      navigate(`/live/${data.id}/broadcast`);
    } catch (error: any) {
      console.error("Error starting live stream:", error);
      toast.error("שגיאה בהתחלת השידור");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-500" />
            צא לשידור חי
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
            <div className="text-center">
              <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">תצוגה מקדימה</p>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">כותרת השידור</Label>
            <Input
              id="title"
              placeholder="על מה השידור?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">תיאור (אופציונלי)</Label>
            <Textarea
              id="description"
              placeholder="ספר לצופים על השידור..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Settings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="private">שידור פרטי</Label>
              </div>
              <Switch
                id="private"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="comments">אפשר תגובות</Label>
              </div>
              <Switch
                id="comments"
                checked={allowComments}
                onCheckedChange={setAllowComments}
              />
            </div>
          </div>

          {/* Go Live Button */}
          <Button
            onClick={handleGoLive}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-pink-500 via-red-500 to-orange-500 hover:from-pink-600 hover:via-red-600 hover:to-orange-600"
          >
            {isLoading ? (
              "מתחיל..."
            ) : (
              <>
                <Radio className="w-4 h-4 ml-2" />
                צא לשידור חי
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
