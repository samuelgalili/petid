import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface ScheduledPost {
  id: string;
  caption: string | null;
  image_url: string;
  scheduled_for: string;
  status: string | null;
  created_at: string;
}

interface ScheduledPostsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ScheduledPostsManager = ({ open, onOpenChange }: ScheduledPostsManagerProps) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      fetchScheduledPosts();
    }
  }, [open, user]);

  const fetchScheduledPosts = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching scheduled posts:", error);
      toast.error("שגיאה בטעינת פוסטים מתוזמנים");
    } finally {
      setLoading(false);
    }
  };

  const deleteScheduledPost = async (id: string) => {
    setDeleting(id);

    try {
      const { error } = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPosts(posts.filter(p => p.id !== id));
      toast.success("הפוסט המתוזמן נמחק");
    } catch (error) {
      console.error("Error deleting scheduled post:", error);
      toast.error("שגיאה במחיקה");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            פוסטים מתוזמנים
            <span className="text-sm font-normal text-muted-foreground">({posts.length})</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>אין פוסטים מתוזמנים</p>
              <p className="text-xs mt-1">תזמן פוסטים בעת יצירה חדשה</p>
            </div>
          ) : (
            <AnimatePresence>
              {posts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="flex gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors"
                >
                  {/* Preview Image */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img 
                      src={post.image_url} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-2">
                      {post.caption || "ללא כיתוב"}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>
                        {format(new Date(post.scheduled_for), "dd/MM/yyyy HH:mm", { locale: he })}
                      </span>
                    </div>
                  </div>

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive self-center"
                    onClick={() => deleteScheduledPost(post.id)}
                    disabled={deleting === post.id}
                  >
                    {deleting === post.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};