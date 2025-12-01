import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreateHighlightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreateHighlightDialog = ({ open, onOpenChange, onSuccess }: CreateHighlightDialogProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!user || !title.trim()) {
      toast.error("נא להזין שם להדגשה");
      return;
    }

    setIsCreating(true);

    try {
      const { error } = await supabase
        .from("story_highlights")
        .insert({
          user_id: user.id,
          title: title.trim(),
        });

      if (error) throw error;

      toast.success("הדגשה נוצרה בהצלחה!");
      setTitle("");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error creating highlight:", error);
      toast.error("שגיאה ביצירת הדגשה");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md font-jakarta" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-gray-900">הדגשה חדשה</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="font-bold text-gray-700">
              שם ההדגשה
            </Label>
            <Input
              id="title"
              placeholder='לדוגמה: "זיכרונות מהחופש"'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={30}
              className="font-jakarta"
            />
            <p className="text-xs text-gray-500">
              {title.length}/30 תווים
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={handleCreate}
              disabled={!title.trim() || isCreating}
              className="flex-1 bg-gradient-to-r from-[#FFD700] to-[#FFC107] hover:from-[#FFC107] hover:to-[#FFB700] text-gray-900 font-black"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  יוצר...
                </>
              ) : (
                "צור הדגשה"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              ביטול
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};