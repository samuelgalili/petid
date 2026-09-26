import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

import defaultPetAvatar from "@/assets/default-pet-avatar.png";
import PresenceAurora from "@/components/home/PresenceAurora";
import { cn } from "@/lib/utils";
import {
  PetAvatarScene,
  type PrototypeMood,
  type PrototypeSpecies,
} from "@/pages/dev/petAvatarScene";

const MOODS: { id: PrototypeMood; label: string }[] = [
  { id: "neutral", label: "רגוע" },
  { id: "happy", label: "שמח" },
  { id: "excited", label: "נרגש" },
  { id: "curious", label: "סקרן" },
  { id: "concerned", label: "מודאג" },
];

const SPECIES: { id: PrototypeSpecies; label: string }[] = [
  { id: "cat", label: "חתול" },
  { id: "dog", label: "כלב" },
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
          אב טיפוס לבדיקת נפח, נשימה, מצמוץ, זנב ומגע. זו לא הדמות של חיית מחמד אמיתית, והמסך הזה לא נכלל בבנייה לייצור.
        </p>

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
          <h2 id="proposal-heading" className="text-sm font-semibold text-mipo-ink">הצעה: נפח שמגיב</h2>
          <p className="mt-1 text-sm leading-6 text-mipo-muted">
            {showScene
              ? "WebGL מקומי, בלי ספרייה ובלי קובץ מודל. הקישו על הדמות."
              : "WebGL לא זמין כאן, אז נשארת התמונה בעיגול — אותו גיבוי שההצעה שומרת למשתמשים."}
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

          <div className="mt-6 flex justify-center gap-2" role="group" aria-label="מין הדמות">
            {SPECIES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={species === item.id}
                onClick={() => setSpecies(item.id)}
                className={cn(
                  "min-h-11 rounded-full border border-mipo-ink/10 px-4 text-sm font-semibold",
                  species === item.id ? "bg-mipo-ink text-white" : "text-mipo-ink",
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
                  "min-h-11 rounded-full border border-mipo-ink/10 px-3 text-sm font-semibold",
                  mood === item.id ? "bg-mipo-ink text-white" : "text-mipo-ink",
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
