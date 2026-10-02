import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

import { PetAvatarPhoto } from "@/components/pet/PetAvatarPhoto";
import { PetAvatarScene } from "@/components/pet/petAvatarScene";
import { appearanceFromPet } from "@/lib/petAvatarAppearance";

type PetAvatarProps = {
  name: string;
  photoSrc: string;
  species?: string | null;
  breed?: string | null;
  color?: string | null;
  onActivate?: () => void;
};

type Phase = "booting" | "scene" | "photo";

/**
 * Living stand-in for one pet. The chunk that imports this file is loaded
 * only after the dashboard has painted, and only on a device that can run it.
 */
const PetAvatar = ({ name, photoSrc, species, breed, color, onActivate }: PetAvatarProps) => {
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<PetAvatarScene | null>(null);
  const [phase, setPhase] = useState<Phase>("booting");
  const look = useMemo(
    () => appearanceFromPet({ type: species, breed, color, name }),
    [species, breed, color, name],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let scene = PetAvatarScene.mount(canvas);
    if (!scene) {
      setPhase("photo");
      return;
    }
    sceneRef.current = scene;
    let announced = false;
    const fail = () => {
      scene?.destroy();
      scene = null;
      sceneRef.current = null;
      setPhase("photo");
    };
    scene.setErrorHandler(fail);
    scene.setFrameListener(() => {
      if (announced) return;
      announced = true;
      setPhase("scene");
    });
    scene.setPaused(true);
    scene.setLook(look);
    scene.setReducedMotion(Boolean(reduced));

    let onScreen = false;
    const syncPause = () => {
      if (!scene) return;
      const hidden = document.visibilityState === "hidden";
      scene.setPaused(hidden || !onScreen);
    };
    const observer = new IntersectionObserver((entries) => {
      onScreen = entries.some((entry) => entry.isIntersecting);
      syncPause();
    }, { threshold: 0.05 });
    observer.observe(canvas);
    document.addEventListener("visibilitychange", syncPause);

    const onLost = () => fail();
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncPause);
      canvas.removeEventListener("webglcontextlost", onLost);
      scene?.destroy();
      scene = null;
      sceneRef.current = null;
    };
    // Look and reduced-motion updates go through the effect below so a change
    // does not rebuild the GL context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.setLook(look);
    scene.setReducedMotion(Boolean(reduced));
  }, [look, reduced]);

  const activate = () => {
    sceneRef.current?.nudge();
    onActivate?.();
  };

  if (phase === "photo") {
    return <PetAvatarPhoto name={name} src={photoSrc} onActivate={onActivate} />;
  }

  const ready = phase === "scene";

  return (
    <div className="relative h-[240px] w-[240px]">
      {!ready && (
        <div className="absolute inset-0">
          <PetAvatarPhoto name={name} src={photoSrc} onActivate={onActivate} />
        </div>
      )}
      <button
        type="button"
        onClick={activate}
        aria-label={ready ? `הדמות של ${name}` : undefined}
        aria-hidden={ready ? undefined : true}
        tabIndex={ready ? 0 : -1}
        data-pet-avatar="scene"
        data-pet-avatar-painted={ready ? "yes" : "no"}
        data-pet-avatar-motion={reduced ? "still" : "live"}
        className={
          ready
            ? "relative z-[1] h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mipo-violet"
            : "pointer-events-none absolute inset-0 z-[1] opacity-0"
        }
      >
        {ready && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-[22px] rounded-full bg-[radial-gradient(circle,rgba(255,196,120,0.42),transparent_68%)]"
          />
        )}
        <canvas ref={canvasRef} className="relative z-[1] h-full w-full" aria-hidden="true" />
      </button>
    </div>
  );
};

export default PetAvatar;
