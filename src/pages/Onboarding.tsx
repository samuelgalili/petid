/**
 * Premium Onboarding Experience
 * 3-screen intro swiper → Pet type → AI photo + breed detect → Conversational name → Dashboard reveal
 */
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { usePetPreference } from "@/contexts/PetPreferenceContext";
import { useGame } from "@/contexts/GameContext";
import { useToast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";
import confetti from "canvas-confetti";
import {
  Camera, ImagePlus, Loader2, Sparkles, ArrowLeft, Check, PawPrint,
  Heart, ShoppingBag, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import dogIcon from "@/assets/dog-official.svg";
import catIcon from "@/assets/cat-official.png";
import onboardingHero from "@/assets/onboarding-hero.jpg";
import onboardingScientist from "@/assets/onboarding-scientist.jpg";
import onboardingShop from "@/assets/onboarding-shop.jpg";

/* ════════ Intro Slides ════════ */
const SLIDES = [
  {
    image: onboardingHero,
    title: "הקהילה שלכם",
    subtitle: "פיד חברתי לחיות מחמד — שתפו רגעים, גלו חברים חדשים",
    gradient: "from-amber-500/30 to-orange-500/10",
  },
  {
    image: onboardingScientist,
    title: "המומחה האישי",
    subtitle: "AI שמבין את הגזע, הבריאות והתזונה של חיית המחמד שלכם",
    gradient: "from-sky-500/30 to-blue-500/10",
  },
  {
    image: onboardingShop,
    title: "חנות חכמה",
    subtitle: "מוצרים מותאמים אישית עם ציון בטיחות לכל חיית מחמד",
    gradient: "from-emerald-500/30 to-teal-500/10",
  },
];

type Phase = "intro" | "petType" | "photo" | "name" | "creating" | "success";

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { petType, setPetType, refresh: refreshPets } = usePetPreference();
  const { awardBadge, updateStreak } = useGame();

  /* ── State ── */
  const [phase, setPhase] = useState<Phase>("intro");
  const [slideIdx, setSlideIdx] = useState(0);
  const [selectedType, setSelectedType] = useState<"dog" | "cat" | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [petName, setPetName] = useState("");
  const [detectedBreed, setDetectedBreed] = useState("");
  const [breedConfidence, setBreedConfidence] = useState<number | null>(null);
  const [breedDetecting, setBreedDetecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdPetAvatar, setCreatedPetAvatar] = useState("");

  const nameInputRef = useRef<HTMLInputElement>(null);

  /* ── Intro swipe ── */
  const handleSwipe = (_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) < 50) return;
    if (info.offset.x < 0 && slideIdx < SLIDES.length - 1) {
      haptic("selection");
      setSlideIdx(s => s + 1);
    } else if (info.offset.x > 0 && slideIdx > 0) {
      haptic("selection");
      setSlideIdx(s => s - 1);
    }
  };

  const goToSetup = () => {
    haptic("success");
    setPhase("petType");
  };

  /* ── Pet type ── */
  const selectType = (type: "dog" | "cat") => {
    haptic("medium");
    setSelectedType(type);
    setPetType(type);
    setTimeout(() => setPhase("photo"), 400);
  };

  /* ── Photo & breed detect ── */
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
      detectBreed(result);
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          setImagePreview(result);
          detectBreed(result);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const detectBreed = async (base64: string) => {
    if (!selectedType) return;
    setBreedDetecting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/detect-pet-breed`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ imageBase64: base64, petType: selectedType }),
        }
      );
      const data = await response.json();
      if (data.breed && data.breed !== "Unknown Breed") {
        // Try matching Hebrew name from DB
        const { data: match } = await supabase
          .from("breed_information")
          .select("breed_name, breed_name_he")
          .eq("pet_type", selectedType)
          .or(`breed_name.ilike.%${data.breed}%,breed_name_he.ilike.%${data.breed}%`)
          .limit(1)
          .maybeSingle();
        setDetectedBreed(match?.breed_name_he || match?.breed_name || data.breed);
        setBreedConfidence(data.confidence || null);
        haptic("success");
      }
    } catch (err) {
      console.error("Breed detection error:", err);
    } finally {
      setBreedDetecting(false);
    }
  };

  const proceedToName = () => {
    haptic("light");
    setPhase("name");
    setTimeout(() => nameInputRef.current?.focus(), 500);
  };

  /* ── Create pet ── */
  const createPet = async () => {
    if (!petName.trim() || !selectedType) return;
    setPhase("creating");
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const avatarUrl = imagePreview || "";

      const { data: petData, error } = await supabase.from("pets").insert({
        user_id: user.id,
        name: petName.trim(),
        type: selectedType,
        breed: detectedBreed || null,
        breed_confidence: breedConfidence,
        avatar_url: avatarUrl,
      }).select().single();

      if (error) throw error;

      // Save breed detection history
      if (petData && detectedBreed && breedConfidence !== null) {
        await supabase.from("breed_detection_history").insert({
          pet_id: petData.id,
          breed: detectedBreed,
          confidence: breedConfidence,
          avatar_url: avatarUrl,
        });
      }

      // Award onboarding badge
      const { data: welcomeBadge } = await supabase
        .from("badges")
        .select("id")
        .eq("condition_type", "onboarding_complete")
        .maybeSingle();
      if (welcomeBadge) await awardBadge(welcomeBadge.id);
      await updateStreak();
      localStorage.setItem("onboardingCompleted", "true");

      setCreatedPetAvatar(avatarUrl);
      await refreshPets?.();

      // Trigger success
      setTimeout(() => {
        setPhase("success");
        setLoading(false);
        haptic("success");
        confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 }, colors: ["#FFD700", "#FF6B8A", "#7C5CFC", "#4ECDC4"] });
      }, 1200);
    } catch (err: any) {
      console.error("Create pet error:", err);
      toast({ title: "שגיאה", description: err.message || "לא הצלחנו ליצור את הפרופיל", variant: "destructive" });
      setPhase("name");
      setLoading(false);
    }
  };

  /* ── Dashboard reveal ── */
  const revealDashboard = () => {
    haptic("success");
    navigate("/", { replace: true });
  };

  /* ════════ RENDER ════════ */
  return (
    <div className="h-screen bg-background overflow-hidden" dir="rtl">
      <AnimatePresence mode="wait">

        {/* ═══════ PHASE: INTRO SWIPER ═══════ */}
        {phase === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="h-full flex flex-col"
          >
            {/* Slide area */}
            <motion.div
              className="flex-1 relative overflow-hidden"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={handleSwipe}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={slideIdx}
                  initial={{ opacity: 0, x: 80 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -80 }}
                  transition={{ type: "spring", stiffness: 200, damping: 25 }}
                  className="absolute inset-0 flex flex-col"
                >
                  {/* Image */}
                  <div className="flex-1 relative">
                    <img
                      src={SLIDES[slideIdx].image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${SLIDES[slideIdx].gradient} to-transparent`} />
                  </div>

                  {/* Text */}
                  <div className="px-8 py-6 text-center space-y-3">
                    <motion.h2
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      className="text-2xl font-bold text-foreground"
                    >
                      {SLIDES[slideIdx].title}
                    </motion.h2>
                    <motion.p
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.25 }}
                      className="text-muted-foreground leading-relaxed max-w-xs mx-auto"
                    >
                      {SLIDES[slideIdx].subtitle}
                    </motion.p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Dots & CTA */}
            <div className="px-8 pb-10 pt-4 space-y-6">
              {/* Dots */}
              <div className="flex justify-center gap-2">
                {SLIDES.map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      width: i === slideIdx ? 24 : 8,
                      backgroundColor: i === slideIdx ? "hsl(var(--primary))" : "hsl(var(--muted))",
                    }}
                    className="h-2 rounded-full"
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  />
                ))}
              </div>

              {/* Button */}
              {slideIdx === SLIDES.length - 1 ? (
                <Button
                  onClick={goToSetup}
                  size="lg"
                  className="w-full h-14 rounded-2xl text-lg font-bold text-primary-foreground shadow-lg shadow-primary/30"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  בואו נתחיל 🐾
                </Button>
              ) : (
                <Button
                  onClick={() => { haptic("selection"); setSlideIdx(s => s + 1); }}
                  variant="ghost"
                  size="lg"
                  className="w-full h-14 rounded-2xl text-lg font-semibold text-primary"
                >
                  הבא
                </Button>
              )}

              {slideIdx < SLIDES.length - 1 && (
                <button
                  onClick={goToSetup}
                  className="w-full text-center text-sm text-muted-foreground/60"
                >
                  דלג
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══════ PHASE: PET TYPE ═══════ */}
        {phase === "petType" && (
          <motion.div
            key="petType"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="h-full flex flex-col items-center justify-center px-8 space-y-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="text-5xl"
            >
              🐾
            </motion.div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">מי הולך להצטרף?</h2>
              <p className="text-muted-foreground">בחרו את סוג חיית המחמד</p>
            </div>

            <div className="grid grid-cols-2 gap-6 w-full max-w-sm">
              {([
                { type: "cat" as const, icon: catIcon, label: "חתול", size: "w-24 h-24" },
                { type: "dog" as const, icon: dogIcon, label: "כלב", size: "w-28 h-28" },
              ]).map(({ type, icon, label, size }) => (
                <motion.button
                  key={type}
                  whileHover={{ scale: 1.04, y: -4 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => selectType(type)}
                  className={cn(
                    "flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all bg-card shadow-md",
                    selectedType === type
                      ? "border-primary shadow-lg shadow-primary/20"
                      : "border-border/40 hover:border-primary/40"
                  )}
                >
                  <img src={icon} alt={label} className={`${size} object-contain mb-3`} />
                  <span className="font-semibold text-foreground text-lg">{label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ═══════ PHASE: PHOTO + BREED DETECT ═══════ */}
        {phase === "photo" && (
          <motion.div
            key="photo"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="h-full flex flex-col items-center justify-center px-8 space-y-6"
          >
            {/* Back */}
            <button
              onClick={() => { setPhase("petType"); setImagePreview(""); setDetectedBreed(""); }}
              className="absolute top-6 right-6 p-2 rounded-xl bg-muted/60 hover:bg-muted transition-colors z-10"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>

            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">צלמו או העלו תמונה</h2>
              <p className="text-muted-foreground text-sm">ה-AI שלנו יזהה את הגזע אוטומטית</p>
            </div>

            {/* Avatar circle */}
            <div className="relative w-44 h-44">
              <motion.div
                animate={breedDetecting ? { rotate: 360 } : {}}
                transition={breedDetecting ? { duration: 2, repeat: Infinity, ease: "linear" } : {}}
                className={cn(
                  "w-44 h-44 rounded-full border-[3px] border-dashed overflow-hidden flex items-center justify-center",
                  imagePreview ? "border-primary" : "border-border/60 bg-muted/40"
                )}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Camera className="w-12 h-12" />
                    <span className="text-xs">צלם או העלה</span>
                  </div>
                )}
              </motion.div>

              {breedDetecting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin mx-auto" />
                    <span className="text-xs text-white mt-1 block">מזהה גזע...</span>
                  </div>
                </div>
              )}

              {/* Breed badge */}
              {detectedBreed && !breedDetecting && (
                <motion.div
                  initial={{ scale: 0, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-primary/30 flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {detectedBreed}
                  {breedConfidence && (
                    <span className="text-primary-foreground/70 text-xs">
                      ({Math.round(breedConfidence * 100)}%)
                    </span>
                  )}
                </motion.div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 w-full max-w-xs">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleCameraCapture}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-primary text-primary-foreground font-medium shadow-md"
              >
                <Camera className="w-5 h-5" />
                צלם
              </motion.button>

              <label className="flex-1">
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-muted text-foreground font-medium cursor-pointer"
                >
                  <ImagePlus className="w-5 h-5" />
                  גלריה
                </motion.div>
                <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              </label>
            </div>

            {/* Continue */}
            <Button
              onClick={proceedToName}
              disabled={breedDetecting}
              size="lg"
              className="w-full max-w-xs h-14 rounded-2xl text-lg font-bold text-primary-foreground shadow-lg shadow-primary/30"
              style={{ background: "var(--gradient-primary)" }}
            >
              {imagePreview ? "המשך" : "דלג בינתיים"}
            </Button>
          </motion.div>
        )}

        {/* ═══════ PHASE: CONVERSATIONAL NAME ═══════ */}
        {phase === "name" && (
          <motion.div
            key="name"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            className="h-full flex flex-col items-center justify-center px-8 space-y-8"
          >
            {/* Pet avatar small */}
            {imagePreview && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
              >
                <Avatar className="w-20 h-20 border-2 border-primary/30 shadow-lg">
                  <AvatarImage src={imagePreview} />
                  <AvatarFallback className="bg-muted text-2xl">🐾</AvatarFallback>
                </Avatar>
              </motion.div>
            )}

            {/* Conversational prompt */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="w-full max-w-sm"
            >
              {/* Chat bubble */}
              <div className="bg-muted/60 backdrop-blur-xl rounded-2xl rounded-br-md p-5 mb-6 border border-border/20">
                <p className="text-foreground text-lg leading-relaxed">
                  {selectedType === "dog" ? "🐕" : "🐱"}{" "}
                  {detectedBreed
                    ? `יופי! זיהינו ${detectedBreed}. מה השם שלו?`
                    : `איזה ${selectedType === "dog" ? "כלב" : "חתול"} מקסים! מה השם?`}
                </p>
              </div>

              {/* Name input */}
              <div className="relative">
                <Input
                  ref={nameInputRef}
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && petName.trim() && createPet()}
                  placeholder="הקלידו שם..."
                  className="h-14 rounded-2xl text-lg pr-5 pl-14 bg-card border-border/30 shadow-sm text-right"
                  dir="rtl"
                  autoComplete="off"
                />
                <Button
                  onClick={createPet}
                  disabled={!petName.trim()}
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl shadow-md"
                  style={{ background: petName.trim() ? "var(--gradient-primary)" : undefined }}
                >
                  <ArrowLeft className="w-5 h-5 text-primary-foreground" />
                </Button>
              </div>
            </motion.div>

            {/* Live personalization preview */}
            <AnimatePresence>
              {petName.trim() && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-muted-foreground"
                >
                  הדאשבורד של <span className="font-bold text-foreground">{petName}</span> כמעט מוכן ✨
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ═══════ PHASE: CREATING (TRANSITION) ═══════ */}
        {phase === "creating" && (
          <motion.div
            key="creating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col items-center justify-center px-8 space-y-6"
          >
            {/* Animated avatar moving to center */}
            <motion.div
              initial={{ scale: 1 }}
              animate={{
                scale: [1, 1.15, 0.9, 1],
              }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            >
              <Avatar className="w-28 h-28 border-4 border-primary shadow-2xl shadow-primary/30">
                <AvatarImage src={imagePreview} />
                <AvatarFallback className="bg-primary/10 text-4xl">🐾</AvatarFallback>
              </Avatar>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center space-y-2"
            >
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
              <p className="text-lg font-semibold text-foreground">
                יוצרים את הפרופיל של {petName}...
              </p>
            </motion.div>
          </motion.div>
        )}

        {/* ═══════ PHASE: SUCCESS CARD ═══════ */}
        {phase === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 150, damping: 18 }}
            className="h-full flex flex-col items-center justify-center px-8 space-y-8"
          >
            {/* Success card */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-full max-w-sm bg-card rounded-3xl p-8 shadow-2xl border border-border/20 text-center space-y-5"
            >
              {/* Golden health ring */}
              <div className="relative w-32 h-32 mx-auto">
                <motion.svg
                  viewBox="0 0 120 120"
                  className="w-full h-full"
                  initial={{ rotate: -90 }}
                  animate={{ rotate: -90 }}
                >
                  {/* Background ring */}
                  <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                  {/* Golden progress ring */}
                  <motion.circle
                    cx="60" cy="60" r="52"
                    fill="none"
                    stroke="url(#goldGradient)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 52}
                    initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 52 * 0.7 }}
                    transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                  />
                  <defs>
                    <linearGradient id="goldGradient" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="hsl(var(--accent))" />
                    </linearGradient>
                  </defs>
                </motion.svg>

                {/* Avatar inside ring */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Avatar className="w-20 h-20 border-2 border-background shadow-lg">
                    <AvatarImage src={imagePreview} />
                    <AvatarFallback className="bg-primary/10 text-3xl">🐾</AvatarFallback>
                  </Avatar>
                </div>

                {/* Pulse glow */}
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)",
                  }}
                />
              </div>

              <div>
                <motion.h2
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-2xl font-bold text-foreground"
                >
                  🎉 {petName} רשום!
                </motion.h2>
                <motion.p
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7 }}
                  className="text-muted-foreground mt-1"
                >
                  {detectedBreed && `${detectedBreed} · `}הפרופיל מוכן
                </motion.p>
              </div>

              {/* Badges */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.9, type: "spring" }}
                className="flex items-center justify-center gap-3"
              >
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 text-sm font-medium">
                  <Sparkles className="w-3.5 h-3.5" />
                  50 נקודות
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  <PawPrint className="w-3.5 h-3.5" />
                  באדג׳ ברוך הבא
                </div>
              </motion.div>
            </motion.div>

            {/* CTA */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="w-full max-w-sm"
            >
              <Button
                onClick={revealDashboard}
                size="lg"
                className="w-full h-14 rounded-2xl text-lg font-bold text-primary-foreground shadow-lg shadow-primary/30"
                style={{ background: "var(--gradient-primary)" }}
              >
                גלו את הדאשבורד של {petName} 🐾
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Onboarding;
