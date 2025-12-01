import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, Trash2, MoreVertical, MessageCircle, Eye, Bookmark } from "lucide-react";
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
import { StoryViewersDialog } from "@/components/StoryViewersDialog";
import { AddToHighlightDialog } from "@/components/AddToHighlightDialog";

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
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const STORY_DURATION = 5000; // 5 seconds per story

  useEffect(() => {
    if (!userId) return;
    fetchStories();
  }, [userId]);

  useEffect(() => {
    if (stories.length === 0 || isPaused) return;

    // Mark story as viewed and fetch viewers count
    if (user && stories[currentIndex]) {
      markStoryAsViewed(stories[currentIndex].id);
      fetchViewersCount(stories[currentIndex].id);
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

  const fetchViewersCount = async (storyId: string) => {
    const { data, error } = await supabase
      .from("story_views")
      .select("id", { count: "exact", head: true })
      .eq("story_id", storyId);

    if (!error && data !== null) {
      setViewersCount(data.length || 0);
    }
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
      className="fixed inset-0 bg-gradient-to-b from-black via-gray-900 to-black z-50"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1.5 p-3 z-10">
        {stories.map((_, index) => (
          <div key={index} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
            <motion.div
              className="h-full bg-gradient-primary shadow-lg"
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
      <div className="absolute top-6 left-0 right-0 flex items-center justify-between px-5 z-10 backdrop-blur-md bg-black/30 py-3 mx-2 rounded-2xl shadow-xl">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate(`/user/${currentStory.user.id}`)}
        >
          <div className="p-[2px] rounded-full bg-gradient-primary">
            <Avatar className="w-12 h-12 ring-2 ring-black">
              <AvatarImage src={currentStory.user.avatar_url} />
              <AvatarFallback className="bg-gradient-secondary text-white font-black">
                {currentStory.user.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <p className="font-black text-white font-jakarta drop-shadow-lg">{currentStory.user.full_name}</p>
            <p className="text-xs text-white/90 font-jakarta font-semibold drop-shadow-md">{getTimeAgo(currentStory.created_at)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Viewers count button - only for story owner */}
          {user && currentStory.user_id === user.id && viewersCount > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="bg-accent hover:bg-accent-hover text-text-inverse rounded-full shadow-lg relative"
              onClick={() => setShowViewersDialog(true)}
            >
              <Eye className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-error text-white text-xs font-black rounded-full flex items-center justify-center shadow-md">
                {viewersCount}
              </span>
            </Button>
          )}
          
          {user && currentStory.user_id !== user.id && (
            <Button
              variant="ghost"
              size="icon"
              className="bg-accent hover:bg-accent-hover text-text-inverse rounded-full shadow-lg"
              onClick={() => setShowReplyDialog(true)}
            >
              <MessageCircle className="w-5 h-5" />
            </Button>
          )}
          
          {user && currentStory.user_id === user.id && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="bg-secondary hover:bg-secondary-dark text-white rounded-full shadow-lg"
                onClick={() => setShowHighlightDialog(true)}
              >
                <Bookmark className="w-5 h-5" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full">
                    <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="font-jakarta bg-white/95 backdrop-blur-lg">
                  <DropdownMenuItem onClick={handleDelete} className="text-red-600 font-bold cursor-pointer">
                    <Trash2 className="w-4 h-4 ml-2" />
                    מחק סטורי
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 rounded-full"
            onClick={() => navigate("/feed")}
          >
            <X className="w-6 h-6" />
          </Button>
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
      {currentIndex > 0 && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 flex items-center justify-center bg-accent hover:bg-accent-hover text-text-inverse rounded-full shadow-2xl transition-all"
          onClick={handlePrevious}
        >
          <ChevronRight className="w-8 h-8" />
        </motion.button>
      )}
      
      <motion.button
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 flex items-center justify-center bg-accent hover:bg-accent-hover text-text-inverse rounded-full shadow-2xl transition-all"
        onClick={handleNext}
      >
        <ChevronLeft className="w-8 h-8" />
      </motion.button>

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