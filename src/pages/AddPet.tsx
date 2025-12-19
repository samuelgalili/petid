import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Sparkles, ArrowLeft, ArrowRight, Calendar as CalendarIcon, Camera, Edit2 } from "lucide-react";
import { usePetPreference } from "@/contexts/PetPreferenceContext";
import { useGuest } from "@/contexts/GuestContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import dogIcon from "@/assets/dog-official.svg";
import catIcon from "@/assets/cat-official.png";
import { motion, AnimatePresence } from "framer-motion";
const AddPet = () => {
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    birthDate: null as Date | null,
    gender: "",
    breed: "",
    is_neutered: "false"
  });
  const [breedDetecting, setBreedDetecting] = useState(false);
  const [breedConfident, setBreedConfident] = useState(true);
  const [breedConfidence, setBreedConfidence] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [showValidationError, setShowValidationError] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | null>(null);
  const [isEditingBreed, setIsEditingBreed] = useState(false);
  const [tempBreed, setTempBreed] = useState("");

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;
  const [showCalendar, setShowCalendar] = useState(false);
  const {
    petType,
    setPetType
  } = usePetPreference();
  const {
    isGuest
  } = useGuest();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session && !isGuest) {
        navigate("/auth");
      }
    };
    checkAuth();

    // Check if user has seen the tutorial
    const hasSeenTutorial = localStorage.getItem('hasSeenSwipeTutorial');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }

    // Load saved draft from localStorage
    const savedDraft = localStorage.getItem('addPetDraft');
    if (savedDraft) {
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
        if (draft.breedConfidence !== undefined) setBreedConfidence(draft.breedConfidence);
        if (draft.breedConfident !== undefined) setBreedConfident(draft.breedConfident);
        
        toast({
          title: "טיוטה שוחזרה",
          description: "ההתקדמות הקודמת שלך שוחזרה"
        });
      } catch (e) {
        console.error('Error loading draft:', e);
      }
    }
  }, [navigate, isGuest, toast]);

  // Auto-save to localStorage
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
        breedConfidence,
        breedConfident,
        timestamp: new Date().toISOString()
      };

      const saveTimer = setTimeout(() => {
        localStorage.setItem('addPetDraft', JSON.stringify(draft));
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus(null), 2000);
      }, 1000); // Debounce auto-save

      return () => clearTimeout(saveTimer);
    }
  }, [formData, currentStep, petType, imagePreview, breedConfidence, breedConfident]);

  const dismissTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('hasSeenSwipeTutorial', 'true');
  };

  const clearDraft = () => {
    localStorage.removeItem('addPetDraft');
    toast({
      title: "הטיוטה נוקתה",
      description: "ההתקדמות השמורה שלך הוסרה"
    });
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
        setBreedConfident(data.confident);
        setBreedConfidence(data.confidence || null);
        
        // Save to history if user is logged in
        const { data: { user } } = await supabase.auth.getUser();
        if (user && imagePreview) {
          // We'll save to history after pet is created, storing data for now
        }
      } else {
        setBreedConfident(false);
        setBreedConfidence(data.confidence || null);
      }
    } catch (error) {
      console.error('Error detecting breed:', error);
      setBreedConfident(false);
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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petType) {
      toast({
        title: "שגיאה",
        description: "אנא בחר סוג חיית מחמד",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      // For guest users, just show success and navigate
      if (isGuest) {
        toast({
          title: "מצב אורח",
          description: "אנא התחבר כדי לשמור את חיית המחמד שלך לצמיתות. הנתונים לא יישמרו במצב אורח.",
          variant: "destructive"
        });
        navigate("/home");
        return;
      }
      
      console.log("Starting pet submission...");
      
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("No user authenticated");
        toast({
          title: "נדרשת הזדהות",
          description: "אנא התחבר כדי להוסיף חיית מחמד",
          variant: "destructive"
        });
        navigate("/auth");
        return;
      }
      
      console.log("User authenticated:", user.id);
      
      let avatarUrl = "";

      // Upload image if exists
      if (imageFile) {
        console.log("Uploading image...");
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const {
          error: uploadError
        } = await supabase.storage.from("pet-avatars").upload(fileName, imageFile);
        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw uploadError;
        }
        const {
          data: {
            publicUrl
          }
        } = supabase.storage.from("pet-avatars").getPublicUrl(fileName);
        avatarUrl = publicUrl;
        console.log("Image uploaded:", avatarUrl);
      }

      // Insert pet data
      console.log("Inserting pet data...", {
        user_id: user.id,
        name: formData.name,
        type: petType,
        birth_date: formData.birthDate ? formData.birthDate.toISOString().split('T')[0] : null,
        gender: formData.gender || null,
        breed: formData.breed || null,
        breed_confidence: breedConfidence,
        is_neutered: formData.is_neutered === "true",
        avatar_url: avatarUrl
      });
      
      const {
        data: petData,
        error: insertError
      } = await supabase.from("pets").insert({
        user_id: user.id,
        name: formData.name,
        type: petType,
        birth_date: formData.birthDate ? formData.birthDate.toISOString().split('T')[0] : null,
        gender: formData.gender || null,
        breed: formData.breed || null,
        breed_confidence: breedConfidence,
        is_neutered: formData.is_neutered === "true",
        avatar_url: avatarUrl
      }).select().single();
      
      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }
      
      console.log("Pet inserted successfully:", petData);

      // Save initial breed detection to history if available
      if (petData && formData.breed && breedConfidence !== null) {
        console.log("Saving breed detection history...");
        await supabase.from("breed_detection_history").insert({
          pet_id: petData.id,
          breed: formData.breed,
          confidence: breedConfidence,
          avatar_url: avatarUrl
        });
      }
      
      toast({
        title: "הצלחה!",
        description: `${formData.name} נוסף בהצלחה!`
      });
      
      // Clear saved draft after successful submission
      localStorage.removeItem('addPetDraft');
      
      navigate("/home");
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
    if (currentStep === 1) return petType !== null;
    if (currentStep === 2) return formData.name.trim() !== "" && formData.breed.trim() !== "";
    if (currentStep === 3) return true; // Gender and neutered are optional
    return true;
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

    // Swipe left = next step (if allowed)
    if (isLeftSwipe && currentStep < 4) {
      if (canProceed()) {
        setSlideDirection('left');
        setCurrentStep(prev => prev + 1);
        setShowValidationError(false);
      } else {
        // Show validation error
        setShowValidationError(true);
        setTimeout(() => setShowValidationError(false), 2000);
      }
    }

    // Swipe right = previous step
    if (isRightSwipe && currentStep > 1) {
      setSlideDirection('right');
      setCurrentStep(prev => prev - 1);
      setShowValidationError(false);
    }

    setIsSwiping(false);
    setSwipeDirection(null);
  };
  return (
    <div className="min-h-screen bg-background p-4 pb-24 relative" dir="rtl">
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
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-card rounded-3xl p-8 max-w-sm w-full space-y-6 shadow-2xl"
          >
            <div className="w-16 h-16 mx-auto bg-primary rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <h3 className="text-2xl font-bold text-foreground text-center">
              החלקה לניווט
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-muted rounded-xl">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-primary" />
                </div>
                <p className="text-muted-foreground text-sm">
                  החלק <span className="font-semibold text-foreground">ימינה</span> לחזור
                </p>
              </div>
              <div className="flex items-center gap-4 p-3 bg-muted rounded-xl">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ArrowLeft className="w-5 h-5 text-primary" />
                </div>
                <p className="text-muted-foreground text-sm">
                  החלק <span className="font-semibold text-foreground">שמאלה</span> להמשיך
                </p>
              </div>
            </div>
            <Button
              onClick={dismissTutorial}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              הבנתי!
            </Button>
          </motion.div>
        </motion.div>
      )}

      {/* Back Button */}
      {currentStep > 1 && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          type="button"
          onClick={() => {
            setSlideDirection('right');
            setCurrentStep(prev => prev - 1);
            setShowValidationError(false);
          }}
          className="fixed top-6 right-4 z-[100] p-2.5 bg-card rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 border border-border"
        >
          <ArrowRight className="w-5 h-5 text-foreground" />
        </motion.button>
      )}

      <div className="max-w-md mx-auto pt-12 md:pt-16">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 mb-3 px-4 py-1.5 bg-primary/10 rounded-full">
            <span className="text-xs font-semibold text-primary">שלב {currentStep} מתוך 4</span>
            {autoSaveStatus === 'saved' && (
              <span className="text-xs text-green-600">• נשמר</span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {currentStep === 1 && "בחר את חיית המחמד שלך"}
            {currentStep === 2 && "פרטי חיית המחמד"}
            {currentStep === 3 && "מידע נוסף"}
            {currentStep === 4 && "סקירה ואישור"}
          </h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            {currentStep === 1 && "בחר את סוג חיית המחמד שלך כדי להתחיל"}
            {currentStep === 2 && "ספר לנו על החבר הפרוותי שלך"}
            {currentStep === 3 && "עוד כמה פרטים קטנים"}
            {currentStep === 4 && "וודא שהכל נראה נכון"}
          </p>
          {currentStep > 1 && (
            <button
              type="button"
              onClick={clearDraft}
              className="mt-2 text-xs text-muted-foreground hover:text-foreground underline transition-colors"
            >
              נקה טיוטה שמורה
            </button>
          )}
        </motion.div>

        {/* Progress Bar */}
        <div className="mb-8 px-2">
          <div className="flex items-center justify-between gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex-1 flex items-center">
                <div className="flex-1 relative">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ 
                        width: step < currentStep ? '100%' : step === currentStep ? '50%' : '0%' 
                      }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                  <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    step < currentStep 
                      ? 'bg-primary text-primary-foreground scale-90' 
                      : step === currentStep 
                        ? 'bg-card border-2 border-primary text-primary scale-110 shadow-lg'
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {step < currentStep ? '✓' : step}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
            {/* Swipe Indicators */}
            {isSwiping && currentStep > 1 && swipeDirection === 'right' && (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 pointer-events-none"
              >
                <div className="flex items-center gap-1 text-primary">
                  <ArrowRight className="w-8 h-8 animate-pulse" strokeWidth={2.5} />
                </div>
              </motion.div>
            )}
            
            {isSwiping && currentStep < 4 && canProceed() && swipeDirection === 'left' && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 pointer-events-none"
              >
                <div className="flex items-center gap-1 text-primary">
                  <ArrowLeft className="w-8 h-8 animate-pulse" strokeWidth={2.5} />
                </div>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
              <AnimatePresence mode="wait" initial={false}>
                {/* Step 1: Pet Type Selection */}
                {currentStep === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ x: slideDirection === 'left' ? 100 : -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: slideDirection === 'left' ? -100 : 100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-2 gap-6 py-8">
                      <motion.button 
                        type="button" 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setPetType("dog");
                          setCurrentStep(2);
                        }} 
                        className="group relative flex flex-col items-center justify-center p-6 bg-card rounded-3xl border-2 border-border hover:border-primary hover:shadow-xl transition-all duration-300"
                      >
                        <div className="w-28 h-28 md:w-36 md:h-36 flex items-center justify-center mb-3">
                          <img src={dogIcon} alt="כלב" className="w-full h-full object-contain drop-shadow-lg" />
                        </div>
                        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">כלב</span>
                      </motion.button>
                      
                      <motion.button 
                        type="button" 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setPetType("cat");
                          setCurrentStep(2);
                        }} 
                        className="group relative flex flex-col items-center justify-center p-6 bg-card rounded-3xl border-2 border-border hover:border-primary hover:shadow-xl transition-all duration-300"
                      >
                        <div className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center mb-3">
                          <img src={catIcon} alt="חתול" className="w-full h-full object-contain drop-shadow-lg" />
                        </div>
                        <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">חתול</span>
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Basic Info */}
                {currentStep === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ x: slideDirection === 'left' ? 100 : -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: slideDirection === 'left' ? -100 : 100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="space-y-5 bg-card rounded-3xl p-6 shadow-sm border border-border"
                  >
                    {/* Image Upload */}
                    <div className="space-y-4">
                      <Label className="text-sm font-semibold text-foreground">תמונת חיית המחמד</Label>
                      <div className="flex flex-col items-center gap-4">
                        {imagePreview ? (
                          <div className="relative group">
                            <div className="absolute -inset-1 bg-primary rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
                            <img src={imagePreview} alt="תצוגה מקדימה" className="relative w-28 h-28 rounded-full object-cover ring-4 ring-card shadow-xl" />
                            {breedDetecting && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                                <Loader2 className="w-6 h-6 text-primary-foreground animate-spin" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-28 h-28 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border">
                            <Camera className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex gap-3 w-full">
                          <Label htmlFor="image-upload" className="flex-1 flex items-center gap-2 cursor-pointer bg-muted border border-border rounded-xl p-3 hover:bg-muted/80 hover:border-primary transition-all duration-200 justify-center">
                            <Upload className="w-4 h-4 text-foreground" />
                            <span className="font-medium text-sm text-foreground">העלאה</span>
                            <Input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                          </Label>
                          <Label htmlFor="image-camera" className="flex-1 flex items-center gap-2 cursor-pointer bg-muted border border-border rounded-xl p-3 hover:bg-muted/80 hover:border-primary transition-all duration-200 justify-center">
                            <Camera className="w-4 h-4 text-foreground" />
                            <span className="font-medium text-sm text-foreground">מצלמה</span>
                            <Input id="image-camera" type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Name */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-semibold text-foreground">
                        שם <span className="text-destructive">*</span>
                      </Label>
                      <Input 
                        id="name" 
                        value={formData.name} 
                        onChange={e => setFormData({ ...formData, name: e.target.value })} 
                        placeholder="איך קוראים לחיית המחמד שלך?" 
                        required 
                        disabled={loading} 
                        className={cn(
                          "h-11 text-sm bg-muted border border-border rounded-xl placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all",
                          showValidationError && formData.name.trim() === "" && "border-destructive bg-destructive/10"
                        )}
                      />
                      {showValidationError && formData.name.trim() === "" && (
                        <p className="text-xs text-destructive animate-fade-in">שם חיית המחמד הוא שדה חובה</p>
                      )}
                    </div>

                    {/* Birth Date */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-foreground">תאריך לידה</Label>
                      <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full h-11 text-sm bg-muted border border-border rounded-xl hover:bg-muted/80 hover:border-primary justify-start text-right font-normal",
                              !formData.birthDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="ml-2 h-4 w-4 text-muted-foreground" />
                            {formData.birthDate ? format(formData.birthDate, "PPP") : "בחר תאריך לידה"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.birthDate || undefined}
                            onSelect={(date) => {
                              setFormData({ ...formData, birthDate: date || null });
                              setShowCalendar(false);
                            }}
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Breed */}
                    <div className="space-y-2">
                      <Label htmlFor="breed" className="text-sm font-semibold text-foreground">
                        גזע <span className="text-destructive">*</span>
                      </Label>
                      {breedDetecting && (
                        <div className="flex items-center gap-2 text-xs text-primary font-medium">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          AI מנתח את התמונה שלך...
                        </div>
                      )}
                      {formData.breed && !breedDetecting && breedConfidence !== null && (
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <span className="text-xs text-muted-foreground">AI זיהה: <strong>{formData.breed}</strong></span>
                          <span className={`text-sm font-semibold ${breedConfident ? 'text-green-600' : 'text-orange-500'}`}>
                            {breedConfident ? '✓' : '?'}
                          </span>
                        </div>
                      )}
                      {!breedConfident && formData.breed && (
                        <p className="text-xs text-orange-600">אנא אשר או תקן את הגזע שזוהה</p>
                      )}
                      <div className="relative">
                        <Input 
                          id="breed" 
                          value={formData.breed} 
                          onChange={e => setFormData({ ...formData, breed: e.target.value })} 
                          placeholder={breedDetecting ? "מזהה גזע..." : "מה הגזע?"} 
                          disabled={loading || breedDetecting} 
                          className={cn(
                            "h-11 text-sm bg-muted border border-border rounded-xl placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all",
                            breedDetecting && "pl-10",
                            showValidationError && formData.breed.trim() === "" && "border-destructive bg-destructive/10"
                          )}
                        />
                        {breedDetecting && (
                          <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="w-4 h-4 text-primary animate-spin" />
                          </div>
                        )}
                      </div>
                      {showValidationError && formData.breed.trim() === "" && (
                        <p className="text-xs text-destructive animate-fade-in">גזע הוא שדה חובה - העלה תמונה או הזן ידנית</p>
                      )}
                    </div>

                    {/* Continue Button */}
                    <div className="pt-2">
                      <Button
                        type="button"
                        onClick={() => {
                          if (canProceed()) {
                            setSlideDirection('left');
                            setCurrentStep(3);
                            setShowValidationError(false);
                          } else {
                            setShowValidationError(true);
                            setTimeout(() => setShowValidationError(false), 2000);
                          }
                        }}
                        disabled={!canProceed() || breedDetecting}
                        className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {breedDetecting ? (
                          <>
                            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                            מזהה...
                          </>
                        ) : (
                          <>
                            המשך
                            <ArrowLeft className="mr-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Additional Info */}
                {currentStep === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{ x: slideDirection === 'left' ? 100 : -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: slideDirection === 'left' ? -100 : 100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="space-y-5 bg-card rounded-3xl p-6 shadow-sm border border-border"
                  >
                    {/* Gender */}
                    <div className="space-y-2">
                      <Label htmlFor="gender" className="text-sm font-semibold text-foreground">מין</Label>
                      <Select value={formData.gender} onValueChange={value => setFormData({ ...formData, gender: value })} disabled={loading}>
                        <SelectTrigger className="h-11 text-sm bg-muted border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all">
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
                      <Label htmlFor="neutered" className="text-sm font-semibold text-foreground">מסורס/מעוקר</Label>
                      <Select value={formData.is_neutered} onValueChange={value => setFormData({ ...formData, is_neutered: value })} disabled={loading}>
                        <SelectTrigger className="h-11 text-sm bg-muted border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all">
                          <SelectValue placeholder="בחר סטטוס" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">כן</SelectItem>
                          <SelectItem value="false">לא</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Review/Summary */}
                {currentStep === 4 && (
                  <motion.div
                    key="step-4"
                    initial={{ x: slideDirection === 'left' ? 100 : -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: slideDirection === 'left' ? -100 : 100, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="space-y-6"
                  >
                    <h3 className="text-xl font-jakarta font-bold text-foreground text-center mb-6">
                      סקירת פרטי חיית המחמד
                    </h3>

                    {/* Pet Photo */}
                      {imagePreview && (
                      <div className="flex justify-center relative">
                        <div className="relative group">
                          <div className="absolute inset-0 bg-primary rounded-full blur-lg opacity-30"></div>
                          <img 
                            src={imagePreview} 
                            alt="תצוגה מקדימה" 
                            className="relative w-32 h-32 rounded-full object-cover ring-4 ring-accent/30 shadow-[0_8px_30px_rgba(0,0,0,0.2)]" 
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setSlideDirection('right');
                              setCurrentStep(2);
                            }}
                            className="absolute bottom-0 left-0 p-2 bg-card rounded-full shadow-lg hover:bg-muted transition-all hover:scale-110 border-2 border-accent"
                          >
                            <Edit2 className="w-4 h-4 text-foreground" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Summary Cards */}
                    <div className="space-y-3">
                      <div className="bg-card rounded-xl p-4 border-2 border-border shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground font-jakarta mb-1">סוג חיית מחמד</p>
                          <p className="text-base font-jakarta font-semibold text-foreground">{petType === 'dog' ? 'כלב' : 'חתול'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSlideDirection('right');
                            setCurrentStep(1);
                          }}
                          className="p-2 hover:bg-muted rounded-lg transition-all hover:scale-110"
                        >
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>

                      <div className="bg-card rounded-xl p-4 border-2 border-border shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground font-jakarta mb-1">שם</p>
                          <p className="text-base font-jakarta font-semibold text-foreground">{formData.name}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSlideDirection('right');
                            setCurrentStep(2);
                          }}
                          className="p-2 hover:bg-muted rounded-lg transition-all hover:scale-110"
                        >
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>

                      {formData.birthDate && (
                        <div className="bg-card rounded-xl p-4 border-2 border-border shadow-sm flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground font-jakarta mb-1">תאריך לידה</p>
                            <p className="text-base font-jakarta font-semibold text-foreground">{format(formData.birthDate, "PPP")}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSlideDirection('right');
                              setCurrentStep(2);
                            }}
                            className="p-2 hover:bg-muted rounded-lg transition-all hover:scale-110"
                          >
                            <Edit2 className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </div>
                      )}

                      <div className="bg-card rounded-xl p-4 border-2 border-border shadow-sm">
                        <p className="text-xs text-muted-foreground font-jakarta mb-1">גזע</p>
                        {isEditingBreed ? (
                          <div className="flex items-center gap-2">
                            <Input 
                              value={tempBreed}
                              onChange={e => setTempBreed(e.target.value)}
                              className="h-9 text-sm font-jakarta"
                              autoFocus
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                if (tempBreed.trim()) {
                                  setFormData({ ...formData, breed: tempBreed });
                                  setIsEditingBreed(false);
                                  toast({ title: "גזע עודכן", description: "השינויים נשמרו בהצלחה" });
                                }
                              }}
                              className="h-9 bg-accent hover:bg-accent/90 text-accent-foreground font-jakarta"
                            >
                              שמור
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setIsEditingBreed(false);
                                setTempBreed(formData.breed);
                              }}
                              className="h-9 font-jakarta"
                            >
                              ביטול
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <p className="text-base font-jakarta font-semibold text-foreground">{formData.breed}</p>
                              {breedConfidence !== null && (
                                <span className={`text-xl font-semibold ${
                                  breedConfident ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {breedConfident ? '✓' : '✗'}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setTempBreed(formData.breed);
                                setIsEditingBreed(true);
                              }}
                              className="p-2 hover:bg-muted rounded-lg transition-all hover:scale-110"
                            >
                              <Edit2 className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </div>
                        )}
                      </div>

                      {formData.gender && (
                        <div className="bg-card rounded-xl p-4 border-2 border-border shadow-sm flex items-center justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground font-jakarta mb-1">מין</p>
                            <p className="text-base font-jakarta font-semibold text-foreground">{formData.gender === 'male' ? 'זכר' : 'נקבה'}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSlideDirection('right');
                              setCurrentStep(3);
                            }}
                            className="p-2 hover:bg-muted rounded-lg transition-all hover:scale-110"
                          >
                            <Edit2 className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </div>
                      )}

                      <div className="bg-card rounded-xl p-4 border-2 border-border shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground font-jakarta mb-1">מסורס/מעוקר</p>
                          <p className="text-base font-jakarta font-semibold text-foreground">{formData.is_neutered === "true" ? "כן" : "לא"}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSlideDirection('right');
                            setCurrentStep(3);
                          }}
                          className="p-2 hover:bg-muted rounded-lg transition-all hover:scale-110"
                        >
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground font-jakarta text-center pt-4">
                      אנא בדוק את כל הפרטים לפני השליחה
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-6">
                {currentStep === 3 && (
                  <Button 
                    type="button" 
                    onClick={() => {
                      setSlideDirection('left');
                      setCurrentStep(4);
                    }}
                    className="w-full h-12 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-jakarta font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                  >
                    <ArrowLeft className="ml-2 h-4 w-4" />
                    המשך לסקירה
                  </Button>
                )}
                {currentStep === 4 && (
                  <>
                    <Button 
                      type="button" 
                      onClick={() => {
                        setSlideDirection('right');
                        setCurrentStep(3);
                      }}
                      className="h-12 text-sm border-2 border-border bg-card hover:bg-muted text-foreground rounded-full font-jakarta font-bold transition-all duration-300 hover:scale-[1.02] px-6"
                    >
                      <ArrowRight className="ml-2 h-4 w-4" />
                      חזרה
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={loading} 
                      className="flex-1 h-12 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-jakarta font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                          שומר...
                        </>
                      ) : (
                        <>
                          <Sparkles className="ml-2 h-4 w-4" />
                          הוסף חיית מחמד
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </form>
        </div>
      </div>
    </div>
  );
};
export default AddPet;