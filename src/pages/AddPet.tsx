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
        title: "שגיאה",
        description: "אנא בחר סוג חיית מחמד",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // For guest users, just show success and navigate
      if (isGuest) {
        toast({
          title: "הצלחה!",
          description: "חיית המחמד נוספה (מצב אורח - לא נשמר)",
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
        title: "הצלחה!",
        description: "חיית המחמד נוספה בהצלחה",
      });

      navigate("/home");
    } catch (error: any) {
      toast({
        title: "שגיאה",
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
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/30 p-4 pb-24 animate-fade-in" dir="rtl">
      <div className="max-w-2xl mx-auto mt-8">
        {/* Header with Icon */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary to-accent rounded-full mb-4 shadow-premium animate-float">
            <PawPrint className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-jakarta font-bold text-foreground mb-2">
            הוסף חיית מחמד
          </h1>
          <p className="text-muted-foreground text-lg">
            בואו ניצור יחד פרופיל מיוחד לחבר שלכם
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`h-2 rounded-full transition-all duration-500 ${
                step === currentStep
                  ? "w-12 bg-gradient-to-r from-primary to-accent"
                  : step < currentStep
                  ? "w-8 bg-primary"
                  : "w-8 bg-border"
              }`}
            />
          ))}
        </div>

        <Card className="shadow-premium border-0 overflow-hidden animate-scale-in bg-card/80 backdrop-blur-sm">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-shimmer" />
          
          <CardHeader className="text-center space-y-2 pb-6">
            <CardTitle className="text-2xl font-jakarta font-bold">
              {currentStep === 1 && "בחר סוג חיית מחמד"}
              {currentStep === 2 && "פרטים בסיסיים"}
              {currentStep === 3 && "פרטים נוספים"}
            </CardTitle>
            <CardDescription className="text-base">
              {currentStep === 1 && "כלב או חתול? בחר את המתאים"}
              {currentStep === 2 && "ספר לנו על חיית המחמד שלך"}
              {currentStep === 3 && "עוד כמה פרטים קטנים"}
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
                          ? "border-primary bg-gradient-to-br from-primary/10 to-accent/5 shadow-medium scale-105"
                          : "border-border hover:border-primary/50 hover:shadow-soft hover:scale-102"
                      }`}
                    >
                      <div className="text-6xl mb-3 transition-transform duration-300 group-hover:scale-110">
                        🐕
                      </div>
                      <div className="font-semibold text-lg">כלב</div>
                      {petType === "dog" && (
                        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1">
                          <Sparkles className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPetType("cat")}
                      className={`group relative p-8 border-2 rounded-2xl transition-all duration-300 ${
                        petType === "cat"
                          ? "border-primary bg-gradient-to-br from-primary/10 to-accent/5 shadow-medium scale-105"
                          : "border-border hover:border-primary/50 hover:shadow-soft hover:scale-102"
                      }`}
                    >
                      <div className="text-6xl mb-3 transition-transform duration-300 group-hover:scale-110">
                        🐈
                      </div>
                      <div className="font-semibold text-lg">חתול</div>
                      {petType === "cat" && (
                        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1">
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
                    <Label htmlFor="image" className="text-base font-medium">תמונה</Label>
                    <div className="flex flex-col items-center gap-6">
                      {imagePreview && (
                        <div className="relative group">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-40 h-40 rounded-full object-cover ring-4 ring-primary/20 shadow-large transition-all duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                      <Label
                        htmlFor="image"
                        className="flex items-center gap-3 cursor-pointer border-2 border-dashed border-primary/30 rounded-xl p-6 hover:border-primary hover:bg-primary/5 transition-all duration-300 group w-full justify-center"
                      >
                        <Upload className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                        <span className="font-medium text-primary">{imagePreview ? "שנה תמונה" : "העלה תמונה"}</span>
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
                    <Label htmlFor="name" className="text-base font-medium">
                      שם <span className="text-primary">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="מה קוראים לחיית המחמד שלך?"
                      required
                      disabled={loading}
                      className="h-12 text-base border-2 focus:border-primary transition-all"
                    />
                  </div>

                  {/* Age */}
                  <div className="space-y-3">
                    <Label htmlFor="age" className="text-base font-medium">גיל (בשנים)</Label>
                    <Input
                      id="age"
                      type="number"
                      min="0"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      placeholder="כמה שנים?"
                      disabled={loading}
                      className="h-12 text-base border-2 focus:border-primary transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Additional Info */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-fade-in">
                  {/* Gender */}
                  <div className="space-y-3">
                    <Label htmlFor="gender" className="text-base font-medium">מין</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => setFormData({ ...formData, gender: value })}
                      disabled={loading}
                    >
                      <SelectTrigger className="h-12 text-base border-2 focus:border-primary transition-all">
                        <SelectValue placeholder="בחר מין" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">זכר</SelectItem>
                        <SelectItem value="female">נקבה</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Breed */}
                  <div className="space-y-3">
                    <Label htmlFor="breed" className="text-base font-medium">גזע</Label>
                    <Input
                      id="breed"
                      value={formData.breed}
                      onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                      placeholder="איזה גזע?"
                      disabled={loading}
                      className="h-12 text-base border-2 focus:border-primary transition-all"
                    />
                  </div>

                  {/* Neutered */}
                  <div className="space-y-3">
                    <Label htmlFor="neutered" className="text-base font-medium">מסורס/מעוקר</Label>
                    <Select
                      value={formData.is_neutered}
                      onValueChange={(value) => setFormData({ ...formData, is_neutered: value })}
                      disabled={loading}
                    >
                      <SelectTrigger className="h-12 text-base border-2 focus:border-primary transition-all">
                        <SelectValue placeholder="בחר סטטוס" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">כן</SelectItem>
                        <SelectItem value="false">לא</SelectItem>
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
                    className="flex-1 h-12 text-base border-2 hover:border-primary transition-all"
                  >
                    חזרה
                  </Button>
                )}
                
                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(currentStep + 1)}
                    disabled={!canProceed() || loading}
                    className="flex-1 h-12 text-base bg-gradient-to-r from-primary to-accent hover:shadow-large transition-all duration-300 hover:scale-105"
                  >
                    הבא
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-12 text-base bg-gradient-to-r from-primary to-accent hover:shadow-large transition-all duration-300 hover:scale-105"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                        שומר...
                      </>
                    ) : (
                      <>
                        <Sparkles className="ml-2 h-5 w-5" />
                        הוסף חיית מחמד
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
