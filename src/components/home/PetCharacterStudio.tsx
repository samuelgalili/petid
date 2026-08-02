import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  Camera,
  Check,
  ImagePlus,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { MipoPetCharacter } from "@/lib/mipoApi";
import { preparePetCharacterPhoto } from "@/lib/petCharacterImages";
import { cn } from "@/lib/utils";

type PetCharacterStudioProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petName: string;
  petAvatarUrl: string;
  character: MipoPetCharacter | null;
  available: boolean;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  onGenerate: (photos: File[]) => Promise<MipoPetCharacter | null>;
  onSelectCandidate: (candidateKey: string) => Promise<MipoPetCharacter | null>;
  onDelete: () => Promise<boolean>;
};

const errorMessages: Record<string, string> = {
  invalid_reference_photos: "לא הצלחנו לזהות את אותה חיית מחמד בבירור. נסו תמונות חדות יותר של הפנים והגוף.",
  generation_blocked: "המודל לא הצליח ליצור דמות מהתמונות האלה. נסו תמונות אחרות ללא אנשים ברקע.",
  generation_inconsistent: "חלק מההבעות לא שמרו בדיוק על המראה של הדמות. בחרו שוב בעיצוב כדי שניצור חבילה עקבית יותר.",
  temporarily_unavailable: "הסטודיו עמוס כרגע. הדמות נשמרה ואפשר לנסות שוב מאוחר יותר.",
  generation_failed: "משהו השתבש ביצירת הדמות. אפשר לנסות שוב עם אותן תמונות או לבחור עיצוב אחר.",
};

const EXPRESSION_LABELS: Record<string, string> = {
  neutral: "רגוע",
  happy: "שמח",
  curious: "סקרן",
  sleepy: "ישנוני",
  proud: "גאה",
  celebrate: "חוגג",
  attentive: "קשוב",
};

const WorkingState = ({ stage, petName, previewUrl }: {
  stage: "candidates" | "expressions";
  petName: string;
  previewUrl?: string | null;
}) => (
  <div className="flex flex-col items-center px-3 pb-5 pt-8 text-center" aria-live="polite">
    <div className="relative flex h-36 w-36 items-center justify-center">
      <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-sky-300/30 via-violet-300/30 to-rose-300/30 blur-xl" />
      <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-mipo-soft shadow-[0_16px_45px_rgba(96,165,250,0.22)] dark:border-mipo-surface">
        {previewUrl ? (
          <img src={previewUrl} alt="העיצוב שנבחר" className="h-full w-full object-cover" />
        ) : (
          <WandSparkles className="h-10 w-10 text-mipo-ink" strokeWidth={1.5} />
        )}
      </div>
      <LoaderCircle className="absolute bottom-0 right-1 h-8 w-8 animate-spin rounded-full bg-mipo-surface p-1.5 text-mipo-ink shadow-md" />
    </div>
    <h3 className="mt-5 text-xl font-semibold tracking-[-0.025em] text-mipo-ink">
      {stage === "candidates" ? `מעצבים את ${petName}` : "יוצרים את חבילת התגובות"}
    </h3>
    <p className="mt-2 max-w-[310px] text-sm leading-6 text-mipo-muted">
      {stage === "candidates"
        ? "אנחנו לומדים את סימני הפרווה, מבנה הפנים והצבעים ויוצרים שלושה עיצובים לבחירה."
        : "העיצוב נשאר זהה; רק ההבעה והתנוחה משתנות כדי שהדמות תרגיש חיה באפליקציה."}
    </p>
    <div className="mt-6 flex items-center gap-2" aria-hidden="true">
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className="h-2 w-2 animate-pulse rounded-full bg-mipo-ink/70"
          style={{ animationDelay: `${dot * 180}ms` }}
        />
      ))}
    </div>
    <p className="mt-5 text-xs leading-5 text-mipo-muted">אפשר לסגור את החלון — התהליך ימשיך ברקע.</p>
  </div>
);

const PetCharacterStudio = ({
  open,
  onOpenChange,
  petName,
  petAvatarUrl,
  character,
  available,
  loading,
  submitting,
  error,
  onGenerate,
  onSelectCandidate,
  onDelete,
}: PetCharacterStudioProps) => {
  const [photos, setPhotos] = useState<File[]>([]);
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const [consent, setConsent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [recreate, setRecreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setSelectedKey(character?.selected_candidate_key || character?.candidates[0]?.key || null);
  }, [character?.candidates, character?.selected_candidate_key]);

  useEffect(() => {
    if (!open) {
      setConfirmDelete(false);
      setLocalError(null);
    }
  }, [open]);

  const previewUrls = useMemo(() => photos.map((photo) => URL.createObjectURL(photo)), [photos]);
  useEffect(() => () => previewUrls.forEach((url) => URL.revokeObjectURL(url)), [previewUrls]);

  const addPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = "";
    if (files.length === 0) return;
    if (photos.length + files.length > 3) {
      setLocalError("אפשר לבחור עד שלוש תמונות");
      return;
    }
    setProcessingPhotos(true);
    setLocalError(null);
    try {
      const prepared = await Promise.all(files.map(preparePetCharacterPhoto));
      setPhotos((current) => [...current, ...prepared].slice(0, 3));
    } catch (photoError) {
      setLocalError(photoError instanceof Error ? photoError.message : "לא הצלחנו להכין את התמונות");
    } finally {
      setProcessingPhotos(false);
    }
  };

  const generate = async () => {
    if (photos.length === 0 || !consent) return;
    setLocalError(null);
    try {
      await onGenerate(photos);
      setPhotos([]);
      setConsent(false);
      setRecreate(false);
    } catch {
      // The hook exposes the server message inline.
    }
  };

  const selectCandidate = async () => {
    if (!selectedKey) return;
    setLocalError(null);
    try {
      await onSelectCandidate(selectedKey);
    } catch {
      // The hook exposes the server message inline.
    }
  };

  const removeCharacter = async () => {
    try {
      if (await onDelete()) {
        setConfirmDelete(false);
        setRecreate(false);
      }
    } catch {
      // The hook exposes the server message inline.
    }
  };

  const selectedCandidate = character?.candidates.find((candidate) => candidate.key === selectedKey) || null;
  const serverError = character?.error_code ? errorMessages[character.error_code] : null;
  const showUploader = recreate || !character || (character.status === "failed" && character.candidates.length === 0);
  const inputId = `pet-character-photos-${character?.pet_id || "new"}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        dir="rtl"
        className="max-h-[92vh] overflow-y-auto rounded-t-[1.75rem] border-mipo-line/60 bg-mipo-surface px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="pb-1">
          <SheetTitle className="flex items-center justify-center gap-2 text-center text-lg font-semibold text-mipo-ink">
            <Sparkles className="h-5 w-5" strokeWidth={1.7} />
            סטודיו הדמות של {petName}
          </SheetTitle>
        </SheetHeader>

        {loading && !character ? (
          <div className="flex h-72 items-center justify-center">
            <LoaderCircle className="h-8 w-8 animate-spin text-mipo-muted" aria-label="טוען" />
          </div>
        ) : showUploader ? (
          <div className="pb-2 pt-5">
            <div className="mx-auto flex max-w-[360px] items-center gap-4 rounded-3xl border border-mipo-line/60 bg-mipo-soft/60 p-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-mipo-surface shadow-sm">
                <img src={petAvatarUrl} alt={petName} className="h-full w-full object-cover" />
              </div>
              <div>
                <p className="text-base font-semibold text-mipo-ink">מתמונה לחבר דיגיטלי</p>
                <p className="mt-1 text-xs leading-5 text-mipo-muted">
                  שלושה עיצובים לבחירה, ואז חבילת הבעות מונפשת — בלי לייצר וידאו.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {photos.map((photo, index) => (
                <div key={`${photo.name}-${photo.lastModified}-${index}`} className="relative aspect-square overflow-hidden rounded-2xl bg-mipo-soft">
                  <img src={previewUrls[index]} alt={`תמונת מקור ${index + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    className="absolute left-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur"
                    aria-label={`הסרת תמונה ${index + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {photos.length < 3 && (
                <label
                  htmlFor={inputId}
                  className={cn(
                    "flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-mipo-ink/25 bg-mipo-soft/45 text-center text-mipo-ink transition-colors hover:bg-mipo-soft",
                    processingPhotos && "pointer-events-none opacity-60",
                  )}
                >
                  {processingPhotos ? <LoaderCircle className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" strokeWidth={1.6} />}
                  <span className="mt-2 text-xs font-semibold">הוספת תמונה</span>
                </label>
              )}
              <input
                id={inputId}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={addPhotos}
                disabled={processingPhotos || photos.length >= 3}
              />
            </div>
            <p className="mt-2 text-center text-xs text-mipo-muted">1–3 תמונות · פנים ברורות · אור טבעי · רק אותה חיית מחמד</p>

            {!available && (
              <div className="mt-4 rounded-2xl border border-amber-300/60 bg-amber-50 p-3 text-sm leading-6 text-amber-950 dark:bg-amber-950/25 dark:text-amber-100">
                הסטודיו עדיין לא הופעל בסביבת השרת. יש להגדיר מפתח Vertex AI כדי להתחיל ליצור.
              </div>
            )}

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-mipo-line/60 p-3.5">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-1 h-4 w-4 accent-mipo-ink"
              />
              <span className="text-xs leading-5 text-mipo-muted">
                אני מאשר/ת עיבוד של התמונות באמצעות Google Vertex AI לצורך יצירת הדמות. תמונות המקור נמחקות מהשרת לאחר יצירת אפשרויות העיצוב; התמונות שנוצרו נשמרות בחשבון עד למחיקה.
              </span>
            </label>

            {(localError || serverError || error) && (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200" role="alert">
                {localError || serverError || error}
              </p>
            )}

            <button
              type="button"
              onClick={generate}
              disabled={!available || photos.length === 0 || !consent || submitting || processingPhotos}
              className="mipo-gradient-button mt-5 w-full disabled:cursor-not-allowed disabled:opacity-45"
            >
              {submitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <WandSparkles className="h-5 w-5" />}
              יצירת שלושה עיצובים
            </button>
            {recreate && (
              <button type="button" onClick={() => setRecreate(false)} className="mt-2 min-h-11 w-full text-sm font-semibold text-mipo-muted">
                ביטול וחזרה לדמות הקיימת
              </button>
            )}
          </div>
        ) : character?.status === "generating_candidates" ? (
          <WorkingState stage="candidates" petName={petName} />
        ) : character?.status === "generating_pack" ? (
          <WorkingState stage="expressions" petName={petName} previewUrl={selectedCandidate?.url} />
        ) : character?.status === "awaiting_selection" || (character?.status === "failed" && character.candidates.length > 0) ? (
          <div className="pb-3 pt-5">
            <div className="text-center">
              <p className="text-xl font-semibold tracking-[-0.025em] text-mipo-ink">איזה עיצוב הכי מרגיש כמו {petName}?</p>
              <p className="mt-2 text-sm leading-6 text-mipo-muted">בחרו לפי סימני הפרווה והפנים. מהעיצוב הזה ניצור את כל התגובות.</p>
            </div>
            {serverError && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm leading-6 text-red-700 dark:bg-red-950/30 dark:text-red-200">{serverError}</p>}
            <div className="mt-5 grid grid-cols-3 gap-2">
              {character.candidates.map((candidate, index) => {
                const selected = candidate.key === selectedKey;
                return (
                  <button
                    type="button"
                    key={candidate.key}
                    onClick={() => setSelectedKey(candidate.key)}
                    aria-pressed={selected}
                    className={cn(
                      "relative aspect-square overflow-hidden rounded-2xl border-2 bg-mipo-soft transition-all",
                      selected ? "border-mipo-ink shadow-[0_10px_24px_rgba(21,21,26,0.14)]" : "border-transparent",
                    )}
                  >
                    <img src={candidate.url} alt={`עיצוב ${index + 1}`} className="h-full w-full object-cover" />
                    {selected && (
                      <span className="absolute left-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-mipo-ink text-mipo-surface shadow">
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {(localError || error) && <p className="mt-3 text-center text-sm text-red-600" role="alert">{localError || error}</p>}
            <button
              type="button"
              onClick={selectCandidate}
              disabled={!selectedKey || submitting}
              className="mipo-gradient-button mt-5 w-full disabled:opacity-45"
            >
              {submitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              זה העיצוב שלי — יצירת תגובות
            </button>
            <button type="button" onClick={() => setRecreate(true)} className="mt-2 min-h-11 w-full text-sm font-semibold text-mipo-muted">
              שימוש בתמונות אחרות
            </button>
          </div>
        ) : character?.status === "ready" ? (
          <div className="pb-2 pt-5">
            <div className="text-center">
              <div className="mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-mipo-soft shadow-[0_18px_45px_rgba(96,165,250,0.22)] dark:border-mipo-surface">
                <img src={character.expressions.happy || character.expressions.neutral || petAvatarUrl} alt={`הדמות של ${petName}`} className="h-full w-full object-cover" />
              </div>
              <h3 className="mt-4 text-xl font-semibold tracking-[-0.025em] text-mipo-ink">הדמות של {petName} מוכנה</h3>
              <p className="mt-2 text-sm leading-6 text-mipo-muted">ההבעות מתחלפות לפי מצב הרוח והפעילות באפליקציה, עם תנועה חלקה וחסכונית ללא וידאו.</p>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-2">
              {Object.entries(character.expressions).filter((entry): entry is [string, string] => Boolean(entry[1])).slice(0, 8).map(([expression, url]) => (
                <div key={expression} className="text-center">
                  <div className="aspect-square overflow-hidden rounded-2xl bg-mipo-soft">
                    <img src={url} alt={`${petName} ${EXPRESSION_LABELS[expression] || expression}`} className="h-full w-full object-cover" />
                  </div>
                  <span className="mt-1 block text-[10px] font-medium text-mipo-muted">{EXPRESSION_LABELS[expression] || expression}</span>
                </div>
              ))}
            </div>

            <button type="button" onClick={() => onOpenChange(false)} className="mipo-gradient-button mt-5 w-full">
              <Check className="h-5 w-5" />
              מעולה, בואו נפגוש אותה
            </button>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setRecreate(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-mipo-line/70 text-xs font-semibold text-mipo-ink">
                <Camera className="h-4 w-4" />
                יצירה מתמונות אחרות
              </button>
              <button
                type="button"
                onClick={() => setSelectedKey(character.candidates.find((candidate) => candidate.key !== character.selected_candidate_key)?.key || character.selected_candidate_key)}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-mipo-line/70 text-xs font-semibold text-mipo-ink"
              >
                <RefreshCw className="h-4 w-4" />
                עיצוב אחר מהשלושה
              </button>
            </div>

            {selectedKey && selectedKey !== character.selected_candidate_key && (
              <div className="mt-3 rounded-2xl bg-mipo-soft/70 p-3">
                <p className="text-center text-xs leading-5 text-mipo-muted">בחירה בעיצוב אחר תיצור מחדש את חבילת התגובות.</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {character.candidates.map((candidate) => (
                    <button
                      type="button"
                      key={candidate.key}
                      onClick={() => setSelectedKey(candidate.key)}
                      className={cn("aspect-square overflow-hidden rounded-xl border-2", candidate.key === selectedKey ? "border-mipo-ink" : "border-transparent")}
                    >
                      <img src={candidate.url} alt="אפשרות עיצוב" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
                <button type="button" onClick={selectCandidate} disabled={submitting} className="mt-3 min-h-11 w-full rounded-xl bg-mipo-ink px-4 text-sm font-semibold text-mipo-surface disabled:opacity-50">
                  החלפת עיצוב ויצירת תגובות
                </button>
              </div>
            )}

            <div className="mt-5 border-t border-mipo-line/60 pt-3">
              {confirmDelete ? (
                <div className="rounded-2xl bg-red-50 p-3 dark:bg-red-950/25">
                  <p className="text-center text-xs leading-5 text-red-700 dark:text-red-200">למחוק את הדמות ואת כל התמונות שנוצרו?</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setConfirmDelete(false)} className="min-h-10 rounded-xl border border-mipo-line bg-mipo-surface text-xs font-semibold text-mipo-ink">ביטול</button>
                    <button type="button" onClick={removeCharacter} disabled={submitting} className="min-h-10 rounded-xl bg-red-600 text-xs font-semibold text-white disabled:opacity-50">מחיקה</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className="mx-auto flex min-h-11 items-center gap-2 px-3 text-xs font-semibold text-mipo-muted">
                  <Trash2 className="h-4 w-4" />
                  מחיקת הדמות
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="px-3 pb-5 pt-8 text-center">
            <LockKeyhole className="mx-auto h-9 w-9 text-mipo-muted" strokeWidth={1.5} />
            <p className="mt-4 text-base font-semibold text-mipo-ink">הסטודיו אינו זמין כרגע</p>
            <p className="mt-2 text-sm text-mipo-muted">נסו שוב בעוד כמה דקות.</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default PetCharacterStudio;
