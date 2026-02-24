import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, User, Mail, Camera, Phone, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ProfileImageEditor } from "@/components/ProfileImageEditor";
import { PhoneOtpVerification } from "@/components/PhoneOtpVerification";
import { z } from "zod";
import { toE164, isValidIsraeliPhone, toDisplayFormat } from "@/utils/phoneFormat";

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "השם חייב להכיל לפחות 2 תווים").max(100, "השם ארוך מדי"),
  bio: z.string().max(150, "הביו ארוך מדי").optional(),
  whatsappNumber: z.string().regex(/^(\+?972|0)?[0-9]{9,10}$/, "מספר וואטסאפ לא תקין").or(z.literal("")).optional(),
});

interface FieldErrors {
  fullName?: string;
  bio?: string;
  whatsappNumber?: string;
}

const EditProfile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [isImageEditorOpen, setIsImageEditorOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showPhoneOtp, setShowPhoneOtp] = useState(false);
  const [originalPhone, setOriginalPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfile();
  }, [user, authLoading]);

  const fetchProfile = async () => {
    if (!user) return;
    setFetchingProfile(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setBio(data.bio || "");
        const phone = (data as any).whatsapp_number || "";
        setWhatsappNumber(phone);
        setOriginalPhone(phone);
        setPhoneVerified(false);
      }
    } catch (error: any) {
      toast({
        title: "שגיאה בטעינת הפרופיל",
        description: "משהו השתבש, נסה שנית מאוחר יותר",
        variant: "destructive",
      });
    } finally {
      setFetchingProfile(false);
    }
  };

  const validateForm = (): boolean => {
    const result = profileSchema.safeParse({
      fullName,
      bio,
      whatsappNumber,
    });

    if (result.success) {
      setFieldErrors({});
      return true;
    }

    const errors: FieldErrors = {};
    result.error.issues.forEach((issue) => {
      const field = issue.path[0] as keyof FieldErrors;
      if (field) errors[field] = issue.message;
    });
    setFieldErrors(errors);
    return false;
  };

  const handleSave = async () => {
    if (!user) return;
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          bio: bio,
          whatsapp_number: whatsappNumber || null,
        } as any)
        .eq("id", user.id);

      if (error) throw error;

      toast({ title: "הפרופיל עודכן בהצלחה" });
      navigate(-1);
    } catch (error: any) {
      toast({
        title: "שגיאה בעדכון הפרופיל",
        description: error?.message || "משהו השתבש, נסה שנית מאוחר יותר",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetchingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      {/* Header */}
      <div className="bg-background border-b border-border sticky top-0 z-10 px-4 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
            aria-label="חזרה"
          >
            <ArrowRight className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold text-foreground font-jakarta">
            עריכת פרופיל
          </h1>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg px-4"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "סיום"}
          </Button>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={profile?.avatar_url} alt="תמונת פרופיל" />
              <AvatarFallback className="text-2xl bg-muted text-muted-foreground font-black">
                {fullName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => setIsImageEditorOpen(true)}
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-md border-2 border-background"
              aria-label="שינוי תמונת פרופיל"
            >
              <Camera className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
          <Button
            variant="ghost"
            onClick={() => setIsImageEditorOpen(true)}
            className="text-primary font-semibold font-jakarta"
          >
            שינוי תמונת פרופיל
          </Button>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-foreground font-jakarta">
              שם *
            </Label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setFieldErrors({ ...fieldErrors, fullName: undefined });
                }}
                className={`pr-10 font-jakarta ${fieldErrors.fullName ? "border-destructive" : ""}`}
                placeholder="השם שלך"
                maxLength={100}
              />
            </div>
            {fieldErrors.fullName && (
              <p className="text-xs text-destructive">{fieldErrors.fullName}</p>
            )}
          </div>

          {/* Email Field (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground font-jakarta">
              אימייל
            </Label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={profile?.email || ""}
                disabled
                className="pr-10 font-jakarta bg-muted text-muted-foreground"
              />
            </div>
            <p className="text-xs text-muted-foreground font-jakarta">לא ניתן לשנות את האימייל</p>
          </div>

          {/* WhatsApp Field */}
          <div className="space-y-2">
            <Label htmlFor="whatsapp" className="text-sm font-medium text-foreground font-jakarta">
              מספר וואטסאפ
            </Label>
            <div className="relative">
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <Input
                id="whatsapp"
                type="tel"
                value={whatsappNumber}
                onChange={(e) => {
                  setWhatsappNumber(e.target.value);
                  setFieldErrors({ ...fieldErrors, whatsappNumber: undefined });
                }}
                className={`pr-10 font-jakarta ${fieldErrors.whatsappNumber ? "border-destructive" : ""}`}
                placeholder="972501234567+"
                dir="ltr"
              />
            </div>
            {fieldErrors.whatsappNumber ? (
              <p className="text-xs text-destructive">{fieldErrors.whatsappNumber}</p>
            ) : (
              <p className="text-xs text-muted-foreground font-jakarta">הזינו מספר בפורמט בינלאומי (לדוגמה: 972501234567+)</p>
            )}
          </div>

          {/* Bio Field */}
          <div className="space-y-2">
            <Label htmlFor="bio" className="text-sm font-medium text-foreground font-jakarta">
              ביו
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => {
                setBio(e.target.value);
                setFieldErrors({ ...fieldErrors, bio: undefined });
              }}
              className={`min-h-[120px] font-jakarta resize-none ${fieldErrors.bio ? "border-destructive" : ""}`}
              placeholder="כתבו משהו על עצמכם... אפשר להשתמש באימוג'ים! 🐕🐈"
              maxLength={150}
            />
            <div className="flex justify-between items-center">
              {fieldErrors.bio ? (
                <p className="text-xs text-destructive">{fieldErrors.bio}</p>
              ) : (
                <p className="text-xs text-muted-foreground font-jakarta">
                  הפכו את הפרופיל שלכם לבולט עם אימוג'ים וביו קצר
                </p>
              )}
              <p className="text-xs text-muted-foreground/60 font-jakarta">
                {bio.length}/150
              </p>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 bg-secondary rounded-xl p-4 border border-border"
        >
          <h3 className="text-sm font-bold text-foreground font-jakarta mb-2">
            טיפים לפרופיל
          </h3>
          <ul className="space-y-1 text-xs text-muted-foreground font-jakarta">
            <li>• השתמשו באימוג'ים כדי להוסיף אישיות לביו 🐾</li>
            <li>• שמרו על שם ברור ומזהה</li>
            <li>• הוסיפו תמונת פרופיל כדי שאחרים ימצאו אתכם</li>
            <li>• שתפו את התחביבים שלכם ומה אתם אוהבים בחיות מחמד</li>
          </ul>
        </motion.div>
      </div>

      {/* Profile Image Editor */}
      <ProfileImageEditor
        isOpen={isImageEditorOpen}
        onClose={() => setIsImageEditorOpen(false)}
        currentImageUrl={profile?.avatar_url}
        onImageUpdated={(url) => {
          setProfile((prev: any) => ({ ...prev, avatar_url: url }));
        }}
      />
    </div>
  );
};

export default EditProfile;