import { useState } from "react";
import { Flag, AlertTriangle, MessageSquare, UserX, Trash2, MoreHorizontal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUserId?: string;
  reportedPostId?: string;
}

const reportTypes = [
  { value: "spam", label: "ספאם", icon: Trash2, description: "תוכן פרסומי או חוזר על עצמו" },
  { value: "inappropriate", label: "תוכן לא הולם", icon: AlertTriangle, description: "תוכן מיני, אלימות או גרפי" },
  { value: "harassment", label: "הטרדה", icon: UserX, description: "התנהגות מטרידה או בריונית" },
  { value: "fake", label: "פרופיל מזויף", icon: Flag, description: "התחזות או חשבון מזויף" },
  { value: "other", label: "אחר", icon: MoreHorizontal, description: "סיבה אחרת" },
] as const;

export const ReportDialog = ({
  open,
  onOpenChange,
  reportedUserId,
  reportedPostId,
}: ReportDialogProps) => {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedType) {
      toast({
        title: "שגיאה",
        description: "יש לבחור סוג דיווח",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "שגיאה",
          description: "יש להתחבר כדי לדווח",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId || null,
        reported_post_id: reportedPostId || null,
        report_type: selectedType as any,
        description: description || null,
      });

      if (error) throw error;

      toast({
        title: "הדיווח נשלח",
        description: "תודה על הדיווח. הצוות שלנו יבדוק את התוכן.",
      });

      onOpenChange(false);
      setSelectedType(null);
      setDescription("");
    } catch (error) {
      console.error("Error submitting report:", error);
      toast({
        title: "שגיאה",
        description: "נכשל בשליחת הדיווח",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-right">דיווח על תוכן</DialogTitle>
          <DialogDescription className="text-right">
            בחר את הסיבה לדיווח
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {reportTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-right ${
                  selectedType === type.value
                    ? "border-destructive bg-destructive/10"
                    : "border-border hover:border-muted-foreground/50"
                }`}
              >
                <Icon className={`w-5 h-5 ${selectedType === type.value ? "text-destructive" : "text-muted-foreground"}`} />
                <div className="flex-1">
                  <p className="font-medium text-foreground">{type.label}</p>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {selectedType && (
          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium text-right block">
              פרטים נוספים (אופציונלי)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="תאר את הבעיה..."
              className="text-right"
              rows={3}
            />
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            ביטול
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!selectedType || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? "שולח..." : "שלח דיווח"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
