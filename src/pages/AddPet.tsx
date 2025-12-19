import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Sparkles, ArrowLeft, ArrowRight, Calendar as CalendarIcon, Camera, Check, Heart, MapPin } from "lucide-react";
import { usePetPreference } from "@/contexts/PetPreferenceContext";
import { useGuest } from "@/contexts/GuestContext";
import { useGame } from "@/contexts/GameContext";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { cn } from "@/lib/utils";
import dogIcon from "@/assets/dog-official.svg";
import catIcon from "@/assets/cat-official.png";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

const PERSONALITY_TAGS = [
  { value: "playful", label: "שובב", emoji: "🎾" },
  { value: "calm", label: "רגוע", emoji: "😌" },
  { value: "friendly", label: "חברותי", emoji: "🤗" },
  { value: "shy", label: "ביישן", emoji: "🙈" },
  { value: "energetic", label: "אנרגטי", emoji: "⚡" },
  { value: "sleepy", label: "אוהב לישון", emoji: "😴" },
  { value: "protective", label: "שמרני", emoji: "🛡️" },
  { value: "curious", label: "סקרן", emoji: "🔍" },
];

const ACTIVITIES = [
  { value: "walks", label: "טיולים", emoji: "🚶" },
  { value: "beach", label: "חוף ים", emoji: "🏖️" },
  { value: "parks", label: "גינות כלבים", emoji: "🌳" },
  { value: "fetch", label: "משחקי כדור", emoji: "🎾" },
  { value: "training", label: "אילוף", emoji: "🎓" },
  { value: "cuddles", label: "חיבוקים", emoji: "🤗" },
];

const TOTAL_STEPS = 7;

const AddPet = () => {
  const [searchParams] = useSearchParams();
  const isOnboarding = searchParams.get("onboarding") === "true";
  
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(isOnboarding ? 0 : 1);
  const [formData, setFormData] = useState({
    name: "",
    birthDate: null as Date | null,
    gender: "",
    breed: "",
    is_neutered: "false"
  });
  const [personalityTags, setPersonalityTags] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [healthNotes, setHealthNotes] = useState("");
  
  const [breedDetecting, setBreedDetecting] = useState(false);
  const [breedConfidence, setBreedConfidence] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [showValidationError, setShowValidationError] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  const minSwipeDistance = 50;
  
  const { petType, setPetType } = usePetPreference();
  const { isGuest } = useGuest();
  const { awardBadge, updateStreak } = useGame();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && !isGuest) {
        navigate("/auth");
      }
    };
    checkAuth();

    const hasSeenTutorial = localStorage.getItem('hasSeenSwipeTutorial');
    if (!hasSeenTutorial && !isOnboarding) {
      setShowTutorial(true);
    }

    // Load saved draft
    const savedDraft = localStorage.getItem('addPetDraft');
    if (savedDraft && !isOnboarding) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.formData) {
          setFormData({
            ...draft.formData,
            birthDate: draft.formData.birthDate ? new Date(draft.formData.birthDate) : null
          });
        }
        if (draft.currentStep) setCurrentStep(draft.currentStep);
        if (draft.petType) setPetType(draft.petType);
        if (draft.imagePreview) setImagePreview(draft.imagePreview);
        if (draft.personalityTags) setPersonalityTags(draft.personalityTags);
        if (draft.activities) setActivities(draft.activities);
        if (draft.healthNotes) setHealthNotes(draft.healthNotes);
        
        toast({
          title: "טיוטה שוחזרה",
          description: "ההתקדמות הקודמת שלך שוחזרה"
        });
      } catch (e) {
        console.error('Error loading draft:', e);
      }
    }
  }, [navigate, isGuest, toast, isOnboarding, setPetType]);

  // Auto-save
  useEffect(() => {
    if (currentStep > 1 || petType) {
      setAutoSaveStatus('saving');
      
      const draft = {
        formData: {
          ...formData,
          birthDate: formData.birthDate?.toISOString()
        },
        currentStep,
        petType,
        imagePreview,
        personalityTags,
        activities,
        healthNotes,
        breedConfidence,
        timestamp: new Date().toISOString()
      };

      const saveTimer = setTimeout(() => {
        localStorage.setItem('addPetDraft', JSON.stringify(draft));
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus(null), 2000);
      }, 1000);

      return () => clearTimeout(saveTimer);
    }
  }, [formData, currentStep, petType, imagePreview, personalityTags, activities, healthNotes, breedConfidence]);

  const dismissTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('hasSeenSwipeTutorial', 'true');
  };

  const detectBreed = async (base64Image: string) => {
    if (!petType) return;
    
    setBreedDetecting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/detect-pet-breed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify({
          imageBase64: base64Image,
          petType: petType
        })
      });

      const data = await response.json();
      
      if (data.breed && data.breed !== "Unknown Breed") {
        setFormData(prev => ({ ...prev, breed: data.breed }));
        setBreedConfidence(data.confidence || null);
      }
    } catch (error) {
      console.error('Error detecting breed:', error);
    } finally {
      setBreedDetecting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        detectBreed(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleTag = (tag: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!petType) return;
    
    setLoading(true);
    try {
      if (isGuest) {
        toast({
          title: "מצב אורח",
          description: "אנא התחבר כדי לשמור את חיית המחמד שלך",
          variant: "destructive"
        });
        navigate("/auth");
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }
      
      let avatarUrl = imagePreview || "";

      const { data: petData, error: insertError } = await supabase.from("pets").insert({
        user_id: user.id,
        name: formData.name,
        type: petType,
        birth_date: formData.birthDate ? formData.birthDate.toISOString().split('T')[0] : null,
        gender: formData.gender || null,
        breed: formData.breed || null,
        breed_confidence: breedConfidence,
        is_neutered: formData.is_neutered === "true",
        avatar_url: avatarUrl,
        personality_tags: personalityTags.length > 0 ? personalityTags : null,
        favorite_activities: activities.length > 0 ? activities : null,
        health_notes: healthNotes || null
      }).select().single();
      
      if (insertError) throw insertError;

      // Save breed detection history
      if (petData && formData.breed && breedConfidence !== null) {
        await supabase.from("breed_detection_history").insert({
          pet_id: petData.id,
          breed: formData.breed,
          confidence: breedConfidence,
          avatar_url: avatarUrl
        });
      }

      // Award badge for first pet / onboarding
      if (isOnboarding) {
        const { data: welcomeBadge } = await supabase
          .from('badges')
          .select('id')
          .eq('condition_type', 'onboarding_complete')
          .maybeSingle();

        if (welcomeBadge) {
          await awardBadge(welcomeBadge.id);
        }
        await updateStreak();
        localStorage.setItem('onboardingCompleted', 'true');
      }

      // Confetti celebration
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
      });
      
      toast({
        title: isOnboarding ? "🎉 מזל טוב!" : "הצלחה!",
        description: isOnboarding 
          ? `הפרופיל של ${formData.name} מוכן! קיבלת 50 נקודות ובאדג׳ ברוך הבא`
          : `${formData.name} נוסף בהצלחה!`
      });
      
      localStorage.removeItem('addPetDraft');
      
      setTimeout(() => navigate("/"), 1500);
    } catch (error: any) {
      toast({
        title: "שגיאה",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (currentStep === 0) return true; // Welcome step
    if (currentStep === 1) return petType !== null;
    if (currentStep === 2) return formData.name.trim() !== "";
    if (currentStep === 3) return true; // Date/gender optional
    if (currentStep === 4) return true; // Personality optional
    if (currentStep === 5) return true; // Activities optional
    if (currentStep === 6) return true; // Health optional
    return true;
  };

  const nextStep = () => {
    if (canProceed() && currentStep < TOTAL_STEPS) {
      setSlideDirection('left');
      setCurrentStep(prev => prev + 1);
      setShowValidationError(false);
    } else if (!canProceed()) {
      setShowValidationError(true);
      setTimeout(() => setShowValidationError(false), 2000);
    }
  };

  const prevStep = () => {
    if (currentStep > (isOnboarding ? 0 : 1)) {
      setSlideDirection('right');
      setCurrentStep(prev => prev - 1);
      setShowValidationError(false);
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsSwiping(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
    if (touchStart !== null) {
      const distance = touchStart - e.targetTouches[0].clientX;
      if (Math.abs(distance) > 10) {
        setSwipeDirection(distance > 0 ? 'left' : 'right');
      }
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setIsSwiping(false);
      setSwipeDirection(null);
      return;
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentStep < TOTAL_STEPS && canProceed()) {
      nextStep();
    }
    if (isRightSwipe && currentStep > (isOnboarding ? 0 : 1)) {
      prevStep();
    }

    setIsSwiping(false);
    setSwipeDirection(null);
  };

  const stepTitles = [
    "ברוכים הבאים!", // 0
    "בחר את חיית המחמד", // 1
    "פרטי חיית המחמד", // 2
    "תאריך לידה ומין", // 3
    "אופי ואישיות", // 4
    "פעילויות אהובות", // 5
    "מידע בריאותי", // 6
    "סקירה ואישור", // 7
  ];

  const actualSteps = isOnboarding ? TOTAL_STEPS + 1 : TOTAL_STEPS;
  const displayStep = isOnboarding ? currentStep : currentStep;
  const progressSteps = isOnboarding ? actualSteps : TOTAL_STEPS;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 pb-24" dir="rtl">
      {/* Tutorial Overlay */}
      {showTutorial && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card rounded-3xl p-8 max-w-sm w-full space-y-6 shadow-2xl"
          >
            <div className="w-16 h-16 mx-auto bg-primary rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <h3 className="text-2xl font-bold text-foreground text-center">החלקה לניווט</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-background rounded-xl border border-border">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-primary" />
                </div>
                <p className="text-muted-foreground text-sm">
                  החלק <span className="font-semibold text-foreground">ימינה</span> לחזור
                </p>
              </div>
              <div className="flex items-center gap-4 p-3 bg-background rounded-xl border border-border">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ArrowLeft className="w-5 h-5 text-primary" />
                </div>
                <p className="text-muted-foreground text-sm">
                  החלק <span className="font-semibold text-foreground">שמאלה</span> להמשיך
                </p>
              </div>
            </div>
            <Button onClick={dismissTutorial} className="w-full">הבנתי!</Button>
          </motion.div>
        </motion.div>
      )}

      {/* Back Button */}
      {currentStep > (isOnboarding ? 0 : 1) && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          type="button"
          onClick={prevStep}
          className="fixed top-6 right-4 z-50 p-2.5 bg-card rounded-full shadow-lg border border-border"
        >
          <ArrowRight className="w-5 h-5 text-foreground" />
        </motion.button>
      )}

      <div className="max-w-md mx-auto pt-12">
        {/* Header */}
        {currentStep > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <div className="inline-flex items-center gap-2 mb-3 px-4 py-1.5 bg-primary/10 rounded-full">
              <span className="text-xs font-semibold text-primary">
                שלב {displayStep} מתוך {progressSteps}
              </span>
              {autoSaveStatus === 'saved' && (
                <span className="text-xs text-green-600">• נשמר</span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {stepTitles[currentStep]}
            </h1>
          </motion.div>
        )}

        {/* Progress Bar */}
        {currentStep > 0 && (
          <div className="mb-8 px-2">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(displayStep / progressSteps) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div 
          className="relative"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <AnimatePresence mode="wait">
            {/* Step 0: Welcome (Onboarding only) */}
            {currentStep === 0 && isOnboarding && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-card rounded-3xl p-8 shadow-lg text-center space-y-6"
              >
                <div className="text-6xl mb-4">🐾</div>
                <h1 className="text-3xl font-bold">ברוכים הבאים!</h1>
                <p className="text-muted-foreground text-lg">
                  הבית הדיגיטלי של החבר על ארבע שלכם
                </p>
                <Button onClick={nextStep} size="lg" className="w-full">
                  בואו נתחיל
                </Button>
              </motion.div>
            )}

            {/* Step 1: Pet Type */}
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ x: slideDirection === 'left' ? 100 : -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: slideDirection === 'left' ? -100 : 100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-6 py-4">
                  <motion.button 
                    type="button" 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setPetType("dog");
                      nextStep();
                    }} 
                    className={cn(
                      "flex flex-col items-center justify-center p-6 bg-card rounded-3xl border-2 transition-all",
                      petType === "dog" ? "border-primary shadow-lg" : "border-border hover:border-primary/50"
                    )}
                  >
                    <img src={dogIcon} alt="כלב" className="w-28 h-28 object-contain mb-3" />
                    <span className="font-semibold text-foreground">כלב</span>
                  </motion.button>
                  
                  <motion.button 
                    type="button" 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setPetType("cat");
                      nextStep();
                    }} 
                    className={cn(
                      "flex flex-col items-center justify-center p-6 bg-card rounded-3xl border-2 transition-all",
                      petType === "cat" ? "border-primary shadow-lg" : "border-border hover:border-primary/50"
                    )}
                  >
                    <img src={catIcon} alt="חתול" className="w-24 h-24 object-contain mb-3" />
                    <span className="font-semibold text-foreground">חתול</span>
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Name & Photo */}
            {currentStep === 2 && (
              <motion.div
                key="step-2"
                initial={{ x: slideDirection === 'left' ? 100 : -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: slideDirection === 'left' ? -100 : 100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="bg-card rounded-3xl p-6 shadow-lg space-y-6"
              >
                {/* Image Upload */}
                <div className="text-center">
                  <Label className="block mb-3 font-semibold">תמונת פרופיל</Label>
                  <label className="cursor-pointer inline-block">
                    <div className="relative">
                      <div className="w-32 h-32 mx-auto rounded-full border-2 border-dashed border-border hover:border-primary transition-colors flex items-center justify-center overflow-hidden bg-muted">
                        {imagePreview ? (
                          <img src={imagePreview} alt="תצוגה מקדימה" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-12 h-12 text-muted-foreground" />
                        )}
                      </div>
                      {breedDetecting && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  {breedConfidence !== null && formData.breed && (
                    <p className="text-xs text-muted-foreground mt-2">
                      זוהה: {formData.breed} ({Math.round(breedConfidence * 100)}%)
                    </p>
                  )}
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">שם חיית המחמד *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="מה השם?"
                    className="text-lg"
                  />
                </div>

                {/* Breed */}
                <div className="space-y-2">
                  <Label htmlFor="breed">גזע</Label>
                  <Input
                    id="breed"
                    value={formData.breed}
                    onChange={(e) => setFormData(prev => ({ ...prev, breed: e.target.value }))}
                    placeholder={breedDetecting ? "מזהה גזע..." : "מה הגזע?"}
                    disabled={breedDetecting}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={prevStep} variant="outline" className="flex-1">חזור</Button>
                  <Button onClick={nextStep} disabled={!formData.name.trim()} className="flex-1">המשך</Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Date & Gender */}
            {currentStep === 3 && (
              <motion.div
                key="step-3"
                initial={{ x: slideDirection === 'left' ? 100 : -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: slideDirection === 'left' ? -100 : 100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="bg-card rounded-3xl p-6 shadow-lg space-y-6"
              >
                {/* Birth Date */}
                <div className="space-y-2">
                  <Label>תאריך לידה</Label>
                  <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-right">
                        <CalendarIcon className="ml-2 h-4 w-4" />
                        {formData.birthDate ? format(formData.birthDate, "PPP", { locale: he }) : "בחר תאריך"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.birthDate || undefined}
                        onSelect={(date) => {
                          setFormData(prev => ({ ...prev, birthDate: date || null }));
                          setShowCalendar(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <Label>מין</Label>
                  <Select value={formData.gender} onValueChange={(val) => setFormData(prev => ({ ...prev, gender: val }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר מין" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">זכר</SelectItem>
                      <SelectItem value="female">נקבה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Neutered */}
                <div className="space-y-2">
                  <Label>מעוקר/מסורס?</Label>
                  <Select value={formData.is_neutered} onValueChange={(val) => setFormData(prev => ({ ...prev, is_neutered: val }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">כן</SelectItem>
                      <SelectItem value="false">לא</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={prevStep} variant="outline" className="flex-1">חזור</Button>
                  <Button onClick={nextStep} className="flex-1">המשך</Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Personality Tags */}
            {currentStep === 4 && (
              <motion.div
                key="step-4"
                initial={{ x: slideDirection === 'left' ? 100 : -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: slideDirection === 'left' ? -100 : 100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="bg-card rounded-3xl p-6 shadow-lg space-y-6"
              >
                <p className="text-muted-foreground text-center text-sm">
                  בחר תגיות שמתארות את {formData.name || "חיית המחמד"}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {PERSONALITY_TAGS.map(tag => (
                    <button
                      key={tag.value}
                      type="button"
                      onClick={() => toggleTag(tag.value, setPersonalityTags)}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all text-center",
                        personalityTags.includes(tag.value)
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="text-2xl mb-1">{tag.emoji}</div>
                      <div className="text-sm font-medium">{tag.label}</div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={prevStep} variant="outline" className="flex-1">חזור</Button>
                  <Button onClick={nextStep} className="flex-1">המשך</Button>
                </div>
              </motion.div>
            )}

            {/* Step 5: Activities */}
            {currentStep === 5 && (
              <motion.div
                key="step-5"
                initial={{ x: slideDirection === 'left' ? 100 : -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: slideDirection === 'left' ? -100 : 100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="bg-card rounded-3xl p-6 shadow-lg space-y-6"
              >
                <p className="text-muted-foreground text-center text-sm">
                  מה {formData.name || "חיית המחמד"} אוהב/ת לעשות?
                </p>
                <div className="space-y-3">
                  {ACTIVITIES.map(activity => (
                    <button
                      key={activity.value}
                      type="button"
                      onClick={() => toggleTag(activity.value, setActivities)}
                      className={cn(
                        "w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3",
                        activities.includes(activity.value)
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="text-2xl">{activity.emoji}</div>
                      <div className="text-lg font-medium">{activity.label}</div>
                      {activities.includes(activity.value) && (
                        <Check className="w-5 h-5 text-primary mr-auto" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={prevStep} variant="outline" className="flex-1">חזור</Button>
                  <Button onClick={nextStep} className="flex-1">המשך</Button>
                </div>
              </motion.div>
            )}

            {/* Step 6: Health Notes */}
            {currentStep === 6 && (
              <motion.div
                key="step-6"
                initial={{ x: slideDirection === 'left' ? 100 : -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: slideDirection === 'left' ? -100 : 100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="bg-card rounded-3xl p-6 shadow-lg space-y-6"
              >
                <p className="text-muted-foreground text-center text-sm">(אופציונלי - אפשר לדלג)</p>
                <div className="space-y-2">
                  <Label>רגישויות או בעיות רפואיות</Label>
                  <Textarea
                    value={healthNotes}
                    onChange={(e) => setHealthNotes(e.target.value)}
                    placeholder="למשל: רגיש למזון מסוים, בעיות עור..."
                    rows={4}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={prevStep} variant="outline" className="flex-1">חזור</Button>
                  <Button onClick={nextStep} className="flex-1">המשך</Button>
                </div>
              </motion.div>
            )}

            {/* Step 7: Review & Complete */}
            {currentStep === 7 && (
              <motion.div
                key="step-7"
                initial={{ x: slideDirection === 'left' ? 100 : -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: slideDirection === 'left' ? -100 : 100, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="bg-card rounded-3xl p-6 shadow-lg space-y-6 text-center"
              >
                <div className="text-5xl">🎉</div>
                
                {imagePreview && (
                  <img 
                    src={imagePreview} 
                    alt={formData.name}
                    className="w-28 h-28 rounded-full mx-auto object-cover border-4 border-primary shadow-lg"
                  />
                )}
                
                <h2 className="text-2xl font-bold">{formData.name}</h2>
                
                <div className="text-right space-y-2 bg-muted/50 rounded-xl p-4">
                  <p><span className="text-muted-foreground">סוג:</span> {petType === "dog" ? "כלב" : "חתול"}</p>
                  {formData.breed && <p><span className="text-muted-foreground">גזע:</span> {formData.breed}</p>}
                  {formData.gender && <p><span className="text-muted-foreground">מין:</span> {formData.gender === "male" ? "זכר" : "נקבה"}</p>}
                  {personalityTags.length > 0 && (
                    <p>
                      <span className="text-muted-foreground">אישיות:</span>{" "}
                      {personalityTags.map(t => PERSONALITY_TAGS.find(pt => pt.value === t)?.label).join(", ")}
                    </p>
                  )}
                </div>

                {isOnboarding && (
                  <div className="bg-primary/10 rounded-2xl p-4 space-y-2">
                    <div className="text-3xl">🎁</div>
                    <p className="font-semibold">קיבלת 50 נקודות התחלתיות</p>
                    <p className="text-sm text-muted-foreground">ובאדג׳ "ברוך הבא" 🏆</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button onClick={prevStep} variant="outline" className="flex-1">חזור</Button>
                  <Button onClick={handleSubmit} disabled={loading} className="flex-1">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                    {loading ? "שומר..." : "סיום 🐾"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Validation Error Toast */}
          {showValidationError && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg"
            >
              אנא מלא את השדות הנדרשים
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddPet;
