import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Sparkles } from "lucide-react";
import { usePetPreference } from "@/contexts/PetPreferenceContext";
import { useGuest } from "@/contexts/GuestContext";
import dogIcon from "@/assets/dog-official.svg";
import catIcon from "@/assets/cat-official.png";
const AddPet = () => {
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    breed: "",
    is_neutered: "false"
  });
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
  }, [navigate, isGuest]);
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
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
      const {
        error: insertError
      } = await supabase.from("pets").insert({
        user_id: user.id,
        name: formData.name,
        type: petType,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender || null,
        breed: formData.breed || null,
        is_neutered: formData.is_neutered === "true",
        avatar_url: avatarUrl
      });
      if (insertError) throw insertError;
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
  return <div className="min-h-screen bg-background p-4 pb-24 animate-fade-in relative" dir="ltr">
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
            <form onSubmit={handleSubmit} className="space-y-8">
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
              {currentStep === 2 && <Card className="border-0 shadow-[0_4px_20px_rgba(0,0,0,0.15)] bg-white/95 backdrop-blur-sm rounded-3xl">
                  <CardContent className="p-6 space-y-5 animate-fade-in">
                  {/* Image Upload */}
                  <div className="space-y-3">
                    <Label htmlFor="image" className="text-sm font-semibold font-jakarta text-gray-900">Pet Photo</Label>
                    <div className="flex flex-col items-center gap-4">
                      {imagePreview && <div className="relative group">
                          <div className="absolute inset-0 bg-gradient-to-br from-[#FBD66A] to-[#F4C542] rounded-full blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
                          <img src={imagePreview} alt="Preview" className="relative w-32 h-32 rounded-full object-cover ring-4 ring-[#FBD66A]/30 shadow-[0_8px_30px_rgba(0,0,0,0.2)] transition-all duration-300 group-hover:scale-105 group-hover:ring-[#FBD66A]/50" />
                        </div>}
                      <Label htmlFor="image" className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-[#FBD66A]/40 rounded-2xl p-6 hover:border-[#FBD66A] hover:bg-[#FBD66A]/5 transition-all duration-300 group w-full justify-center">
                        <Upload className="w-5 h-5 text-[#FBD66A] group-hover:scale-110 transition-transform" />
                        <span className="font-semibold text-sm font-jakarta text-[#F4C542]">{imagePreview ? "Change Photo" : "Upload Photo"}</span>
                        <Input id="image" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                      </Label>
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
                })} placeholder="What's your pet's name?" required disabled={loading} className="h-12 text-sm border-2 border-gray-200 text-gray-900 placeholder:text-gray-500 focus:border-[#FBD66A] focus:ring-2 focus:ring-[#FBD66A]/20 rounded-xl transition-all bg-white/95 font-jakarta" />
                  </div>

                  {/* Age */}
                  <div className="space-y-3">
                    <Label htmlFor="age" className="text-sm font-semibold font-jakarta text-gray-900">Age (in years)</Label>
                    <Input id="age" type="number" min="0" value={formData.age} onChange={e => setFormData({
                  ...formData,
                  age: e.target.value
                })} placeholder="How many years?" disabled={loading} className="h-12 text-sm border-2 border-gray-200 text-gray-900 placeholder:text-gray-500 focus:border-[#FBD66A] focus:ring-2 focus:ring-[#FBD66A]/20 rounded-xl transition-all bg-white/95 font-jakarta" />
                  </div>
                </CardContent>
                </Card>}

              {/* Step 3: Additional Info */}
              {currentStep === 3 && <Card className="border-0 shadow-[0_4px_20px_rgba(0,0,0,0.15)] bg-white/95 backdrop-blur-sm rounded-3xl">
                  <CardContent className="p-6 space-y-5 animate-fade-in">
                  {/* Gender */}
                  <div className="space-y-3">
                    <Label htmlFor="gender" className="text-sm font-semibold font-jakarta text-gray-900">Gender</Label>
                    <Select value={formData.gender} onValueChange={value => setFormData({
                  ...formData,
                  gender: value
                })} disabled={loading}>
                      <SelectTrigger className="h-12 text-sm border-2 border-gray-200 text-gray-900 focus:border-[#FBD66A] focus:ring-2 focus:ring-[#FBD66A]/20 rounded-xl transition-all bg-white/95 font-jakarta">
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
                    <Input id="breed" value={formData.breed} onChange={e => setFormData({
                  ...formData,
                  breed: e.target.value
                })} placeholder="What breed?" disabled={loading} className="h-12 text-sm border-2 border-gray-200 text-gray-900 placeholder:text-gray-500 focus:border-[#FBD66A] focus:ring-2 focus:ring-[#FBD66A]/20 rounded-xl transition-all bg-white/95 font-jakarta" />
                  </div>

                  {/* Neutered */}
                  <div className="space-y-3">
                    <Label htmlFor="neutered" className="text-sm font-semibold font-jakarta text-gray-900">Neutered/Spayed</Label>
                    <Select value={formData.is_neutered} onValueChange={value => setFormData({
                  ...formData,
                  is_neutered: value
                })} disabled={loading}>
                      <SelectTrigger className="h-12 text-sm border-2 border-gray-200 text-gray-900 focus:border-[#FBD66A] focus:ring-2 focus:ring-[#FBD66A]/20 rounded-xl transition-all bg-white/95 font-jakarta">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
                </Card>}

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-6">
                {currentStep > 1 && <Button type="button" variant="ghost" onClick={() => setCurrentStep(currentStep - 1)} disabled={loading} className="flex-1 h-12 text-sm rounded-full bg-white/95 hover:bg-gray-50 text-gray-900 border-2 border-gray-200 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.25)] font-jakarta font-semibold">
                    Back
                  </Button>}
                
                {currentStep === 3 && <Button type="submit" disabled={loading} className="flex-1 h-12 text-sm bg-gradient-to-r from-[#FBD66A] to-[#F4C542] hover:from-[#F4C542] hover:to-[#FBD66A] text-gray-900 rounded-full font-jakarta font-bold shadow-[0_4px_20px_rgba(251,214,106,0.4)] hover:shadow-[0_8px_30px_rgba(251,214,106,0.6)] transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">
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