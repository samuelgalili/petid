import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, ArrowLeft, ArrowRight, Calendar as CalendarIcon, Camera, Check, Heart, ImagePlus } from "lucide-react";
import { usePetPreference } from "@/contexts/PetPreferenceContext";
import { useGuest } from "@/contexts/GuestContext";
import { useAuth } from "@/hooks/useAuth";
import { createMyPet, uploadMyImage } from "@/lib/mipoApi";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { cn } from "@/lib/utils";
import dogIcon from "@/assets/dog-official.svg";
import catIcon from "@/assets/cat-official.png";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { PetidLogo } from "@/components/PetidLogo";

const MEDICAL_CONDITIONS = [
  { value: "gastrointestinal", label: "בעיות עיכול / גסטרו", emoji: "🤢", categoryEn: "Gastrointestinal" },
  { value: "urinary", label: "בעיות בדרכי השתן (קריסטלים/אבנים)", emoji: "💧", categoryEn: "Urinary / Struvite" },
  { value: "allergies", label: "אלרגיות מזון או עור", emoji: "🤧", categoryEn: "Hypoallergenic" },
  { value: "diabetic", label: "סוכרת", emoji: "💉", categoryEn: "Diabetic" },
  { value: "renal", label: "בעיות כליה", emoji: "🫘", categoryEn: "Renal" },
  { value: "obesity", label: "עודף משקל", emoji: "⚖️", categoryEn: "Obesity / Metabolic" },
  { value: "dermatosis", label: "בעיות עור ופרווה", emoji: "🐾", categoryEn: "Dermatosis" },
  { value: "hairball", label: "כדורי פרווה", emoji: "🧶", categoryEn: "Hairball", catOnly: true },
  { value: "other", label: "אחר", emoji: "📝" },
];

const PERSONALITY_TAGS_DOG = [
  { value: "playful", label: "שובב", emoji: "🎾" },
  { value: "calm", label: "רגוע", emoji: "😌" },
  { value: "friendly", label: "חברותי", emoji: "🤗" },
  { value: "shy", label: "ביישן", emoji: "🙈" },
  { value: "energetic", label: "אנרגטי", emoji: "⚡" },
  { value: "sleepy", label: "אוהב לישון", emoji: "😴" },
  { value: "protective", label: "שמרני", emoji: "🛡️" },
  { value: "curious", label: "סקרן", emoji: "🔍" },
];

const PERSONALITY_TAGS_CAT = [
  { value: "playful", label: "שובב", emoji: "🧶" },
  { value: "calm", label: "רגוע", emoji: "😌" },
  { value: "friendly", label: "חברותי", emoji: "🤗" },
  { value: "shy", label: "ביישן", emoji: "🙈" },
  { value: "energetic", label: "אנרגטי", emoji: "⚡" },
  { value: "sleepy", label: "אוהב לישון", emoji: "😴" },
  { value: "protective", label: "שמרני", emoji: "🛡️" },
  { value: "curious", label: "סקרן", emoji: "🔍" },
];

const DOG_ACTIVITIES = [
  { value: "walks", label: "טיולים", emoji: "🚶" },
  { value: "beach", label: "חוף ים", emoji: "🏖️" },
  { value: "parks", label: "גינות כלבים", emoji: "🌳" },
  { value: "fetch", label: "משחקי כדור", emoji: "🎾" },
  { value: "training", label: "אילוף", emoji: "🎓" },
  { value: "cuddles", label: "חיבוקים", emoji: "🤗" },
];

const CAT_ACTIVITIES = [
  { value: "couch_potato", label: "בטטת כורסה", emoji: "🛋️", score: 1 },
  { value: "chill", label: "נינוח ומחושב", emoji: "🧘", score: 2 },
  { value: "plays_sometimes", label: "משחק כשבא לו", emoji: "🧶", score: 3 },
  { value: "adventurer", label: "חובב הרפתקאות", emoji: "🧗", score: 4 },
  { value: "zoomies_champ", label: "אלוף הזומנז", emoji: "⚡", score: 5 },
];

const TOTAL_STEPS = 7;

const errorMessage = (error: unknown, fallback: string) => (
  error instanceof Error ? error.message : fallback
);

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
    secondary_breed: "",
    is_mixed: false,
    is_neutered: "false"
  });
  const [personalityTags, setPersonalityTags] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [healthNotes, setHealthNotes] = useState("");
  const [medicalConditions, setMedicalConditions] = useState<string[]>([]);
  const [otherConditionText, setOtherConditionText] = useState("");
  const [breedSearchResults, setBreedSearchResults] = useState<Array<{ breed_name: string; breed_name_he: string }>>([]);
  const [showBreedSearch, setShowBreedSearch] = useState(false);
  const [breedSearchField, setBreedSearchField] = useState<'primary' | 'secondary'>('primary');
  
  const [breedDetecting, setBreedDetecting] = useState(false);
  const [breedConfidence, setBreedConfidence] = useState<number | null>(null);
  const [breedSource, setBreedSource] = useState<'ai' | 'user' | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [showValidationError, setShowValidationError] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [typeMismatch, setTypeMismatch] = useState<{ detectedType: string; breed: string; confidence: number } | null>(null);

  const minSwipeDistance = 50;
  
  const { petType, setPetType, refresh: refreshPets } = usePetPreference();
  const { isGuest } = useGuest();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user && !isGuest) {
      navigate("/auth");
    }

    const hasSeenTutorial = localStorage.getItem('hasSeenSwipeTutorial');
    if (!hasSeenTutorial && !isOnboarding) {
      setShowTutorial(true);
    }

    // Load saved draft - only restore if we were past pet type selection
    const savedDraft = localStorage.getItem('addPetDraft');
    if (savedDraft && !isOnboarding) {
      try {
        const draft = JSON.parse(savedDraft);
        // Only restore if draft had meaningful progress (past step 1)
        if (draft.currentStep && draft.currentStep > 1 && draft.formData?.name) {
          setFormData({
            ...draft.formData,
            birthDate: draft.formData.birthDate ? new Date(draft.formData.birthDate) : null
          });
          setCurrentStep(draft.currentStep);
          if (draft.petType) setPetType(draft.petType);
          if (draft.imagePreview) setImagePreview(draft.imagePreview);
          if (draft.personalityTags) setPersonalityTags(draft.personalityTags);
          if (draft.activities) setActivities(draft.activities);
          if (draft.healthNotes) setHealthNotes(draft.healthNotes);
          if (draft.medicalConditions) setMedicalConditions(draft.medicalConditions);
          if (draft.otherConditionText) setOtherConditionText(draft.otherConditionText);
          
          toast({
            title: "טיוטה שוחזרה",
            description: "ההתקדמות הקודמת שלך שוחזרה"
          });
        } else {
          // Clear stale draft that has no real progress
          localStorage.removeItem('addPetDraft');
        }
      } catch (e) {
        console.error('Error loading draft:', e);
        localStorage.removeItem('addPetDraft');
      }
    }
  }, [navigate, isGuest, toast, isOnboarding, setPetType, user, authLoading]);

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
        medicalConditions,
        otherConditionText,
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
  }, [formData, currentStep, petType, imagePreview, personalityTags, activities, healthNotes, medicalConditions, otherConditionText, breedConfidence]);

  const dismissTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('hasSeenSwipeTutorial', 'true');
  };

  const matchBreedInDB = async (detectedBreed: string, _type: string) => {
    return detectedBreed;
  };

  const searchBreeds = async (query: string) => {
    if (!petType || query.length < 1) {
      setBreedSearchResults([]);
      return;
    }
    setBreedSearchResults([]);
  };

  const [breedDetectionFailed, setBreedDetectionFailed] = useState(false);
  const [photoQualityFeedback, setPhotoQualityFeedback] = useState<string | null>(null);
  const [detectedHealthRisks, setDetectedHealthRisks] = useState<Array<{ risk: string; risk_he: string; severity: string; note: string }>>([]);

  const detectBreed = async (_base64Image: string) => {
    if (!petType) return;
    
    setBreedDetecting(false);
    setBreedDetectionFailed(false);
    setPhotoQualityFeedback(null);
    setDetectedHealthRisks([]);
  };

  const handleTypeMismatchSwitch = async () => {
    if (!typeMismatch) return;
    const newType = typeMismatch.detectedType as 'dog' | 'cat';
    setPetType(newType);
    const matchedBreed = await matchBreedInDB(typeMismatch.breed, newType);
    setFormData(prev => ({ ...prev, breed: matchedBreed }));
    setBreedConfidence(typeMismatch.confidence);
    setBreedSource('ai');
    setTypeMismatch(null);
    setBreedDetecting(false);
  };

  const handleTypeMismatchKeep = async () => {
    if (!typeMismatch) return;
    // User insists on their original selection - clear breed since it doesn't match
    setFormData(prev => ({ ...prev, breed: '' }));
    setBreedConfidence(null);
    setBreedSource(null);
    setTypeMismatch(null);
    setBreedDetecting(false);
  };

  const previewAndDetectBreed = (file: File) => {
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      previewAndDetectBreed(file);
      e.target.value = "";
    }
  };

  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.style.display = 'none';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        previewAndDetectBreed(file);
      }
      document.body.removeChild(input);
    };
    input.oncancel = () => {
      document.body.removeChild(input);
    };
    document.body.appendChild(input);
    input.click();
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
      
      if (!user) {
        navigate("/auth");
        return;
      }
      
      let avatarUrl = "";
      if (imageFile) {
        avatarUrl = (await uploadMyImage(imageFile)).url;
      } else if (imagePreview && imagePreview.startsWith("http")) {
        avatarUrl = imagePreview;
      }

      const breedValue = formData.is_mixed && formData.secondary_breed 
        ? `${formData.breed} + ${formData.secondary_breed}` 
        : formData.breed || null;

      const petData = await createMyPet({
        name: formData.name,
        type: petType,
        birth_date: formData.birthDate ? format(formData.birthDate, "yyyy-MM-dd") : null,
        gender: formData.gender || null,
        breed: breedValue,
        breed_confidence: breedConfidence !== null ? Math.round(breedConfidence * 100) : null,
        is_neutered: formData.is_neutered === "true",
        avatar_url: avatarUrl,
        personality_tags: personalityTags.length > 0 ? personalityTags : null,
        favorite_activities: activities.length > 0 ? activities : null,
        medical_conditions: medicalConditions.length > 0 ? medicalConditions : null,
        health_notes: otherConditionText || healthNotes || null
      });

      // Award badge for first pet / onboarding
      if (isOnboarding) {
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
          ? `הפרופיל של ${formData.name} מוכן!`
          : `${formData.name} נוסף בהצלחה!`
      });
      
      if (petData?.id) {
        localStorage.setItem("activePetId", petData.id);
        await refreshPets();
      }

      localStorage.removeItem('addPetDraft');
      
      setTimeout(() => navigate("/"), 1500);
    } catch (error: unknown) {
      console.error('AddPet submit error:', error);
      toast({
        title: "שגיאה",
        description: errorMessage(error, "שגיאה בשמירת חיית המחמד"),
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

  const forceNextStep = () => {
    if (currentStep < TOTAL_STEPS) {
      setSlideDirection('left');
      setCurrentStep(prev => prev + 1);
      setShowValidationError(false);
    }
  };

  const prevStep = () => {
    if (currentStep > (isOnboarding ? 0 : 1)) {
      setSlideDirection('right');
      const goingToStep = currentStep - 1;
      // Reset image and breed when going back to pet type selection
      if (goingToStep === 1) {
        setImagePreview("");
        setImageFile(null);
        setFormData(prev => ({ ...prev, breed: '' }));
        setBreedSource(null);
        setBreedConfidence(null);
        setActivities([]);
      }
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
    "ברוכים הבאים ל-MIPO", // 0
    "מי מצטרף אלינו?", // 1
    "ספרו לנו על חיית המחמד", // 2
    "פרטים בסיסיים", // 3
    "אופי ואישיות", // 4
    "פעילויות אהובות", // 5
    "מידע בריאותי", // 6
    "הפרופיל מוכן", // 7
  ];

  const actualSteps = isOnboarding ? TOTAL_STEPS + 1 : TOTAL_STEPS;
  const displayStep = isOnboarding ? currentStep : currentStep;
  const progressSteps = isOnboarding ? actualSteps : TOTAL_STEPS;

  return (
    <div className="min-h-screen mipo-screen pb-24" dir="rtl">
      {/* MIPO Header */}
      <motion.div 
        className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-mipo-line/70"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {currentStep > (isOnboarding ? 0 : 1) ? (
              <button
                type="button"
                onClick={prevStep}
                className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-mipo-soft transition-colors"
                aria-label="חזרה"
              >
                <ArrowRight className="w-5 h-5 text-mipo-ink" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-mipo-soft transition-colors"
                aria-label="חזרה"
              >
                <ArrowRight className="w-5 h-5 text-mipo-ink" />
              </button>
            )}
            <PetidLogo variant="horizontal" showAnimals={false} size="sm" />
            <div className="w-11" />
          </div>
          
          {/* Progress Bar */}
          {currentStep > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-mipo-muted">
                  שלב {displayStep} מתוך {progressSteps}
                </span>
                {autoSaveStatus === 'saved' && (
                  <span className="text-xs text-mipo-muted flex items-center gap-1">
                    <Check className="w-3 h-3" /> נשמר
                  </span>
                )}
              </div>
              <div className="h-1.5 bg-mipo-soft rounded-full overflow-hidden">
                <motion.div 
                  className="h-full rounded-full"
                  style={{ background: "var(--gradient-primary)" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(displayStep / progressSteps) * 100}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Tutorial Overlay */}
      {showTutorial && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mipo-flow-card p-8 max-w-sm w-full space-y-6"
          >
            <div 
              className="w-16 h-16 mx-auto rounded-full flex items-center justify-center shadow-shop"
              style={{ background: 'var(--gradient-primary)' }}
            >
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-semibold text-mipo-ink text-center">החלקה לניווט</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-mipo-soft rounded-xl">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--gradient-primary)' }}
                >
                  <ArrowRight className="w-5 h-5 text-white" />
                </div>
                <p className="text-mipo-muted text-sm">
                  החלק <span className="font-semibold text-mipo-ink">ימינה</span> לחזור
                </p>
              </div>
              <div className="flex items-center gap-4 p-3 bg-mipo-soft rounded-xl">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--gradient-primary)' }}
                >
                  <ArrowLeft className="w-5 h-5 text-white" />
                </div>
                <p className="text-mipo-muted text-sm">
                  החלק <span className="font-semibold text-mipo-ink">שמאלה</span> להמשיך
                </p>
              </div>
            </div>
            <Button 
              onClick={dismissTutorial} 
              className="mipo-gradient-button w-full"
            >
              הבנתי!
            </Button>
          </motion.div>
        </motion.div>
      )}

      <div className="max-w-md mx-auto p-4 pt-6">
        {/* Step Title */}
        {currentStep > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <h2 className="text-2xl font-semibold text-mipo-ink">
              {stepTitles[currentStep]}
            </h2>
          </motion.div>
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
                className="mipo-flow-card p-8 text-center space-y-7"
              >
                <PetidLogo size="md" showAnimals className="mx-auto" />
                <h1 className="text-2xl font-semibold text-mipo-ink">ברוכים הבאים ל-MIPO</h1>
                <p className="text-mipo-muted text-base">
                  הבית השקט והחכם של חיית המחמד שלכם
                </p>
                <Button 
                  onClick={nextStep} 
                  size="lg" 
                  className="mipo-gradient-button w-full"
                >
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
                <p className="text-center text-mipo-muted">בחרו את סוג חיית המחמד</p>
                <div className="grid grid-cols-2 gap-6 py-4">
                  <motion.button 
                    type="button" 
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setPetType("cat");
                      forceNextStep();
                    }} 
                    className={cn(
                      "mipo-soft-card flex flex-col items-center justify-center p-6 transition-all",
                      petType === "cat" 
                        ? "border-mipo-cyan shadow-shop" 
                        : "hover:border-mipo-cyan/50 hover:shadow-elevated"
                    )}
                  >
                    <img src={catIcon} alt="חתול" className="w-24 h-24 object-contain mb-3" />
                    <span className="font-semibold text-mipo-ink text-lg">חתול</span>
                  </motion.button>
                  
                  <motion.button 
                    type="button" 
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      setPetType("dog");
                      forceNextStep();
                    }} 
                    className={cn(
                      "mipo-soft-card flex flex-col items-center justify-center p-6 transition-all",
                      petType === "dog" 
                        ? "border-mipo-cyan shadow-shop" 
                        : "hover:border-mipo-cyan/50 hover:shadow-elevated"
                    )}
                  >
                    <img src={dogIcon} alt="כלב" className="w-28 h-28 object-contain mb-3" />
                    <span className="font-semibold text-mipo-ink text-lg">כלב</span>
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
                className="mipo-flow-card p-6 space-y-6"
              >
                {/* Image Upload */}
                <div className="text-center space-y-3">
                  <Label className="block font-semibold text-mipo-ink">תמונת פרופיל</Label>
                  
                  {/* Preview circle */}
                  <div className="relative w-32 h-32 mx-auto">
                    <div 
                      className="w-32 h-32 rounded-full border-3 border-dashed transition-all flex items-center justify-center overflow-hidden"
                      style={{ 
                        borderColor: imagePreview ? 'hsl(var(--mipo-cyan))' : 'hsl(var(--mipo-line))',
                        background: imagePreview ? 'transparent' : 'hsl(var(--mipo-soft))'
                      }}
                    >
                      {imagePreview ? (
                        <img src={imagePreview} alt="תצוגה מקדימה" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <Camera className="w-10 h-10 text-mipo-muted" />
                          <span className="text-xs text-mipo-muted">צלם או העלה</span>
                        </div>
                      )}
                    </div>
                    {breedDetecting && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                        <div className="text-center">
                          <Loader2 className="w-8 h-8 text-white animate-spin mx-auto" />
                          <span className="text-xs text-white mt-1 block">מזהה גזע...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Camera + Gallery buttons */}
                  <div className="flex gap-3 justify-center">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCameraCapture}
                      className="mipo-gradient-button min-h-0 px-4 py-2.5 text-sm"
                    >
                      <Camera className="w-4 h-4" />
                      צלם
                    </motion.button>
                    <label>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="mipo-pill-button min-h-0 px-4 py-2.5 text-sm cursor-pointer"
                      >
                        <ImagePlus className="w-4 h-4" />
                        גלריה
                      </motion.div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Photo quality warning */}
                  {photoQualityFeedback && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 px-4 py-3 rounded-xl bg-warning/10 border border-warning/30 text-sm"
                    >
                      <Camera className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                      <span className="text-mipo-ink">
                        {photoQualityFeedback.includes('dark') || photoQualityFeedback.includes('blur') 
                          ? 'צלם תמונה ברורה יותר באור טוב יותר לזיהוי מדויק.'
                          : photoQualityFeedback}
                      </span>
                    </motion.div>
                  )}

                  {/* AI breed detection badge */}
                  {breedConfidence !== null && formData.breed && breedSource === 'ai' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      <div
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm shadow-xs"
                        style={{ background: breedConfidence > 0.8 ? 'var(--gradient-primary)' : 'hsl(var(--mipo-soft))' }}
                      >
                        <Sparkles className={cn("w-4 h-4", breedConfidence > 0.8 ? "text-white" : "text-warning")} />
                        <span className={cn("font-medium", breedConfidence > 0.8 ? "text-white" : "text-mipo-ink")}>
                          זוהה: {formData.breed} ({Math.round(breedConfidence * 100)}%)
                        </span>
                      </div>
                      {breedConfidence <= 0.8 && (
                        <p className="text-xs text-mipo-muted">
                          רמת הוודאות נמוכה. אנא אשרו או ערכו את הגזע למטה
                        </p>
                      )}

                      {/* Breed-specific health risks */}
                      {detectedHealthRisks.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="bg-mipo-soft rounded-xl p-3 space-y-2"
                        >
                          <p className="text-xs font-semibold text-mipo-ink flex items-center gap-1">
                            <Heart className="w-3.5 h-3.5 text-destructive" />
                            סיכונים בריאותיים לגזע
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {detectedHealthRisks.slice(0, 5).map((risk, i) => (
                              <span
                                key={i}
                                className={cn(
                                  "text-[11px] px-2 py-1 rounded-full font-medium",
                                  risk.severity === 'high' ? "bg-destructive/15 text-destructive" :
                                  risk.severity === 'medium' ? "bg-warning/15 text-warning" :
                                  "bg-white text-mipo-muted"
                                )}
                              >
                                {risk.risk_he || risk.risk}
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  {/* Breed detection failed message */}
                  {breedDetectionFailed && !breedDetecting && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 px-4 py-3 rounded-xl bg-destructive/10 text-sm"
                    >
                      <span className="text-destructive font-medium">
                        לא הצלחנו לזהות את הגזע. בחר ידנית לדיוק בריאותי טוב יותר.
                      </span>
                    </motion.div>
                  )}
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-mipo-ink">שם חיית המחמד *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="מה השם?"
                    className="mipo-input text-lg h-12"
                  />
                </div>

                {/* Breed Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="breed" className="text-mipo-ink">גזע</Label>
                    {breedSource === 'ai' && (
                      <span className="text-xs text-mipo-muted flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-warning" />
                        זוהה אוטומטית
                      </span>
                    )}
                  </div>

                  {/* Mixed breed toggle */}
                  <motion.button
                    type="button"
                    onClick={() => {
                      const newMixed = !formData.is_mixed;
                      setFormData(prev => ({ 
                        ...prev, 
                        is_mixed: newMixed,
                        breed: newMixed && !prev.breed ? 'מעורב' : prev.breed,
                        secondary_breed: newMixed ? prev.secondary_breed : ''
                      }));
                      setBreedSource('user');
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all w-full",
                      formData.is_mixed 
                        ? "border-mipo-cyan bg-mipo-cyan/10 text-mipo-ink font-medium" 
                        : "border-mipo-line bg-mipo-soft text-mipo-muted"
                    )}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="text-base">🧬</span>
                    <span>{formData.is_mixed ? 'גזע מעורב ✓' : 'מעורב? לחץ כאן'}</span>
                  </motion.button>

                  {/* Primary breed input with search */}
                  <div className="relative">
                    <Input
                      id="breed"
                      value={formData.breed}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => ({ ...prev, breed: val }));
                        setBreedSource('user');
                        setBreedSearchField('primary');
                        searchBreeds(val);
                        setShowBreedSearch(val.length >= 1);
                      }}
                      onFocus={() => {
                        if (formData.breed.length >= 1) {
                          setBreedSearchField('primary');
                          searchBreeds(formData.breed);
                          setShowBreedSearch(true);
                        }
                      }}
                      onBlur={() => setTimeout(() => setShowBreedSearch(false), 200)}
                      placeholder={breedDetecting ? "מזהה גזע..." : formData.is_mixed ? "גזע ראשי" : "חפש גזע..."}
                      disabled={breedDetecting}
                      className="mipo-input h-12"
                    />
                    {/* Search results dropdown */}
                    {showBreedSearch && breedSearchField === 'primary' && breedSearchResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute z-20 top-full mt-1 w-full bg-white rounded-xl border border-mipo-line shadow-lg max-h-48 overflow-y-auto"
                      >
                        {breedSearchResults.map((b, i) => (
                          <button
                            key={i}
                            type="button"
                            className="w-full text-right px-4 py-2.5 text-sm hover:bg-mipo-soft transition-colors border-b border-mipo-line/60 last:border-0"
                            onMouseDown={() => {
                              setFormData(prev => ({ ...prev, breed: b.breed_name_he || b.breed_name }));
                              setBreedSource('user');
                              setShowBreedSearch(false);
                            }}
                          >
                            <span className="font-medium">{b.breed_name_he || b.breed_name}</span>
                            {b.breed_name_he && (
                              <span className="text-mipo-muted mr-2 text-xs">({b.breed_name})</span>
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </div>

                  {/* Secondary breed (visible when mixed) */}
                  {formData.is_mixed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="relative"
                    >
                      <Input
                        value={formData.secondary_breed}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData(prev => ({ ...prev, secondary_breed: val }));
                          setBreedSearchField('secondary');
                          searchBreeds(val);
                          setShowBreedSearch(val.length >= 1);
                        }}
                        onFocus={() => {
                          if (formData.secondary_breed.length >= 1) {
                            setBreedSearchField('secondary');
                            searchBreeds(formData.secondary_breed);
                            setShowBreedSearch(true);
                          }
                        }}
                        onBlur={() => setTimeout(() => setShowBreedSearch(false), 200)}
                        placeholder="גזע משני (אופציונלי)"
                        className="mipo-input h-12"
                      />
                      {showBreedSearch && breedSearchField === 'secondary' && breedSearchResults.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute z-20 top-full mt-1 w-full bg-white rounded-xl border border-mipo-line shadow-lg max-h-48 overflow-y-auto"
                        >
                          {breedSearchResults.map((b, i) => (
                            <button
                              key={i}
                              type="button"
                              className="w-full text-right px-4 py-2.5 text-sm hover:bg-mipo-soft transition-colors border-b border-mipo-line/60 last:border-0"
                              onMouseDown={() => {
                                setFormData(prev => ({ ...prev, secondary_breed: b.breed_name_he || b.breed_name }));
                                setShowBreedSearch(false);
                              }}
                            >
                              <span className="font-medium">{b.breed_name_he || b.breed_name}</span>
                              {b.breed_name_he && (
                                <span className="text-mipo-muted mr-2 text-xs">({b.breed_name})</span>
                              )}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={prevStep} variant="outline" className="mipo-pill-button flex-1 h-12">חזור</Button>
                  <Button 
                    onClick={nextStep} 
                    disabled={!formData.name.trim()} 
                    className="mipo-gradient-button flex-1 h-12"
                  >
                    המשך
                  </Button>
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
                className="mipo-flow-card p-6 space-y-6"
              >
                {/* Birth Date */}
                <div className="space-y-2">
                  <Label className="text-mipo-ink">תאריך לידה</Label>
                  <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="mipo-input w-full justify-start text-right h-12">
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
                  <Label className="text-mipo-ink">מין</Label>
                  <Select value={formData.gender} onValueChange={(val) => setFormData(prev => ({ ...prev, gender: val }))}>
                    <SelectTrigger className="mipo-input h-12">
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
                  <Label className="text-mipo-ink">מעוקר/מסורס?</Label>
                  <Select value={formData.is_neutered} onValueChange={(val) => setFormData(prev => ({ ...prev, is_neutered: val }))}>
                    <SelectTrigger className="mipo-input h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">כן</SelectItem>
                      <SelectItem value="false">לא</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={prevStep} variant="outline" className="mipo-pill-button flex-1 h-12">חזור</Button>
                  <Button 
                    onClick={nextStep} 
                    className="mipo-gradient-button flex-1 h-12"
                  >
                    המשך
                  </Button>
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
                className="mipo-flow-card p-6 space-y-6"
              >
                <p className="text-mipo-muted text-center text-sm">
                  בחר תגיות שמתארות את {formData.name || "חיית המחמד"}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {(petType === 'cat' ? PERSONALITY_TAGS_CAT : PERSONALITY_TAGS_DOG).map(tag => (
                    <motion.button
                      key={tag.value}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleTag(tag.value, setPersonalityTags)}
                      className={cn(
                        "p-4 rounded-xl border transition-all text-center",
                        personalityTags.includes(tag.value)
                          ? "border-transparent shadow-shop"
                          : "border-mipo-line hover:border-mipo-cyan/50 bg-white"
                      )}
                      style={personalityTags.includes(tag.value) ? { background: 'var(--gradient-primary)' } : {}}
                    >
                      <div className="text-2xl mb-1">{tag.emoji}</div>
                      <div className={cn(
                        "text-sm font-medium",
                        personalityTags.includes(tag.value) ? "text-white" : "text-mipo-ink"
                      )}>{tag.label}</div>
                    </motion.button>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={prevStep} variant="outline" className="mipo-pill-button flex-1 h-12">חזור</Button>
                  <Button 
                    onClick={nextStep} 
                    className="mipo-gradient-button flex-1 h-12"
                  >
                    המשך
                  </Button>
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
                className="mipo-flow-card p-6 space-y-6"
              >
                <p className="text-mipo-muted text-center text-sm">
                  {petType === 'cat' 
                    ? `מה רמת הפעילות של ${formData.name || "החתול"}?`
                    : `מה ${formData.name || "חיית המחמד"} אוהב/ת לעשות?`
                  }
                </p>

                {petType === 'cat' ? (
                  <div className="space-y-3">
                    {CAT_ACTIVITIES.map(activity => (
                      <motion.button
                        key={activity.value}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => toggleTag(activity.value, setActivities)}
                        className={cn(
                          "w-full p-4 rounded-xl border transition-all flex items-center gap-3",
                          activities.includes(activity.value)
                            ? "border-transparent shadow-shop"
                            : "border-mipo-line hover:border-mipo-cyan/50 bg-white"
                        )}
                        style={activities.includes(activity.value) ? { background: 'var(--gradient-primary)' } : {}}
                      >
                        <div className="text-2xl">{activity.emoji}</div>
                        <div className={cn(
                          "text-base font-medium",
                          activities.includes(activity.value) ? "text-white" : "text-mipo-ink"
                        )}>{activity.label}</div>
                        {activities.includes(activity.value) && (
                          <Check className="w-5 h-5 text-white mr-auto" />
                        )}
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {DOG_ACTIVITIES.map(activity => (
                      <motion.button
                        key={activity.value}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => toggleTag(activity.value, setActivities)}
                        className={cn(
                          "w-full p-4 rounded-xl border transition-all flex items-center gap-3",
                          activities.includes(activity.value)
                            ? "border-transparent shadow-shop"
                            : "border-mipo-line hover:border-mipo-cyan/50 bg-white"
                        )}
                        style={activities.includes(activity.value) ? { background: 'var(--gradient-primary)' } : {}}
                      >
                        <div className="text-2xl">{activity.emoji}</div>
                        <div className={cn(
                          "text-lg font-medium",
                          activities.includes(activity.value) ? "text-white" : "text-mipo-ink"
                        )}>{activity.label}</div>
                        {activities.includes(activity.value) && (
                          <Check className="w-5 h-5 text-white mr-auto" />
                        )}
                      </motion.button>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button onClick={prevStep} variant="outline" className="mipo-pill-button flex-1 h-12">חזור</Button>
                  <Button 
                    onClick={nextStep} 
                    className="mipo-gradient-button flex-1 h-12"
                  >
                    המשך
                  </Button>
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
                className="mipo-flow-card p-6 space-y-6"
              >
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mipo-soft text-mipo-muted text-sm mb-2">
                    <Heart className="w-4 h-4" />
                    אופציונלי
                  </div>
                </div>
                <div className="space-y-4">
                  <Label className="text-base font-semibold text-mipo-ink">
                    האם {formData.name || 'חיית המחמד'} סובל/ת מרגישות או בעיה רפואית?
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {MEDICAL_CONDITIONS
                      .filter(c => c.value !== 'hairball' || petType === 'cat')
                      .map((condition) => {
                        const isSelected = medicalConditions.includes(condition.value);
                        return (
                          <motion.button
                            key={condition.value}
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setMedicalConditions(prev =>
                                prev.includes(condition.value)
                                  ? prev.filter(v => v !== condition.value)
                                  : [...prev, condition.value]
                              );
                              if (condition.value === 'other' && !medicalConditions.includes('other')) {
                                // opening other
                              } else if (condition.value === 'other' && medicalConditions.includes('other')) {
                                setOtherConditionText('');
                              }
                            }}
                            className={cn(
                              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border',
                              isSelected
                                ? 'border-mipo-cyan bg-mipo-cyan/10 text-mipo-ink'
                                : 'border-mipo-line bg-white text-mipo-muted hover:border-mipo-cyan/50'
                            )}
                          >
                            <span>{condition.emoji}</span>
                            <span>{condition.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </motion.button>
                        );
                      })}
                  </div>

                  {medicalConditions.includes('other') && (
                    <Textarea
                      value={otherConditionText}
                      onChange={(e) => setOtherConditionText(e.target.value)}
                      placeholder="פרט/י את הבעיה הרפואית..."
                      rows={2}
                      className="mipo-input rounded-xl resize-none"
                    />
                  )}

                  {medicalConditions.length > 0 && !medicalConditions.every(c => c === 'other') && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl p-3 bg-mipo-soft border border-mipo-line text-sm text-mipo-ink"
                    >
                      <p className="font-medium mb-1">💡 שימי לב</p>
                      <p className="text-mipo-muted">
                        ב-MIPO תוכל/י למצוא מידע על תזונה רפואית מותאמת לבעיות שציינת.
                      </p>
                    </motion.div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={prevStep} variant="outline" className="mipo-pill-button flex-1 h-12">חזור</Button>
                  <Button 
                    onClick={nextStep} 
                    className="mipo-gradient-button flex-1 h-12"
                  >
                    המשך
                  </Button>
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
                className="mipo-flow-card p-6 space-y-6 text-center"
              >
                <div 
                  className="w-16 h-16 mx-auto rounded-full flex items-center justify-center shadow-shop"
                  style={{ background: 'var(--gradient-primary)' }}
                >
                  <span className="text-3xl">🎉</span>
                </div>
                
                {imagePreview ? (
                  <div className="relative w-28 h-28 mx-auto">
                    <img 
                      src={imagePreview} 
                      alt={formData.name}
                      className="w-28 h-28 rounded-full object-cover shadow-shop"
                      style={{ border: '4px solid hsl(0 0% 100%)' }}
                    />
                  </div>
                ) : (
                  <div 
                    className="w-28 h-28 mx-auto rounded-full flex items-center justify-center"
                    style={{ background: 'var(--gradient-primary)' }}
                  >
                    <span className="text-5xl">{petType === "dog" ? "🐕" : "🐈"}</span>
                  </div>
                )}
                
                <h2 className="text-2xl font-semibold text-mipo-ink">{formData.name}</h2>
                
                <div className="text-right space-y-3 bg-mipo-soft rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-mipo-ink font-medium">{petType === "dog" ? "כלב" : "חתול"}</span>
                    <span className="text-mipo-muted text-sm">סוג</span>
                  </div>
                  {formData.breed && (
                    <div className="flex justify-between items-center">
                      <span className="text-mipo-ink font-medium">{formData.breed}</span>
                      <span className="text-mipo-muted text-sm">גזע</span>
                    </div>
                  )}
                  {formData.gender && (
                    <div className="flex justify-between items-center">
                      <span className="text-mipo-ink font-medium">{formData.gender === "male" ? "זכר" : "נקבה"}</span>
                      <span className="text-mipo-muted text-sm">מין</span>
                    </div>
                  )}
                  {personalityTags.length > 0 && (
                    <div className="pt-2 border-t border-mipo-line">
                      <span className="text-mipo-muted text-sm block mb-2">אישיות</span>
                      <div className="flex flex-wrap gap-2">
                        {personalityTags.map(t => {
                          const tag = (petType === 'cat' ? PERSONALITY_TAGS_CAT : PERSONALITY_TAGS_DOG).find(pt => pt.value === t);
                          return (
                            <span 
                              key={t}
                              className="px-3 py-1 rounded-full text-sm text-white"
                              style={{ background: 'var(--gradient-primary)' }}
                            >
                              {tag?.emoji} {tag?.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {isOnboarding && (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-xl p-4 space-y-2 shadow-shop"
                    style={{ background: 'var(--gradient-primary)' }}
                  >
                    <div className="text-3xl">🎁</div>
                    <p className="font-semibold text-white">קיבלת 50 נקודות התחלתיות</p>
                    <p className="text-sm text-white/80">ובאדג׳ "ברוך הבא" 🏆</p>
                  </motion.div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button onClick={prevStep} variant="outline" className="mipo-pill-button flex-1 h-12">חזור</Button>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={loading} 
                    className="mipo-gradient-button flex-1 h-12"
                  >
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

      {/* Type Mismatch Dialog */}
      <AlertDialog open={!!typeMismatch} onOpenChange={(open) => !open && handleTypeMismatchKeep()}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">
              {petType === 'dog' ? '🐱' : '🐕'} רגע, זיהינו משהו אחר
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right text-base">
              {petType === 'dog' 
                ? `בחרת להוסיף כלב, אבל נראה לנו שזה חתול (${typeMismatch?.breed}). רוצה לתקן?`
                : `בחרת להוסיף חתול, אבל נראה לנו שזה כלב (${typeMismatch?.breed}). רוצה לתקן?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2 sm:flex-row-reverse">
            <AlertDialogAction onClick={handleTypeMismatchSwitch}>
              {typeMismatch?.detectedType === 'cat' ? 'כן, זה חתול 🐱' : 'כן, זה כלב 🐕'}
            </AlertDialogAction>
            <AlertDialogCancel onClick={handleTypeMismatchKeep}>
              {petType === 'dog' ? 'לא, זה כלב' : 'לא, זה חתול'}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AddPet;
