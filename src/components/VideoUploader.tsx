import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Video, X, Loader2, Play, Pause } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface VideoUploaderProps {
  videoFile: File | null;
  videoPreview: string | null;
  onVideoSelect: (file: File, preview: string) => void;
  onVideoRemove: () => void;
  maxDurationSeconds?: number;
  className?: string;
}

export const VideoUploader = ({
  videoFile,
  videoPreview,
  onVideoSelect,
  onVideoRemove,
  maxDurationSeconds = 90,
  className
}: VideoUploaderProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate video file
    if (!file.type.startsWith("video/")) {
      toast.error("נא לבחור קובץ וידאו");
      return;
    }

    // Max 100MB
    if (file.size > 100 * 1024 * 1024) {
      toast.error("הקובץ גדול מדי (מקסימום 100MB)");
      return;
    }

    setLoading(true);

    // Create preview and check duration
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      
      if (video.duration > maxDurationSeconds) {
        toast.error(`הסרטון ארוך מדי (מקסימום ${maxDurationSeconds} שניות)`);
        setLoading(false);
        return;
      }

      onVideoSelect(file, url);
      setLoading(false);
      toast.success("הסרטון נטען בהצלחה");
    };

    video.onerror = () => {
      toast.error("שגיאה בטעינת הסרטון");
      setLoading(false);
    };

    video.src = url;
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (videoPreview) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative ${className}`}
      >
        <video
          ref={videoRef}
          src={videoPreview}
          className="w-full aspect-video object-cover rounded-2xl shadow-lg"
          onEnded={() => setIsPlaying(false)}
          onClick={togglePlay}
          playsInline
        />
        
        {/* Play/Pause overlay */}
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors rounded-2xl"
        >
          {!isPlaying && (
            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
              <Play className="w-8 h-8 text-gray-900 mr-[-2px]" fill="currentColor" />
            </div>
          )}
        </button>

        {/* Remove button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-3 left-3 bg-black/60 hover:bg-black/80 text-white rounded-full shadow-lg w-10 h-10"
          onClick={onVideoRemove}
        >
          <X className="w-5 h-5" strokeWidth={1.5} />
        </Button>

        {/* Duration badge */}
        <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
          {videoRef.current ? `${Math.floor(videoRef.current.duration)}ש׳` : "טוען..."}
        </div>
      </motion.div>
    );
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Button
          type="button"
          variant="outline"
          className="w-full h-24 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-purple-500 hover:bg-purple-50/50 rounded-2xl transition-all"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          ) : (
            <>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Video className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
              <span className="text-sm font-medium text-gray-700">הוסף וידאו (עד {maxDurationSeconds} שניות)</span>
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
};
