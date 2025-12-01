import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Story {
  id: string;
  media_url: string;
  media_type: string;
  created_at: string;
}

interface Highlight {
  id: string;
  title: string;
  user_id: string;
  user: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
}

const HighlightViewer = () => {
  const { highlightId } = useParams<{ highlightId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const STORY_DURATION = 5000;

  useEffect(() => {
    if (!highlightId) return;
    fetchHighlightData();
  }, [highlightId]);

  useEffect(() => {
    if (stories.length === 0 || isPaused) return;

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

  const fetchHighlightData = async () => {
    setLoading(true);

    // Fetch highlight info
    const { data: highlightData } = await supabase
      .from("story_highlights")
      .select("id, title, user_id")
      .eq("id", highlightId)
      .single();

    if (!highlightData) {
      toast.error("הדגשה לא נמצאה");
      navigate("/feed");
      return;
    }

    // Fetch user profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("id", highlightData.user_id)
      .single();

    if (profileData) {
      setHighlight({
        ...highlightData,
        user: profileData,
      });
    }

    // Fetch stories in highlight
    const { data: highlightStories } = await supabase
      .from("highlight_stories")
      .select(`
        story_id,
        stories(id, media_url, media_type, created_at)
      `)
      .eq("highlight_id", highlightId)
      .order("display_order", { ascending: true });

    if (highlightStories && highlightStories.length > 0) {
      const storiesData = highlightStories
        .map((hs: any) => hs.stories)
        .filter((s: any) => s !== null);
      
      setStories(storiesData);
    } else {
      toast.error("אין סטוריז בהדגשה זו");
      navigate("/feed");
    }

    setLoading(false);
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      navigate(-1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleDeleteFromHighlight = async () => {
    if (!user || !highlight || highlight.user_id !== user.id) return;

    const storyId = stories[currentIndex].id;

    try {
      const { error } = await supabase
        .from("highlight_stories")
        .delete()
        .eq("highlight_id", highlightId)
        .eq("story_id", storyId);

      if (error) throw error;

      toast.success("הסטורי הוסר מההדגשה");
      
      const newStories = stories.filter((_, i) => i !== currentIndex);
      if (newStories.length === 0) {
        navigate(-1);
      } else {
        setStories(newStories);
        if (currentIndex >= newStories.length) {
          setCurrentIndex(newStories.length - 1);
        }
      }
    } catch (error) {
      console.error("Error removing story from highlight:", error);
      toast.error("שגיאה בהסרת הסטורי");
    }
  };

  if (loading || !highlight || stories.length === 0) {
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
              className="h-full bg-gradient-secondary shadow-lg"
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
          onClick={() => navigate(`/user/${highlight.user.id}`)}
        >
          <div className="p-[2px] rounded-full bg-gradient-secondary">
            <Avatar className="w-12 h-12 ring-2 ring-black">
              <AvatarImage src={highlight.user.avatar_url} />
              <AvatarFallback className="bg-gradient-secondary text-white font-black">
                {highlight.user.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
          <div>
            <p className="font-black text-white font-jakarta drop-shadow-lg">{highlight.user.full_name}</p>
            <p className="text-xs text-white/90 font-jakarta font-semibold drop-shadow-md">{highlight.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user && highlight.user_id === user.id && (
            <Button
              variant="ghost"
              size="icon"
              className="text-red-500 hover:bg-red-500/20 rounded-full"
              onClick={handleDeleteFromHighlight}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 rounded-full"
            onClick={() => navigate(-1)}
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
              alt="Highlight Story"
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
          className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 flex items-center justify-center bg-secondary hover:bg-secondary-dark text-white rounded-full shadow-2xl"
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
        className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 flex items-center justify-center bg-secondary hover:bg-secondary-dark text-white rounded-full shadow-2xl"
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
    </div>
  );
};

export default HighlightViewer;