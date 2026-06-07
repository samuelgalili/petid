/**
 * MIPO Onboarding — 5-step flow matching the master reference 1:1.
 *
 * Splash → Photo → Analyzing (detect breed) → Avatar reveal → Pet details → Setup complete
 *
 * On completion:
 *   - localStorage: mipo-onboarding-complete = "true"
 *   - localStorage: mipo-pet-draft = { name, breed, ageGroup, gender, avatarUrl, petType }
 *   - Navigates to /feed
 *
 * The generated avatar is also reused everywhere via <AvatarCompanion />.
 */

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Camera, Check, Loader2, Sparkles, ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import mipoLogo from "@/assets/mipo-logo.svg";
import { cn } from "@/lib/utils";

type Step = "splash" | "photo" | "analyzing" | "avatar" | "details" | "complete";

interface PetDraft {
  name: string;
  breed: string;
  breedHe?: string;
  ageGroup: "Puppy" | "Adult" | "Senior";
  gender: "Male" | "Female";
  petType: "dog" | "cat";
  avatarUrl: string;      // generated, full-body
  photoUrl: string;       // original user upload (square)
}

/* ============================================================
 * Shared chrome
 * ============================================================ */
const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed inset-0 z-[200] bg-white overflow-y-auto">
    <div className="min-h-full flex flex-col items-stretch px-6 py-10 max-w-md mx-auto">
      {children}
    </div>
  </div>
);

const MipoButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }
> = ({ className, variant = "primary", children, ...rest }) => (
  <button
    {...rest}
    className={cn(
      "h-14 px-8 rounded-full text-[15px] font-semibold transition active:scale-[0.98] disabled:opacity-50",
      variant === "primary"
        ? "bg-white text-slate-800 shadow-[0_6px_24px_-6px_rgba(231,123,108,0.45),0_6px_24px_-6px_rgba(90,150,220,0.45)]"
        : "bg-transparent text-slate-500",
      className,
    )}
  >
    {children}
  </button>
);

/* ============================================================
 * Aurora ring (used during analyzing + completion medallion)
 * ============================================================ */
const AuroraRing: React.FC<{ size?: number }> = ({ size = 220 }) => (
  <motion.div
    aria-hidden
    initial={{ rotate: 0 }}
    animate={{ rotate: 360 }}
    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
    className="absolute inset-0 rounded-full"
    style={{
      width: size,
      height: size,
      background:
        "conic-gradient(from 0deg, rgba(244,168,108,0.0) 0deg, rgba(244,168,108,0.55) 60deg, rgba(224,122,158,0.55) 140deg, rgba(160,123,201,0.55) 220deg, rgba(91,168,217,0.55) 300deg, rgba(244,168,108,0.0) 360deg)",
      filter: "blur(14px)",
    }}
  />
);

/* ============================================================
 * Splash
 * ============================================================ */
const SplashStep: React.FC<{ onNext: () => void }> = ({ onNext }) => (
  <Shell>
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-8">
      <motion.img
        src={mipoLogo}
        alt="MIPO"
        className="w-40 h-auto"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      />
      <div className="space-y-2">
        <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">Welcome to MIPO</h1>
        <p className="text-slate-500 text-[15px]">Let's get started!</p>
      </div>
    </div>
    <MipoButton onClick={onNext} className="self-center mb-4">Get Started</MipoButton>
  </Shell>
);

/* ============================================================
 * Photo step (camera or upload)
 * ============================================================ */
const PhotoStep: React.FC<{ onPhoto: (dataUrl: string) => void; onBack: () => void }> = ({
  onPhoto,
  onBack,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => onPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <Shell>
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-8">
        <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">
          Take a photo of your pet
        </h1>
        <p className="text-slate-500 text-[14px] -mt-4 max-w-xs">
          We'll bring them to life and create their personal avatar.
        </p>

        <motion.div
          whileTap={{ scale: 0.97 }}
          onClick={() => inputRef.current?.click()}
          className="relative w-56 h-56 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 cursor-pointer"
        >
          <Camera className="w-8 h-8 text-slate-400" strokeWidth={1.5} />
          <span className="text-[13px] text-slate-400">Tap to upload or take photo</span>
        </motion.div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>
      <div className="flex justify-between items-center pt-4">
        <MipoButton variant="ghost" onClick={onBack}>Back</MipoButton>
      </div>
    </Shell>
  );
};

/* ============================================================
 * Analyzing step (Screen 02)
 * ============================================================ */
const AnalyzingStep: React.FC<{
  photoUrl: string;
  analyzing: boolean;
  detectedBreed?: string;
  onRetake: () => void;
  onContinue: () => void;
}> = ({ photoUrl, analyzing, detectedBreed, onRetake, onContinue }) => (
  <Shell>
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
      <p className="text-slate-500 text-[14px]">
        {analyzing ? "Analyzing your pet…" : "We found a perfect match"}
      </p>

      <div className="relative w-[260px] h-[260px] flex items-center justify-center">
        {/* Soft aura hugging the pet silhouette */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 50% 55%, rgba(244,168,108,0.55) 0%, rgba(224,122,158,0.40) 25%, rgba(160,123,201,0.30) 45%, rgba(91,168,217,0.20) 65%, transparent 78%)",
            filter: "blur(22px)",
          }}
        />
        <img
          src={photoUrl}
          alt="your pet"
          className="relative z-10 w-[230px] h-[230px] object-contain"
          style={{
            filter:
              "drop-shadow(0 0 12px rgba(244,168,108,0.55)) drop-shadow(0 0 24px rgba(160,123,201,0.45)) drop-shadow(0 14px 18px rgba(0,0,0,0.18))",
          }}
        />
      </div>

      <div className="mt-2 space-y-1">
        <div className="text-[13px] text-slate-400">Detected:</div>
        <div
          className="text-[24px] font-bold tracking-tight bg-clip-text text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(90deg,#F4A86C 0%,#E07A9E 35%,#A07BC9 65%,#5BA8D9 100%)",
          }}
        >
          {analyzing ? "…" : detectedBreed || "Mixed breed"}
        </div>
      </div>
    </div>

    <div className="flex justify-center gap-4 pt-6">
      <MipoButton variant="ghost" onClick={onRetake} disabled={analyzing}>
        Retake Photo
      </MipoButton>
      <MipoButton onClick={onContinue} disabled={analyzing}>
        Continue
      </MipoButton>
    </div>
  </Shell>
);

/* ============================================================
 * Avatar reveal (Screen 03)
 * ============================================================ */
const AvatarStep: React.FC<{
  generating: boolean;
  avatarUrl?: string;
  onBack: () => void;
  onNext: () => void;
}> = ({ generating, avatarUrl, onBack, onNext }) => (
  <Shell>
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
      <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">Meet your pet's avatar</h1>
      <p className="text-slate-500 text-[14px]">
        {generating ? "Bringing them to life…" : "Ready to proceed?"}
      </p>

      <div className="relative w-[280px] h-[280px] flex items-center justify-center mt-4">
        {generating ? (
          <>
            <AuroraRing size={280} />
            <Loader2 className="w-10 h-10 text-slate-400 animate-spin relative z-10" />
          </>
        ) : (
          <motion.img
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            src={avatarUrl}
            alt="Generated avatar"
            className="w-full h-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.12)]"
          />
        )}
      </div>
    </div>

    <div className="flex justify-center gap-4 pt-6">
      <MipoButton variant="ghost" onClick={onBack}>Back</MipoButton>
      <MipoButton onClick={onNext} disabled={generating || !avatarUrl}>Next</MipoButton>
    </div>
  </Shell>
);

/* ============================================================
 * Details step (Screen 04: Tell us about your pet)
 * ============================================================ */
const DetailsStep: React.FC<{
  avatarUrl: string;
  initial: { breed: string; petType: "dog" | "cat" };
  onSave: (data: Omit<PetDraft, "avatarUrl" | "photoUrl" | "petType" | "breedHe">) => void;
  onBack: () => void;
}> = ({ avatarUrl, initial, onSave, onBack }) => {
  const [name, setName] = useState("");
  const [breed, setBreed] = useState(initial.breed);
  const [ageGroup, setAgeGroup] = useState<PetDraft["ageGroup"]>("Adult");
  const [gender, setGender] = useState<PetDraft["gender"]>("Male");

  const canContinue = name.trim().length > 0;

  return (
    <Shell>
      <div className="flex-1 flex flex-col gap-6 pt-2">
        <h1 className="text-[22px] font-semibold text-slate-700 tracking-tight text-center">
          Tell us about your pet
        </h1>

        <div className="grid grid-cols-[1fr,1fr] gap-4 items-center">
          {/* Form */}
          <div className="space-y-4">
            <Field label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your pet's name"
                className="w-full h-12 px-4 rounded-full border border-slate-200 text-[14px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-slate-400"
              />
            </Field>

            <Field label="Breed">
              <input
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                className="w-full h-12 px-4 rounded-full border border-slate-200 text-[14px] text-slate-700 focus:outline-none focus:border-slate-400"
              />
            </Field>

            <Field label="Age">
              <Segmented
                options={["Puppy", "Adult", "Senior"]}
                value={ageGroup}
                onChange={(v) => setAgeGroup(v as PetDraft["ageGroup"])}
              />
            </Field>

            <Field label="Gender">
              <div className="flex gap-2">
                {(["Male", "Female"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={cn(
                      "flex-1 h-12 rounded-full border text-[14px] font-medium flex items-center justify-center gap-2 transition",
                      gender === g
                        ? "border-slate-300 bg-slate-100 text-slate-800"
                        : "border-slate-200 text-slate-500 bg-white",
                    )}
                  >
                    <span
                      className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center border",
                        gender === g ? "border-slate-700 bg-slate-700 text-white" : "border-slate-300",
                      )}
                    >
                      {gender === g && <Check className="w-3 h-3" />}
                    </span>
                    {g}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* Avatar preview — large, soft shadow only (like reference) */}
          <div className="flex items-center justify-center">
            <img
              src={avatarUrl}
              alt="pet"
              className="w-full max-w-[280px] h-auto object-contain"
              style={{
                filter:
                  "drop-shadow(0 24px 28px rgba(0,0,0,0.10)) drop-shadow(0 6px 10px rgba(0,0,0,0.06))",
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center gap-3 pt-6">
        <MipoButton variant="ghost" onClick={onBack}>Back</MipoButton>
        <MipoButton
          disabled={!canContinue}
          onClick={() => onSave({ name: name.trim(), breed: breed.trim(), ageGroup, gender })}
          className="flex-1 max-w-[260px]"
        >
          Continue
        </MipoButton>
      </div>
    </Shell>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="space-y-1.5">
    <div className="text-[13px] font-semibold text-slate-700">{label}</div>
    {children}
  </div>
);

const Segmented: React.FC<{
  options: string[];
  value: string;
  onChange: (v: string) => void;
}> = ({ options, value, onChange }) => (
  <div className="h-12 p-1 rounded-full border border-slate-200 flex bg-white">
    {options.map((o) => (
      <button
        key={o}
        onClick={() => onChange(o)}
        className={cn(
          "flex-1 rounded-full text-[14px] font-medium transition",
          value === o ? "bg-slate-100 text-slate-800 font-semibold" : "text-slate-400",
        )}
      >
        {o}
      </button>
    ))}
  </div>
);

/* ============================================================
 * Complete (Screen 05)
 * ============================================================ */
const CompleteStep: React.FC<{ avatarUrl: string; onGo: () => void }> = ({ avatarUrl, onGo }) => (
  <Shell>
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 pt-10">
      <div className="relative w-[150px] h-[150px] flex items-center justify-center">
        <AuroraRing size={170} />
        <div className="relative z-10 w-[130px] h-[130px] rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-[0_10px_24px_-12px_rgba(0,0,0,0.18)]">
          <Check
            className="w-14 h-14"
            style={{ color: "transparent", strokeWidth: 2.5 }}
            stroke="url(#mipoCheck)"
          />
          <svg width="0" height="0">
            <defs>
              <linearGradient id="mipoCheck" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#F4A86C" />
                <stop offset="50%" stopColor="#A07BC9" />
                <stop offset="100%" stopColor="#5BA8D9" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-[24px] font-bold text-slate-800">Setup Complete!</h1>
        <p className="text-slate-400 text-[14px]">Thank you! Your pet is all set up. Let's go!</p>
      </div>

      <MipoButton onClick={onGo} className="mt-2">Let's Go!</MipoButton>
    </div>

    <div className="flex justify-end pt-6">
      <img
        src={avatarUrl}
        alt="pet"
        className="w-40 h-40 object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.12)]"
      />
    </div>
  </Shell>
);

/* ============================================================
 * Root state machine
 * ============================================================ */
export const MipoOnboarding: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("splash");
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [breed, setBreed] = useState<string>("");
  const [petType, setPetType] = useState<"dog" | "cat">("dog");
  const [generating, setGenerating] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  /* ── detect breed via edge function ── */
  const detectBreed = useCallback(async (dataUrl: string) => {
    setAnalyzing(true);
    setBreed("");
    try {
      const { data, error } = await supabase.functions.invoke("detect-breed", {
        body: { imageBase64: dataUrl, petType: "dog" }, // default; AI corrects detectedType
      });
      if (error) throw error;
      const detected = (data as any)?.detectedType === "cat" ? "cat" : "dog";
      setPetType(detected);
      setBreed((data as any)?.breed || "Mixed breed");
    } catch (e) {
      console.error("detect-breed failed:", e);
      setBreed("Mixed breed");
    } finally {
      setAnalyzing(false);
    }
  }, []);

  /* ── generate stylized avatar ── */
  const generateAvatar = useCallback(async () => {
    setGenerating(true);
    setAvatarUrl("");
    try {
      const { data, error } = await supabase.functions.invoke("generate-pet-avatar", {
        body: { imageBase64: photoUrl, breed, petType },
      });
      if (error) throw error;
      const url = (data as any)?.imageBase64;
      if (!url) throw new Error("No avatar returned");
      setAvatarUrl(url);
    } catch (e) {
      console.error("generate-pet-avatar failed:", e);
      // graceful fallback — reuse the user's own photo
      setAvatarUrl(photoUrl);
    } finally {
      setGenerating(false);
    }
  }, [photoUrl, breed, petType]);

  /* ── transitions ── */
  const handlePhoto = (dataUrl: string) => {
    setPhotoUrl(dataUrl);
    setStep("analyzing");
    detectBreed(dataUrl);
  };

  const handleAnalyzingContinue = () => {
    setStep("avatar");
    generateAvatar();
  };

  const handleDetailsSave = (form: {
    name: string;
    breed: string;
    ageGroup: PetDraft["ageGroup"];
    gender: PetDraft["gender"];
  }) => {
    const draft: PetDraft = {
      ...form,
      petType,
      avatarUrl,
      photoUrl,
    };
    try {
      localStorage.setItem("mipo-pet-draft", JSON.stringify(draft));
    } catch {}
    setStep("complete");
  };

  const finish = () => {
    try {
      localStorage.setItem("mipo-onboarding-complete", "true");
    } catch {}
    onComplete?.();
    navigate("/feed");
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        {step === "splash" && <SplashStep onNext={() => setStep("photo")} />}
        {step === "photo" && (
          <PhotoStep onPhoto={handlePhoto} onBack={() => setStep("splash")} />
        )}
        {step === "analyzing" && (
          <AnalyzingStep
            photoUrl={photoUrl}
            analyzing={analyzing}
            detectedBreed={breed}
            onRetake={() => setStep("photo")}
            onContinue={handleAnalyzingContinue}
          />
        )}
        {step === "avatar" && (
          <AvatarStep
            generating={generating}
            avatarUrl={avatarUrl}
            onBack={() => setStep("analyzing")}
            onNext={() => setStep("details")}
          />
        )}
        {step === "details" && (
          <DetailsStep
            avatarUrl={avatarUrl}
            initial={{ breed, petType }}
            onSave={handleDetailsSave}
            onBack={() => setStep("avatar")}
          />
        )}
        {step === "complete" && (
          <CompleteStep avatarUrl={avatarUrl} onGo={finish} />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default MipoOnboarding;