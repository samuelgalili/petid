import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface Viewer {
  id: string;
  full_name: string;
  avatar_url: string;
  viewed_at: string;
}

interface StoryViewersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storyId: string;
}

export const StoryViewersDialog = ({ open, onOpenChange, storyId }: StoryViewersDialogProps) => {
  const navigate = useNavigate();
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && storyId) {
      fetchViewers();
    }
  }, [open, storyId]);

  const fetchViewers = async () => {
    setLoading(true);

    try {
      // Get all viewers for this story
      const { data: viewsData, error: viewsError } = await supabase
        .from("story_views")
        .select("viewer_id, viewed_at")
        .eq("story_id", storyId)
        .order("viewed_at", { ascending: false });

      if (viewsError) throw viewsError;

      if (viewsData && viewsData.length > 0) {
        // Get unique viewer IDs
        const viewerIds = [...new Set(viewsData.map(v => v.viewer_id))];

        // Fetch viewer profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", viewerIds);

        if (profilesError) throw profilesError;

        if (profilesData) {
          // Map profiles with viewed_at timestamp
          const viewersWithTime = profilesData.map(profile => {
            const view = viewsData.find(v => v.viewer_id === profile.id);
            return {
              id: profile.id,
              full_name: profile.full_name || "משתמש",
              avatar_url: profile.avatar_url || "",
              viewed_at: view?.viewed_at || "",
            };
          });

          // Sort by viewed_at (most recent first)
          viewersWithTime.sort((a, b) => 
            new Date(b.viewed_at).getTime() - new Date(a.viewed_at).getTime()
          );

          setViewers(viewersWithTime);
        }
      }
    } catch (error) {
      console.error("Error fetching story viewers:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return "עכשיו";
    if (seconds < 3600) return `לפני ${Math.floor(seconds / 60)} דקות`;
    if (seconds < 86400) return `לפני ${Math.floor(seconds / 3600)} שעות`;
    return `לפני ${Math.floor(seconds / 86400)} ימים`;
  };

  const handleViewerClick = (viewerId: string) => {
    onOpenChange(false);
    navigate(`/user/${viewerId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md font-jakarta bg-gradient-to-br from-white to-gray-50 rounded-3xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-lg">
              <Eye className="w-6 h-6 text-gray-900" />
            </div>
            צפו בסטורי
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {/* Viewers count */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-4 mb-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-700" />
                <span className="text-sm font-bold text-gray-700">סך הכל צפיות</span>
              </div>
              <span className="text-2xl font-black text-accent">
                {viewers.length}
              </span>
            </div>
          </div>

          {/* Viewers list */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {loading ? (
              // Loading skeleton
              [...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))
            ) : viewers.length === 0 ? (
              // Empty state
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-4">
                  <Eye className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-500 font-semibold">אין צפיות עדיין</p>
                <p className="text-gray-400 text-sm mt-1">הסטורי שלך עדיין לא נצפה</p>
              </div>
            ) : (
              // Viewers list
              viewers.map((viewer, index) => (
                <motion.div
                  key={viewer.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-3 bg-white rounded-2xl hover:bg-accent/10 border border-gray-100 hover:border-accent transition-all cursor-pointer shadow-sm hover:shadow-md"
                  onClick={() => handleViewerClick(viewer.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-12 h-12 ring-2 ring-white shadow-md">
                        <AvatarImage src={viewer.avatar_url} />
                        <AvatarFallback className="bg-gradient-secondary text-white font-black">
                          {viewer.full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-success rounded-full border-2 border-white shadow-sm" />
                    </div>
                    <div>
                      <p className="font-black text-gray-900">{viewer.full_name}</p>
                      <p className="text-xs text-gray-500 font-semibold">
                        {getTimeAgo(viewer.viewed_at)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
