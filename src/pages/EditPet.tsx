import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateWheelPicker } from "@/components/ui/date-wheel-picker";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar as CalendarIcon, Save } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { AppHeader } from "@/components/AppHeader";
import { getMyPet, updateMyPet } from "@/lib/mipoApi";

const errorMessage = (error: unknown, fallback: string) => (
  error instanceof Error ? error.message : fallback
);

const EditPet = () => {
  const { petId } = useParams<{ petId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    breed: "",
    birthDate: null as Date | null,
    gender: "",
    // Empty means the owner has not said. See the load and save below: an
    // unknown status has to survive a trip through this form unchanged.
    is_neutered: ""
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempBirthDate, setTempBirthDate] = useState<Date>(new Date());

  useEffect(() => {
    const fetchPet = async () => {
      if (!petId) return;
      
      try {
        const data = await getMyPet(petId);
        if (!data) {
          toast({ title: "חיה לא נמצאה", variant: "destructive" });
          navigate(-1);
          return;
        }
        
        setFormData({
          name: data.name || "",
          breed: data.breed || "",
          birthDate: data.birth_date ? new Date(data.birth_date) : null,
          gender: data.gender || "",
          // A null column means nobody has answered yet. Rendering that as "לא"
          // turned opening the form into an assertion: the owner saw an answer
          // they never gave, and saving wrote it to the database as fact.
          is_neutered: data.is_neutered === null || data.is_neutered === undefined
            ? ""
            : data.is_neutered ? "true" : "false"
        });
      } catch (error: unknown) {
        toast({ title: "שגיאה", description: errorMessage(error, "שגיאה בטעינת חיית המחמד"), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    
    fetchPet();
  }, [petId, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petId || !formData.name.trim()) return;
    
    setSaving(true);
    try {
      await updateMyPet(petId, {
        name: formData.name.trim(),
        breed: formData.breed || null,
        birth_date: formData.birthDate ? format(formData.birthDate, "yyyy-MM-dd") : null,
        gender: formData.gender || null,
        is_neutered: formData.is_neutered === "" ? null : formData.is_neutered === "true"
      });
      
      toast({ title: "הפרטים עודכנו בהצלחה!" });
      navigate('/');
    } catch (error: unknown) {
      toast({ title: "שגיאה", description: errorMessage(error, "שגיאה בשמירת חיית המחמד"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mipo-screen flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mipo-shell min-h-screen bg-white pb-20" dir="rtl">
      <AppHeader title="עריכת פרופיל" showBackButton />
      
      <motion.form 
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto px-4 py-6 space-y-6"
      >
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">שם *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="שם חיית המחמד"
            className="h-12 text-lg"
            required
          />
        </div>

        {/* Breed */}
        <div className="space-y-2">
          <Label htmlFor="breed" className="text-sm font-medium">גזע</Label>
          <Input
            id="breed"
            value={formData.breed}
            onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
            placeholder="גזע (אופציונלי)"
            className="h-12"
          />
        </div>

        {/* Birth Date */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">תאריך לידה</Label>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setTempBirthDate(formData.birthDate || new Date());
              setShowDatePicker(true);
            }}
            className={cn(
              "w-full h-12 justify-start text-right font-normal",
              !formData.birthDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="ml-2 h-4 w-4" />
            {formData.birthDate ? (
              format(formData.birthDate, "dd/MM/yyyy", { locale: he })
            ) : (
              "בחירת תאריך"
            )}
          </Button>
        </div>

        {/* Birth Date Picker Dialog */}
        <Dialog open={showDatePicker} onOpenChange={setShowDatePicker}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-center">בחירת תאריך לידה</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <DateWheelPicker
                value={tempBirthDate}
                onChange={setTempBirthDate}
                minYear={1990}
                maxYear={new Date().getFullYear()}
                locale="he-IL"
                size="md"
              />
              <div className="flex gap-2 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDatePicker(false)}
                  className="flex-1"
                >
                  ביטול
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, birthDate: tempBirthDate });
                    setShowDatePicker(false);
                  }}
                  className="flex-1"
                >
                  אישור
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Gender */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">מין</Label>
          <Select
            value={formData.gender}
            onValueChange={(value) => setFormData({ ...formData, gender: value })}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="בחירת מין" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">זכר</SelectItem>
              <SelectItem value="female">נקבה</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Neutered */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">מעוקר/מסורס</Label>
          <Select
            value={formData.is_neutered}
            onValueChange={(value) => setFormData({ ...formData, is_neutered: value })}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="לא צוין" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">כן</SelectItem>
              <SelectItem value="false">לא</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={saving || !formData.name.trim()}
          className="w-full h-12 text-lg font-semibold"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Save className="w-5 h-5 ml-2" />
              שמור שינויים
            </>
          )}
        </Button>
      </motion.form>
    </div>
  );
};

export default EditPet;
