import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

import defaultPetAvatar from "@/assets/default-pet-avatar.png";
import PresenceAurora from "@/components/home/PresenceAurora";
import { cn } from "@/lib/utils";
import {
  PetAvatarScene,
  type PrototypeMood,
  type PrototypeSpecies,
} from "@/components/pet/petAvatarScene";

const MOODS: { id: PrototypeMood; label: string }[] = [
  { id: "neutral", label: "רגוע" },
  { id: "happy", label: "שמח" },
  { id: "excited", label: "נרגש" },
  { id: "curious", label: "סקרן" },
  { id: "concerned", label: "מודאג" },
];

const SPECIES: { id: PrototypeSpecies; label: string }[] = [
  { id: "cat", label: "גוף בדיקה: חתול" },
  { id: "dog", label: "גוף בדיקה: כלב" },
];

const PIPELINE = [
  "העלאה בפרופיל של חיית המחמד, תמונה אחת שלה.",
  "שער איכות לפני כל הוצאה: גוף מלא, חיה אחת, אור ורזולוציה, מבט מהצד או משלושת רבעים. דחייה בעברית, בלי קריאה לספק.",
  "תור בשרת: אותו גיבוב של חיית מחמד ותמונה לא נשלח פעמיים. המכסה נספרת לפי חיית המחמד, וכשל אצל הספק לא נספר.",
  "ריג אוטומטי על ארבע. מנוחה, נשימה וזנב בקוד — לספק יש רק קליפ הליכה.",
  "שמירת GLB לכל חיית מחמד, דחוס, עם תקרת משקל לטלפון.",
  "בזמן ההמתנה נשארת התמונה, עם משפט שהבנייה אורכת כמה דקות. בסיום, התראה בתוך האפליקציה.",
  "כשל, או דגל כבוי: שוב התמונה הרגילה.",
];

const REJECTIONS = [
  "רואים רק חלק מהחיה. צריך שכל הגוף יופיע בתמונה — ראש, גוף, רגליים וזנב.",
  "בתמונה יש יותר מחיית מחמד אחת, או שזו לא החיה מהפרופיל. צלמו רק אותה.",
  "התמונה קטנה מדי, כהה מדי, או לא חדה. צלמו באור יום, עם כל הגוף בפריים.",
  "התמונה ישר מלפנים. עדיף מהצד, או בזווית של שלושת רבעים, כדי שהמודל יקבל עומק.",
];

/**
 * Local-only stand-in for the living centre pet.
 * The route that loads this file is registered only when `import.meta.env.DEV`
 * is true, so a production build does not include the page.
 */
const PetAvatarPrototype = () => {
  const reduced = useReducedMotion();
  const forcedFallback = new URLSearchParams(window.location.search).get("fallback") === "1";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<PetAvatarScene | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const [species, setSpecies] = useState<PrototypeSpecies>("cat");
  const [mood, setMood] = useState<PrototypeMood>("neutral");
  const [nudged, setNudged] = useState(false);
  const showScene = !forcedFallback && !webglFailed;

  useEffect(() => {
    if (!showScene) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scene = PetAvatarScene.mount(canvas);
    if (!scene) {
      setWebglFailed(true);
      return;
    }
    sceneRef.current = scene;
    scene.setSpecies(species);
    scene.setMood(mood);
    scene.setReducedMotion(Boolean(reduced));
    if (!reduced) scene.start();
    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
    // Mood and species are pushed in the effect below so a tap does not rebuild the context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showScene, reduced]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setSpecies(species);
    scene.setMood(mood);
    scene.setReducedMotion(Boolean(reduced));
  }, [species, mood, reduced]);

  const nudge = () => {
    sceneRef.current?.nudge();
    setNudged(true);
    window.setTimeout(() => setNudged(false), 520);
  };

  return (
    <main className="mipo-screen min-h-screen" dir="rtl">
      <div className="mipo-shell mx-auto flex min-h-screen flex-col px-5 pb-10 pt-8">
        <p className="text-xs font-semibold tracking-[0.08em] text-mipo-muted">פיתוח בלבד</p>
        <h1 className="mt-2 text-[1.65rem] font-semibold leading-tight tracking-[-0.03em] text-mipo-ink">
          דמות חיה במרכז המסך
        </h1>
        <p className="mt-3 text-sm leading-6 text-mipo-muted">
          התכנון הוא דגם ריאליסטי נפרד לכל חיית מחמד, מהתמונה שהועלתה. הדף הזה לא מעלה תמונה, לא קורא לספק, ואין בו מפתח. הוא לא נכלל בבנייה לייצור, והדגל כבוי.
        </p>

        <section className="mt-8" aria-labelledby="pipeline-heading">
          <h2 id="pipeline-heading" className="text-sm font-semibold text-mipo-ink">הצינור המתוכנן</h2>
          <p className="mt-1 text-sm leading-6 text-mipo-muted">
            רשימה בלבד. אין כאן כפתור שמתחיל יצירה.
          </p>
          <ol className="mt-3 list-inside list-decimal space-y-2 text-sm leading-6 text-mipo-ink">
            {PIPELINE.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <h3 className="mt-4 text-sm font-semibold text-mipo-ink">משוב אם התמונה נדחית</h3>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-mipo-muted">
            {REJECTIONS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <h3 className="mt-4 text-sm font-semibold text-mipo-ink">אחרי שההחלפה נוצלה</h3>
          <p className="mt-1 text-sm leading-6 text-mipo-muted">
            תצוגה בלבד. במסלול החינמי, אחרי יצירה אחת והחלפה אחת לאותה חיית מחמד, הכפתור כבוי. אין כאן ספירה אמיתית.
          </p>
          <button
            type="button"
            disabled
            className="mt-3 min-h-11 rounded-full border border-mipo-ink/10 px-4 text-sm font-semibold text-mipo-ink opacity-60"
          >
            החלפת הדמות
          </button>
          <p className="mt-2 text-sm leading-6 text-mipo-ink">ההחלפה כבר נוצלה לחיית המחמד הזו.</p>
          <p className="mt-2 text-sm leading-6 text-mipo-muted">
            במסלול בתשלום הכפתור נשאר פעיל. אם תקרת השימוש הנסתרת נתפסת, המשפט הוא: נסו שוב מחר.
          </p>
        </section>

        <section className="mt-8" aria-labelledby="today-heading">
          <h2 id="today-heading" className="text-sm font-semibold text-mipo-ink">מה שרואים היום בלי חבילת דמות</h2>
          <p className="mt-1 text-sm leading-6 text-mipo-muted">
            אותו עיגול ש־PetOrbit שם על תמונת הפרופיל: חיתוך עגול, ומעט נשימה ב־CSS. התמונה כאן היא ברירת המחדל של המאגר, לא צילום של חיית מחמד מסוימת.
          </p>
          <div className="mt-4 flex justify-center">
            <div className="relative h-[166px] w-[166px]" data-presence-visual="aurora" data-current-circle="photo">
              <PresenceAurora still={Boolean(reduced)} />
              <div
                className="relative z-[1] h-full w-full overflow-hidden rounded-full border-[5px] border-white bg-mipo-soft dark:border-mipo-surface"
                data-presence-idle={reduced ? "still" : "live"}
                data-presence-mood="neutral"
              >
                <img src={defaultPetAvatar} alt="" className="h-full w-full object-cover" />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10" aria-labelledby="proposal-heading">
          <h2 id="proposal-heading" className="text-sm font-semibold text-mipo-ink">תנועת מנוחה בקוד, עד שיהיה קובץ של החיה</h2>
          <p className="mt-1 text-sm leading-6 text-mipo-muted">
            {showScene
              ? "הכדורים בודקים נשימה, מצמוץ, זנב ומגע. זו לא הדמות הריאליסטית, ולא דגם משותף למין. הקישו על הדמות."
              : "WebGL לא זמין כאן, אז נשארת התמונה בעיגול — אותו גיבוי שנשאר כשהדגל כבוי או כשהיצירה נכשלת."}
          </p>
          <div className="mt-4 flex justify-center">
            {showScene ? (
              <button
                type="button"
                onClick={nudge}
                aria-label="הדמות במרכז — הקישו כדי שתגיב"
                className="relative h-[280px] w-[280px] rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mipo-violet"
                data-avatar-prototype="webgl"
                data-avatar-nudged={nudged ? "yes" : "no"}
              >
                <PresenceAurora still={Boolean(reduced)} isCharacter />
                <canvas ref={canvasRef} className="relative z-[1] h-full w-full" aria-hidden="true" />
              </button>
            ) : (
              <div
                className="relative h-[166px] w-[166px]"
                data-avatar-prototype="fallback"
                data-presence-visual="aurora"
              >
                <PresenceAurora still />
                <div className="relative z-[1] h-full w-full overflow-hidden rounded-full border-[5px] border-white bg-mipo-soft">
                  <img src={defaultPetAvatar} alt="תמונת גיבוי כשאין WebGL" className="h-full w-full object-cover" />
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2" role="group" aria-label="צורת גוף לבדיקת תנועה">
            {SPECIES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={species === item.id}
                onClick={() => setSpecies(item.id)}
                className={cn(
                  "min-h-11 rounded-full border border-mipo-ink/10 px-4 text-sm font-semibold text-mipo-ink",
                  species === item.id && "mipo-chip-selected",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2" role="group" aria-label="מצב רוח">
            {MOODS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={mood === item.id}
                onClick={() => setMood(item.id)}
                className={cn(
                  "min-h-11 rounded-full border border-mipo-ink/10 px-3 text-sm font-semibold text-mipo-ink",
                  mood === item.id && "mipo-chip-selected",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default PetAvatarPrototype;
