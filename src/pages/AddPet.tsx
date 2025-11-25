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
import { Loader2, Upload, Sparkles, ArrowLeft, ArrowRight, Calendar as CalendarIcon, Camera } from "lucide-react";
import { usePetPreference } from "@/contexts/PetPreferenceContext";
import { useGuest } from "@/contexts/GuestContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import dogIcon from "@/assets/dog-official.svg";
import catIcon from "@/assets/cat-official.png";
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
  }, [navigate, isGuest]);

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
          title: "Success!",
          description: "Pet added (guest mode - not saved)"
        });
        navigate("/home");
        return;
      }
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      let avatarUrl = "";

      // Upload image if exists
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const {
          error: uploadError
        } = await supabase.storage.from("pet-avatars").upload(fileName, imageFile);
        if (uploadError) throw uploadError;
        const {
          data: {
            publicUrl
          }
        } = supabase.storage.from("pet-avatars").getPublicUrl(fileName);
        avatarUrl = publicUrl;
      }

      // Insert pet data
      // Insert pet data with birth date
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
      if (insertError) throw insertError;

      // Save initial breed detection to history if available
      if (petData && formData.breed && breedConfidence !== null) {
        await supabase.from("breed_detection_history").insert({
          pet_id: petData.id,
          breed: formData.breed,
          confidence: breedConfidence,
          avatar_url: avatarUrl
        });
      }
      toast({
        title: "Success!",
        description: "Pet added successfully"
      });
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
    if (currentStep === 2) return formData.name.trim() !== "";
    return true;
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    // Swipe left = next step (if allowed)
    if (isLeftSwipe && currentStep < 3 && canProceed()) {
      setCurrentStep(prev => prev + 1);
    }

    // Swipe right = previous step
    if (isRightSwipe && currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
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

      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 left-4 z-10 p-2 hover:bg-gray-100 rounded-full transition-all group"
      >
        <ArrowLeft className="w-6 h-6 text-gray-900 group-hover:scale-110 transition-transform" />
      </button>

      <div className="max-w-[440px] mx-auto mt-8 md:mt-12">
        {/* Header */}
        <div className="text-center mb-8 animate-slide-up">
          <h1 className="text-3xl md:text-4xl font-jakarta font-semibold text-gray-900 mb-2 tracking-tight">
            Add Your Pet
          </h1>
          <p className="text-gray-700 text-sm md:text-base font-jakarta font-normal max-w-md mx-auto">
            Let's create a special profile for your furry friend
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center items-center gap-2 mb-12">
          {[1, 2, 3].map(step => <div key={step} className="flex items-center">
              <div className={`flex items-center justify-center rounded-full transition-all duration-500 ${step === currentStep ? "w-9 h-9 bg-gradient-to-br from-[#FBD66A] to-[#F4C542] shadow-[0_4px_20px_rgba(251,214,106,0.4)] scale-110" : step < currentStep ? "w-7 h-7 bg-[#F4C542] shadow-md" : "w-7 h-7 bg-gray-200"}`}>
                {step < currentStep ? <Sparkles className="w-3.5 h-3.5 text-gray-900" /> : <span className={`font-jakarta font-bold ${step === currentStep ? 'text-gray-900 text-sm' : 'text-gray-500 text-xs'}`}>
                    {step}
                  </span>}
              </div>
              {step < 3 && <div className={`w-6 h-0.5 mx-0.5 rounded-full transition-all duration-500 ${step < currentStep ? 'bg-[#F4C542]' : 'bg-gray-200'}`} />}
            </div>)}
        </div>

        <div className="animate-scale-in">
            <form onSubmit={handleSubmit} className="space-y-8" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
              {/* Step 1: Pet Type Selection */}
              {currentStep === 1 && <div className="space-y-6">
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
                </div>}

              {/* Step 2: Basic Info */}
              {currentStep === 2 && <div className="space-y-5 animate-fade-in">
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
                    <Input id="name" value={formData.name} onChange={e => setFormData({
                  ...formData,
                  name: e.target.value
                })} placeholder="What's your pet's name?" required disabled={loading} className="h-12 text-sm border-2 border-gray-200 text-gray-900 placeholder:text-gray-500 focus:border-[#FBD66A] focus:ring-2 focus:ring-[#FBD66A]/20 rounded-xl transition-all bg-white/95 font-jakarta shadow-[0_4px_20px_rgba(0,0,0,0.08)]" />
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
                </div>}

              {/* Step 3: Additional Info */}
              {currentStep === 3 && <div className="space-y-5 animate-fade-in">
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

                  {/* Breed */}
                  <div className="space-y-3">
                    <Label htmlFor="breed" className="text-sm font-semibold font-jakarta text-gray-900">Breed</Label>
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
                        <span className={`text-xs font-semibold font-jakarta px-2 py-0.5 rounded-full ${
                          breedConfidence > 80 ? 'bg-green-100 text-green-700' :
                          breedConfidence > 60 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {breedConfidence}% confident
                        </span>
                      </div>
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
                        className={`h-12 text-sm border-2 text-gray-900 placeholder:text-gray-500 focus:border-[#FBD66A] focus:ring-2 focus:ring-[#FBD66A]/20 rounded-xl transition-all bg-white/95 font-jakarta shadow-[0_4px_20px_rgba(0,0,0,0.08)] ${
                          breedDetecting ? 'border-[#FBD66A] animate-pulse pr-10' : 'border-gray-200'
                        }`} 
                      />
                      {breedDetecting && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-5 h-5 text-[#F4C542] animate-spin" />
                        </div>
                      )}
                    </div>
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
                </div>}

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-6">
                {currentStep === 3 && <Button type="submit" disabled={loading} className="w-full h-12 text-sm bg-gradient-to-r from-[#FBD66A] to-[#F4C542] hover:from-[#F4C542] hover:to-[#FBD66A] text-gray-900 rounded-full font-jakarta font-bold shadow-[0_4px_20px_rgba(251,214,106,0.4)] hover:shadow-[0_8px_30px_rgba(251,214,106,0.6)] transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
                    {loading ? <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </> : <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Add Pet
                      </>}
                  </Button>}
              </div>
            </form>
        </div>
      </div>
    </div>;
};
export default AddPet;