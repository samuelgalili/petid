import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";
import { usePetPreference } from "@/contexts/PetPreferenceContext";
import { useGuest } from "@/contexts/GuestContext";

const AddPet = () => {
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
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

  return (
    <div className="min-h-screen bg-background p-4 pb-20" dir="rtl">
      <Card className="max-w-2xl mx-auto mt-8">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">הוסף חיית מחמד</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Pet Type Selection */}
            <div className="space-y-2">
              <Label>סוג חיית מחמד</Label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setPetType("dog")}
                  className={`p-6 border-2 rounded-lg transition-all ${
                    petType === "dog"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="text-4xl mb-2">🐕</div>
                  <div className="font-semibold">כלב</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPetType("cat")}
                  className={`p-6 border-2 rounded-lg transition-all ${
                    petType === "cat"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="text-4xl mb-2">🐈</div>
                  <div className="font-semibold">חתול</div>
                </button>
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label htmlFor="image">תמונה</Label>
              <div className="flex flex-col items-center gap-4">
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-32 h-32 rounded-full object-cover"
                  />
                )}
                <Label
                  htmlFor="image"
                  className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-border rounded-lg p-4 hover:border-primary transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  <span>העלה תמונה</span>
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
            <div className="space-y-2">
              <Label htmlFor="name">שם *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="שם חיית המחמד"
                required
                disabled={loading}
              />
            </div>

            {/* Age */}
            <div className="space-y-2">
              <Label htmlFor="age">גיל</Label>
              <Input
                id="age"
                type="number"
                min="0"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="גיל בשנים"
                disabled={loading}
              />
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label htmlFor="gender">מין</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר מין" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">זכר</SelectItem>
                  <SelectItem value="female">נקבה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Breed */}
            <div className="space-y-2">
              <Label htmlFor="breed">גזע</Label>
              <Input
                id="breed"
                value={formData.breed}
                onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                placeholder="גזע חיית המחמד"
                disabled={loading}
              />
            </div>

            {/* Neutered */}
            <div className="space-y-2">
              <Label htmlFor="neutered">מסורס/מעוקר</Label>
              <Select
                value={formData.is_neutered}
                onValueChange={(value) => setFormData({ ...formData, is_neutered: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">כן</SelectItem>
                  <SelectItem value="false">לא</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  שומר...
                </>
              ) : (
                "הוסף חיית מחמד"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddPet;
