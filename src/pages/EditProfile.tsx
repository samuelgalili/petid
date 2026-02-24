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
    // Check if phone was changed and not verified
    const phoneChanged = whatsappNumber !== originalPhone && whatsappNumber !== "";
    if (phoneChanged && !phoneVerified) {
      if (!isValidIsraeliPhone(whatsappNumber)) {
        setPhoneError("מספר טלפון לא תקין");
        setLoading(false);
        return;
      }
      setShowPhoneOtp(true);
      setLoading(false);
      return;
    }

    try {
      const phoneToSave = phoneVerified ? toE164(whatsappNumber) : (whatsappNumber || null);
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          bio: bio,
          whatsapp_number: phoneToSave,
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

          {/* WhatsApp / Phone Field */}
          <div className="space-y-2">
            <Label htmlFor="whatsapp" className="text-sm font-medium text-foreground font-jakarta">
              מספר טלפון / וואטסאפ
            </Label>

            {showPhoneOtp ? (
              <PhoneOtpVerification
                phone={whatsappNumber}
                mode="update"
                onVerified={(e164Phone) => {
                  setWhatsappNumber(e164Phone);
                  setPhoneVerified(true);
                  setShowPhoneOtp(false);
                  setPhoneError("");
                  toast({ title: "המספר אומת בהצלחה ✓" });
                }}
                onCancel={() => {
                  setShowPhoneOtp(false);
                  setWhatsappNumber(originalPhone);
                  setPhoneVerified(false);
                }}
              />
            ) : (
              <>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="whatsapp"
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => {
                      setWhatsappNumber(e.target.value);
                      setPhoneVerified(false);
                      setPhoneError("");
                      setFieldErrors({ ...fieldErrors, whatsappNumber: undefined });
                    }}
                    className={`pr-10 font-jakarta ${fieldErrors.whatsappNumber || phoneError ? "border-destructive" : ""}`}
                    placeholder="050-123-4567"
                    dir="ltr"
                  />
                  {phoneVerified && (
                    <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                  )}
                </div>
                {phoneError ? (
                  <p className="text-xs text-destructive">{phoneError}</p>
                ) : fieldErrors.whatsappNumber ? (
                  <p className="text-xs text-destructive">{fieldErrors.whatsappNumber}</p>
                ) : whatsappNumber && whatsappNumber !== originalPhone && !phoneVerified ? (
                  <p className="text-xs text-amber-600 font-jakarta">שינוי מספר ידרוש אימות באמצעות קוד SMS</p>
                ) : (
                  <p className="text-xs text-muted-foreground font-jakarta">ניתן להזין בפורמט ישראלי (לדוגמה: 050-123-4567)</p>
                )}
              </>
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