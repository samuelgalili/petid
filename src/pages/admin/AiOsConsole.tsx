/**
 * AI OS Console — The main AI Operating System interface
 * Premium ChatGPT-style UX with agent activity, approvals, and workflows
 */
import { useState, useRef, useEffect } from "react";
import { useAiOsChat, AiOsMessage } from "@/hooks/useAiOsChat";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { 
  Send, Square, Plus, Bot, Shield, Activity, Clock, 
  ChevronRight, AlertTriangle, CheckCircle2, XCircle, 
  Zap, BarChart3, ShoppingCart, Users, MessageSquare,
  Package, DollarSign, Settings, ArrowLeft, Sparkles,
  PanelRightOpen, PanelRightClose, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

// ===== SUGGESTION CARDS =====
const SUGGESTIONS = [
  { icon: BarChart3, label: "דוח מכירות שבועי", prompt: "הצג דוח מכירות מפורט לשבוע האחרון", color: "text-blue-500" },
  { icon: Users, label: "לידים לא פעילים", prompt: "מצא לקוחות שלא רכשו ב-30 יום ותן המלצות לפולואפ", color: "text-emerald-500" },
  { icon: Package, label: "מלאי נמוך", prompt: "הצג מוצרים עם מלאי נמוך ותן המלצות להזמנה מחדש", color: "text-amber-500" },
  { icon: MessageSquare, label: "קמפיין שיווקי", prompt: "צור קמפיין שיווקי לשבוע הקרוב כולל פוסטים לרשתות חברתיות", color: "text-purple-500" },
  { icon: DollarSign, label: "סיכום פיננסי", prompt: "תן סיכום פיננסי של החודש: הכנסות, הוצאות, רווח", color: "text-green-500" },
  { icon: ShoppingCart, label: "עגלות נטושות", prompt: "הצג עגלות נטושות ב-48 שעות האחרונות ותכנן מסע שחזור", color: "text-red-500" },
];

// ===== ACTIVITY PANEL =====
const ActivityPanel = ({ isOpen }: { isOpen: boolean }) => {
  const [executions, setExecutions] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    fetchActivity();
  }, [isOpen]);

  const fetchActivity = async () => {
    const [execRes, incRes] = await Promise.all([
      (supabase as any).from("ai_os_tool_executions").select("*").order("created_at", { ascending: false }).limit(20),
      (supabase as any).from("ai_os_security_incidents").select("*").order("created_at", { ascending: false }).limit(10),
    ]);
    if (execRes.data) setExecutions(execRes.data);
    if (incRes.data) setIncidents(incRes.data);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case "blocked": case "failed": return <XCircle className="w-3.5 h-3.5 text-destructive" />;
      case "pending": return <Clock className="w-3.5 h-3.5 text-amber-500" />;
      default: return <Activity className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 340, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          className="border-l border-border bg-background overflow-y-auto flex-shrink-0"
        >
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Agent Activity
            </h3>
          </div>

          {/* Security Incidents */}
          {incidents.length > 0 && (
            <div className="p-3 border-b border-border">
              <h4 className="text-xs font-semibold text-destructive flex items-center gap-1.5 mb-2">
                <Shield className="w-3.5 h-3.5" />
                Security Alerts
              </h4>
              {incidents.slice(0, 3).map((inc: any) => (
                <div key={inc.id} className="flex items-start gap-2 p-2 rounded-lg bg-destructive/5 mb-1.5 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">{inc.incident_type}</p>
                    <p className="text-muted-foreground line-clamp-2">{inc.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tool Executions */}
          <div className="p-3">
            <h4 className="text-xs font-semibold text-muted-foreground mb-2">Recent Executions</h4>
            {executions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No executions yet</p>
            ) : (
              executions.map((exec: any) => (
                <div key={exec.id} className="flex items-center gap-2.5 py-2 border-b border-border/50 last:border-0">
                  {getStatusIcon(exec.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{exec.tool_name}</p>
                    <p className="text-[10px] text-muted-foreground">{exec.agent_slug} · Risk: {(exec.risk_score * 100).toFixed(0)}%</p>
                  </div>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                    exec.status === "completed" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                    exec.status === "blocked" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                    exec.status === "pending" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                  )}>
                    {exec.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ===== MESSAGE BUBBLE =====
const MessageBubble = ({ message }: { message: AiOsMessage }) => {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center my-3">
        <div className="px-4 py-2 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3 max-w-3xl mx-auto px-4", isUser ? "flex-row-reverse" : "flex-row")}
    >
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center",
        isUser ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        {isUser ? (
          <span className="text-xs font-bold">אני</span>
        ) : (
          <Bot className="w-4 h-4 text-foreground" />
        )}
      </div>

      {/* Content */}
      <div className={cn(
        "flex-1 min-w-0",
        isUser ? "text-right" : "text-right"
      )}>
        <div className={cn(
          "inline-block rounded-2xl px-4 py-3 max-w-full text-sm",
          isUser 
            ? "bg-primary text-primary-foreground rounded-br-sm" 
            : "bg-muted/50 text-foreground rounded-bl-sm"
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none text-right [&>*]:text-right" dir="rtl">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ===== TYPING INDICATOR =====
const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex gap-3 max-w-3xl mx-auto px-4"
  >
    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
      <Bot className="w-4 h-4 text-foreground" />
    </div>
    <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-muted/50 rounded-bl-sm">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-muted-foreground/50"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  </motion.div>
);

// ===== MAIN COMPONENT =====
export default function AiOsConsole() {
  const { messages, isStreaming, sendMessage, stopStreaming, clearChat } = useAiOsChat();
  const [input, setInput] = useState("");
  const [activityOpen, setActivityOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="h-screen flex flex-col bg-background" dir="rtl">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-14 border-b border-border bg-background/80 backdrop-blur-xl flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/growo")} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground">PetID AI OS</h1>
              <p className="text-[10px] text-muted-foreground">מערכת הפעלה עסקית</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={clearChat} className="h-8 w-8" title="שיחה חדשה">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setActivityOpen(!activityOpen)} 
            className="h-8 w-8"
            title="פעילות סוכנים"
          >
            {activityOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto py-4">
            {isEmpty ? (
              /* Welcome screen */
              <div className="flex flex-col items-center justify-center h-full px-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-6"
                >
                  <Sparkles className="w-8 h-8 text-primary-foreground" />
                </motion.div>
                <h2 className="text-xl font-bold text-foreground mb-2">מה נעשה היום?</h2>
                <p className="text-sm text-muted-foreground mb-8 text-center max-w-md">
                  AI OS מנהל את העסק שלך. שאל כל שאלה, בקש דוחות, הפעל קמפיינים, ועוד.
                </p>
                
                <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => sendMessage(s.prompt)}
                      className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-right group"
                    >
                      <s.icon className={cn("w-5 h-5 flex-shrink-0 mt-0.5", s.color)} />
                      <span className="text-xs font-medium text-foreground leading-relaxed">{s.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map(msg => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {isStreaming && messages[messages.length - 1]?.role === "user" && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-border bg-background/80 backdrop-blur-xl p-3 flex-shrink-0">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-end gap-2 bg-muted/30 border border-border rounded-2xl p-2 focus-within:border-primary/50 transition-colors">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleTextareaInput}
                  onKeyDown={handleKeyDown}
                  placeholder="מה תרצה לעשות?"
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none px-2 py-1.5 max-h-40 min-h-[36px]"
                  dir="rtl"
                />
                {isStreaming ? (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={stopStreaming}
                    className="h-9 w-9 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive flex-shrink-0"
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="h-9 w-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0 disabled:opacity-30"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-2">
                AI OS · כל פעולה עוברת אימות אבטחה וניקוד סיכון
              </p>
            </div>
          </div>
        </div>

        {/* Activity Panel */}
        <ActivityPanel isOpen={activityOpen} />
      </div>
    </div>
  );
}
