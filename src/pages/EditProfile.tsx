import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Camera, Loader2, Mail, Phone, User } from "lucide-react";
import { z } from "zod";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser, updateMyProfile, uploadMyImage, type MipoProfile } from "@/lib/mipoApi";

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "השם חייב להכיל לפחות 2 תווים").max(100, "השם ארוך מדי"),
  bio: z.string().max(150, "הביו ארוך מדי").optional(),
  whatsappNumber: z.string().regex(/^(\+?972|0)?[0-9]{9,10}$/, "מספר וואטסאפ לא תקין").or(z.literal("")).optional(),
});

const errorMessage = (error: unknown, fallback: string) => (
  error instanceof Error ? error.message : fallback
);

interface FieldErrors {
  fullName?: string;
  bio?: string;
  whatsappNumber?: string;
}

const EditProfile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [profile, setProfile] = useState<MipoProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }

    const fetchProfile = async () => {
      setFetchingProfile(true);
      try {
        const auth = await getCurrentUser();
        const nextProfile = auth?.profile || null;
        setProfile(nextProfile);
        setFullName(nextProfile?.full_name || auth?.user.full_name || "");
        setBio(nextProfile?.bio || "");
        setWhatsappNumber(nextProfile?.whatsapp_number || nextProfile?.phone || auth?.user.phone || "");
        setAvatarUrl(nextProfile?.avatar_url || null);
      } catch {
        toast({
          title: "שגיאה בטעינת הפרופיל",
          description: "משהו השתבש, נסו שנית מאוחר יותר",
          variant: "destructive",
        });
      } finally {
        setFetchingProfile(false);
      }
    };

    fetchProfile();
  }, [user, authLoading, navigate, toast]);

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

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const upload = await uploadMyImage(file);
      setAvatarUrl(upload.url);
      toast({ title: "התמונה הועלתה" });
    } catch (error: unknown) {
      toast({
        title: "שגיאה בהעלאת תמונה",
        description: errorMessage(error, "נסו שוב מאוחר יותר"),
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!user || !validateForm()) return;

    setLoading(true);
    try {
      const result = await updateMyProfile({
        full_name: fullName.trim(),
        bio,
        phone: whatsappNumber || null,
        whatsapp_number: whatsappNumber || null,
        avatar_url: avatarUrl,
      });

      setProfile(result.profile);
      toast({ title: "הפרופיל עודכן בהצלחה" });
      navigate(-1);
    } catch (error: unknown) {
      toast({
        title: "שגיאה בעדכון הפרופיל",
        description: errorMessage(error, "משהו השתבש, נסו שנית מאוחר יותר"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetchingProfile) {
    return (
      <div className="mipo-screen flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mipo-shell min-h-screen bg-white pb-20" dir="rtl">
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
            disabled={loading || uploadingAvatar}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg px-4"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "סיום"}
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={avatarUrl || undefined} alt="תמונת פרופיל" />
              <AvatarFallback className="text-2xl bg-muted text-muted-foreground font-black">
                {fullName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-md border-2 border-background"
              aria-label="שינוי תמונת פרופיל"
            >
              {uploadingAvatar ? (
                <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-primary-foreground" />
              )}
            </button>
          </div>
          <Button
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="text-primary font-semibold font-jakarta"
          >
            שינוי תמונת פרופיל
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        <div className="space-y-6">
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
            {fieldErrors.fullName && <p className="text-xs text-destructive">{fieldErrors.fullName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground font-jakarta">
              אימייל
            </Label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={profile?.email || user?.email || ""}
                disabled
                className="pr-10 font-jakarta bg-muted text-muted-foreground"
              />
            </div>
            <p className="text-xs text-muted-foreground font-jakarta">לא ניתן לשנות את האימייל</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp" className="text-sm font-medium text-foreground font-jakarta">
              מספר טלפון / וואטסאפ
            </Label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="whatsapp"
                type="tel"
                value={whatsappNumber}
                onChange={(e) => {
                  setWhatsappNumber(e.target.value);
                  setFieldErrors({ ...fieldErrors, whatsappNumber: undefined });
                }}
                className={`pr-10 font-jakarta ${fieldErrors.whatsappNumber ? "border-destructive" : ""}`}
                placeholder="050-123-4567"
                dir="ltr"
              />
            </div>
            {fieldErrors.whatsappNumber ? (
              <p className="text-xs text-destructive">{fieldErrors.whatsappNumber}</p>
            ) : (
              <p className="text-xs text-muted-foreground font-jakarta">ניתן להזין בפורמט ישראלי</p>
            )}
          </div>

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
              placeholder="כתבו משהו על עצמכם..."
              maxLength={150}
            />
            <div className="flex justify-between items-center">
              {fieldErrors.bio ? (
                <p className="text-xs text-destructive">{fieldErrors.bio}</p>
              ) : (
                <p className="text-xs text-muted-foreground font-jakarta">ביו קצר שיוצג בפרופיל</p>
              )}
              <p className="text-xs text-muted-foreground/60 font-jakarta">
                {bio.length}/150
              </p>
            </div>
          </div>
        </div>

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
            <li>• שמרו על שם ברור ומזהה</li>
            <li>• הוסיפו תמונת פרופיל כדי שאחרים ימצאו אתכם</li>
            <li>• שתפו את התחביבים שלכם ומה אתם אוהבים בחיות מחמד</li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
};

export default EditProfile;
