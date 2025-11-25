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
          title: "Draft restored",
          description: "Your previous progress has been restored"
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
      title: "Draft cleared",
      description: "Your saved progress has been removed"
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
        title: "Error",
        description: "Please choose a pet type",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      // For guest users, just show success and navigate
      if (isGuest) {
        toast({
          title: "Guest Mode",
          description: "Please log in to save your pet permanently. Your pet data won't be saved in guest mode.",
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
          title: "Authentication Required",
          description: "Please log in to add a pet",
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
        title: "Success!",
        description: `${formData.name} has been added successfully!`
      });
      
      // Clear saved draft after successful submission
      localStorage.removeItem('addPetDraft');
      
      navigate("/home");
    } catch (error: any) {
      toast({
        title: "Error",
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
  return <div className="min-h-screen bg-background p-4 pb-24 animate-fade-in relative" dir="ltr">
      {/* Tutorial Overlay */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-background rounded-2xl p-8 max-w-sm w-full space-y-6 animate-scale-in shadow-2xl">
            <h3 className="text-2xl font-bold text-foreground text-center">
              Swipe to Navigate
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <ArrowLeft className="w-6 h-6 text-primary" />
                </div>
                <p className="text-muted-foreground">
                  Swipe <span className="font-semibold text-foreground">right</span> to go back
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <ArrowRight className="w-6 h-6 text-primary" />
                </div>
                <p className="text-muted-foreground">
                  Swipe <span className="font-semibold text-foreground">left</span> to continue
                </p>
              </div>
            </div>
            <button
              onClick={dismissTutorial}
              className="w-full py-3 rounded-xl font-semibold transition-all duration-200 bg-[#FBD66A] hover:bg-[#F4C542] text-gray-800"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Back Button - Only visible on step 2 and 3 */}
      {(currentStep === 2 || currentStep === 3) && (
        <button
          type="button"
          onClick={() => {
            console.log('Back button clicked, going from step', currentStep, 'to step', currentStep - 1);
            setSlideDirection('right');
            setCurrentStep(prev => prev - 1);
            setShowValidationError(false);
          }}
          className="fixed top-4 left-4 z-[100] p-2 hover:bg-gray-100 rounded-full transition-all group bg-white shadow-lg"
        >
          <ArrowLeft className="w-6 h-6 text-gray-900 group-hover:scale-110 transition-transform" />
        </button>
      )}

      <div className="max-w-[440px] mx-auto mt-8 md:mt-12">
        {/* Header */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="flex items-center justify-center gap-2 mb-2">
            <h1 className="text-3xl md:text-4xl font-jakarta font-semibold text-gray-900 tracking-tight">
              Add Your Pet
            </h1>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={clearDraft}
                className="text-xs text-gray-400 hover:text-gray-600 font-jakarta underline transition-colors"
                title="Clear saved draft"
              >
                Clear draft
              </button>
            )}
          </div>
          <p className="text-gray-700 text-sm md:text-base font-jakarta font-normal max-w-md mx-auto">
            Let's create a special profile for your furry friend
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-jakarta font-semibold text-gray-600">
              Progress
            </span>
            <div className="flex items-center gap-2">
              {autoSaveStatus && (
                <span className={cn(
                  "text-xs font-jakarta font-medium transition-opacity duration-300",
                  autoSaveStatus === 'saving' ? "text-gray-400" : "text-green-600"
                )}>
                  {autoSaveStatus === 'saving' ? 'Saving...' : 'Saved ✓'}
                </span>
              )}
              <span className="text-xs font-jakarta font-bold text-[#F4C542]">
                {Math.round((currentStep / 4) * 100)}%
              </span>
            </div>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#FBD66A] to-[#F4C542] transition-all duration-500 ease-out rounded-full shadow-[0_0_10px_rgba(251,214,106,0.5)]"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center items-center gap-2 mb-12">
          {[1, 2, 3, 4].map(step => <div key={step} className="flex items-center">
              <div className={`flex items-center justify-center rounded-full transition-all duration-500 ${step === currentStep ? "w-9 h-9 bg-gradient-to-br from-[#FBD66A] to-[#F4C542] shadow-[0_4px_20px_rgba(251,214,106,0.4)] scale-110" : step < currentStep ? "w-7 h-7 bg-[#F4C542] shadow-md" : "w-7 h-7 bg-gray-200"}`}>
                {step < currentStep ? <Sparkles className="w-3.5 h-3.5 text-gray-900" /> : <span className={`font-jakarta font-bold ${step === currentStep ? 'text-gray-900 text-sm' : 'text-gray-500 text-xs'}`}>
                    {step}
                  </span>}
              </div>
              {step < 4 && <div className={`w-6 h-0.5 mx-0.5 rounded-full transition-all duration-500 ${step < currentStep ? 'bg-[#F4C542]' : 'bg-gray-200'}`} />}
            </div>)}
        </div>

        <div className="animate-scale-in relative">
            {/* Swipe Indicators */}
            {isSwiping && currentStep > 1 && swipeDirection === 'right' && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 pointer-events-none animate-fade-in">
                <div className="flex items-center gap-1 text-[#FBD66A] animate-pulse">
                  <ArrowLeft className="w-8 h-8" strokeWidth={3} />
                  <ArrowLeft className="w-6 h-6 -ml-4 opacity-60" strokeWidth={3} />
                </div>
              </div>
            )}
            
            {isSwiping && currentStep < 4 && canProceed() && swipeDirection === 'left' && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 pointer-events-none animate-fade-in">
                <div className="flex items-center gap-1 text-[#FBD66A] animate-pulse">
                  <ArrowRight className="w-6 h-6 -mr-4 opacity-60" strokeWidth={3} />
                  <ArrowRight className="w-8 h-8" strokeWidth={3} />
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
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
                  <div className="grid grid-cols-2 gap-8 md:gap-10 py-6">
                    <button type="button" onClick={() => {
                  setPetType("dog");
                  setCurrentStep(2);
                }} className="group relative flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 focus:outline-none animate-fade-in" style={{
                  animationDelay: '100ms'
                }}>
                      <div className="w-40 h-40 md:w-48 md:h-48 flex items-center justify-center animate-pulse-subtle">
                        <img src={dogIcon} alt="Dog" className="w-full h-full object-contain drop-shadow-lg transition-all duration-300 group-hover:drop-shadow-2xl" />
                      </div>
                    </button>
                    <button type="button" onClick={() => {
                  setPetType("cat");
                  setCurrentStep(2);
                }} className="group relative flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 focus:outline-none animate-fade-in" style={{
                  animationDelay: '250ms'
                }}>
                      <div className="w-36 h-36 md:w-44 md:h-44 flex items-center justify-center animate-pulse-subtle">
                        <img src={catIcon} alt="Cat" className="w-full h-full object-contain drop-shadow-lg transition-all duration-300 group-hover:drop-shadow-2xl" />
                      </div>
                    </button>
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
                    className="space-y-5"
                  >
                  {/* Image Upload */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold font-jakarta text-gray-900">Pet Photo</Label>
                    <div className="flex flex-col items-center gap-4">
                      {imagePreview && <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-br from-[#FBD66A] to-[#F4C542] rounded-full blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
                          <img src={imagePreview} alt="Preview" className="relative w-32 h-32 rounded-full object-cover ring-4 ring-[#FBD66A]/30 shadow-[0_8px_30px_rgba(0,0,0,0.2)] transition-all duration-300 group-hover:scale-105 group-hover:ring-[#FBD66A]/50" />
                          {breedDetecting && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                              <Loader2 className="w-6 h-6 text-white animate-spin" />
                            </div>
                          )}
                        </div>}
                      <div className="flex gap-3 w-full">
                        <Label htmlFor="image-upload" className="flex-1 flex items-center gap-2 cursor-pointer border-2 border-dashed border-[#FBD66A]/40 rounded-2xl p-4 hover:border-[#FBD66A] hover:bg-[#FBD66A]/5 transition-all duration-300 group justify-center">
                          <Upload className="w-5 h-5 text-[#FBD66A] group-hover:scale-110 transition-transform" />
                          <span className="font-semibold text-sm font-jakarta text-[#F4C542]">Upload</span>
                          <Input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                        </Label>
                        <Label htmlFor="image-camera" className="flex-1 flex items-center gap-2 cursor-pointer border-2 border-dashed border-[#FBD66A]/40 rounded-2xl p-4 hover:border-[#FBD66A] hover:bg-[#FBD66A]/5 transition-all duration-300 group justify-center">
                          <Camera className="w-5 h-5 text-[#FBD66A] group-hover:scale-110 transition-transform" />
                          <span className="font-semibold text-sm font-jakarta text-[#F4C542]">Camera</span>
                          <Input id="image-camera" type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Name */}
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-sm font-semibold font-jakarta text-gray-900">
                      Pet Name <span className="text-[#F4C542]">*</span>
                    </Label>
                    <Input 
                      id="name" 
                      value={formData.name} 
                      onChange={e => setFormData({
                        ...formData,
                        name: e.target.value
                      })} 
                      placeholder="What's your pet's name?" 
                      required 
                      disabled={loading} 
                      className={cn(
                        "h-12 text-sm border-2 text-gray-900 placeholder:text-gray-500 focus:border-[#FBD66A] focus:ring-2 focus:ring-[#FBD66A]/20 rounded-xl transition-all bg-white/95 font-jakarta shadow-[0_4px_20px_rgba(0,0,0,0.08)]",
                        showValidationError && formData.name.trim() === "" && "border-red-400 animate-pulse"
                      )}
                    />
                    {showValidationError && formData.name.trim() === "" && (
                      <p className="text-xs text-red-600 font-jakarta animate-fade-in">
                        Pet name is required
                      </p>
                    )}
                  </div>

                  {/* Birth Date */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold font-jakarta text-gray-900">Birth Date</Label>
                    <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-12 text-sm border-2 border-gray-200 text-gray-900 hover:border-[#FBD66A] hover:bg-[#FBD66A]/5 focus:border-[#FBD66A] focus:ring-2 focus:ring-[#FBD66A]/20 rounded-xl transition-all bg-white/95 font-jakarta shadow-[0_4px_20px_rgba(0,0,0,0.08)] justify-start text-left font-normal",
                            !formData.birthDate && "text-gray-500"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.birthDate ? format(formData.birthDate, "PPP") : "Select birth date"}
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
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Breed */}
                  <div className="space-y-3">
                    <Label htmlFor="breed" className="text-sm font-semibold font-jakarta text-gray-900">
                      Breed <span className="text-[#F4C542]">*</span>
                    </Label>
                    {breedDetecting && (
                      <div className="flex items-center gap-2 text-xs text-[#F4C542] font-jakarta font-semibold animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        AI is analyzing your photo...
                      </div>
                    )}
                    {formData.breed && !breedDetecting && breedConfidence !== null && (
                      <div className="flex items-center gap-2 -mb-1">
                        <p className="text-xs text-gray-600 font-jakarta">
                          AI detected: "{formData.breed}"
                        </p>
                        <span className={`text-xl font-semibold ${
                          breedConfident ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {breedConfident ? '✓' : '✗'}
                        </span>
                      </div>
                    )}
                    {!breedConfident && formData.breed && (
                      <p className="text-xs text-orange-600 font-jakarta">
                        Please confirm or correct the detected breed
                      </p>
                    )}
                    <div className="relative">
                      <Input 
                        id="breed" 
                        value={formData.breed} 
                        onChange={e => setFormData({
                          ...formData,
                          breed: e.target.value
                        })} 
                        placeholder={breedDetecting ? "Detecting breed..." : "What breed?"} 
                        disabled={loading || breedDetecting} 
                        className={cn(
                          "h-12 text-sm border-2 text-gray-900 placeholder:text-gray-500 focus:border-[#FBD66A] focus:ring-2 focus:ring-[#FBD66A]/20 rounded-xl transition-all bg-white/95 font-jakarta shadow-[0_4px_20px_rgba(0,0,0,0.08)]",
                          breedDetecting && "border-[#FBD66A] animate-pulse pr-10",
                          !breedDetecting && "border-gray-200",
                          showValidationError && formData.breed.trim() === "" && "border-red-400 animate-pulse"
                        )}
                      />
                      {breedDetecting && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-5 h-5 text-[#F4C542] animate-spin" />
                        </div>
                      )}
                    </div>
                    {showValidationError && formData.breed.trim() === "" && (
                      <p className="text-xs text-red-600 font-jakarta animate-fade-in">
                        Breed is required - please upload a photo or enter manually
                      </p>
                    )}
                  </div>

                  {/* Continue Button */}
                  <div className="pt-4">
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
                      className="w-full h-12 text-sm bg-gradient-to-r from-[#FBD66A] to-[#F4C542] hover:from-[#F4C542] hover:to-[#FBD66A] text-gray-900 rounded-full font-jakarta font-bold shadow-[0_4px_20px_rgba(251,214,106,0.4)] hover:shadow-[0_8px_30px_rgba(251,214,106,0.6)] transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {breedDetecting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Detecting...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="mr-2 h-4 w-4" />
                          Continue to Step 3
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
                    className="space-y-5"
                  >
                  {/* Gender */}
                  <div className="space-y-3">
                    <Label htmlFor="gender" className="text-sm font-semibold font-jakarta text-gray-900">Gender</Label>
                    <Select value={formData.gender} onValueChange={value => setFormData({
                  ...formData,
                  gender: value
                })} disabled={loading}>
                      <SelectTrigger className="h-12 text-sm border-2 border-gray-200 text-gray-900 focus:border-[#FBD66A] focus:ring-2 focus:ring-[#FBD66A]/20 rounded-xl transition-all bg-white/95 font-jakarta shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Neutered */}
                  <div className="space-y-3">
                    <Label htmlFor="neutered" className="text-sm font-semibold font-jakarta text-gray-900">Neutered/Spayed</Label>
                    <Select value={formData.is_neutered} onValueChange={value => setFormData({
                  ...formData,
                  is_neutered: value
                })} disabled={loading}>
                      <SelectTrigger className="h-12 text-sm border-2 border-gray-200 text-gray-900 focus:border-[#FBD66A] focus:ring-2 focus:ring-[#FBD66A]/20 rounded-xl transition-all bg-white/95 font-jakarta shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
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
                    <h3 className="text-xl font-jakarta font-bold text-gray-900 text-center mb-6">
                      Review Pet Details
                    </h3>

                    {/* Pet Photo */}
                    {imagePreview && (
                      <div className="flex justify-center relative">
                        <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-br from-[#FBD66A] to-[#F4C542] rounded-full blur-lg opacity-30"></div>
                          <img 
                            src={imagePreview} 
                            alt="Pet preview" 
                            className="relative w-32 h-32 rounded-full object-cover ring-4 ring-[#FBD66A]/30 shadow-[0_8px_30px_rgba(0,0,0,0.2)]" 
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setSlideDirection('right');
                              setCurrentStep(2);
                            }}
                            className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-all hover:scale-110 border-2 border-[#FBD66A]"
                          >
                            <Edit2 className="w-4 h-4 text-gray-900" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Summary Cards */}
                    <div className="space-y-3">
                      <div className="bg-white rounded-xl p-4 border-2 border-gray-100 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 font-jakarta mb-1">Pet Type</p>
                          <p className="text-base font-jakarta font-semibold text-gray-900 capitalize">{petType}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSlideDirection('right');
                            setCurrentStep(1);
                          }}
                          className="p-2 hover:bg-gray-50 rounded-lg transition-all hover:scale-110"
                        >
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>

                      <div className="bg-white rounded-xl p-4 border-2 border-gray-100 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 font-jakarta mb-1">Name</p>
                          <p className="text-base font-jakarta font-semibold text-gray-900">{formData.name}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSlideDirection('right');
                            setCurrentStep(2);
                          }}
                          className="p-2 hover:bg-gray-50 rounded-lg transition-all hover:scale-110"
                        >
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>

                      {formData.birthDate && (
                        <div className="bg-white rounded-xl p-4 border-2 border-gray-100 shadow-sm flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500 font-jakarta mb-1">Birth Date</p>
                            <p className="text-base font-jakarta font-semibold text-gray-900">{format(formData.birthDate, "PPP")}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSlideDirection('right');
                              setCurrentStep(2);
                            }}
                            className="p-2 hover:bg-gray-50 rounded-lg transition-all hover:scale-110"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      )}

                      <div className="bg-white rounded-xl p-4 border-2 border-gray-100 shadow-sm">
                        <p className="text-xs text-gray-500 font-jakarta mb-1">Breed</p>
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
                                  toast({ title: "Breed updated", description: "Changes saved successfully" });
                                }
                              }}
                              className="h-9 bg-[#FBD66A] hover:bg-[#F4C542] text-gray-900 font-jakarta"
                            >
                              Save
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
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <p className="text-base font-jakarta font-semibold text-gray-900">{formData.breed}</p>
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
                              className="p-2 hover:bg-gray-50 rounded-lg transition-all hover:scale-110"
                            >
                              <Edit2 className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        )}
                      </div>

                      {formData.gender && (
                        <div className="bg-white rounded-xl p-4 border-2 border-gray-100 shadow-sm flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500 font-jakarta mb-1">Gender</p>
                            <p className="text-base font-jakarta font-semibold text-gray-900 capitalize">{formData.gender}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSlideDirection('right');
                              setCurrentStep(3);
                            }}
                            className="p-2 hover:bg-gray-50 rounded-lg transition-all hover:scale-110"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      )}

                      <div className="bg-white rounded-xl p-4 border-2 border-gray-100 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 font-jakarta mb-1">Neutered/Spayed</p>
                          <p className="text-base font-jakarta font-semibold text-gray-900">{formData.is_neutered === "true" ? "Yes" : "No"}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSlideDirection('right');
                            setCurrentStep(3);
                          }}
                          className="p-2 hover:bg-gray-50 rounded-lg transition-all hover:scale-110"
                        >
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 font-jakarta text-center pt-4">
                      Please review all details before submitting
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
                    className="w-full h-12 text-sm bg-gradient-to-r from-[#FBD66A] to-[#F4C542] hover:from-[#F4C542] hover:to-[#FBD66A] text-gray-900 rounded-full font-jakarta font-bold shadow-[0_4px_20px_rgba(251,214,106,0.4)] hover:shadow-[0_8px_30px_rgba(251,214,106,0.6)] transition-all duration-300 hover:scale-[1.02]"
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Continue to Review
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
                      className="h-12 text-sm border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-900 rounded-full font-jakarta font-bold transition-all duration-300 hover:scale-[1.02] px-6"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={loading} 
                      className="flex-1 h-12 text-sm bg-gradient-to-r from-[#FBD66A] to-[#F4C542] hover:from-[#F4C542] hover:to-[#FBD66A] text-gray-900 rounded-full font-jakarta font-bold shadow-[0_4px_20px_rgba(251,214,106,0.4)] hover:shadow-[0_8px_30px_rgba(251,214,106,0.6)] transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Add Pet
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </form>
        </div>
      </div>
    </div>;
};
export default AddPet;