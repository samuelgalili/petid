import { useRef, useEffect, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, Sparkles, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import { MipoLogo } from "@/components/MipoLogo";
import HorizontalDatePicker from "@/components/chat/HorizontalDatePicker";
import ChatInputBar from "@/components/chat/ChatInputBar";
import { ChatActionButton, extractActionTags, cleanActionTags } from "@/components/chat/ChatActionButton";
import { ChatProductCards } from "@/components/chat/ChatProductCards";
import { GroomingServicePicker } from "@/components/chat/GroomingServicePicker";
import { QuickReplySuggestions } from "@/components/chat/QuickReplySuggestions";
import { AppointmentPicker } from "@/components/chat/AppointmentPicker";
import { TrainingCategoryPicker } from "@/components/chat/TrainingCategoryPicker";
import { TrainingSubPicker } from "@/components/chat/TrainingSubPicker";
import { DogParkPicker } from "@/components/chat/DogParkPicker";
import { DocumentTypePicker } from "@/components/chat/DocumentTypePicker";
import { BoardingTypePicker } from "@/components/chat/BoardingTypePicker";
import { StoreCategoryPicker } from "@/components/chat/StoreCategoryPicker";
import { AdoptionTraitPicker } from "@/components/chat/AdoptionTraitPicker";
import { AdoptionRequirementPicker } from "@/components/chat/AdoptionRequirementPicker";
import { ChatProvider, useChatContext, type Message } from "@/contexts/ChatContext";
import { useDataIntake, type IntakeType } from "@/hooks/useDataIntake";
import { Button } from "@/components/ui/button";
import { getCurrentUser, updateMyProfile } from "@/lib/mipoApi";
import { cn } from "@/lib/utils";

const ChatContent = () => {
  const {
    messages, setMessages,
    input, setInput,
    isLoading, setIsLoading,
    isTyping,
    userPets, selectedPet, setSelectedPet,
    showPetSelection, setShowPetSelection,
    showCategories, setShowCategories,
    showDatePicker, setShowDatePicker,
    selectedDate, setSelectedDate,
    pendingDateContext, setPendingDateContext,
    sendMessage, streamChat,
  } = useChatContext();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [headerHidden, setHeaderHidden] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const lastScrollTop = useRef(0);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/feed");
    }
  };

  // Auto-hide header on scroll down, show on scroll up + scroll-to-bottom detection
  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const st = el.scrollTop;
    if (st > lastScrollTop.current && st > 40) {
      setHeaderHidden(true);
    } else {
      setHeaderHidden(false);
    }
    // Show scroll-to-bottom button when not near bottom
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollDown(distFromBottom > 200);
    lastScrollTop.current = st;
  }, []);

  // V72 Data Intake
  const { triggerFilePicker } = useDataIntake({
    petId: selectedPet?.id || null,
    petName: selectedPet?.name || "החיה שלך",
  });

  const handleAttachment = useCallback(async (type: IntakeType) => {
    const result = await triggerFilePicker(type);
    if (!result || !result.userMessage) return;

    // Inject user message with attachment context
    const userMsg: Message = { role: "user", content: result.userMessage };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    // Categories handled via NLP

    try {
      // Send the AI prompt (includes triage metadata) as user context
      const aiContextMsg: Message = { role: "user", content: result.aiPrompt };
      // We send the visible user message + hidden AI prompt
      await streamChat([...messages, userMsg, aiContextMsg]);
    } catch (error) {
      console.error("Intake error:", error);
      toast({
        title: "שגיאה",
        description: error instanceof Error ? error.message : "משהו השתבש",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [triggerFilePicker, messages, setMessages, setIsLoading, streamChat, toast]);

  // Category buttons removed — NLP intent recognition handles categories via natural language

  const handlePetSelect = (petName: string) => {
    const pet = userPets.find(p => p.name === petName);
    if (pet) {
      setSelectedPet(pet);
      // Don't force category selection — user can type freely
      setMessages(prev => [
        ...prev,
        { role: "user", content: pet.name },
        { role: "assistant", content: `מעולה! איך אוכל לעזור היום עם ${pet.name}? אפשר לכתוב לי כל שאלה או לבחור קטגוריה 👇` }
      ]);
    } else {
      sendMessage(petName);
    }
  };

  // Category selection removed — handled via NLP intent recognition

  // Expert sphere selection removed — handled via NLP

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle ACTION tags from AI responses
  const handleActionTags = (content: string) => {
    const actions = extractActionTags(content);
    if (actions.includes("SHOW_CALENDAR")) {
      setPendingDateContext("grooming");
      setShowDatePicker(true);
    }
    const pickerActions: Array<{ action: string; key: keyof Message }> = [
      { action: "SHOW_GROOMING_SERVICES", key: "showGroomingPicker" },
      { action: "SHOW_APPOINTMENT_PICKER", key: "showAppointmentPicker" },
      { action: "SHOW_PARK_OPTIONS", key: "showDogParkPicker" },
      { action: "SHOW_DOCUMENT_TYPES", key: "showDocumentPicker" },
      { action: "SHOW_BOARDING_TYPES", key: "showBoardingPicker" },
      { action: "SHOW_STORE_CATEGORIES", key: "showStorePicker" },
      { action: "SHOW_ADOPTION_TRAITS", key: "showAdoptionTraits" },
      { action: "SHOW_ADOPTION_REQUIREMENTS", key: "showAdoptionRequirements" },
      { action: "SHOW_TRAINING_CATEGORIES", key: "showTrainingPicker" },
    ];

    for (const { action, key } of pickerActions) {
      if (actions.includes(action)) {
        setMessages(prev => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg?.role === "assistant") {
            updated[updated.length - 1] = { ...lastMsg, [key]: true };
          }
          return updated;
        });
      }
    }

    // Handle dynamic training sub-options
    const subMatch = content.match(/\[ACTION:SHOW_TRAINING_OPTIONS:([^\]]+)\]/);
    if (subMatch) {
      const options = subMatch[1].split("|").map(s => s.trim());
      setMessages(prev => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg?.role === "assistant") {
          updated[updated.length - 1] = { ...lastMsg, trainingSubOptions: options };
        }
        return updated;
      });
    }

  };

  // Also clean CARD tags from displayed content
  const cleanAllTags = (content: string) => {
    return cleanActionTags(content).replace(/\[CARD:\w+:.*?\]/g, "").trim();
  };

  // Watch for new assistant messages and process action tags
  const lastProcessedRef = useRef<string>("");
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant" && lastMsg.content !== lastProcessedRef.current) {
      lastProcessedRef.current = lastMsg.content;
      handleActionTags(lastMsg.content);
    }
  }, [messages]);

  const handleActionClick = (actionTag: string) => {
    switch (actionTag) {
      case "SHOW_CALENDAR":
        setShowDatePicker(true);
        break;
      case "UPLOAD_DOCUMENT":
        void handleAttachment("scan");
        break;
      case "UPLOAD_PHOTO":
        void handleAttachment("gallery");
        break;
      default:
        break;
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setShowDatePicker(false);
    const formattedDate = date.toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const userMessage: Message = { role: "user", content: `בחרתי את ${formattedDate}` };
    setMessages(prev => [...prev, userMessage]);
    streamChat([...messages, userMessage]);
    setPendingDateContext(null);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Hide categories when user types freely
    setShowCategories(false);

    const userMessage: Message = { role: "user", content: input.trim(), timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      await streamChat([...messages, userMessage]);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "שגיאה",
        description: error instanceof Error ? error.message : "משהו השתבש",
        variant: "destructive",
      });
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Empty state is handled by the initial greeting in ChatProvider

  // Check if message has expanded content (pickers, cards etc.)
  const hasExpandedContent = (message: Message) => 
    message.showGroomingPicker ||
    message.showAppointmentPicker || message.showTrainingPicker || message.trainingSubOptions || 
    message.showDogParkPicker || message.showDocumentPicker || message.showBoardingPicker || 
    message.showStorePicker || message.showAdoptionTraits || message.showAdoptionRequirements;

  return (
    <div className="mipo-shell min-h-screen w-full overflow-x-hidden bg-white pb-[calc(5rem+env(safe-area-inset-bottom,0px))]" dir="rtl" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <SEO title="צ'אט AI" description="שאלו את העוזר החכם שלנו כל שאלה על חיות מחמד - אילוף, תזונה, בריאות" url="/chat" />
      
      <div className="sticky top-0 z-50 border-b border-black/[0.05] bg-white/90 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={handleBack}
            className="mipo-icon-button"
            aria-label="חזרה"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
          
          <div className="flex items-center gap-2">
            <MipoLogo variant="horizontal" size="sm" showAnimals={false} />
            <span className="rounded-full bg-mipo-soft px-2 py-1 text-[10px] font-semibold text-mipo-muted">AI</span>
          </div>
          
          <div className="w-11" />
        </div>
      </div>

      {/* Scientist Tab — ChatGPT/Gemini style */}
      <div className="flex flex-col h-[calc(100dvh-120px-env(safe-area-inset-bottom,0px))]">
        {/* Messages Container — clean white/dark bg */}
        <div
          ref={messagesContainerRef} 
          onScroll={handleMessagesScroll} 
          className="flex-1 overflow-y-auto overflow-x-hidden"
        >
          <div className="mx-auto max-w-2xl overflow-x-hidden">
          <AnimatePresence>
            {messages.map((message, index) => {
              const isUser = message.role === "user";

              return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="max-w-full overflow-hidden px-4 py-3"
              >
                <div className="flex gap-3 items-start">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {isUser ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mipo-soft">
                        <span className="text-xs font-bold text-primary">
                          {selectedPet?.name?.charAt(0) || "א"}
                        </span>
                      </div>
                    ) : (
                      <div className="mipo-gradient-ring p-[2px]">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white">
                          <Sparkles className="h-3.5 w-3.5 text-mipo-violet" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className={`flex-1 min-w-0 ${hasExpandedContent(message) ? 'max-w-full' : ''}`}>
                    {/* Role label */}
                    <p className="mb-1 text-[12px] font-semibold text-mipo-muted">
                      {isUser ? "את/ה" : "Mipo AI"}
                    </p>
                    
                    {/* Message text — no bubble, clean prose */}
                    <div className={cn(
                      "whitespace-pre-wrap break-words rounded-[1.35rem] px-4 py-3 text-[15px] leading-[1.7] text-mipo-ink",
                      isUser ? "bg-mipo-soft" : "border border-mipo-line/70 bg-mipo-surface shadow-[0_8px_24px_rgba(21,21,26,0.06)]",
                    )}>
                      {cleanAllTags(message.content)}
                    </div>
                    
                    {/* Action Buttons */}
                    {message.role === "assistant" && extractActionTags(message.content).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {extractActionTags(message.content).map((tag, i) => (
                          <ChatActionButton key={i} actionTag={tag} onAction={handleActionClick} />
                        ))}
                      </div>
                    )}

                    {/* Product Cards */}
                    {message.role === "assistant" && message.products && message.products.length > 0 && (
                      <ChatProductCards products={message.products} />
                    )}

                    {/* Grooming Service Picker */}
                    {message.role === "assistant" && message.showGroomingPicker && (
                      <GroomingServicePicker
                        petName={selectedPet?.name || "החיה שלך"}
                        onSelect={(service) => {
                          setMessages(prev => prev.map((m, i) => 
                            i === messages.indexOf(message) ? { ...m, showGroomingPicker: false } : m
                          ));
                          sendMessage(`בחרתי: ${service}`);
                        }}
                      />
                    )}

                    {/* Appointment Picker */}
                    {message.role === "assistant" && message.showAppointmentPicker && (
                      <AppointmentPicker
                        onConfirm={(date, time) => {
                          setMessages(prev => prev.map((m, i) =>
                            i === messages.indexOf(message) ? { ...m, showAppointmentPicker: false } : m
                          ));
                          const formatted = date.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
                          sendMessage(`בחרתי תאריך: ${formatted}, שעה: ${time}`);
                        }}
                      />
                    )}

                    {/* Dog Park Picker */}
                    {message.role === "assistant" && message.showDogParkPicker && (
                      <DogParkPicker
                        onSelect={(option) => {
                          setMessages(prev => prev.map((m, i) =>
                            i === messages.indexOf(message) ? { ...m, showDogParkPicker: false } : m
                          ));
                          sendMessage(option);
                        }}
                      />
                    )}

                    {/* Document Type Picker */}
                    {message.role === "assistant" && message.showDocumentPicker && (
                      <DocumentTypePicker
                        onSelect={(option) => {
                          setMessages(prev => prev.map((m, i) =>
                            i === messages.indexOf(message) ? { ...m, showDocumentPicker: false } : m
                          ));
                          sendMessage(option);
                        }}
                      />
                    )}

                    {/* Boarding Type Picker */}
                    {message.role === "assistant" && message.showBoardingPicker && (
                      <BoardingTypePicker
                        onSelect={(option) => {
                          setMessages(prev => prev.map((m, i) =>
                            i === messages.indexOf(message) ? { ...m, showBoardingPicker: false } : m
                          ));
                          sendMessage(option);
                        }}
                      />
                    )}

                    {/* Store Category Picker */}
                    {message.role === "assistant" && message.showStorePicker && (
                      <StoreCategoryPicker
                        onSelect={(option) => {
                          setMessages(prev => prev.map((m, i) =>
                            i === messages.indexOf(message) ? { ...m, showStorePicker: false } : m
                          ));
                          sendMessage(option);
                        }}
                      />
                    )}

                    {/* Adoption Trait Picker */}
                    {message.role === "assistant" && message.showAdoptionTraits && (
                      <AdoptionTraitPicker
                        onSelect={(traits) => {
                          setMessages(prev => prev.map((m, i) =>
                            i === messages.indexOf(message) ? { ...m, showAdoptionTraits: false } : m
                          ));
                          sendMessage(`תכונות: ${traits.join(", ")}`);
                        }}
                      />
                    )}

                    {/* Adoption Requirement Picker */}
                    {message.role === "assistant" && message.showAdoptionRequirements && (
                      <AdoptionRequirementPicker
                        onSelect={(reqs) => {
                          setMessages(prev => prev.map((m, i) =>
                            i === messages.indexOf(message) ? { ...m, showAdoptionRequirements: false } : m
                          ));
                          sendMessage(`דרישות: ${reqs.join(", ")}`);
                        }}
                      />
                    )}

                    {/* Training Category Picker */}
                    {message.role === "assistant" && message.showTrainingPicker && (
                      <TrainingCategoryPicker
                        petName={selectedPet?.name || "החיה שלך"}
                        onSelect={(category) => {
                          setMessages(prev => prev.map((m, i) =>
                            i === messages.indexOf(message) ? { ...m, showTrainingPicker: false } : m
                          ));
                          sendMessage(category);
                        }}
                      />
                    )}

                    {/* Training Sub-Options */}
                    {message.role === "assistant" && message.trainingSubOptions && (
                      <TrainingSubPicker
                        options={message.trainingSubOptions}
                        onSelect={(option) => {
                          setMessages(prev => prev.map((m, i) =>
                            i === messages.indexOf(message) ? { ...m, trainingSubOptions: undefined } : m
                          ));
                          sendMessage(option);
                        }}
                      />
                    )}

                    {/* Quick Reply Suggestions */}
                    {message.role === "assistant" && message.suggestions && message.suggestions.length > 0 && index === messages.length - 1 && (
                      <QuickReplySuggestions
                        suggestions={message.suggestions}
                        petAvatars={!selectedPet ? userPets.map(p => ({ name: p.name, avatarUrl: p.avatar_url, type: p.type })) : undefined}
                        onSelect={(text) => {
                          if (!selectedPet && userPets.some(p => p.name === text)) {
                            handlePetSelect(text);
                          } else {
                            sendMessage(text);
                          }
                        }}
                      />
                    )}

                  </div>
                </div>
              </motion.div>
              );
            })}

            {/* Date Picker */}
            {showDatePicker && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 mx-2"
              >
                <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-lg">
                  <HorizontalDatePicker
                    value={selectedDate}
                    onChange={handleDateSelect}
                    minDate={new Date()}
                  />
                </div>
              </motion.div>
            )}

            {/* Typing indicator — Gemini style */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-4 py-5"
              >
                <div className="max-w-2xl mx-auto flex gap-3 items-start">
                  <div className="mipo-gradient-ring flex-shrink-0 p-[2px]">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white">
                      <Sparkles className="h-3.5 w-3.5 text-mipo-violet" />
                    </div>
                  </div>
                  <div className="pt-1">
                    <p className="mb-2 text-[12px] font-semibold text-mipo-muted">Mipo AI</p>
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-primary/40"
                          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom FAB */}
        <AnimatePresence>
          {showScrollDown && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={scrollToBottom}
              className="absolute left-1/2 -translate-x-1/2 bottom-24 z-sticky h-11 w-11 rounded-full bg-card/90 backdrop-blur-md border border-border/40 shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              whileTap={{ scale: 0.9 }}
            >
              <ChevronDown className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <ChatInputBar
          value={input}
          onChange={setInput}
          onSend={handleSend}
          onKeyPress={handleKeyPress}
          isLoading={isLoading}
          placeholder="כתיבת הודעה..."
          onAttachment={handleAttachment}
          onQuickAction={(actionId) => {
            if (actionId === "calendar") {
              setShowDatePicker(true);
            }
          }}
        />
      </div>

    </div>
  );
};

const Chat = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [consentState, setConsentState] = useState<"loading" | "required" | "granted">("loading");
  const [savingConsent, setSavingConsent] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((auth) => {
        if (!active) return;
        if (!auth) {
          navigate("/auth");
          return;
        }
        setConsentState(auth.profile?.ai_consent_given === true ? "granted" : "required");
      })
      .catch(() => {
        if (active) setConsentState("required");
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  const grantConsent = async () => {
    setSavingConsent(true);
    try {
      const result = await updateMyProfile({ ai_consent_given: true });
      if (result.profile?.ai_consent_given !== true) throw new Error("Consent was not saved");
      setConsentState("granted");
    } catch {
      toast({ title: "לא ניתן לשמור את ההסכמה", variant: "destructive" });
    } finally {
      setSavingConsent(false);
    }
  };

  if (consentState === "loading") {
    return <main className="mipo-screen min-h-screen" aria-busy="true" />;
  }

  if (consentState === "required") {
    return (
      <main className="mipo-screen flex min-h-screen items-center justify-center p-5" dir="rtl">
        <section className="mipo-card w-full max-w-md p-7">
          <MipoLogo variant="horizontal" size="sm" showAnimals={false} />
          <span className="mipo-gradient-ring mt-7 inline-flex p-[2px]"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-white"><Sparkles className="h-5 w-5 text-mipo-violet" /></span></span>
          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.025em] text-mipo-ink">הסכמה לעיבוד באמצעות AI</h1>
          <p className="mt-3 text-sm leading-relaxed text-mipo-muted">
            בעת שימוש בצ'אט, MIPO שולחת ל-Google Gemini את תוכן השיחה ואת פרטי חיית המחמד והפרופיל
            שנדרשים לתשובה. קבצים ותמונות נשלחים רק לאחר בחירה מפורשת שלך לצרף אותם.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-mipo-muted">
            אפשר לבטל את ההסכמה בכל עת בהגדרות. ללא הסכמה הצ'אט נשאר חסום.
          </p>
          <div className="mt-6 space-y-3">
            <Button className="mipo-gradient-button w-full" onClick={grantConsent} disabled={savingConsent}>
              {savingConsent ? "שומר..." : "אני מסכימ/ה וממשיך/ה לצ'אט"}
            </Button>
            <Button className="mipo-pill-button w-full" variant="outline" onClick={() => navigate("/")}>לא עכשיו</Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <ChatProvider>
      <ChatContent />
    </ChatProvider>
  );
};

export default Chat;
