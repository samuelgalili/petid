import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Image as ImageIcon, Mic, Sparkles, X, Plus, Camera, MapPin, Calendar, Check, PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ChatInputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
  placeholder?: string;
  onQuickAction?: (actionId: string) => void;
  onAttachment?: (type: "scan" | "camera" | "gallery" | "location") => void;
  onVirtualTreat?: () => void;
}

const ChatInputBar = ({
  value,
  onChange,
  onSend,
  onKeyPress,
  isLoading,
  placeholder = "כתוב הודעה...",
  onQuickAction,
  onAttachment,
  onVirtualTreat,
}: ChatInputBarProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPills, setShowPills] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [clickedPill, setClickedPill] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Dog-first quick action pills
  const dogPills = [
    { id: "park", emoji: "📍", label: "בוא לגינה", action: () => onAttachment?.("location") },
    { id: "treat", emoji: "🦴", label: "שלח צ׳ופר", action: () => onVirtualTreat?.() },
    { id: "photo", emoji: "📸", label: "תמונה של שיבס", action: () => onAttachment?.("camera") },
  ];

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
    if (isRecording) {
      setIsRecording(false);
      toast({
        title: "ההקלטה נשמרה",
        description: `משך ההקלטה: ${formatTime(recordingTime)}`,
      });
      onChange("🎤 הודעה קולית נשלחה");
      setTimeout(() => onSend(), 100);
    } else {
      setIsRecording(true);
      toast({
        title: "מקליט...",
        description: "לחץ שוב לעצירה",
      });
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast({
        title: "תמונה נבחרה",
        description: file.name,
      });
      onChange(`📷 תמונה: ${file.name}`);
      e.target.value = "";
    }
  };

  const handlePillClick = (pill: typeof dogPills[0]) => {
    setClickedPill(pill.id);
    setTimeout(() => {
      setClickedPill(null);
      setShowPills(false);
    }, 400);
    pill.action();
  };

  const handleSparkleClick = () => {
    const suggestions = [
      "מה הטיפולים הנדרשים לכלב שלי?",
      "מתי החיסון הבא?",
      "איפה הווטרינר הקרוב אליי?",
      "איך לטפל בפרווה של החתול?",
    ];
    const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
    onChange(randomSuggestion);
    toast({
      title: "✨ הצעה חכמה",
      description: "נוספה שאלה מומלצת",
    });
  };

  const hasContent = value.trim().length > 0;

  return (
    <div className="relative">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Dog-First Quick Action Pills */}
      <AnimatePresence>
        {showPills && !isFocused && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="absolute bottom-full left-0 right-0 mb-2 px-4"
          >
            <div className="flex items-center justify-center gap-2">
              {dogPills.map((pill, i) => (
                <motion.button
                  key={pill.id}
                  initial={{ opacity: 0, scale: 0.8, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 8 }}
                  transition={{ delay: i * 0.06, type: "spring", stiffness: 400, damping: 18 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handlePillClick(pill)}
                  className={cn(
                    "flex items-center gap-1.5 px-3.5 py-2 rounded-full",
                    "bg-card/90 backdrop-blur-xl border border-border/40 shadow-lg",
                    "text-sm font-medium text-foreground",
                    "active:shadow-md transition-shadow",
                    clickedPill === pill.id && "ring-2 ring-primary/40 bg-primary/10"
                  )}
                >
                  <span className="text-base">{pill.emoji}</span>
                  <span className="text-[13px]">{pill.label}</span>
                </motion.button>
              ))}
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
            <div className="bg-gradient-to-r from-destructive/10 to-orange-500/10 backdrop-blur-xl rounded-2xl border border-destructive/30 p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-3 h-3 bg-destructive rounded-full"
                  />
                  <span className="text-sm text-foreground">מקליט...</span>
                  <span className="text-sm font-mono text-destructive">{formatTime(recordingTime)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setIsRecording(false);
                      toast({ title: "ההקלטה בוטלה" });
                    }}
                    className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleMicPress}
                    className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white"
                  >
                    <Check className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
              
              {/* Audio Waveform Animation */}
              <div className="flex items-center justify-center gap-1 mt-3 h-8">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-gradient-to-t from-destructive to-orange-400 rounded-full"
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
              ? "0 0 20px hsl(var(--primary) / 0.12)" 
              : "0 0 0px transparent",
          }}
          className={cn(
            "flex items-end gap-2 bg-muted/40 rounded-3xl border transition-all duration-300 p-1.5",
            isFocused ? "border-primary/30 bg-background" : "border-border/50"
          )}
        >
          {/* Paw Icon / Toggle Pills */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowPills(!showPills)}
            className={cn(
              "w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full transition-all",
              showPills 
                ? "bg-primary text-primary-foreground" 
                : "text-muted-foreground hover:text-primary hover:bg-muted/50"
            )}
          >
            <motion.div
              animate={{ rotate: showPills ? 15 : 0, scale: showPills ? 1.1 : 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <PawPrint className="w-5 h-5" strokeWidth={1.8} />
            </motion.div>
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
                  onSend();
                }
              }}
              onFocus={() => {
                setIsFocused(true);
                setShowPills(false);
              }}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              rows={1}
              className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-[15px] placeholder:text-muted-foreground resize-none py-2 px-2 max-h-[120px] leading-relaxed"
              disabled={isLoading || isRecording}
              dir="rtl"
            />
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <AnimatePresence mode="popLayout">
              {!hasContent && !isRecording && (
                <>
                  <motion.button
                    key="image"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleImageClick}
                    className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-full transition-colors"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </motion.button>

                  <motion.button
                    key="mic"
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleMicPress}
                    className="w-9 h-9 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-full transition-colors"
                  >
                    <Mic className="w-5 h-5" />
                  </motion.button>
                </>
              )}
            </AnimatePresence>

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
                  className="w-10 h-10 flex items-center justify-center bg-primary rounded-full text-primary-foreground disabled:opacity-50 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              ) : (
                <motion.button
                  key="sparkle"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  whileHover={{ scale: 1.1, rotate: 15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSparkleClick}
                  className="w-10 h-10 flex items-center justify-center bg-primary/10 hover:bg-primary/20 rounded-full text-primary transition-colors"
                >
                  <Sparkles className="w-5 h-5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Focused Suggestions */}
        <AnimatePresence>
          {isFocused && !hasContent && !isRecording && (
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
                    onClick={() => {
                      onChange(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="flex-shrink-0 px-3 py-1.5 bg-muted/50 hover:bg-muted rounded-full text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/50"
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
