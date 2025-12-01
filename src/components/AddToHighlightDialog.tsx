import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Check, Plus } from "lucide-react";
import { CreateHighlightDialog } from "./CreateHighlightDialog";

interface Highlight {
  id: string;
  title: string;
  cover_image: string | null;
  has_story: boolean;
}

interface AddToHighlightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
  storyMediaUrl: string;
}

export const AddToHighlightDialog = ({ open, onOpenChange, storyId, storyMediaUrl }: AddToHighlightDialogProps) => {
  const { user } = useAuth();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchHighlights();
    }
  }, [open, user]);

  const fetchHighlights = async () => {
    if (!user) return;

    setLoading(true);

    const { data: highlightsData } = await supabase
      .from("story_highlights")
      .select("id, title, cover_image")
      .eq("user_id", user.id)
      .order("display_order", { ascending: true });

    if (highlightsData) {
      // Check which highlights already have this story
      const { data: existingStories } = await supabase
        .from("highlight_stories")
        .select("highlight_id")
        .eq("story_id", storyId);

      const existingHighlightIds = existingStories?.map(s => s.highlight_id) || [];

      setHighlights(
        highlightsData.map((h) => ({
          ...h,
          has_story: existingHighlightIds.includes(h.id),
        }))
      );
    }

    setLoading(false);
  };

  const handleAddToHighlight = async (highlightId: string) => {
    setIsAdding(highlightId);

    try {
      // Check if story is already in this highlight
      const { data: existing } = await supabase
        .from("highlight_stories")
        .select("id")
        .eq("highlight_id", highlightId)
        .eq("story_id", storyId)
        .maybeSingle();

      if (existing) {
        // Remove from highlight
        const { error } = await supabase
          .from("highlight_stories")
          .delete()
          .eq("id", existing.id);

        if (error) throw error;
        toast.success("הסטורי הוסר מההדגשה");
      } else {
        // Add to highlight
        const { error } = await supabase
          .from("highlight_stories")
          .insert({
            highlight_id: highlightId,
            story_id: storyId,
          });

        if (error) throw error;

        // Update cover image if highlight doesn't have one
        const highlight = highlights.find(h => h.id === highlightId);
        if (!highlight?.cover_image) {
          await supabase
            .from("story_highlights")
            .update({ cover_image: storyMediaUrl })
            .eq("id", highlightId);
        }

        toast.success("הסטורי נוסף להדגשה!");
      }

      fetchHighlights();
    } catch (error) {
      console.error("Error toggling story in highlight:", error);
      toast.error("שגיאה בעדכון ההדגשה");
    } finally {
      setIsAdding(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md font-jakarta max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-gray-900">הוסף להדגשה</DialogTitle>
          </DialogHeader>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-3 pt-4">
              {/* Create new highlight button */}
              <Button
                onClick={() => setCreateDialogOpen(true)}
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-4"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-6 h-6 text-gray-600" />
                </div>
                <span className="font-bold text-gray-900">הדגשה חדשה</span>
              </Button>

              {/* Existing highlights */}
              {highlights.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                  אין הדגשות עדיין. צור הדגשה ראשונה!
                </p>
              ) : (
                highlights.map((highlight) => (
                  <Button
                    key={highlight.id}
                    onClick={() => handleAddToHighlight(highlight.id)}
                    disabled={isAdding === highlight.id}
                    variant="outline"
                    className={`w-full justify-start gap-3 h-auto py-4 transition-all ${
                      highlight.has_story
                        ? "bg-success/10 border-success hover:bg-success/20"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="w-14 h-14 rounded-full bg-gradient-secondary overflow-hidden flex-shrink-0 relative">
                      {highlight.cover_image ? (
                        <img
                          src={highlight.cover_image}
                          alt={highlight.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          ✨
                        </div>
                      )}
                      {highlight.has_story && (
                        <div className="absolute inset-0 bg-success/20 flex items-center justify-center">
                          <Check className="w-6 h-6 text-success" />
                        </div>
                      )}
                    </div>
                    <span className="font-bold text-gray-900 flex-1 text-right">
                      {highlight.title}
                    </span>
                    {isAdding === highlight.id && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                  </Button>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CreateHighlightDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          fetchHighlights();
          setCreateDialogOpen(false);
        }}
      />
    </>
  );
};
