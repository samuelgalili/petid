import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Cat,
  Check,
  Dog,
  ImagePlus,
  Loader2,
  Sparkles,
} from "lucide-react";
import confetti from "canvas-confetti";

import defaultPetAvatar from "@/assets/default-pet-avatar.png";
import { MipoLogo } from "@/components/MipoLogo";
import { usePetPreference } from "@/contexts/PetPreferenceContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { createMyPet, uploadMyImage } from "@/lib/mipoApi";
import { MIPO_GRADIENT_STOPS } from "@/lib/mipoTheme";
import { cn } from "@/lib/utils";

type Phase = "welcome" | "photo" | "reveal" | "details" | "creating" | "success";

const stepForPhase: Record<Phase, number> = {
  welcome: 1,
  photo: 2,
  reveal: 3,
  details: 4,
  creating: 4,
  success: 5,
};

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { refresh, setPetType } = usePetPreference();
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("welcome");
  const [petType, setSelectedPetType] = useState<"dog" | "cat">("dog");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");

  useEffect(() => () => {
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
  }, [preview]);

  const chooseType = (type: "dog" | "cat") => {
    setSelectedPetType(type);
    setPetType(type);
  };

  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
    setPhase("reveal");
  };

  const createPet = async () => {
    if (!name.trim()) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    try {
      setPhase("creating");
      const avatarUrl = file ? (await uploadMyImage(file)).url : null;
      const pet = await createMyPet({
        name: name.trim(),
        type: petType,
        pet_type: petType,
        breed: breed.trim() || null,
        avatar_url: avatarUrl,
      });
      localStorage.setItem("onboardingCompleted", "true");
      localStorage.setItem("activePetId", pet.id);
      await refresh();
      setPhase("success");
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.62 },
        colors: [...MIPO_GRADIENT_STOPS],
      });
    } catch (error) {
      toast({
        title: "לא הצלחנו ליצור את הפרופיל",
        description: error instanceof Error ? error.message : "נסו שוב בעוד רגע",
        variant: "destructive",
      });
      setPhase("details");
    }
  };

  return (
    <main className="mipo-screen min-h-[100dvh]" dir="rtl">
      <div className="mipo-shell relative flex min-h-[100dvh] flex-col overflow-hidden px-6 pb-8 pt-5">
        <div className="flex items-center justify-between">
          <MipoLogo variant="horizontal" size="sm" showAnimals={false} />
          <span className="text-xs font-semibold tracking-wide text-mipo-muted">{stepForPhase[phase]} / 5</span>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2" aria-label={`שלב ${stepForPhase[phase]} מתוך 5`}>
          {[1, 2, 3, 4, 5].map((step) => (
            <span
              key={step}
              className={cn(
                "h-1 rounded-full",
                step <= stepForPhase[phase] ? "bg-[image:var(--gradient-primary)]" : "bg-mipo-ink/[0.08]",
                phase === "creating" && step === 4 && "animate-pulse",
              )}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {phase === "welcome" && (
            <Screen key="welcome" className="items-center justify-center text-center">
              <div className="relative">
                <div className="absolute inset-0 scale-150 rounded-full bg-[radial-gradient(circle,rgba(167,139,250,0.18),transparent_68%)]" />
                <MipoLogo size="lg" showAnimals />
              </div>
              <h1 className="mt-10 max-w-sm text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-mipo-ink">
                תמונה אחת.<br />חיים שלמים של דאגה.
              </h1>
              <p className="mt-5 max-w-xs text-base leading-7 text-mipo-muted">
                Mipo מכיר את חיית המחמד שלך והופך כל פרט קטן לטיפול אישי יותר.
              </p>
              <button onClick={() => setPhase("photo")} className="mipo-gradient-button mt-10 w-full max-w-sm px-6">
                מתחילים
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Screen>
          )}

          {phase === "photo" && (
            <Screen key="photo" className="pt-10 text-center">
              <span className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-mipo-soft px-3 py-1 text-xs font-semibold text-mipo-muted">
                <Camera className="h-3.5 w-3.5" />
                שלב ההיכרות
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] text-mipo-ink">מי הכוכב של הבית?</h1>
              <p className="mt-2 text-sm leading-6 text-mipo-muted">בחרו סוג והוסיפו תמונה ברורה. כל השאר ירגיש כמו קסם.</p>

              <div className="mipo-segmented mx-auto mt-6 w-full max-w-xs grid-cols-2">
                <button data-active={petType === "dog"} onClick={() => chooseType("dog")} className="mipo-segment"><Dog className="h-4 w-4" />כלב</button>
                <button data-active={petType === "cat"} onClick={() => chooseType("cat")} className="mipo-segment"><Cat className="h-4 w-4" />חתול</button>
              </div>

              <div className="relative mx-auto mt-8 aspect-[4/5] w-full max-w-sm overflow-hidden rounded-[2rem] bg-[#15151A] shadow-2xl">
                <div className="absolute inset-5 rounded-[1.5rem] border border-white/25" />
                <div className="absolute left-5 top-5 h-8 w-8 border-l-2 border-t-2 border-white" />
                <div className="absolute right-5 top-5 h-8 w-8 border-r-2 border-t-2 border-white" />
                <div className="absolute bottom-5 left-5 h-8 w-8 border-b-2 border-l-2 border-white" />
                <div className="absolute bottom-5 right-5 h-8 w-8 border-b-2 border-r-2 border-white" />
                <button onClick={() => fileRef.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur-md"><Camera className="h-8 w-8" /></span>
                  <span className="mt-4 text-sm font-medium">פתיחת מצלמה או גלריה</span>
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={choosePhoto} className="hidden" />
              <button onClick={() => setPhase("reveal")} className="mt-5 text-sm font-medium text-mipo-muted">המשך בלי תמונה</button>
            </Screen>
          )}

          {phase === "reveal" && (
            <Screen key="reveal" className="items-center justify-center text-center">
              <p className="text-sm font-semibold text-mipo-muted">נעים מאוד</p>
              <div className="mipo-gradient-ring mt-5 h-64 w-64 shadow-[0_24px_70px_rgba(96,165,250,0.25)]">
                <img src={preview || defaultPetAvatar} alt="חיית המחמד" className="h-full w-full rounded-full border-[7px] border-white object-cover" />
              </div>
              <div className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-mipo-ink shadow-lg">
                <Sparkles className="h-4 w-4 text-mipo-violet" />
                כבר יש ביניכם חיבור
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-mipo-ink">עכשיו רק נשלים כמה פרטים</h1>
              <button onClick={() => setPhase("details")} className="mipo-gradient-button mt-8 w-full max-w-sm px-6">המשך</button>
              {!preview && <button onClick={() => setPhase("photo")} className="mt-3 text-sm text-mipo-muted"><ImagePlus className="ml-1 inline h-4 w-4" />הוספת תמונה</button>}
            </Screen>
          )}

          {(phase === "details" || phase === "creating") && (
            <Screen key="details" className="pt-14">
              <div className="mipo-gradient-ring mx-auto h-28 w-28">
                <img src={preview || defaultPetAvatar} alt="" className="h-full w-full rounded-full border-4 border-white object-cover" />
              </div>
              <h1 className="mt-7 text-center text-3xl font-semibold tracking-[-0.035em] text-mipo-ink">איך קוראים לך?</h1>
              <p className="mt-2 text-center text-sm text-mipo-muted">השם והגזע יעזרו ל-Mipo להתאים את החוויה.</p>
              <div className="mt-8 space-y-4">
                <label className="block text-sm font-semibold text-mipo-ink">
                  שם חיית המחמד
                  <input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="לוקה" className="mipo-input mt-2 min-h-14 w-full px-4 text-base outline-none" />
                </label>
                <label className="block text-sm font-semibold text-mipo-ink">
                  גזע <span className="font-normal text-mipo-muted">(אפשר גם בהמשך)</span>
                  <input value={breed} onChange={(event) => setBreed(event.target.value)} maxLength={120} placeholder="למשל גולדן רטריבר" className="mipo-input mt-2 min-h-14 w-full px-4 text-base outline-none" />
                </label>
              </div>
              <button disabled={!name.trim() || phase === "creating"} onClick={() => void createPet()} className="mipo-gradient-button mt-8 w-full px-6">
                {phase === "creating" ? <><Loader2 className="h-5 w-5 animate-spin" />יוצרים את העולם של {name || "החבר שלך"}</> : "יצירת הפרופיל"}
              </button>
            </Screen>
          )}

          {phase === "success" && (
            <Screen key="success" className="items-center justify-center text-center">
              <div className="relative">
                <div className="absolute inset-0 scale-[1.7] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.18),transparent_68%)]" />
                <div className="mipo-gradient-ring h-44 w-44">
                  <img src={preview || defaultPetAvatar} alt={name} className="h-full w-full rounded-full border-[6px] border-white object-cover" />
                </div>
                <span className="absolute bottom-1 left-1 flex h-12 w-12 items-center justify-center rounded-full bg-[#15151A] text-white shadow-xl"><Check className="h-6 w-6" /></span>
              </div>
              <p className="mt-8 text-sm font-semibold text-mipo-muted">הפרופיל מוכן</p>
              <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-mipo-ink">ברוכים הבאים, {name}</h1>
              <p className="mt-4 max-w-xs text-base leading-7 text-mipo-muted">מכאן כל תובנה, שיחה ורגע קהילתי נבנים במיוחד בשבילכם.</p>
              <button onClick={() => navigate("/", { replace: true })} className="mipo-gradient-button mt-9 w-full max-w-sm px-6">כניסה לעולם של Mipo</button>
            </Screen>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};

const Screen = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <motion.section
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12 }}
    transition={{ duration: 0.32, ease: "easeOut" }}
    className={cn("flex min-h-0 flex-1 flex-col", className)}
  >
    {children}
  </motion.section>
);

export default Onboarding;
