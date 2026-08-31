import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Bot, ChevronLeft, FileHeart, HeartPulse, Plus, Shield, ShoppingBag, UserRound } from "lucide-react";

import defaultPetAvatar from "@/assets/default-pet-avatar.png";
import { PetidLogo } from "@/components/PetidLogo";
import PetOrbit, { type OrbitSlot } from "@/components/home/PetOrbit";
import MoodSheet from "@/components/home/MoodSheet";
import PetCharacterStudio from "@/components/home/PetCharacterStudio";
import { useHomeAttention } from "@/hooks/useHomeAttention";
import { useUserRole } from "@/hooks/useUserRole";
import { usePetCharacter } from "@/hooks/usePetCharacter";
import { usePetPreference } from "@/contexts/PetPreferenceContext";
import type { MipoPetCharacterExpression } from "@/lib/mipoApi";
import { consumePetCompanionReaction, PET_COMPANION_REACTION_EVENT } from "@/lib/petCompanionReactions";

const MipoHome = () => {
  const navigate = useNavigate();
  const { activePet, loading } = usePetPreference();
  const petName = activePet?.name || "החבר שלך";
  const moodKey = `mipo-mood-${activePet?.id ?? "default"}-${new Date().toISOString().slice(0, 10)}`;
  const [mood, setMood] = useState<string | null>(null);
  useEffect(() => {
    setMood(localStorage.getItem(moodKey));
  }, [moodKey]);
  const [moodOpen, setMoodOpen] = useState(false);
  const [characterStudioOpen, setCharacterStudioOpen] = useState(false);
  const [reactionOverride, setReactionOverride] = useState<MipoPetCharacterExpression | null>(null);
  const attention = useHomeAttention(activePet);
  const { isAdmin } = useUserRole();
  const petCharacter = usePetCharacter(activePet?.id);
  const previousCharacterStatus = useRef(petCharacter.character?.status);
  const reactionTimer = useRef<number | null>(null);
  const showReaction = useCallback((expression: MipoPetCharacterExpression, duration = 4500) => {
    if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
    setReactionOverride(expression);
    reactionTimer.current = window.setTimeout(() => {
      setReactionOverride(null);
      reactionTimer.current = null;
    }, duration);
  }, []);
  useEffect(() => () => {
    if (reactionTimer.current) window.clearTimeout(reactionTimer.current);
  }, []);
  const pickMood = (label: string) => {
    const next = mood === label ? null : label;
    setMood(next);
    if (next) localStorage.setItem(moodKey, next);
    else localStorage.removeItem(moodKey);
  };
  useEffect(() => {
    const previousStatus = previousCharacterStatus.current;
    const nextStatus = petCharacter.character?.status;
    previousCharacterStatus.current = nextStatus;
    if (previousStatus && previousStatus !== "ready" && nextStatus === "ready") {
      showReaction("celebrate", 5000);
    }
  }, [petCharacter.character?.status, showReaction]);

  useEffect(() => {
    if (!activePet?.id) return;
    const stored = consumePetCompanionReaction(activePet.id);
    if (stored) showReaction(stored);
    const handleReaction = (event: Event) => {
      const detail = (event as CustomEvent<{ petId: string; expression: MipoPetCharacterExpression }>).detail;
      if (detail?.petId === activePet.id) showReaction(detail.expression);
    };
    window.addEventListener(PET_COMPANION_REACTION_EVENT, handleReaction);
    return () => window.removeEventListener(PET_COMPANION_REACTION_EVENT, handleReaction);
  }, [activePet?.id, showReaction]);
  const moodInsights: Record<string, { title: string; body: string }> = {
    "שמחה": { title: "יום מצוין להרפתקה", body: `כש${petName} במצב רוח כזה, זה הזמן למשחק חדש או מסלול טיול ארוך יותר.` },
    "רגועה": { title: "יום טוב לתנועה עדינה", body: `טיול רגוע ומשחק קצר יעזרו לשמור על השגרה המאוזנת של ${petName}.` },
    "שובבה": { title: "לתעל את האנרגיה", body: `משחק משיכה או חיפוש חטיפים יעזור ל${petName} להוציא את האנרגיה בצורה טובה.` },
    "עייפה": { title: "יום של מנוחה", body: `כדאי להשאיר ל${petName} פינה שקטה ומים זמינים — מחר ממשיכים.` },
  };
  const slots: OrbitSlot[] = [
    { id: "health", label: "בריאות", icon: <HeartPulse className="h-[21px] w-[21px]" strokeWidth={1.7} />, onClick: () => navigate("/pet-profile"), attention: attention.has("health"), attentionLabel: attention.items.find((i) => i.slot === "health")?.message },
    { id: "documents", label: "מסמכים", icon: <FileHeart className="h-[21px] w-[21px]" strokeWidth={1.7} />, onClick: () => navigate("/documents"), attention: attention.has("documents"), attentionLabel: attention.items.find((i) => i.slot === "documents")?.message },
    { id: "shop", label: "חנות", icon: <ShoppingBag className="h-[21px] w-[21px]" strokeWidth={1.7} />, onClick: () => navigate("/shop"), attention: attention.has("shop"), attentionLabel: attention.items.find((i) => i.slot === "shop")?.message },
    { id: "chat", label: "Mipo AI", icon: <Bot className="h-[21px] w-[21px]" strokeWidth={1.7} />, onClick: () => navigate("/chat"), attention: attention.has("chat"), attentionLabel: attention.items.find((i) => i.slot === "chat")?.message },
  ];

  // One line under the orbit — attention wins, then mood, then the nudge (SPEC §3)
  const line = attention.primary
    ? { text: attention.primary.message, actionLabel: attention.primary.actionLabel, actionPath: attention.primary.actionPath }
    : mood
      ? { text: moodInsights[mood].body, actionLabel: "לשאול את Mipo", actionPath: "/chat" }
      : { text: `הקישו על ${petName} לעדכון מצב הרוח`, actionLabel: "", actionPath: "" };
  const moodExpressions: Record<string, MipoPetCharacterExpression> = {
    "שמחה": "happy",
    "רגועה": "proud",
    "שובבה": "curious",
    "עייפה": "sleepy",
  };
  const characterExpression: MipoPetCharacterExpression = reactionOverride
    || (mood ? moodExpressions[mood] : null)
    || (attention.primary ? "attentive" : "neutral");
  const characterReady = petCharacter.character?.status === "ready";
  const characterImage = characterReady
    ? petCharacter.character?.expressions[characterExpression]
      || petCharacter.character?.expressions.neutral
      || activePet?.avatar_url
      || defaultPetAvatar
    : activePet?.avatar_url || defaultPetAvatar;
  const firstName = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "בוקר טוב";
    if (hour < 18) return "צהריים טובים";
    return "ערב טוב";
  }, []);

  return (
    <main className="mipo-screen min-h-screen" dir="rtl">
      <div className="mipo-shell flex min-h-screen flex-col overflow-hidden pb-[calc(84px+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-sticky flex items-center justify-between border-b border-mipo-line/60 bg-mipo-surface/85 px-5 py-3 backdrop-blur-xl">
          {/* Both sides flex so the logo stays centred when the admin button
              makes one side wider than the other. */}
          <div className="flex flex-1 items-center justify-start gap-1">
            <button className="mipo-icon-button" onClick={() => navigate("/profile")} aria-label="פרופיל משתמש">
              <UserRound className="h-5 w-5" strokeWidth={1.7} />
            </button>
          </div>
          <PetidLogo variant="horizontal" size="sm" showAnimals={false} />
          <div className="flex flex-1 items-center justify-end gap-1">
            {/* Only for someone the app already knows holds an admin session.
                It points at /admin rather than /admin/login, so a live session
                lands straight in the panel and only an expired one is asked
                for a password. */}
            {isAdmin && (
              <button className="mipo-icon-button" onClick={() => navigate("/admin")} aria-label="פאנל ניהול">
                <Shield className="h-5 w-5" strokeWidth={1.7} />
              </button>
            )}
            <button className="mipo-icon-button" onClick={() => navigate("/notifications")} aria-label="התראות">
              <Bell className="h-5 w-5" strokeWidth={1.7} />
            </button>
          </div>
        </header>

        <section className="px-5 pb-4 pt-7 text-center">
          <p className="text-sm font-medium text-mipo-muted">{firstName}</p>
          <h1 className="mt-1 text-[1.7rem] font-semibold leading-tight tracking-[-0.035em] text-mipo-ink">
            איך {petName} מרגיש{activePet?.pet_type === "cat" ? "ה" : ""} היום?
          </h1>
        </section>

        {activePet || loading ? (
          <>
            <PetOrbit
              className="mt-6"
              slots={slots}
              petName={petName}
              avatarUrl={characterImage}
              isCharacter={characterReady}
              characterExpression={characterExpression}
              loading={loading}
              onPetClick={() => setMoodOpen(true)}
            />

            <p className="mt-7 px-6 text-center text-sm leading-6 text-mipo-muted">
              {line.text}
              {line.actionLabel && (
                <>
                  {" · "}
                  <button
                    onClick={() => navigate(line.actionPath)}
                    className="inline-flex min-h-11 items-center gap-1 align-middle text-sm font-bold text-mipo-ink"
                  >
                    {line.actionLabel}
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </>
              )}
            </p>
          </>
        ) : (
          <section className="px-5 pt-6">
            <button onClick={() => navigate("/add-pet")} className="mipo-gradient-button w-full px-5">
              <Plus className="h-5 w-5" />
              הוספת חיית המחמד הראשונה
            </button>
          </section>
        )}

        <MoodSheet
          open={moodOpen}
          onOpenChange={setMoodOpen}
          petName={petName}
          mood={mood}
          onPick={pickMood}
          onOpenCharacterStudio={() => setCharacterStudioOpen(true)}
          hasCharacter={Boolean(petCharacter.character)}
          characterWorking={petCharacter.character?.status === "generating_candidates" || petCharacter.character?.status === "generating_pack"}
        />
        <PetCharacterStudio
          open={characterStudioOpen}
          onOpenChange={setCharacterStudioOpen}
          petName={petName}
          petAvatarUrl={activePet?.avatar_url || defaultPetAvatar}
          character={petCharacter.character}
          available={petCharacter.available}
          loading={petCharacter.loading}
          submitting={petCharacter.submitting}
          error={petCharacter.error}
          onGenerate={petCharacter.generate}
          onSelectCandidate={petCharacter.selectCandidate}
          onDelete={petCharacter.remove}
        />
      </div>
    </main>
  );
};

export default MipoHome;
