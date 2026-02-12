import { useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import HorizontalDatePicker from "@/components/chat/HorizontalDatePicker";
import ChatInputBar from "@/components/chat/ChatInputBar";
import { ChatActionButton, extractActionTags, cleanActionTags } from "@/components/chat/ChatActionButton";
import { ChatProductCards } from "@/components/chat/ChatProductCards";
import { InsurancePlanCards, InsuranceLoadingAnimation } from "@/components/chat/InsurancePlanCards";
import { InsuranceCallbackForm } from "@/components/chat/InsuranceCallbackForm";
import KineticDotsLoader from "@/components/ui/kinetic-dots-loader";
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
import { ChatProvider, useChatContext, type Message } from "@/contexts/ChatContext";

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
  const { toast } = useToast();
  const navigate = useNavigate();

  // Category buttons for quick selection
  const categoryButtons = [
    { id: "insurance", label: "ביטוח", icon: "🛡️" },
    { id: "grooming", label: "טיפוח", icon: "✂️" },
    { id: "training", label: "אילוף", icon: "🎓" },
    { id: "dog_parks", label: "גינות כלבים", icon: "🌳" },
    { id: "documents", label: "מסמכים", icon: "📂" },
    { id: "boarding", label: "פנסיון", icon: "🏨" },
    { id: "delivery", label: "משלוחים", icon: "📦" },
    { id: "breed", label: "מידע על הגזע", icon: "🐕" },
    { id: "rehoming", label: "למסירה", icon: "🏠" },
  ];

  const handlePetSelect = (petName: string) => {
    const pet = userPets.find(p => p.name === petName);
    if (pet) {
      setSelectedPet(pet);
      setShowCategories(true);
      setMessages(prev => [
        ...prev,
        { role: "user", content: pet.name },
        { role: "assistant", content: `מעולה! איך אוכל לעזור היום עם ${pet.name}?` }
      ]);
    } else {
      sendMessage(petName);
    }
  };

  const handleCategorySelect = async (category: { id: string; label: string; icon: string }) => {
    setShowCategories(false);
    const userMessage: Message = { role: "user", content: `${category.icon} ${category.label}` };
    setMessages((prev) => [...prev, userMessage]);
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
    } finally {
      setIsLoading(false);
    }
  };

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

  const exampleQuestions = [
    { icon: "🐕", text: "איך לטפל בכלב?" },
    { icon: "🐈", text: "מה לתת לחתול?" },
    { icon: "🎓", text: "איך לאלף גור?" },
    { icon: "🏥", text: "מתי לפנות לווטרינר?" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 pb-20" dir="rtl">
      {/* Clean Header */}
      <div className="sticky top-0 z-50 bg-card/90 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-foreground" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-card" />
            </div>
            <div className="text-right">
              <h1 className="text-base font-bold text-foreground">PetAI</h1>
              <p className="text-xs text-success flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                פעיל עכשיו
              </p>
            </div>
          </div>
          
          <div className="w-10 h-10" />
        </div>
      </div>

      <div className="flex flex-col h-[calc(100vh-140px)]">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <AnimatePresence>
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full py-8"
              >
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-primary" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-1">PetAI</h2>
                <p className="text-sm text-muted-foreground mb-8">העוזר החכם שלך לכל מה שקשור לחיות המחמד</p>
                
                <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                  {exampleQuestions.map((q, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setInput(q.text)}
                      className="flex items-center gap-3 px-4 py-3.5 bg-card hover:bg-card/80 rounded-2xl transition-all text-right border border-border/50 shadow-sm hover:shadow-md"
                    >
                      <span className="text-2xl">{q.icon}</span>
                      <span className="text-sm text-foreground font-heebo font-medium">{q.text}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`flex mb-4 ${message.role === "user" ? "justify-start" : "justify-end"}`}
              >
                <div className={`flex items-end gap-2.5 ${message.insuranceData || message.insuranceCallback || message.showGroomingPicker || message.showAppointmentPicker || message.showTrainingPicker || message.trainingSubOptions || message.showDogParkPicker || message.showDocumentPicker || message.showBoardingPicker || message.showStorePicker || message.showAdoptionTraits || message.showAdoptionRequirements ? 'max-w-[95%]' : 'max-w-[85%]'} ${message.role === "user" ? "flex-row" : "flex-row-reverse"}`}>
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-2">
                    <div
                      className={`px-4 py-3 shadow-sm ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                          : "bg-card border border-border/40 text-foreground rounded-2xl rounded-bl-md"
                      }`}
                    >
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                        {cleanActionTags(message.content)}
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

            {/* Category Quick Buttons */}
            {showCategories && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 px-2"
              >
                <p className="text-xs text-muted-foreground text-center mb-3 font-heebo">במה אוכל לעזור?</p>
                <div className="grid grid-cols-4 gap-2">
                  {categoryButtons.map((cat, index) => (
                    <motion.button
                      key={cat.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleCategorySelect(cat)}
                      className="flex flex-col items-center gap-1.5 p-3 bg-card hover:bg-card/80 rounded-2xl transition-all border border-border/50 shadow-sm hover:shadow-md"
                    >
                      <span className="text-2xl">{cat.icon}</span>
                      <span className="text-[10px] text-foreground font-heebo font-medium leading-tight text-center">{cat.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

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

            {/* Typing Indicator */}
            {isTyping && !showInsuranceLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-end mb-3"
              >
                <div className="flex items-end gap-2 flex-row-reverse">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-primary" />
                  </div>
                  <div className="px-3 py-2 bg-card border border-border/40 rounded-3xl rounded-bl-lg">
                    <KineticDotsLoader />
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
          onQuickAction={(actionId) => {
            if (actionId === "calendar") {
              setShowDatePicker(true);
            }
          }}
        />
      </div>

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
