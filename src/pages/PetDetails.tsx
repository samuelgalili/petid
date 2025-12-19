import { Camera, Calendar, Info, History, Heart, Stethoscope, Pill, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { format, differenceInYears, differenceInMonths } from "date-fns";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

interface Pet {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  breed_confidence: number | null;
  birth_date: string | null;
  gender: string | null;
  is_neutered: boolean | null;
  avatar_url: string | null;
  created_at: string;
}

interface BreedHistory {
  id: string;
  breed: string | null;
  confidence: number | null;
  detected_at: string;
  avatar_url: string | null;
}

const PetDetails = () => {
  const navigate = useNavigate();
  const { petId } = useParams<{ petId: string }>();
  const { toast } = useToast();
  const [pet, setPet] = useState<Pet | null>(null);
  const [breedHistory, setBreedHistory] = useState<BreedHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', breed: '' });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPetDetails = async () => {
      if (!petId) return;

      try {
        setLoading(true);

        // Fetch pet details
        const { data: petData, error: petError } = await supabase
          .from('pets')
          .select('*')
          .eq('id', petId)
          .maybeSingle();

        if (petError) throw petError;
        if (!petData) {
          toast({
            title: "חיה לא נמצאה",
            description: "החיה שחיפשת לא קיימת.",
            variant: "destructive",
          });
          navigate('/home');
          return;
        }

        setPet(petData);
        setEditFormData({ name: petData.name, breed: petData.breed || '' });

        // Fetch breed detection history
        const { data: historyData, error: historyError } = await supabase
          .from('breed_detection_history')
          .select('*')
          .eq('pet_id', petId)
          .order('detected_at', { ascending: false });

        if (historyError) throw historyError;
        setBreedHistory(historyData || []);

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

    fetchPetDetails();
  }, [petId, navigate, toast]);

  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pet) return;

    if (!file.type.startsWith("image/")) {
      sonnerToast.error("נא להעלות קובץ תמונה בלבד");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      sonnerToast.error("גודל הקובץ חייב להיות קטן מ-5MB");
      return;
    }

    setIsUploadingImage(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("User not authenticated");

      // Create form data for edge function
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "pet");
      formData.append("petId", pet.id);

      // Upload via edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-avatar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Upload failed");
      }

      setPet(prev => prev ? { ...prev, avatar_url: result.url } : null);
      sonnerToast.success("תמונת חיית המחמד עודכנה בהצלחה!");
      navigate(-1);
    } catch (error: any) {
      console.error("Error uploading pet image:", error);
      sonnerToast.error(error.message || "שגיאה בהעלאת התמונה");
    } finally {
      setIsUploadingImage(false);
    }
  }, [pet, navigate]);

  const handleSaveEdit = async () => {
    if (!pet) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("pets")
        .update({
          name: editFormData.name,
          breed: editFormData.breed || null,
        })
        .eq("id", pet.id);

      if (error) throw error;

      setPet(prev => prev ? { ...prev, name: editFormData.name, breed: editFormData.breed || null } : null);
      setIsEditSheetOpen(false);
      sonnerToast.success("פרטי חיית המחמד עודכנו בהצלחה!");
    } catch (error: any) {
      console.error("Error saving pet:", error);
      sonnerToast.error(error.message || "שגיאה בשמירת הנתונים");
    } finally {
      setIsSaving(false);
    }
  };

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return "Unknown";
    const birth = new Date(birthDate);
    const years = differenceInYears(new Date(), birth);
    const months = differenceInMonths(new Date(), birth) % 12;
    
    if (years === 0) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    }
    return `${years} year${years !== 1 ? 's' : ''}${months > 0 ? `, ${months} month${months !== 1 ? 's' : ''}` : ''}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader title="פרופיל חיית מחמד" showBackButton={true} />
        <div className="px-4 pt-6">
          <div className="animate-pulse">
            <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto mb-8"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!pet) return null;

  return (
    <div className="min-h-screen bg-white pb-20">
      <AppHeader title="פרופיל חיית מחמד" showBackButton={true} />

      {/* Content */}
      <div className="px-4 pt-6">
        {/* Pet Avatar & Name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="relative">
            <Avatar className="w-32 h-32 border-[4px] border-white ring-4 ring-gray-100 shadow-xl">
              <AvatarImage src={pet.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="bg-gradient-secondary text-white text-4xl font-bold">
                {pet.type === 'dog' ? '🐕' : '🐈'}
              </AvatarFallback>
            </Avatar>
            <label className="absolute bottom-0 right-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center ring-2 ring-background cursor-pointer hover:bg-primary/90 transition-colors">
              <Camera className="w-5 h-5 text-primary-foreground" />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                disabled={isUploadingImage}
              />
              {isUploadingImage && (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </label>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 font-jakarta mb-1 mt-4">{pet.name}</h2>
          <p className="text-base text-gray-500 font-jakarta capitalize">{pet.type}</p>
        </motion.div>

        {/* Profile Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
            <h3 className="text-lg font-bold text-foreground font-jakarta mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              מידע על הפרופיל
            </h3>
          <Card className="p-5 bg-card border-2 border-border rounded-3xl shadow-sm">
            <div className="space-y-4">
              {/* Breed */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="text-lg">🐾</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-jakarta">גזע</p>
                    <p className="text-sm font-bold text-foreground font-jakarta">
                      {pet.breed || "Unknown"}
                    </p>
                  </div>
                </div>
                {pet.breed_confidence !== null && (
                  <span className={`text-2xl ${pet.breed_confidence > 70 ? 'text-success' : 'text-error'}`}>
                    {pet.breed_confidence > 70 ? '✓' : '✗'}
                  </span>
                )}
              </div>

              {/* Age */}
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-jakarta">גיל</p>
                  <p className="text-sm font-bold text-foreground font-jakarta">
                    {calculateAge(pet.birth_date)}
                  </p>
                </div>
              </div>

              {/* Birth Date */}
              {pet.birth_date && (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="text-lg">🎂</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-jakarta">תאריך לידה</p>
                    <p className="text-sm font-bold text-foreground font-jakarta">
                      {format(new Date(pet.birth_date), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
              )}

              {/* Gender */}
              {pet.gender && (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg">{pet.gender === 'male' ? '♂️' : '♀️'}</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-jakarta">מין</p>
                    <p className="text-sm font-bold text-foreground font-jakarta capitalize">
                      {pet.gender === 'male' ? 'זכר' : 'נקבה'}
                    </p>
                  </div>
                </div>
              )}

              {/* Neutered Status */}
              {pet.is_neutered !== null && (
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-jakarta">סטטוס</p>
                    <p className="text-sm font-bold text-foreground font-jakarta">
                      {pet.is_neutered ? 'מסורס/מעוקר' : 'לא מסורס/מעוקר'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Breed Detection History */}
        {breedHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <h3 className="text-lg font-bold text-gray-900 font-jakarta mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-secondary" />
              Breed Detection History
            </h3>
            <div className="space-y-3">
              {breedHistory.map((record, index) => (
                <Card
                  key={record.id}
                  className="p-4 bg-white border-2 border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    {record.avatar_url && (
                      <img
                        src={record.avatar_url}
                        alt="Detection"
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-bold text-gray-900 font-jakarta">
                          {record.breed || "Unknown"}
                        </p>
                        {record.confidence !== null && (
                          <span className={`text-lg ${record.confidence > 70 ? 'text-success' : 'text-error'}`}>
                            {record.confidence > 70 ? '✓' : '✗'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-jakarta">
                        {format(new Date(record.detected_at), 'MMM d, yyyy h:mm a')}
                      </p>
                      {record.confidence !== null && (
                        <p className="text-xs text-gray-600 font-jakarta mt-1">
                          Confidence: {record.confidence}%
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Health Records - Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
            <h3 className="text-lg font-bold text-gray-900 font-jakarta mb-4 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-secondary" />
              Health Records
            </h3>
          <Card className="p-6 bg-gradient-to-br from-[#F5F5F5] to-[#FAFAFA] border-2 border-dashed border-gray-200 rounded-3xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[#FFE8D6] to-[#FFE5F0] rounded-full flex items-center justify-center mb-4">
                <Pill className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="text-base font-bold text-gray-900 font-jakarta mb-2">
                No Health Records Yet
              </h4>
              <p className="text-sm text-gray-500 font-jakarta mb-4">
                Start tracking vaccinations, medications, and vet visits
              </p>
              <Button
                onClick={() => toast({ title: "Coming Soon", description: "Health records feature is under development" })}
                className="bg-gradient-secondary hover:opacity-90 text-white rounded-full font-jakarta font-bold px-6 shadow-md"
              >
                Add Health Record
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3 pb-6"
        >
          <Button
            onClick={() => navigate(`/breed-history/${pet.id}`)}
            className="w-full h-14 bg-white border-2 border-gray-200 hover:border-secondary hover:bg-secondary/5 text-gray-900 rounded-2xl font-jakarta font-bold shadow-sm"
          >
            <History className="w-5 h-5 mr-2" />
            View Full Breed History
          </Button>
          <Button
            onClick={() => {
              setEditFormData({ name: pet.name, breed: pet.breed || '' });
              setIsEditSheetOpen(true);
            }}
            className="w-full h-14 bg-gradient-primary hover:opacity-90 text-gray-900 rounded-2xl font-jakarta font-bold shadow-md"
          >
            Edit Profile
          </Button>
        </motion.div>
      </div>

      {/* Edit Pet Sheet */}
      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="font-jakarta text-xl font-bold text-foreground">
              עריכת פרטי חיית מחמד
            </SheetTitle>
            <SheetDescription className="font-jakarta text-sm text-muted-foreground">
              עדכנו את פרטי חיית המחמד שלכם
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Pet Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent/20 to-accent/10 shadow-lg overflow-hidden border-4 border-background">
                  {pet.avatar_url ? (
                    <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      {pet.type === 'dog' ? '🐕' : '🐈'}
                    </div>
                  )}
                  {isUploadingImage && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-accent rounded-full flex items-center justify-center shadow-md border-2 border-background cursor-pointer hover:bg-accent-hover transition-colors">
                  <Camera className="w-4 h-4 text-accent-foreground" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    disabled={isUploadingImage}
                  />
                </label>
              </div>
              <span className="text-sm text-accent font-semibold font-jakarta">
                {isUploadingImage ? "מעלה..." : "שנה תמונה"}
              </span>
            </div>

            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="pet-name" className="font-jakarta font-semibold text-foreground">
                שם חיית המחמד
              </Label>
              <Input
                id="pet-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="הכנס שם"
                className="font-jakarta h-12 rounded-xl border-2 focus:border-accent focus:ring-accent"
              />
            </div>

            {/* Breed Field */}
            <div className="space-y-2">
              <Label htmlFor="pet-breed" className="font-jakarta font-semibold text-foreground">
                גזע
              </Label>
              <Input
                id="pet-breed"
                value={editFormData.breed}
                onChange={(e) => setEditFormData(prev => ({ ...prev, breed: e.target.value }))}
                placeholder="הכנס גזע"
                className="font-jakarta h-12 rounded-xl border-2 focus:border-accent focus:ring-accent"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditSheetOpen(false)}
                className="flex-1 h-12 rounded-xl font-jakarta font-bold border-2"
              >
                ביטול
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex-1 h-12 rounded-xl font-jakarta font-bold bg-accent hover:bg-accent-hover text-accent-foreground shadow-md"
              >
                {isSaving ? "שומר..." : "שמור שינויים"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default PetDetails;
