import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar as CalendarIcon, ArrowRight, Save } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { AppHeader } from "@/components/AppHeader";

interface Pet {
  id: string;
  name: string;
  type: string;
  breed: string | null;
  birth_date: string | null;
  gender: string | null;
  is_neutered: boolean | null;
}

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
    is_neutered: "false"
  });
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    const fetchPet = async () => {
      if (!petId) return;
      
      try {
        const { data, error } = await supabase
          .from("pets")
          .select("*")
          .eq("id", petId)
          .maybeSingle();
        
        if (error) throw error;
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
          is_neutered: data.is_neutered ? "true" : "false"
        });
      } catch (error: any) {
        toast({ title: "שגיאה", description: error.message, variant: "destructive" });
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
      const { error } = await supabase
        .from("pets")
        .update({
          name: formData.name.trim(),
          breed: formData.breed || null,
          birth_date: formData.birthDate ? formData.birthDate.toISOString().split('T')[0] : null,
          gender: formData.gender || null,
          is_neutered: formData.is_neutered === "true"
        })
        .eq("id", petId);
      
      if (error) throw error;
      
      toast({ title: "הפרטים עודכנו בהצלחה!" });
      navigate(`/pet/${petId}`);
    } catch (error: any) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
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
          <Popover open={showCalendar} onOpenChange={setShowCalendar}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full h-12 justify-start text-right font-normal",
                  !formData.birthDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="ml-2 h-4 w-4" />
                {formData.birthDate ? (
                  format(formData.birthDate, "dd/MM/yyyy", { locale: he })
                ) : (
                  "בחר תאריך"
                )}
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
                disabled={(date) => date > new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Gender */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">מין</Label>
          <Select
            value={formData.gender}
            onValueChange={(value) => setFormData({ ...formData, gender: value })}
          >
            <SelectTrigger className="h-12">
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
          <Label className="text-sm font-medium">מעוקר/מסורס</Label>
          <Select
            value={formData.is_neutered}
            onValueChange={(value) => setFormData({ ...formData, is_neutered: value })}
          >
            <SelectTrigger className="h-12">
              <SelectValue />
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
