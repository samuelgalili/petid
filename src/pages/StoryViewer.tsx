import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, Trash2, MoreVertical, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { StoryReplyDialog } from "@/components/StoryReplyDialog";

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
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const STORY_DURATION = 5000; // 5 seconds per story

  useEffect(() => {
    if (!userId) return;
    fetchStories();
  }, [userId]);

  useEffect(() => {
    if (stories.length === 0 || isPaused) return;

    // Mark story as viewed
    if (user && stories[currentIndex]) {
      markStoryAsViewed(stories[currentIndex].id);
    }

    // Progress bar animation
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
      // Fetch user profile
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

      toast.success("הסטורי נמחק בהצלחה");
      
      // Remove from local state
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

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 3600) return `לפני ${Math.floor(seconds / 60)}ד'`;
    if (seconds < 86400) return `לפני ${Math.floor(seconds / 3600)}ש'`;
    return `לפני ${Math.floor(seconds / 86400)}י'`;
  };

  if (loading || stories.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white">טוען...</div>
      </div>
    );
  }

  const currentStory = stories[currentIndex];

  return (
    <div 
      className="fixed inset-0 bg-black z-50"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
        {stories.map((_, index) => (
          <div key={index} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white"
              initial={{ width: "0%" }}
              animate={{
                width: index < currentIndex ? "100%" : index === currentIndex ? `${progress}%` : "0%",
              }}
              transition={{ duration: 0 }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-10">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate(`/user/${currentStory.user.id}`)}
        >
          <Avatar className="w-10 h-10 ring-2 ring-white">
            <AvatarImage src={currentStory.user.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-400 text-white">
              {currentStory.user.full_name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-white font-jakarta">{currentStory.user.full_name}</p>
            <p className="text-xs text-white/80 font-jakarta">{getTimeAgo(currentStory.created_at)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user && currentStory.user_id === user.id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="font-jakarta">
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="w-4 h-4 ml-2" />
                  מחק סטורי
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => navigate("/feed")}
          >
            <X className="w-6 h-6" />
          </Button>

          {/* Reply Button - only show for other users' stories */}
          {currentStory && currentStory.user_id !== user?.id && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 left-16 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={() => setShowReplyDialog(true)}
            >
              <MessageCircle className="w-6 h-6" />
            </Button>
          )}
        </div>
      </div>

      {/* Story Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStory.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full h-full flex items-center justify-center"
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
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <button
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white hover:bg-white/20 rounded-full transition-colors"
        onClick={handlePrevious}
        disabled={currentIndex === 0}
      >
        <ChevronRight className="w-8 h-8" />
      </button>
      <button
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center text-white hover:bg-white/20 rounded-full transition-colors"
        onClick={handleNext}
      >
        <ChevronLeft className="w-8 h-8" />
      </button>

      {/* Tap zones for mobile */}
      <div className="absolute inset-0 flex pointer-events-none">
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

      {/* Reply Dialog */}
      {currentStory && (
        <StoryReplyDialog
          open={showReplyDialog}
          onOpenChange={setShowReplyDialog}
          storyId={currentStory.id}
          storyOwnerId={currentStory.user_id}
          storyOwnerName={currentStory.user?.full_name || undefined}
        />
      )}
    </div>
  );
};

export default StoryViewer;