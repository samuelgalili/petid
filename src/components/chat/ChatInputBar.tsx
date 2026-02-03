import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Image, Mic, Smile, Sparkles, X, Plus, Camera, MapPin, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
  placeholder?: string;
}

const quickActions = [
  { id: "camera", icon: Camera, label: "צלם תמונה", color: "from-pink-500 to-rose-500" },
  { id: "location", icon: MapPin, label: "שתף מיקום", color: "from-green-500 to-emerald-500" },
  { id: "calendar", icon: Calendar, label: "קבע תור", color: "from-blue-500 to-cyan-500" },
];

const ChatInputBar = ({
  value,
  onChange,
  onSend,
  onKeyPress,
  isLoading,
  placeholder = "כתוב הודעה...",
}: ChatInputBarProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [value]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingInterval.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
      setRecordingTime(0);
    }
    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleMicPress = () => {
    setIsRecording(!isRecording);
    if (isRecording) {
      // Stop recording logic would go here
    }
  };

  const hasContent = value.trim().length > 0;

  return (
    <div className="relative">
      {/* Quick Actions Overlay */}
      <AnimatePresence>
        {showQuickActions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-full left-0 right-0 mb-2 px-4"
          >
            <div className="bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 p-3 shadow-xl">
              <div className="flex items-center justify-around gap-2">
                {quickActions.map((action, index) => (
                  <motion.button
                    key={action.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex flex-col items-center gap-1.5 p-3"
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center shadow-lg",
                      action.color
                    )}>
                      <action.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-heebo">{action.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording Overlay */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute bottom-full left-0 right-0 mb-2 px-4"
          >
            <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 backdrop-blur-xl rounded-2xl border border-red-500/30 p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-3 h-3 bg-red-500 rounded-full"
                  />
                  <span className="text-sm font-heebo text-foreground">מקליט...</span>
                  <span className="text-sm font-mono text-red-500">{formatTime(recordingTime)}</span>
                </div>
                <button
                  onClick={() => setIsRecording(false)}
                  className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Audio Waveform Animation */}
              <div className="flex items-center justify-center gap-1 mt-3 h-8">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-gradient-to-t from-red-500 to-orange-400 rounded-full"
                    animate={{
                      height: [8, Math.random() * 24 + 8, 8],
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.05,
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Input Bar */}
      <div className="px-4 py-3 bg-card/80 backdrop-blur-xl border-t border-border/50">
        <motion.div
          animate={{
            boxShadow: isFocused 
              ? "0 0 20px rgba(30, 87, 153, 0.15)" 
              : "0 0 0px rgba(0, 0, 0, 0)",
          }}
          className={cn(
            "flex items-end gap-2 bg-muted/40 rounded-3xl border transition-all duration-300 p-1.5",
            isFocused ? "border-petid-blue/40 bg-background" : "border-border/50"
          )}
        >
          {/* Plus/Close Button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowQuickActions(!showQuickActions)}
            className={cn(
              "w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full transition-all",
              showQuickActions 
                ? "bg-muted text-foreground rotate-45" 
                : "text-muted-foreground hover:text-petid-blue hover:bg-muted/50"
            )}
          >
            <Plus className="w-5 h-5 transition-transform" style={{ transform: showQuickActions ? 'rotate(45deg)' : 'none' }} />
          </motion.button>

          {/* Input Container */}
          <div className="flex-1 flex items-end">
            <textarea
              ref={inputRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onKeyPress(e as unknown as React.KeyboardEvent);
                }
              }}
              onFocus={() => {
                setIsFocused(true);
                setShowQuickActions(false);
              }}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              rows={1}
              className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-[15px] placeholder:text-muted-foreground resize-none py-2 px-2 font-heebo max-h-[120px] leading-relaxed"
              disabled={isLoading}
              dir="rtl"
            />
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {!hasContent && (
              <>
                {/* Image Button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-petid-blue rounded-full transition-colors"
                >
                  <Image className="w-5 h-5" />
                </motion.button>

                {/* Mic Button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleMicPress}
                  className={cn(
                    "w-9 h-9 flex items-center justify-center rounded-full transition-all",
                    isRecording 
                      ? "bg-red-500 text-white" 
                      : "text-muted-foreground hover:text-petid-blue"
                  )}
                >
                  <Mic className="w-5 h-5" />
                </motion.button>
              </>
            )}

            {/* Send Button */}
            <AnimatePresence mode="wait">
              {hasContent ? (
                <motion.button
                  key="send"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onSend}
                  disabled={isLoading}
                  className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-petid-blue via-petid-teal to-petid-gold rounded-full text-white disabled:opacity-50 shadow-lg"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              ) : (
                <motion.button
                  key="sparkle"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-petid-gold/20 to-petid-gold/10 rounded-full text-petid-gold"
                >
                  <Sparkles className="w-5 h-5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Typing Indicator / Suggestions */}
        <AnimatePresence>
          {isFocused && !hasContent && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 overflow-hidden"
            >
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {["🐕 מידע על הכלב שלי", "💉 תזכורת חיסונים", "🍖 המלצות מזון"].map((suggestion, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onChange(suggestion)}
                    className="flex-shrink-0 px-3 py-1.5 bg-muted/50 hover:bg-muted rounded-full text-xs text-muted-foreground hover:text-foreground font-heebo transition-colors border border-border/50"
                  >
                    {suggestion}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ChatInputBar;
