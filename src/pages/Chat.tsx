import { useRef, useEffect, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, Sparkles, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import petidIcon from "@/assets/petid-icon.png";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import { SEO } from "@/components/SEO";
import HorizontalDatePicker from "@/components/chat/HorizontalDatePicker";
import ChatInputBar from "@/components/chat/ChatInputBar";
import { ChatActionButton, extractActionTags, cleanActionTags } from "@/components/chat/ChatActionButton";
import { ChatProductCards } from "@/components/chat/ChatProductCards";
import { InsurancePlanCards, InsuranceLoadingAnimation } from "@/components/chat/InsurancePlanCards";
import { InsuranceCallbackForm } from "@/components/chat/InsuranceCallbackForm";
import { GroomingServicePicker } from "@/components/chat/GroomingServicePicker";
import { QuickReplySuggestions } from "@/components/chat/QuickReplySuggestions";
import { MessageFeedback } from "@/components/chat/MessageFeedback";
import { AppointmentPicker } from "@/components/chat/AppointmentPicker";
import { TrainingCategoryPicker } from "@/components/chat/TrainingCategoryPicker";
import { TrainingSubPicker } from "@/components/chat/TrainingSubPicker";
import { DogParkPicker } from "@/components/chat/DogParkPicker";
import { DocumentTypePicker } from "@/components/chat/DocumentTypePicker";
import { BoardingTypePicker } from "@/components/chat/BoardingTypePicker";
import { StoreCategoryPicker } from "@/components/chat/StoreCategoryPicker";
import { AdoptionTraitPicker } from "@/components/chat/AdoptionTraitPicker";
import { AdoptionRequirementPicker } from "@/components/chat/AdoptionRequirementPicker";
import { OcrApprovalCard, QuickCheckoutCard, InsuranceLeadCard, AddressUpdateCard, NrcPlanCard, PendingApprovalCard } from "@/components/chat/ChatActionCards";
import { ChatProvider, useChatContext, type Message } from "@/contexts/ChatContext";
import { useDataIntake, type IntakeType } from "@/hooks/useDataIntake";
import { ChatHubMessages } from "@/components/chat/ChatHubMessages";

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
    showInsuranceLoading, setShowInsuranceLoading,
    selectedDate, setSelectedDate,
    pendingDateContext, setPendingDateContext,
    sendMessage, streamChat,
  } = useChatContext();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [headerHidden, setHeaderHidden] = useState(false);
  const [activeHubTab, setActiveHubTab] = useState<"scientist" | "messages">("scientist");
  const lastScrollTop = useRef(0);

  // Auto-hide header on scroll down, show on scroll up
  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const st = el.scrollTop;
    if (st > lastScrollTop.current && st > 40) {
      setHeaderHidden(true);
    } else {
      setHeaderHidden(false);
    }
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
    if (actions.includes("SHOW_INSURANCE_PLANS")) {
      setShowInsuranceLoading(true);
      setTimeout(() => {
        setShowInsuranceLoading(false);
        const insuranceMsg: Message = {
          role: "assistant",
          content: "הנה התוכניות שמתאימות:",
          insuranceData: {
            petName: selectedPet?.name || "החיה שלך",
            petType: selectedPet?.type || "dog",
            breed: selectedPet?.breed || null,
            ageYears: null,
            petId: selectedPet?.id || null,
          },
        };
        setMessages(prev => [...prev, insuranceMsg]);
      }, 2000);
    }
    if (actions.includes("SHOW_INSURANCE_CALLBACK")) {
      const callbackMsg: Message = {
        role: "assistant",
        content: "נציג מקצועי יבדוק את המקרה ויחזור אליך:",
        insuranceCallback: {
          petName: selectedPet?.name || "החיה שלך",
          petType: selectedPet?.type || "dog",
          breed: selectedPet?.breed || null,
          ageYears: null,
          petId: selectedPet?.id || null,
        },
      };
      setMessages(prev => [...prev, callbackMsg]);
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

    // ===== Parse CARD tags for Omni-Bot Action Cards =====
    const cardPatterns = content.matchAll(/\[CARD:(\w+):(.*?)\]/g);
    for (const match of cardPatterns) {
      const [, cardType, jsonStr] = match;
      try {
        const data = JSON.parse(jsonStr);
        setMessages(prev => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg?.role === "assistant") {
            const cardMap: Record<string, Partial<Message>> = {
              OCR_APPROVAL: { ocrApproval: data },
              QUICK_CHECKOUT: { quickCheckout: data },
              INSURANCE_LEAD: { insuranceLead: data },
              ADDRESS_UPDATE: { addressUpdate: data },
              NRC_PLAN: { nrcPlan: data },
              PENDING_APPROVAL: { pendingApproval: { ...data, queueId: "" } },
            };
            if (cardMap[cardType]) {
              updated[updated.length - 1] = { ...lastMsg, ...cardMap[cardType] };
            }
          }
          return updated;
        });
      } catch { /* ignore malformed JSON */ }
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
        navigate("/scan-document");
        break;
      case "UPLOAD_PHOTO":
        navigate("/create-post");
        break;
      case "ESCALATE":
        toast({ title: "מעביר לנציג אנושי", description: "נציג יחזור אליך בהקדם" });
        break;
      default:
        sendMessage(`אני רוצה ${actionTag}`);
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

    const userMessage: Message = { role: "user", content: input.trim() };
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

  return (
    <div className="min-h-screen bg-background pb-[calc(5rem+env(safe-area-inset-bottom,0px))]" dir="rtl" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <SEO title="צ'אט AI" description="שאלו את העוזר החכם שלנו כל שאלה על חיות מחמד - אילוף, תזונה, בריאות" url="/chat" />
      {/* Glassmorphism Hub Header with Tabs */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/20">
        <div className="flex items-center justify-between px-3 py-2">
          <button 
            onClick={() => navigate("/feed")}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
            aria-label="חזרה לפיד"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-1">
            
            <span className="text-sm font-bold text-foreground">Petid AI</span>
          </div>
          <div className="w-8" />
        </div>
        {/* Tab Switcher */}
        <div className="flex px-4 gap-1">
          <button
            onClick={() => setActiveHubTab("scientist")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-colors relative ${
              activeHubTab === "scientist" ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            המדען
            {activeHubTab === "scientist" && (
              <motion.div layoutId="hub-tab-indicator" className="absolute bottom-0 inset-x-4 h-[2px] bg-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveHubTab("messages")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-colors relative ${
              activeHubTab === "messages" ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            הודעות
            {activeHubTab === "messages" && (
              <motion.div layoutId="hub-tab-indicator" className="absolute bottom-0 inset-x-4 h-[2px] bg-primary rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Messages Tab */}
      {activeHubTab === "messages" && (
        <div className="flex-1 overflow-hidden">
          <ChatHubMessages />
        </div>
      )}

      {/* Scientist Tab */}
      {activeHubTab === "scientist" && (
      <div className="flex flex-col h-[calc(100dvh-140px-env(safe-area-inset-bottom,0px))]">
        {/* Messages Container */}
        <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="flex-1 overflow-y-auto px-3 py-4 overflow-x-hidden">
          <AnimatePresence>

            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`flex mb-4 ${message.role === "user" ? "justify-start" : "justify-end"}`}
              >
                <div className={`flex items-end gap-2 ${message.insuranceData || message.insuranceCallback || message.showGroomingPicker || message.showAppointmentPicker || message.showTrainingPicker || message.trainingSubOptions || message.showDogParkPicker || message.showDocumentPicker || message.showBoardingPicker || message.showStorePicker || message.showAdoptionTraits || message.showAdoptionRequirements ? 'max-w-full w-full' : 'max-w-[85%]'} ${message.role === "user" ? "flex-row" : "flex-row-reverse"}`}>
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-2 min-w-0 overflow-hidden">
                    <div
                      className={`px-4 py-3 ${
                        message.role === "user"
                          ? "bg-gradient-to-l from-primary to-primary/90 text-primary-foreground rounded-2xl rounded-br-md shadow-md shadow-primary/20"
                          : "bg-card/80 backdrop-blur-md border border-border/30 text-foreground rounded-2xl rounded-bl-md shadow-[0_0_15px_hsla(260,60%,60%,0.12),0_0_30px_hsla(220,70%,50%,0.06)]"
                      }`}
                    >
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                        {cleanAllTags(message.content)}
                      </p>
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

                    {/* Omni-Bot Action Cards */}
                    {message.role === "assistant" && message.ocrApproval && (
                      <OcrApprovalCard
                        {...message.ocrApproval}
                        onApprove={() => {
                          sendMessage(`אשרתי את עדכון הנתונים של ${message.ocrApproval!.petName}`);
                          setMessages(prev => prev.map((m, i) => i === messages.indexOf(message) ? { ...m, ocrApproval: undefined } : m));
                        }}
                        onReject={() => {
                          sendMessage("דחיתי את עדכון הנתונים");
                          setMessages(prev => prev.map((m, i) => i === messages.indexOf(message) ? { ...m, ocrApproval: undefined } : m));
                        }}
                      />
                    )}

                    {message.role === "assistant" && message.quickCheckout && (
                      <QuickCheckoutCard
                        {...message.quickCheckout}
                        onCheckout={() => navigate(message.quickCheckout!.productId ? `/product/${message.quickCheckout!.productId}` : "/shop")}
                      />
                    )}

                    {message.role === "assistant" && message.insuranceLead && (
                      <InsuranceLeadCard
                        {...message.insuranceLead}
                        onSubmit={() => sendMessage(`אני מעוניין בביטוח עבור ${message.insuranceLead!.petName}`)}
                      />
                    )}

                    {message.role === "assistant" && message.addressUpdate && (
                      <AddressUpdateCard
                        {...message.addressUpdate}
                        onConfirm={() => sendMessage(`אישרתי עדכון כתובת ל-${message.addressUpdate!.newAddress}`)}
                      />
                    )}

                    {message.role === "assistant" && message.nrcPlan && (
                      <NrcPlanCard {...message.nrcPlan} />
                    )}

                    {message.role === "assistant" && message.pendingApproval && (
                      <PendingApprovalCard title={message.pendingApproval.title} />
                    )}

                    {/* Insurance Plan Cards */}
                    {message.role === "assistant" && message.insuranceData && (
                      <InsurancePlanCards {...message.insuranceData} />
                    )}

                    {/* Insurance Callback Form */}
                    {message.role === "assistant" && message.insuranceCallback && (
                      <InsuranceCallbackForm {...message.insuranceCallback} />
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

                    {/* Message Feedback */}
                    {message.role === "assistant" && index > 0 && !isTyping && (
                      <MessageFeedback messageContent={message.content} messageIndex={index} />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

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

            {/* Insurance Loading Animation */}
            {showInsuranceLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end mb-3"
              >
                <div className="bg-card border border-border/40 rounded-2xl rounded-bl-md px-4 py-2 max-w-[85%]">
                  <InsuranceLoadingAnimation />
                </div>
              </motion.div>
            )}

            {/* "Scientist is thinking..." Pulse Animation */}
            {isTyping && !showInsuranceLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end mb-3"
              >
                <div className="flex items-end gap-2 flex-row-reverse">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Sparkles className="w-3 h-3 text-primary" />
                    </motion.div>
                  </div>
                  <div className="px-4 py-2.5 bg-card/80 backdrop-blur-md border border-border/30 rounded-2xl rounded-bl-md shadow-[0_0_15px_hsla(260,60%,60%,0.08)]">
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-primary/50"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>


        {/* Input Area */}
        <ChatInputBar
          value={input}
          onChange={setInput}
          onSend={handleSend}
          onKeyPress={handleKeyPress}
          isLoading={isLoading}
          placeholder="כתוב הודעה..."
          onAttachment={handleAttachment}
          onQuickAction={(actionId) => {
            if (actionId === "calendar") {
              setShowDatePicker(true);
            }
          }}
        />
      </div>
      )}

      <BottomNav />
    </div>
  );
};

const Chat = () => (
  <ChatProvider>
    <ChatContent />
  </ChatProvider>
);

export default Chat;
