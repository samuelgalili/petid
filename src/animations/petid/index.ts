// Petid Animations - Commercial Brand
// Professional, subtle, clean animations

import { Variants } from 'framer-motion';

// Add to Cart Animation
export const addToCartAnimation: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.15, 0.95, 1.05, 1],
  },
  tap: {
    scale: 0.9,
  },
};

export const addToCartTransition = {
  duration: 0.4,
  ease: 'easeOut',
};

// Cart Item Fly Animation
export const cartItemFlyAnimation: Variants = {
  initial: {
    scale: 1,
    x: 0,
    y: 0,
    opacity: 1,
  },
  animate: {
    scale: 0.3,
    x: 100,
    y: -100,
    opacity: 0,
  },
};

export const cartItemFlyTransition = {
  duration: 0.6,
  ease: [0.4, 0, 0.2, 1],
};

// Bottom Sheet Entrance Animation
export const bottomSheetAnimation: Variants = {
  initial: {
    y: '100%',
    opacity: 0,
  },
  animate: {
    y: 0,
    opacity: 1,
  },
  exit: {
    y: '100%',
    opacity: 0,
  },
};

export const bottomSheetTransition = {
  type: 'spring',
  damping: 25,
  stiffness: 300,
};

// Rewards Collection Animation
export const rewardsCollectionAnimation: Variants = {
  initial: {
    scale: 1,
    boxShadow: '0 0 0 0 hsla(209, 79%, 52%, 0)',
  },
  animate: {
    scale: [1, 1.05, 1],
    boxShadow: [
      '0 0 0 0 hsla(209, 79%, 52%, 0)',
      '0 0 30px 10px hsla(209, 79%, 52%, 0.3)',
      '0 0 0 0 hsla(209, 79%, 52%, 0)',
    ],
  },
};

export const rewardsCollectionTransition = {
  duration: 0.8,
  ease: 'easeOut',
};

// Points Particle Animation
export const pointsParticleAnimation: Variants = {
  initial: {
    scale: 0,
    y: 0,
    opacity: 1,
  },
  animate: {
    scale: [0, 1, 0.5],
    y: -50,
    opacity: [1, 1, 0],
  },
};

export const pointsParticleTransition = {
  duration: 1,
  ease: 'easeOut',
};

// CTA Button Pulse Animation (Petid Only)
export const ctaPulseAnimation: Variants = {
  initial: {
    boxShadow: '0 0 0 0 hsla(209, 79%, 52%, 0.4)',
  },
  animate: {
    boxShadow: [
      '0 0 0 0 hsla(209, 79%, 52%, 0.4)',
      '0 0 0 8px hsla(209, 79%, 52%, 0)',
    ],
  },
};

export const ctaPulseTransition = {
  duration: 1.5,
  repeat: Infinity,
  ease: 'easeOut',
};

// Product Card Hover Animation
export const productCardAnimation: Variants = {
  initial: {
    y: 0,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
  },
  hover: {
    y: -4,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
  },
};

export const productCardTransition = {
  duration: 0.2,
  ease: 'easeOut',
};

// Wallet Card Glow Animation
export const walletGlowAnimation: Variants = {
  initial: {
    boxShadow: '0 4px 12px hsla(209, 79%, 52%, 0.1)',
  },
  animate: {
    boxShadow: [
      '0 4px 12px hsla(209, 79%, 52%, 0.1)',
      '0 4px 24px hsla(209, 79%, 52%, 0.2)',
      '0 4px 12px hsla(209, 79%, 52%, 0.1)',
    ],
  },
};

export const walletGlowTransition = {
  duration: 2,
  repeat: Infinity,
  ease: 'easeInOut',
};

// Price Change Animation
export const priceChangeAnimation: Variants = {
  initial: { scale: 1, color: 'inherit' },
  animate: {
    scale: [1, 1.2, 1],
    color: ['inherit', 'hsl(153, 52%, 46%)', 'inherit'],
  },
};

export const priceChangeTransition = {
  duration: 0.4,
  ease: 'easeOut',
};

// Page Transition Animation
export const pageTransitionAnimation: Variants = {
  initial: {
    opacity: 0,
    x: 20,
  },
  animate: {
    opacity: 1,
    x: 0,
  },
  exit: {
    opacity: 0,
    x: -20,
  },
};

export const pageTransitionTransition = {
  duration: 0.25,
  ease: 'easeInOut',
};

// List Item Stagger Animation
export const listStaggerAnimation: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
};

export const listStaggerTransition = (index: number) => ({
  duration: 0.3,
  delay: index * 0.05,
  ease: 'easeOut',
});

// Skeleton Loading Animation
export const skeletonAnimation: Variants = {
  initial: {
    backgroundPosition: '-200% 0',
  },
  animate: {
    backgroundPosition: '200% 0',
  },
};

export const skeletonTransition = {
  duration: 1.5,
  repeat: Infinity,
  ease: 'linear',
};

// Badge Pop Animation
export const badgePopAnimation: Variants = {
  initial: {
    scale: 0,
  },
  animate: {
    scale: [0, 1.2, 1],
  },
};

export const badgePopTransition = {
  duration: 0.3,
  ease: 'easeOut',
};

// Success Checkmark Animation
export const checkmarkAnimation: Variants = {
  initial: {
    pathLength: 0,
    opacity: 0,
  },
  animate: {
    pathLength: 1,
    opacity: 1,
  },
};

export const checkmarkTransition = {
  duration: 0.4,
  ease: 'easeOut',
};

// Confetti Trigger Function (Petid style - more subtle)
export const triggerPetidConfetti = async () => {
  const confetti = (await import('canvas-confetti')).default;
  
  // Petid brand colors - more professional
  const petidColors = ['#2688E6', '#37B679', '#FFD748', '#F7F8FA'];
  
  confetti({
    particleCount: 60,
    spread: 50,
    origin: { y: 0.7 },
    colors: petidColors,
    shapes: ['circle'],
    scalar: 1,
    gravity: 1.2,
  });
};

// Export all animations
export const PetidAnimations = {
  addToCart: { variants: addToCartAnimation, transition: addToCartTransition },
  cartItemFly: { variants: cartItemFlyAnimation, transition: cartItemFlyTransition },
  bottomSheet: { variants: bottomSheetAnimation, transition: bottomSheetTransition },
  rewardsCollection: { variants: rewardsCollectionAnimation, transition: rewardsCollectionTransition },
  pointsParticle: { variants: pointsParticleAnimation, transition: pointsParticleTransition },
  ctaPulse: { variants: ctaPulseAnimation, transition: ctaPulseTransition },
  productCard: { variants: productCardAnimation, transition: productCardTransition },
  walletGlow: { variants: walletGlowAnimation, transition: walletGlowTransition },
  priceChange: { variants: priceChangeAnimation, transition: priceChangeTransition },
  pageTransition: { variants: pageTransitionAnimation, transition: pageTransitionTransition },
  listStagger: { variants: listStaggerAnimation, getTransition: listStaggerTransition },
  skeleton: { variants: skeletonAnimation, transition: skeletonTransition },
  badgePop: { variants: badgePopAnimation, transition: badgePopTransition },
  checkmark: { variants: checkmarkAnimation, transition: checkmarkTransition },
  triggerConfetti: triggerPetidConfetti,
};

export default PetidAnimations;
