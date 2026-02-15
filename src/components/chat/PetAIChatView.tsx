/**
 * PetAIChatView — PetID's flagship AI chat interface.
 * V70: Paw-print wallpaper, rich media cards, action buttons,
 * Send/Voice toggle, intelligence typing indicator, full RTL.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Mic,
  Plus,
  Camera,
  Image as ImageIcon,
  FileText,
  X,
  Sparkles,
  ChevronLeft,
  ShoppingBag,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

/* ─── Types ─── */

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  products?: ChatProduct[];
  actions?: ChatAction[];
}

export interface ChatProduct {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  salePrice?: number | null;
}

export interface ChatAction {
  id: string;
  label: string;
  icon?: string;
  variant?: "primary" | "secondary" | "destructive";
}

interface PetAIChatViewProps {
  messages: ChatMessage[];
  petName: string;
  petAvatarUrl?: string;
  userAvatarUrl?: string;
  isTyping?: boolean;
  onSendMessage: (text: string) => void;
  onProductClick?: (productId: string) => void;
  onActionClick?: (actionId: string) => void;
  onAttachment?: (type: "camera" | "gallery" | "document") => void;
}

/* ─── Paw Print SVG Pattern ─── */

const PawPrintPattern = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" aria-hidden="true">
    <defs>
      <pattern id="paw-pattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
        <text x="20" y="45" fontSize="24" fill="currentColor">🐾</text>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#paw-pattern)" />
  </svg>
);

/* ─── Typing Indicator ─── */

const TypingIndicator = ({ petName }: { petName: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 10 }}
    className="flex items-start gap-2.5 max-w-[85%]"
  >
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent p-[1.5px] flex-shrink-0">
      <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
        <Sparkles className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
      </div>
    </div>
    <div className="bg-card border border-border/40 rounded-2xl rounded-tr-md px-4 py-3">
      <p className="text-[11px] text-muted-foreground mb-1.5 font-medium">
        מנתח את הנתונים של {petName}...
      </p>
      <div className="flex items-center gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-primary/60"
            animate={{
              y: [0, -6, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.12,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  </motion.div>
);

/* ─── Product Card (inline) ─── */

const InlineProductCard = ({
  product,
  onClick,
}: {
  product: ChatProduct;
  onClick?: () => void;
}) => (
  <motion.button
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className="flex-shrink-0 w-36 bg-card border border-border/40 rounded-2xl overflow-hidden text-right hover:shadow-md transition-shadow"
  >
    {product.imageUrl ? (
      <div className="w-full h-24 bg-muted">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    ) : (
      <div className="w-full h-24 bg-muted/50 flex items-center justify-center">
        <ShoppingBag className="w-8 h-8 text-muted-foreground/30" strokeWidth={1.5} />
      </div>
    )}
    <div className="p-2.5">
      <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight mb-1.5">
        {product.name}
      </p>
      <div className="flex items-center gap-1.5">
        {product.salePrice ? (
          <>
            <span className="text-sm font-bold text-primary">₪{product.salePrice}</span>
            <span className="text-[10px] text-muted-foreground line-through">₪{product.price}</span>
          </>
        ) : (
          <span className="text-sm font-bold text-foreground">₪{product.price}</span>
        )}
      </div>
    </div>
  </motion.button>
);

/* ─── Action Button (inline) ─── */

const InlineActionButton = ({
  action,
  onClick,
}: {
  action: ChatAction;
  onClick?: () => void;
}) => (
  <motion.button
    initial={{ opacity: 0, y: 5 }}
    animate={{ opacity: 1, y: 0 }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className={cn(
      "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors",
      action.variant === "destructive"
        ? "bg-destructive/10 text-destructive border-destructive/20"
        : action.variant === "secondary"
          ? "bg-muted text-foreground border-border/40"
          : "bg-primary/10 text-primary border-primary/20"
    )}
  >
    {action.label}
  </motion.button>
);

/* ─── Attachment Menu ─── */

const AttachmentMenu = ({
  onSelect,
  onClose,
}: {
  onSelect: (type: "camera" | "gallery" | "document") => void;
  onClose: () => void;
}) => {
  const items = [
    { type: "camera" as const, icon: Camera, label: "צלם תמונה", gradient: "from-primary to-accent" },
    { type: "gallery" as const, icon: ImageIcon, label: "גלריה", gradient: "from-accent to-primary" },
    { type: "document" as const, icon: FileText, label: "מסמכים", gradient: "from-muted-foreground to-foreground" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="absolute bottom-full left-0 right-0 mb-2 px-4"
    >
      <div className="bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 p-3 shadow-xl">
        <div className="flex items-center justify-around gap-2">
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.type}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  onSelect(item.type);
                  onClose();
                }}
                className="flex flex-col items-center gap-1.5 p-3"
              >
                <div className={cn("w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center shadow-lg", item.gradient)}>
                  <Icon className="w-5 h-5 text-primary-foreground" strokeWidth={1.5} />
                </div>
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Main Component ─── */

export const PetAIChatView = ({
  messages,
  petName,
  petAvatarUrl,
  userAvatarUrl,
  isTyping = false,
  onSendMessage,
  onProductClick,
  onActionClick,
  onAttachment,
}: PetAIChatViewProps) => {
  const { direction } = useLanguage();
  const isRtl = direction === "rtl";
  const [inputValue, setInputValue] = useState("");
  const [showAttachments, setShowAttachments] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const hasContent = inputValue.trim().length > 0;

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // Detect scroll position for "scroll down" button
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollDown(distanceFromBottom > 120);
    };
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [inputValue]);

  const handleSend = () => {
    if (!hasContent) return;
    onSendMessage(inputValue.trim());
    setInputValue("");
    if (inputRef.current) inputRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col h-full bg-background" dir={isRtl ? "rtl" : "ltr"}>
      {/* ═══ Header ═══ */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card/80 backdrop-blur-2xl border-b border-border/40 z-10">
        <ChevronLeft className={cn("w-5 h-5 text-muted-foreground", isRtl && "rotate-180")} strokeWidth={1.5} />

        <div className="relative">
          {petAvatarUrl ? (
            <img src={petAvatarUrl} alt={petName} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent p-[2px]">
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.5} />
              </div>
            </div>
          )}
          {/* Active indicator */}
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-card"
          />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold text-foreground">PetID AI</h2>
            <Sparkles className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
          </div>
          <p className="text-[11px] text-muted-foreground">מומחה אישי ל{petName}</p>
        </div>
      </div>

      {/* ═══ Chat Thread ═══ */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        {/* Paw-print wallpaper */}
        <PawPrintPattern />

        <div className="relative z-10 px-4 py-4 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex items-end gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}
              >
                {/* Avatar */}
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent p-[1.5px] flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                    </div>
                  </div>
                )}

                <div className={cn("max-w-[80%] space-y-2", isUser ? "items-end" : "items-start")}>
                  {/* Message Bubble */}
                  <div
                    className={cn(
                      "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                      isUser
                        ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-bl-md shadow-md"
                        : "bg-card border border-border/40 text-foreground rounded-tr-md"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p className={cn(
                      "text-[10px] mt-1.5",
                      isUser ? "text-primary-foreground/60" : "text-muted-foreground"
                    )}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>

                  {/* Product Recommendation Cards */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                      {msg.products.map((product) => (
                        <InlineProductCard
                          key={product.id}
                          product={product}
                          onClick={() => onProductClick?.(product.id)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {msg.actions.map((action) => (
                        <InlineActionButton
                          key={action.id}
                          action={action}
                          onClick={() => onActionClick?.(action.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Typing Indicator */}
          <AnimatePresence>
            {isTyping && <TypingIndicator petName={petName} />}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Scroll-down FAB */}
      <AnimatePresence>
        {showScrollDown && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToBottom}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 w-9 h-9 rounded-full bg-card/90 backdrop-blur-md border border-border/50 flex items-center justify-center shadow-lg"
          >
            <ArrowDown className="w-4 h-4 text-foreground" strokeWidth={1.5} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ═══ Input Bar ═══ */}
      <div className="relative">
        <AnimatePresence>
          {showAttachments && (
            <AttachmentMenu
              onSelect={(type) => onAttachment?.(type)}
              onClose={() => setShowAttachments(false)}
            />
          )}
        </AnimatePresence>

        <div className="px-4 py-3 bg-card/80 backdrop-blur-xl border-t border-border/50">
          <div className={cn(
            "flex items-end gap-2 bg-muted/40 rounded-3xl border transition-all duration-300 p-1.5",
            "border-border/50 focus-within:border-primary/40 focus-within:bg-background"
          )}>
            {/* Plus Button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowAttachments(!showAttachments)}
              className={cn(
                "w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full transition-all",
                showAttachments
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-primary hover:bg-muted/50"
              )}
            >
              <motion.div animate={{ rotate: showAttachments ? 45 : 0 }} transition={{ duration: 0.2 }}>
                <Plus className="w-5 h-5" strokeWidth={1.5} />
              </motion.div>
            </motion.button>

            {/* Text Input */}
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowAttachments(false)}
              placeholder={`שאל על ${petName}...`}
              rows={1}
              className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-[15px] placeholder:text-muted-foreground resize-none py-2 px-2 max-h-[120px] leading-relaxed"
              dir="rtl"
            />

            {/* Send / Voice Toggle */}
            <AnimatePresence mode="wait">
              {hasContent ? (
                <motion.button
                  key="send"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSend}
                  className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-primary rounded-full text-primary-foreground shadow-sm"
                >
                  <Send className="w-4 h-4" strokeWidth={1.5} />
                </motion.button>
              ) : (
                <motion.button
                  key="mic"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-primary/10 hover:bg-primary/20 rounded-full text-primary transition-colors"
                >
                  <Mic className="w-5 h-5" strokeWidth={1.5} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
