import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreatePollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  onPollCreated: () => void;
}

export const CreatePollDialog = ({ 
  open, 
  onOpenChange, 
  storyId, 
  onPollCreated 
}: CreatePollDialogProps) => {
  const [question, setQuestion] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!question.trim() || !optionA.trim() || !optionB.trim()) {
      toast.error("יש למלא את כל השדות");
      return;
    }

    setLoading(true);
    try {
      await (supabase.from("story_polls") as any).insert({
        story_id: storyId,
        question: question.trim(),
        option_a: optionA.trim(),
        option_b: optionB.trim()
      });

      toast.success("הסקר נוצר בהצלחה!");
      onPollCreated();
      onOpenChange(false);
      
      // Reset form
      setQuestion("");
      setOptionA("");
      setOptionB("");
    } catch (error) {
      console.error("Create poll error:", error);
      toast.error("שגיאה ביצירת הסקר");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" dir="rtl">
        <DialogHeader>
          <DialogTitle>צור סקר לסטורי</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>שאלה</Label>
            <Input
              placeholder="מה השאלה שלך?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label>אפשרות א׳</Label>
            <Input
              placeholder="אפשרות ראשונה"
              value={optionA}
              onChange={(e) => setOptionA(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label>אפשרות ב׳</Label>
            <Input
              placeholder="אפשרות שנייה"
              value={optionB}
              onChange={(e) => setOptionB(e.target.value)}
              maxLength={50}
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={loading || !question || !optionA || !optionB}
            className="w-full"
          >
            {loading ? "יוצר..." : "צור סקר"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
