// Petish Animations - Social Network Brand
// Young, vibrant, Instagram-style animations

import { Variants } from 'framer-motion';

// Story Ring Pulse Animation
export const storyPulseAnimation: Variants = {
  initial: {
    boxShadow: '0 0 0 0 hsla(342, 100%, 69%, 0.4)',
  },
  animate: {
    boxShadow: [
      '0 0 0 0 hsla(342, 100%, 69%, 0.4)',
      '0 0 0 8px hsla(342, 100%, 69%, 0)',
      '0 0 0 0 hsla(342, 100%, 69%, 0)',
    ],
  },
};

export const storyPulseTransition = {
  duration: 1.6,
  repeat: Infinity,
  ease: 'easeInOut',
};

// Like Pop Animation
export const likePopAnimation: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.3, 0.9, 1.1, 1],
  },
  tap: {
    scale: 0.85,
  },
};

export const likePopTransition = {
  duration: 0.4,
  ease: 'easeOut',
};

// Like Shake Animation
export const likeShakeAnimation: Variants = {
  initial: { rotate: 0 },
  animate: {
    rotate: [0, -15, 15, -10, 10, -5, 5, 0],
  },
};

export const likeShakeTransition = {
  duration: 0.5,
  ease: 'easeInOut',
};

// Gradient Swipe Animation (for CSS)
export const gradientSwipeKeyframes = `
  @keyframes petish-gradient-swipe {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }
`;

export const gradientSwipeStyle = {
  backgroundSize: '200% 200%',
  animation: 'petish-gradient-swipe 3s ease infinite',
};

// Notification Badge Pulse
export const notificationPulseAnimation: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.15, 1],
  },
};

export const notificationPulseTransition = {
  duration: 2,
  repeat: Infinity,
  ease: 'easeInOut',
};

// Page Fade In Animation
export const pageFadeInAnimation: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -10,
  },
};

export const pageFadeInTransition = {
  duration: 0.3,
  ease: 'easeOut',
};

// Feed Item Stagger Animation
export const feedStaggerAnimation: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
};

export const feedStaggerTransition = (index: number) => ({
  duration: 0.4,
  delay: index * 0.1,
  ease: 'easeOut',
});

// Story View Transition
export const storyViewAnimation: Variants = {
  initial: {
    opacity: 0,
    scale: 1.1,
  },
  animate: {
    opacity: 1,
    scale: 1,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
  },
};

export const storyViewTransition = {
  duration: 0.25,
  ease: 'easeOut',
};

// Follow Button Animation
export const followButtonAnimation: Variants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.05,
  },
  tap: {
    scale: 0.95,
  },
  following: {
    backgroundColor: 'transparent',
    borderColor: 'hsl(var(--petish-primary))',
    color: 'hsl(var(--petish-primary))',
  },
  notFollowing: {
    backgroundColor: 'hsl(var(--petish-primary))',
    color: 'white',
  },
};

// Avatar Ring Glow Animation
export const avatarRingGlowAnimation: Variants = {
  initial: {
    boxShadow: '0 0 0 0 hsla(342, 100%, 69%, 0)',
  },
  animate: {
    boxShadow: '0 0 20px 4px hsla(342, 100%, 69%, 0.3)',
  },
};

// Highlight Badge Pop Animation
export const highlightBadgeAnimation: Variants = {
  initial: {
    scale: 0,
    opacity: 0,
  },
  animate: {
    scale: 1,
    opacity: 1,
  },
  hover: {
    scale: 1.1,
    y: -2,
  },
};

// Message Send Animation
export const messageSendAnimation: Variants = {
  initial: {
    opacity: 0,
    x: 50,
    scale: 0.8,
  },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
  },
};

export const messageSendTransition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1],
};

// Double Tap Heart Animation
export const doubleTapHeartAnimation: Variants = {
  initial: {
    scale: 0,
    opacity: 0,
  },
  animate: {
    scale: [0, 1.4, 1],
    opacity: [0, 1, 0],
  },
};

export const doubleTapHeartTransition = {
  duration: 0.8,
  ease: 'easeOut',
};

// Confetti Trigger Function
export const triggerPetishConfetti = async () => {
  const confetti = (await import('canvas-confetti')).default;
  
  // Petish brand colors
  const petishColors = ['#FF5F8F', '#A06CFF', '#FFD748', '#4ED2C7'];
  
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: petishColors,
    shapes: ['circle', 'square'],
    scalar: 1.2,
  });
};

// Export all animations
export const PetishAnimations = {
  storyPulse: { variants: storyPulseAnimation, transition: storyPulseTransition },
  likePop: { variants: likePopAnimation, transition: likePopTransition },
  likeShake: { variants: likeShakeAnimation, transition: likeShakeTransition },
  notificationPulse: { variants: notificationPulseAnimation, transition: notificationPulseTransition },
  pageFadeIn: { variants: pageFadeInAnimation, transition: pageFadeInTransition },
  feedStagger: { variants: feedStaggerAnimation, getTransition: feedStaggerTransition },
  storyView: { variants: storyViewAnimation, transition: storyViewTransition },
  followButton: { variants: followButtonAnimation },
  avatarRingGlow: { variants: avatarRingGlowAnimation },
  highlightBadge: { variants: highlightBadgeAnimation },
  messageSend: { variants: messageSendAnimation, transition: messageSendTransition },
  doubleTapHeart: { variants: doubleTapHeartAnimation, transition: doubleTapHeartTransition },
  triggerConfetti: triggerPetishConfetti,
};

export default PetishAnimations;
