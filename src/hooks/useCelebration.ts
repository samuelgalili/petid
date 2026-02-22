/**
 * useCelebration - Hook for triggering celebratory animations
 * Uses canvas-confetti for dopamine-hit micro-interactions
 */
import confetti from 'canvas-confetti';

type CelebrationType = 'profileComplete' | 'photoUpload' | 'syncSuccess' | 'milestone';

const CELEBRATION_CONFIGS: Record<CelebrationType, confetti.Options> = {
  profileComplete: {
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6, x: 0.5 },
    colors: ['hsl(25, 95%, 53%)', 'hsl(350, 80%, 70%)', 'hsl(45, 93%, 58%)', 'hsl(var(--primary))'],
    ticks: 120,
    gravity: 1.2,
    scalar: 0.9,
    shapes: ['circle', 'square'],
  },
  photoUpload: {
    particleCount: 40,
    spread: 50,
    origin: { y: 0.4, x: 0.5 },
    colors: ['hsl(var(--primary))', 'hsl(142, 71%, 45%)', 'hsl(45, 93%, 58%)'],
    ticks: 80,
    gravity: 1.5,
    scalar: 0.7,
  },
  syncSuccess: {
    particleCount: 30,
    spread: 40,
    origin: { y: 0.5, x: 0.5 },
    colors: ['hsl(142, 71%, 45%)', 'hsl(160, 60%, 45%)'],
    ticks: 60,
    gravity: 1.8,
    scalar: 0.6,
  },
  milestone: {
    particleCount: 100,
    spread: 100,
    origin: { y: 0.5, x: 0.5 },
    colors: ['hsl(25, 95%, 53%)', 'hsl(350, 80%, 70%)', 'hsl(45, 93%, 58%)', 'hsl(142, 71%, 45%)'],
    ticks: 200,
    gravity: 0.8,
    scalar: 1.1,
  },
};

export const useCelebration = () => {
  const celebrate = (type: CelebrationType = 'profileComplete') => {
    const config = CELEBRATION_CONFIGS[type];
    
    // Fire confetti
    confetti(config);
    
    // For big celebrations, fire a second burst
    if (type === 'profileComplete' || type === 'milestone') {
      setTimeout(() => {
        confetti({
          ...config,
          particleCount: Math.floor(config.particleCount! * 0.5),
          origin: { y: 0.5, x: 0.3 },
        });
        confetti({
          ...config,
          particleCount: Math.floor(config.particleCount! * 0.5),
          origin: { y: 0.5, x: 0.7 },
        });
      }, 200);
    }
  };

  return { celebrate };
};