import { motion } from "framer-motion";
import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

interface PageTransitionProps {
  children: ReactNode;
  variant?: "default" | "fade" | "slide" | "scale" | "slideUp" | "blur";
}

const variants = {
  default: {
    initial: { opacity: 0, y: 20, filter: "blur(4px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: { opacity: 0, y: -10, filter: "blur(4px)" },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slide: {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  },
  slideUp: {
    initial: { opacity: 0, y: 40, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.98 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.92 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 },
  },
  blur: {
    initial: { opacity: 0, filter: "blur(10px)", scale: 0.95 },
    animate: { opacity: 1, filter: "blur(0px)", scale: 1 },
    exit: { opacity: 0, filter: "blur(10px)", scale: 1.02 },
  },
};

// Map routes to specific transition styles
const routeVariantMap: Record<string, keyof typeof variants> = {
  "/shop": "slideUp",
  "/cart": "slide",
  "/checkout": "slide",
  "/": "scale",
  "/settings": "scale",
  "/feed": "fade",
  "/adoption": "slideUp",
  "/explore": "blur",
  "/reels": "scale",
};

export const PageTransition = ({ children, variant }: PageTransitionProps) => {
  const location = useLocation();
  
  // Use route-specific variant, prop variant, or default
  const selectedVariantKey = variant || routeVariantMap[location.pathname] || "default";
  const selectedVariant = variants[selectedVariantKey];
  // The enter animation is allowed to use a filter and a transform. The
  // resting frame is not: either one keeps position:fixed pinned to this
  // wrapper, which is why the product bar sat at the end of the page.
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    setSettled(false);
    const timer = window.setTimeout(() => setSettled(true), 450);
    return () => window.clearTimeout(timer);
  }, [location.pathname, selectedVariantKey]);

  return (
    <motion.div
      initial={selectedVariant.initial}
      animate={selectedVariant.animate}
      exit={selectedVariant.exit}
      onAnimationComplete={(definition) => {
        if (definition === selectedVariant.animate) setSettled(true);
      }}
      onAnimationStart={(definition) => {
        if (definition === selectedVariant.exit) setSettled(false);
      }}
      transition={{
        duration: 0.35,
        ease: [0.25, 0.46, 0.45, 0.94], // Custom smooth easing
        filter: { duration: 0.3 },
        scale: { type: "spring", stiffness: 300, damping: 30 },
      }}
      className={`h-full w-full${settled ? " page-transition-settled" : ""}`}
    >
      {children}
    </motion.div>
  );
};
