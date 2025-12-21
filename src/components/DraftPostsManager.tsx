import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, Edit3, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

interface Draft {
  id: string;
  caption: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

interface DraftPostsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditDraft: (draft: Draft) => void;
}

export const DraftPostsManager = ({ open, onOpenChange, onEditDraft }: DraftPostsManagerProps) => {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      fetchDrafts();
    }
  }, [open, user]);

  const fetchDrafts = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('draft_posts')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDrafts(data || []);
    } catch (error) {
      console.error("Error fetching drafts:", error);
      toast.error("שגיאה בטעינת טיוטות");
    } finally {
      setLoading(false);
    }
  };

  const deleteDraft = async (id: string) => {
    setDeleting(id);

    try {
      const { error } = await supabase
        .from('draft_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDrafts(drafts.filter(d => d.id !== id));
      toast.success("הטיוטה נמחקה");
    } catch (error) {
      console.error("Error deleting draft:", error);
      toast.error("שגיאה במחיקת הטיוטה");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            טיוטות
            <span className="text-sm font-normal text-muted-foreground">({drafts.length})</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>אין טיוטות שמורות</p>
              <p className="text-xs mt-1">טיוטות יישמרו כשתצא באמצע יצירת פוסט</p>
            </div>
          ) : (
            <AnimatePresence>
              {drafts.map((draft) => (
                <motion.div
                  key={draft.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="flex gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors"
                >
                  {/* Preview Image */}
                  {draft.image_url ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      <img 
                        src={draft.image_url} 
                        alt="" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2">
                      {draft.caption || "ללא כיתוב"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(draft.updated_at), { 
                        addSuffix: true, 
                        locale: he 
                      })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        onEditDraft(draft);
                        onOpenChange(false);
                      }}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteDraft(draft.id)}
                      disabled={deleting === draft.id}
                    >
                      {deleting === draft.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};