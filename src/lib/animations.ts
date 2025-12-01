/**
 * Animation utilities for emotional micro-interactions
 * Based on Material Design Motion & Apple HIG principles
 */

import { Variants } from "framer-motion";

// Duration constants (in seconds) - based on UX research for optimal perception
export const ANIMATION_DURATION = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  slower: 0.7,
} as const;

// Easing curves - natural, organic motion
export const EASING = {
  // Entrance animations
  easeOut: [0.0, 0.0, 0.2, 1],
  // Exit animations  
  easeIn: [0.4, 0.0, 1, 1],
  // Movement within screen
  easeInOut: [0.4, 0.0, 0.2, 1],
  // Playful bounce for success states
  bounce: [0.68, -0.55, 0.265, 1.55],
} as const;

// Scale values for interactive elements
export const SCALE = {
  tap: 0.95,
  hover: 1.02,
  active: 1.05,
  success: 1.1,
} as const;

// Pre-built animation variants for common patterns

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: ANIMATION_DURATION.normal, ease: EASING.easeOut }
  }
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: ANIMATION_DURATION.normal, ease: EASING.easeOut }
  }
};

export const slideDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: ANIMATION_DURATION.normal, ease: EASING.easeOut }
  }
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: ANIMATION_DURATION.normal, ease: EASING.easeOut }
  }
};

export const successPulse: Variants = {
  initial: { scale: 1 },
  animate: { 
    scale: [1, 1.1, 1],
    transition: { 
      duration: ANIMATION_DURATION.slow,
      ease: EASING.bounce,
      times: [0, 0.5, 1]
    }
  }
};

export const shimmer: Variants = {
  initial: { backgroundPosition: "-200% 0" },
  animate: { 
    backgroundPosition: "200% 0",
    transition: {
      duration: 2,
      ease: "linear",
      repeat: Infinity
    }
  }
};

// Stagger children animations for lists
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05
    }
  }
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: ANIMATION_DURATION.fast, ease: EASING.easeOut }
  }
};

// Button interactions
export const buttonTap = {
  scale: SCALE.tap,
  transition: { duration: ANIMATION_DURATION.instant }
};

export const buttonHover = {
  scale: SCALE.hover,
  transition: { duration: ANIMATION_DURATION.fast }
};

// Card interactions
export const cardHover = {
  y: -4,
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
  transition: { duration: ANIMATION_DURATION.fast, ease: EASING.easeOut }
};

// Pet-themed playful animations
export const wiggle: Variants = {
  initial: { rotate: 0 },
  animate: {
    rotate: [-2, 2, -2, 2, 0],
    transition: {
      duration: 0.5,
      ease: EASING.easeInOut
    }
  }
};

export const pawPrint: Variants = {
  initial: { scale: 0, rotate: -20 },
  animate: {
    scale: [0, 1.2, 1],
    rotate: [-20, 10, 0],
    transition: {
      duration: ANIMATION_DURATION.slow,
      ease: EASING.bounce
    }
  }
};

// Success celebration animation
export const celebrate: Variants = {
  initial: { scale: 1, rotate: 0 },
  animate: {
    scale: [1, 1.15, 0.95, 1.05, 1],
    rotate: [0, -5, 5, -3, 0],
    transition: {
      duration: 0.6,
      ease: EASING.bounce
    }
  }
};

// Notification badge pulse
export const badgePulse: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.2, 1],
    transition: {
      duration: 1.5,
      ease: EASING.easeInOut,
      repeat: Infinity,
      repeatDelay: 2
    }
  }
};

// Loading skeleton shimmer
export const skeletonShimmer = {
  backgroundImage: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
  backgroundSize: "200% 100%",
  animation: "shimmer 2s infinite"
};
