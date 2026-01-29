import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Radio,
  X,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  RotateCcw,
  Users,
  Heart,
  MessageCircle,
  Share2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
}

interface FloatingHeart {
  id: string;
  x: number;
}

export const LiveBroadcaster = () => {
  const { streamId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<any>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [viewerCount, setViewerCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [duration, setDuration] = useState(0);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!streamId || !user) return;

    fetchStream();
    startCamera();
    subscribeToUpdates();

    // Duration timer
    const timer = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
      stopCamera();
    };
  }, [streamId, user]);

  const fetchStream = async () => {
    const { data, error } = await (supabase.from("live_streams") as any)
      .select("*")
      .eq("id", streamId)
      .single();

    if (error || !data) {
      toast.error("השידור לא נמצא");
      navigate("/");
      return;
    }

    if (data.user_id !== user?.id) {
      toast.error("אין לך הרשאה לשדר");
      navigate(`/live/${streamId}`);
      return;
    }

    setStream(data);
    setViewerCount(data.viewer_count || 0);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true,
      });
      setMediaStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("לא ניתן לגשת למצלמה");
    }
  };

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
    }
  };

  const toggleVideo = () => {
    if (mediaStream) {
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (mediaStream) {
      const audioTrack = mediaStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioOn(audioTrack.enabled);
      }
    }
  };

  const flipCamera = async () => {
    stopCamera();
    const newFacingMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacingMode);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: true,
      });
      setMediaStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Error flipping camera:", error);
    }
  };

  const subscribeToUpdates = () => {
    // Subscribe to stream updates
    const streamChannel = supabase
      .channel(`broadcast-stream-${streamId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "live_streams",
          filter: `id=eq.${streamId}`,
        },
        (payload) => {
          setStream(payload.new);
          setViewerCount((payload.new as any).viewer_count || 0);
        }
      )
      .subscribe();

    // Subscribe to comments
    const commentsChannel = supabase
      .channel(`broadcast-comments-${streamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_stream_comments",
          filter: `stream_id=eq.${streamId}`,
        },
        (payload) => {
          setComments((prev) => [...prev.slice(-49), payload.new as Comment]);
          commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      )
      .subscribe();

    // Subscribe to reactions
    const reactionsChannel = supabase
      .channel(`broadcast-reactions-${streamId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_stream_reactions",
          filter: `stream_id=eq.${streamId}`,
        },
        () => {
          const heartId = crypto.randomUUID();
          const x = Math.random() * 60 + 20;
          setFloatingHearts((prev) => [...prev, { id: heartId, x }]);
          setTimeout(() => {
            setFloatingHearts((prev) => prev.filter((h) => h.id !== heartId));
          }, 2000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(streamChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(reactionsChannel);
    };
  };

  const endStream = async () => {
    stopCamera();

    await (supabase.from("live_streams") as any)
      .update({
        status: "ended",
        ended_at: new Date().toISOString(),
      })
      .eq("id", streamId);

    toast.success("השידור הסתיים");
    navigate("/");
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Video Preview */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 w-full h-full object-cover ${
            facingMode === "user" ? "scale-x-[-1]" : ""
          } ${!isVideoOn ? "hidden" : ""}`}
        />

        {!isVideoOn && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
            <CameraOff className="w-16 h-16 text-white/50" />
          </div>
        )}

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center justify-between" dir="rtl">
            <div className="flex items-center gap-2">
              <Badge className="bg-red-600 text-white border-none gap-1">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                LIVE
              </Badge>
              <span className="text-white/70 text-sm">
                {formatDuration(duration)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-white/70 text-sm">
                <Eye className="w-4 h-4" />
                {viewerCount}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-white bg-red-600 hover:bg-red-700"
                onClick={() => setShowEndDialog(true)}
              >
                סיים שידור
              </Button>
            </div>
          </div>
        </div>

        {/* Floating Hearts */}
        <AnimatePresence>
          {floatingHearts.map((heart) => (
            <motion.div
              key={heart.id}
              initial={{ opacity: 1, y: 0, scale: 0 }}
              animate={{ opacity: 0, y: -200, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="absolute bottom-40 pointer-events-none"
              style={{ left: `${heart.x}%` }}
            >
              <Heart className="w-8 h-8 text-red-500 fill-red-500" />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Comments */}
        <div className="absolute bottom-24 left-0 right-0 h-48 px-4 overflow-y-auto" dir="rtl">
          <div className="space-y-2">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="bg-black/50 backdrop-blur-sm rounded-xl px-3 py-2 max-w-[80%]"
              >
                <p className="text-white text-sm">{comment.content}</p>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>
        </div>

        {/* Controls */}
        <div className="absolute bottom-4 left-0 right-0 px-4">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className={`h-14 w-14 rounded-full ${
                isVideoOn ? "bg-white/20" : "bg-red-600"
              } text-white`}
              onClick={toggleVideo}
            >
              {isVideoOn ? (
                <Camera className="w-6 h-6" />
              ) : (
                <CameraOff className="w-6 h-6" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={`h-14 w-14 rounded-full ${
                isAudioOn ? "bg-white/20" : "bg-red-600"
              } text-white`}
              onClick={toggleAudio}
            >
              {isAudioOn ? (
                <Mic className="w-6 h-6" />
              ) : (
                <MicOff className="w-6 h-6" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-14 w-14 rounded-full bg-white/20 text-white"
              onClick={flipCamera}
            >
              <RotateCcw className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </div>

      {/* End Stream Dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>סיים את השידור?</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך לסיים את השידור? פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={endStream} className="bg-red-600 hover:bg-red-700">
              סיים שידור
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
