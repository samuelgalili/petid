import { useEffect, useRef, useCallback } from "react";

const SCROLL_KEY_PREFIX = "feed_scroll_";

export const useScrollPosition = (key: string) => {
  const isRestoring = useRef(false);

  // Save scroll position
  const savePosition = useCallback(() => {
    if (!isRestoring.current) {
      sessionStorage.setItem(SCROLL_KEY_PREFIX + key, String(window.scrollY));
    }
  }, [key]);

  // Restore scroll position
  const restorePosition = useCallback(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY_PREFIX + key);
    if (saved) {
      isRestoring.current = true;
      requestAnimationFrame(() => {
        window.scrollTo(0, parseInt(saved, 10));
        setTimeout(() => { isRestoring.current = false; }, 100);
      });
    }
  }, [key]);

  useEffect(() => {
    restorePosition();

    const handleScroll = () => savePosition();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [savePosition, restorePosition]);

  return { savePosition, restorePosition };
};
