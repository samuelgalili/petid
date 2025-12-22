import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, Trash2, MoreHorizontal, Send, Heart, Bookmark } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { StoryReplyDialog } from "@/components/StoryReplyDialog";
import { StoryViewersDialog } from "@/components/StoryViewersDialog";
import { AddToHighlightDialog } from "@/components/AddToHighlightDialog";
import { StoryProductSticker } from "@/components/shop/StoryProductSticker";

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

const StoryViewer = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [showViewersDialog, setShowViewersDialog] = useState(false);
  const [showHighlightDialog, setShowHighlightDialog] = useState(false);
  const [viewersCount, setViewersCount] = useState(0);
  const [replyText, setReplyText] = useState("");
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const STORY_DURATION = 5000;

  useEffect(() => {
    if (!userId) return;
    fetchStories();
  }, [userId]);

  useEffect(() => {
    if (stories.length === 0 || isPaused) return;

    if (user && stories[currentIndex]) {
      markStoryAsViewed(stories[currentIndex].id);
      fetchViewersCount(stories[currentIndex].id);
    }

    setProgress(0);
    const startTime = Date.now();
    
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / STORY_DURATION) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        handleNext();
      }
    }, 50);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [currentIndex, stories, isPaused]);

  const fetchStories = async () => {
    setLoading(true);

    const { data: storiesData } = await supabase
      .from("stories")
      .select("id, user_id, media_url, media_type, created_at")
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });

    if (storiesData && storiesData.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", userId)
        .single();

      if (profileData) {
        setStories(
          storiesData.map((story: any) => ({
            ...story,
            user: profileData,
          }))
        );
      }
    } else {
      toast.error("לא נמצאו סטוריז פעילים");
      navigate("/feed");
    }

    setLoading(false);
  };

  const markStoryAsViewed = async (storyId: string) => {
    if (!user) return;

    await supabase
      .from("story_views")
      .upsert(
        { story_id: storyId, viewer_id: user.id },
        { onConflict: "story_id,viewer_id" }
      );
  };

  const fetchViewersCount = async (storyId: string) => {
    const { count } = await supabase
      .from("story_views")
      .select("id", { count: "exact", head: true })
      .eq("story_id", storyId);

    setViewersCount(count || 0);
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      navigate("/feed");
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleDelete = async () => {
    const story = stories[currentIndex];
    if (!story || story.user_id !== user?.id) return;

    try {
      const { error } = await supabase
        .from("stories")
        .delete()
        .eq("id", story.id);

      if (error) throw error;

      toast.success("הסטורי נמחק");
      
      const newStories = stories.filter((_, i) => i !== currentIndex);
      if (newStories.length === 0) {
        navigate("/feed");
      } else {
        setStories(newStories);
        if (currentIndex >= newStories.length) {
          setCurrentIndex(newStories.length - 1);
        }
      }
    } catch (error) {
      console.error("Error deleting story:", error);
      toast.error("שגיאה במחיקת הסטורי");
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !user || !stories[currentIndex]) return;
    
    try {
      await supabase.from("story_replies").insert({
        story_id: stories[currentIndex].id,
        sender_id: user.id,
        receiver_id: stories[currentIndex].user_id,
        message: replyText.trim(),
      });
      
      toast.success("התגובה נשלחה");
      setReplyText("");
    } catch (error) {
      toast.error("שגיאה בשליחת התגובה");
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 3600) return `${Math.floor(seconds / 60)}ד'`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}ש'`;
    return `${Math.floor(seconds / 86400)}י'`;
  };

  if (loading || stories.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white">טוען...</div>
      </div>
    );
  }

  const currentStory = stories[currentIndex];
  const isOwnStory = user?.id === currentStory.user_id;

  return (
    <div 
      className="fixed inset-0 bg-black z-50"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Progress bars - Instagram style */}
      <div className="absolute top-0 left-0 right-0 flex gap-[2px] p-2 pt-3 z-20">
        {stories.map((_, index) => (
          <div key={index} className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{
                width: index < currentIndex ? "100%" : index === currentIndex ? `${progress}%` : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header - Instagram style */}
      <div className="absolute top-6 left-0 right-0 flex items-center justify-between px-3 z-20">
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate(`/profile/${currentStory.user.id}`)}
        >
          <Avatar className="w-8 h-8 ring-2 ring-white/20">
            <AvatarImage src={currentStory.user.avatar_url} />
            <AvatarFallback className="bg-gray-600 text-white text-xs">
              {currentStory.user.full_name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2">
            <span className="text-white text-[13px] font-semibold">
              {currentStory.user.full_name}
            </span>
            <span className="text-white/60 text-[13px]">
              {getTimeAgo(currentStory.created_at)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOwnStory && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1">
                  <MoreHorizontal className="w-6 h-6 text-white" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px]">
                <DropdownMenuItem 
                  onClick={() => setShowHighlightDialog(true)}
                  className="cursor-pointer"
                >
                  <Bookmark className="w-4 h-4 ml-2" />
                  הוסף להיילייט
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleDelete} 
                  className="text-red-600 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 ml-2" />
                  מחק סטורי
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <button onClick={() => navigate("/feed")} className="p-1">
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Story Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStory.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="w-full h-full flex items-center justify-center relative"
        >
          {currentStory.media_type === 'image' ? (
            <img
              src={currentStory.media_url}
              alt="Story"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <video
              src={currentStory.media_url}
              className="max-w-full max-h-full object-contain"
              autoPlay
              muted
              playsInline
            />
          )}
          {/* Product Tags */}
          <StoryProductSticker storyId={currentStory.id} />
        </motion.div>
      </AnimatePresence>

      {/* Tap zones for navigation */}
      <div className="absolute inset-0 flex pointer-events-none z-10">
        <div 
          className="w-1/3 h-full pointer-events-auto"
          onClick={handlePrevious}
        />
        <div className="w-1/3 h-full" />
        <div 
          className="w-1/3 h-full pointer-events-auto"
          onClick={handleNext}
        />
      </div>

      {/* Bottom section */}
      <div className="absolute bottom-0 left-0 right-0 z-20 safe-area-inset-bottom">
        {isOwnStory ? (
          /* Viewers count for own story */
          <div className="px-4 py-4">
            <button 
              onClick={() => setShowViewersDialog(true)}
              className="flex items-center gap-2 text-white"
            >
              <div className="flex -space-x-2">
                {/* Placeholder avatars */}
                <div className="w-6 h-6 rounded-full bg-gray-600 border border-black" />
              </div>
              <span className="text-[13px]">{viewersCount} צפיות</span>
            </button>
          </div>
        ) : (
          /* Reply input for other's story */
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 flex items-center bg-transparent border border-white/40 rounded-full px-4 py-2">
              <Input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendReply()}
                placeholder="שלח הודעה"
                className="flex-1 bg-transparent border-none text-white placeholder:text-white/60 text-[14px] p-0 h-auto focus-visible:ring-0"
                dir="rtl"
              />
            </div>
            <button className="p-1">
              <Heart className="w-6 h-6 text-white" />
            </button>
            <button 
              onClick={handleSendReply}
              disabled={!replyText.trim()}
              className="p-1"
            >
              <Send className={`w-6 h-6 ${replyText.trim() ? "text-white" : "text-white/40"}`} />
            </button>
          </div>
        )}
      </div>

      {/* Viewers Dialog */}
      {currentStory && (
        <StoryViewersDialog
          open={showViewersDialog}
          onOpenChange={setShowViewersDialog}
          storyId={currentStory.id}
        />
      )}

      {/* Add to Highlight Dialog */}
      {currentStory && (
        <AddToHighlightDialog
          open={showHighlightDialog}
          onOpenChange={setShowHighlightDialog}
          storyId={currentStory.id}
          storyMediaUrl={currentStory.media_url}
        />
      )}
    </div>
  );
};

export default StoryViewer;
