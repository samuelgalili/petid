import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
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
import {
  mapOnboardingGender,
  readStoredOnboardingDraft,
  writeStoredOnboardingDraft,
  type OnboardingPetDraft,
} from "@/lib/mipoOnboardingDraft";
import { createMyPet, getMyPet, MipoApiError, uploadMyImage } from "@/lib/mipoApi";
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

const markOnboardingComplete = () => {
  try {
    localStorage.setItem("onboardingCompleted", "true");
    localStorage.setItem("mipo-onboarding-complete", "true");
  } catch {
    // ignore storage quota / private mode
  }
};

async function fileFromDataUrl(dataUrl: string): Promise<File | null> {
  if (!dataUrl.startsWith("data:image/")) return null;
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const subtype = (blob.type.split("/")[1] || "png").split("+")[0];
  return new File([blob], `onboarding-avatar.${subtype}`, { type: blob.type || "image/png" });
}

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { refresh, setPetType } = usePetPreference();
  const fileRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef<OnboardingPetDraft | null>(null);
  const persistInFlight = useRef(false);
  const persistedPetId = useRef<string | null>(null);
  const detailsSaveLock = useRef(false);
  const resumeStarted = useRef(false);
  const fileRefState = useRef<File | null>(null);
  const [phase, setPhase] = useState<Phase>("welcome");
  const [petType, setSelectedPetType] = useState<"dog" | "cat">("dog");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => () => {
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
  }, [preview]);

  useEffect(() => {
    fileRefState.current = file;
  }, [file]);

  const chooseType = (type: "dog" | "cat") => {
    setSelectedPetType(type);
    setPetType(type);
  };

  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setFile(nextFile);
    const reader = new FileReader();
    reader.onerror = () => {
      setPreview(URL.createObjectURL(nextFile));
      setPhase("reveal");
    };
    reader.onload = () => {
      setPreview(String(reader.result));
      setPhase("reveal");
    };
    reader.readAsDataURL(nextFile);
  };

  const hydrateFromDraft = useCallback((stored: OnboardingPetDraft) => {
    draftRef.current = stored;
    setName(stored.name);
    setBreed(stored.breed || "");
    setSelectedPetType(stored.petType);
    setPetType(stored.petType);
    if (stored.avatarUrl) setPreview(stored.avatarUrl);
    if (stored.petId) persistedPetId.current = stored.petId;
  }, [setPetType]);

  const persistPet = useCallback(async (nextDraft?: OnboardingPetDraft): Promise<boolean> => {
    if (persistInFlight.current) return false;

    const stored = readStoredOnboardingDraft();
    const draft = nextDraft ?? draftRef.current ?? stored;
    if (draft) draftRef.current = draft;

    persistInFlight.current = true;
    setSaving(true);
    setSaveError("");
    try {
      if (!user) {
        if (draft) writeStoredOnboardingDraft(draft);
        throw new Error("צריך להתחבר כדי לשמור את חיית המחמד.");
      }

      const existingId = persistedPetId.current || stored?.petId;
      if (existingId) {
        try {
          const existing = await getMyPet(existingId);
          if (existing?.id) {
            persistedPetId.current = existing.id;
            try {
              localStorage.setItem("activePetId", existing.id);
            } catch {
              // ignore storage quota / private mode
            }
            markOnboardingComplete();
            await refresh();
            return true;
          }
        } catch (error) {
          if (!(error instanceof MipoApiError) || (error.status !== 404 && error.status !== 403)) {
            throw error;
          }
        }
        persistedPetId.current = null;
      }

      if (!draft?.name) {
        const message = "חסרים פרטי חיית המחמד. חזרו אחורה ונסו שוב.";
        setSaveError(message);
        toast({ title: "לא הצלחנו לשמור את הפרופיל", description: message, variant: "destructive" });
        return false;
      }

      // Same avatar path as AddPet: upload a File, or reuse an already-hosted http(s) URL.
      // Remounted drafts keep Master as a data URL in localStorage — turn that back
      // into a File and upload. Do not write data: URLs or source_image_url onto pets.
      let avatarUrl: string | null = null;
      const imageFile = fileRefState.current
        ?? (draft.avatarUrl ? await fileFromDataUrl(draft.avatarUrl) : null);
      if (imageFile) {
        avatarUrl = (await uploadMyImage(imageFile)).url;
      } else if (/^https?:\/\//i.test(draft.avatarUrl)) {
        avatarUrl = draft.avatarUrl;
      }

      const gender = mapOnboardingGender(draft.gender);
      const pet = await createMyPet({
        name: draft.name,
        type: draft.petType,
        pet_type: draft.petType,
        breed: draft.breed.trim() || null,
        avatar_url: avatarUrl,
        ...(gender ? { gender } : {}),
      });
      if (!pet?.id) throw new Error("הפרופיל לא נוצר.");

      persistedPetId.current = pet.id;
      try {
        localStorage.setItem("activePetId", pet.id);
        writeStoredOnboardingDraft({ ...draft, petId: pet.id, avatarUrl: avatarUrl || draft.avatarUrl });
        markOnboardingComplete();
      } catch {
        // ignore storage quota / private mode
      }
      await refresh();
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "לא הצלחנו לשמור את הפרופיל. נסו שוב.";
      setSaveError(message);
      toast({
        title: "לא הצלחנו לשמור את הפרופיל",
        description: message,
        variant: "destructive",
      });
      return false;
    } finally {
      persistInFlight.current = false;
      setSaving(false);
    }
  }, [refresh, toast, user]);

  const celebrate = () => {
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.62 },
      colors: [...MIPO_GRADIENT_STOPS],
    });
  };

  const handleDetailsSave = () => {
    if (!name.trim()) return;
    if (detailsSaveLock.current || persistInFlight.current) return;
    detailsSaveLock.current = true;

    const draft: OnboardingPetDraft = {
      name: name.trim(),
      breed: breed.trim(),
      petType,
      avatarUrl: preview.startsWith("data:image/") ? preview : (draftRef.current?.avatarUrl || ""),
      photoUrl: preview.startsWith("data:image/") ? preview : "",
    };
    draftRef.current = draft;
    writeStoredOnboardingDraft(draft);

    void (async () => {
      if (!user) {
        detailsSaveLock.current = false;
        navigate("/auth", { replace: true });
        return;
      }
      resumeStarted.current = true;
      setPhase("success");
      const ok = await persistPet(draft);
      if (ok) celebrate();
    })();
  };

  const finish = async () => {
    if (persistInFlight.current || saving) return;
    const ok = await persistPet();
    if (!ok) return;
    markOnboardingComplete();
    navigate("/", { replace: true });
  };

  useEffect(() => {
    const stored = readStoredOnboardingDraft();
    if (stored) hydrateFromDraft(stored);
  }, [hydrateFromDraft]);

  useEffect(() => {
    if (authLoading || resumeStarted.current) return;
    const stored = readStoredOnboardingDraft();
    if (!stored?.name) return;
    hydrateFromDraft(stored);

    if (!user) return;

    resumeStarted.current = true;
    detailsSaveLock.current = true;
    setPhase("success");
    void persistPet(stored).then((ok) => {
      if (ok) celebrate();
    });
  }, [authLoading, hydrateFromDraft, persistPet, user]);

  return (
    <main className="mipo-screen min-h-[100dvh]" dir="rtl">
      <div className="mipo-shell relative flex min-h-[100dvh] flex-col overflow-hidden px-6 pb-8 pt-5">
        <div className="flex items-center justify-between">
          <MipoLogo variant="mark" size="xs" showAnimals={false} />
          <span className="text-xs font-semibold tracking-wide text-mipo-muted">{stepForPhase[phase]} / 5</span>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2" aria-label={`שלב ${stepForPhase[phase]} מתוך 5`}>
          {[1, 2, 3, 4, 5].map((step) => (
            <span
              key={step}
              className={cn(
                "h-1 rounded-full",
                step <= stepForPhase[phase] ? "bg-[image:var(--gradient-primary)]" : "bg-mipo-ink/[0.08]",
                (phase === "creating" || saving) && step === 4 && "animate-pulse",
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
              <button onClick={() => setPhase("photo")} className="mipo-cta-button mt-10 w-full max-w-sm px-6">
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
              <div className="mipo-avatar-glow mt-5 h-64 w-64 shadow-[0_24px_70px_rgba(96,165,250,0.25)]">
                <img src={preview || defaultPetAvatar} alt="חיית המחמד" className="h-full w-full rounded-full border-[7px] border-white object-cover" />
              </div>
              <div className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-mipo-ink shadow-lg">
                <Sparkles className="h-4 w-4 text-mipo-violet" />
                כבר יש ביניכם חיבור
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-mipo-ink">עכשיו רק נשלים כמה פרטים</h1>
              <button onClick={() => setPhase("details")} className="mipo-cta-button mt-8 w-full max-w-sm px-6">המשך</button>
              {!preview && <button onClick={() => setPhase("photo")} className="mt-3 text-sm text-mipo-muted"><ImagePlus className="ml-1 inline h-4 w-4" />הוספת תמונה</button>}
            </Screen>
          )}

          {(phase === "details" || phase === "creating") && (
            <Screen key="details" className="pt-14">
              <div className="mipo-avatar-glow mx-auto h-28 w-28">
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
              <button disabled={!name.trim() || phase === "creating" || saving} onClick={handleDetailsSave} className="mipo-cta-button mt-8 w-full px-6">
                {phase === "creating" || saving ? <><Loader2 className="h-5 w-5 animate-spin" />יוצרים את העולם של {name || "החבר שלך"}</> : "יצירת הפרופיל"}
              </button>
            </Screen>
          )}

          {phase === "success" && (
            <Screen key="success" className="items-center justify-center text-center">
              <div className="relative">
                <div className="absolute inset-0 scale-[1.7] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.18),transparent_68%)]" />
                <div className="mipo-avatar-glow h-44 w-44">
                  <img src={preview || defaultPetAvatar} alt={name} className="h-full w-full rounded-full border-[6px] border-white object-cover" />
                </div>
                <span className="absolute bottom-1 left-1 flex h-12 w-12 items-center justify-center rounded-full bg-[#15151A] text-white shadow-xl"><Check className="h-6 w-6" /></span>
              </div>
              {saveError ? (
                <>
                  <p className="mt-8 text-sm font-semibold text-mipo-muted">עוד רגע</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-mipo-ink">לא הצלחנו לשמור את {name || "הפרופיל"}</h1>
                  <p className="mt-4 max-w-xs text-base leading-7 text-mipo-muted">{saveError}</p>
                </>
              ) : (
                <>
                  <p className="mt-8 text-sm font-semibold text-mipo-muted">{saving ? "שומרים את הפרופיל" : "הפרופיל מוכן"}</p>
                  <h1 className="mt-2 text-4xl font-semibold tracking-[-0.04em] text-mipo-ink">ברוכים הבאים, {name}</h1>
                  <p className="mt-4 max-w-xs text-base leading-7 text-mipo-muted">מכאן כל תובנה, שיחה ורגע קהילתי נבנים במיוחד בשבילכם.</p>
                </>
              )}
              <button
                disabled={saving}
                onClick={() => void finish()}
                className="mipo-cta-button mt-9 w-full max-w-sm px-6"
              >
                {saving ? <><Loader2 className="h-5 w-5 animate-spin" />שומרים…</> : saveError ? "נסו שוב" : "כניסה לעולם של Mipo"}
              </button>
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
