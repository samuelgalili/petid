import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Sparkles, PawPrint } from "lucide-react";
import { usePetPreference } from "@/contexts/PetPreferenceContext";
import { useGuest } from "@/contexts/GuestContext";

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
    is_neutered: "false",
  });
  const { petType, setPetType } = usePetPreference();
  const { isGuest } = useGuest();
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
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // For guest users, just show success and navigate
      if (isGuest) {
        toast({
          title: "Success!",
          description: "Pet added (guest mode - not saved)",
        });
        navigate("/home");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      let avatarUrl = "";

      // Upload image if exists
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("pet-avatars")
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("pet-avatars")
          .getPublicUrl(fileName);

        avatarUrl = publicUrl;
      }

      // Insert pet data
      const { error: insertError } = await supabase
        .from("pets")
        .insert({
          user_id: user.id,
          name: formData.name,
          type: petType,
          age: formData.age ? parseInt(formData.age) : null,
          gender: formData.gender || null,
          breed: formData.breed || null,
          is_neutered: formData.is_neutered === "true",
          avatar_url: avatarUrl,
        });

      if (insertError) throw insertError;

      toast({
        title: "Success!",
        description: "Pet added successfully",
      });

      navigate("/home");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
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

  return (
    <div className="min-h-screen bg-background p-4 pb-24 animate-fade-in" dir="ltr">
      <div className="max-w-2xl mx-auto mt-8">
        {/* Header with Icon */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#FBD66A] rounded-full mb-4 shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
            <PawPrint className="w-10 h-10 text-gray-900" />
          </div>
          <h1 className="text-4xl md:text-5xl font-jakarta font-bold text-gray-900 mb-2">
            Add Your Pet
          </h1>
          <p className="text-gray-600 text-lg font-jakarta">
            Let's create a special profile for your friend
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`h-2 rounded-full transition-all duration-500 ${
                step === currentStep
                  ? "w-12 bg-[#FBD66A]"
                  : step < currentStep
                  ? "w-8 bg-[#F4C542]"
                  : "w-8 bg-gray-200"
              }`}
            />
          ))}
        </div>

        <Card className="shadow-[0_8px_30px_rgba(0,0,0,0.15)] border-2 border-gray-200 overflow-hidden animate-scale-in bg-white/95 backdrop-blur-sm">
          
          <CardHeader className="text-center space-y-2 pb-6">
            <CardTitle className="text-2xl font-jakarta font-bold text-gray-900">
              {currentStep === 1 && "Choose Pet Type"}
              {currentStep === 2 && "Basic Details"}
              {currentStep === 3 && "Additional Details"}
            </CardTitle>
            <CardDescription className="text-base text-gray-600 font-jakarta">
              {currentStep === 1 && "Dog or Cat? Choose what fits"}
              {currentStep === 2 && "Tell us about your pet"}
              {currentStep === 3 && "Just a few more details"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Step 1: Pet Type Selection */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-2 gap-6">
                    <button
                      type="button"
                      onClick={() => setPetType("dog")}
                      className={`group relative p-8 border-2 rounded-2xl transition-all duration-300 ${
                        petType === "dog"
                          ? "border-[#FBD66A] bg-[#FBD66A]/10 shadow-[0_8px_30px_rgba(251,214,106,0.3)] scale-105"
                          : "border-gray-200 hover:border-[#FBD66A]/50 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)] hover:scale-102"
                      }`}
                    >
                      <div className="text-6xl mb-3 transition-transform duration-300 group-hover:scale-110">
                        🐕
                      </div>
                      <div className="font-semibold text-lg font-jakarta text-gray-900">Dog</div>
                      {petType === "dog" && (
                        <div className="absolute -top-2 -right-2 bg-[#FBD66A] text-gray-900 rounded-full p-1">
                          <Sparkles className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPetType("cat")}
                      className={`group relative p-8 border-2 rounded-2xl transition-all duration-300 ${
                        petType === "cat"
                          ? "border-[#FBD66A] bg-[#FBD66A]/10 shadow-[0_8px_30px_rgba(251,214,106,0.3)] scale-105"
                          : "border-gray-200 hover:border-[#FBD66A]/50 hover:shadow-[0_4px_20px_rgba(0,0,0,0.1)] hover:scale-102"
                      }`}
                    >
                      <div className="text-6xl mb-3 transition-transform duration-300 group-hover:scale-110">
                        🐈
                      </div>
                      <div className="font-semibold text-lg font-jakarta text-gray-900">Cat</div>
                      {petType === "cat" && (
                        <div className="absolute -top-2 -right-2 bg-[#FBD66A] text-gray-900 rounded-full p-1">
                          <Sparkles className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Basic Info */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-fade-in">
                  {/* Image Upload */}
                  <div className="space-y-3">
                    <Label htmlFor="image" className="text-base font-medium font-jakarta text-gray-700">Photo</Label>
                    <div className="flex flex-col items-center gap-6">
                      {imagePreview && (
                        <div className="relative group">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-40 h-40 rounded-full object-cover ring-4 ring-[#FBD66A]/20 shadow-[0_8px_30px_rgba(0,0,0,0.2)] transition-all duration-300 group-hover:scale-105"
                          />
                        </div>
                      )}
                      <Label
                        htmlFor="image"
                        className="flex items-center gap-3 cursor-pointer border-2 border-dashed border-[#FBD66A]/30 rounded-xl p-6 hover:border-[#FBD66A] hover:bg-[#FBD66A]/5 transition-all duration-300 group w-full justify-center backdrop-blur-sm"
                      >
                        <Upload className="w-6 h-6 text-[#FBD66A] group-hover:scale-110 transition-transform" />
                        <span className="font-medium font-jakarta text-[#FBD66A]">{imagePreview ? "Change Photo" : "Upload Photo"}</span>
                        <Input
                          id="image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </Label>
                    </div>
                  </div>

                  {/* Name */}
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-base font-medium font-jakarta text-gray-700">
                      Name <span className="text-[#FBD66A]">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="What's your pet's name?"
                      required
                      disabled={loading}
                      className="h-12 text-base border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#FBD66A] rounded-xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] focus:shadow-[0_8px_30px_rgba(251,214,106,0.3)] backdrop-blur-sm font-jakarta"
                    />
                  </div>

                  {/* Age */}
                  <div className="space-y-3">
                    <Label htmlFor="age" className="text-base font-medium font-jakarta text-gray-700">Age (in years)</Label>
                    <Input
                      id="age"
                      type="number"
                      min="0"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      placeholder="How many years?"
                      disabled={loading}
                      className="h-12 text-base border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#FBD66A] rounded-xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] focus:shadow-[0_8px_30px_rgba(251,214,106,0.3)] backdrop-blur-sm font-jakarta"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Additional Info */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-fade-in">
                  {/* Gender */}
                  <div className="space-y-3">
                    <Label htmlFor="gender" className="text-base font-medium font-jakarta text-gray-700">Gender</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => setFormData({ ...formData, gender: value })}
                      disabled={loading}
                    >
                      <SelectTrigger className="h-12 text-base border-2 border-gray-200 text-gray-900 focus:border-[#FBD66A] rounded-xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-sm font-jakarta">
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
                    <Label htmlFor="breed" className="text-base font-medium font-jakarta text-gray-700">Breed</Label>
                    <Input
                      id="breed"
                      value={formData.breed}
                      onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                      placeholder="What breed?"
                      disabled={loading}
                      className="h-12 text-base border-2 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#FBD66A] rounded-xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] focus:shadow-[0_8px_30px_rgba(251,214,106,0.3)] backdrop-blur-sm font-jakarta"
                    />
                  </div>

                  {/* Neutered */}
                  <div className="space-y-3">
                    <Label htmlFor="neutered" className="text-base font-medium font-jakarta text-gray-700">Neutered/Spayed</Label>
                    <Select
                      value={formData.is_neutered}
                      onValueChange={(value) => setFormData({ ...formData, is_neutered: value })}
                      disabled={loading}
                    >
                      <SelectTrigger className="h-12 text-base border-2 border-gray-200 text-gray-900 focus:border-[#FBD66A] rounded-xl transition-all shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-sm font-jakarta">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-4 pt-4">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    disabled={loading}
                    className="flex-1 h-12 text-base border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-xl transition-all font-jakarta font-medium shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.2)]"
                  >
                    Back
                  </Button>
                )}
                
                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(currentStep + 1)}
                    disabled={!canProceed() || loading}
                    className="flex-1 h-12 text-base bg-[#FBD66A] hover:bg-[#F4C542] text-gray-900 rounded-xl font-jakarta font-semibold shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_40px_rgba(251,191,36,0.4)] transition-all duration-300 hover:scale-[1.02]"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-12 text-base bg-[#FBD66A] hover:bg-[#F4C542] text-gray-900 rounded-xl font-jakarta font-semibold shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_40px_rgba(251,191,36,0.4)] transition-all duration-300 hover:scale-[1.02]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Add Pet
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AddPet;
