// Petish Icons - Social Network Brand
// Gradient-based, rounded, young aesthetic

import React from 'react';
import { motion } from 'framer-motion';

interface IconProps {
  size?: number;
  className?: string;
  filled?: boolean;
  animate?: boolean;
}

// Petish Gradient Definition for SVG
export const PetishGradientDef = () => (
  <defs>
    <linearGradient id="petish-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="hsl(342, 100%, 69%)" />
      <stop offset="100%" stopColor="hsl(263, 100%, 71%)" />
    </linearGradient>
    <linearGradient id="petish-gradient-vertical" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="hsl(342, 100%, 69%)" />
      <stop offset="100%" stopColor="hsl(263, 100%, 71%)" />
    </linearGradient>
  </defs>
);

// Like Icon - Dog tongue/heart hybrid
export const PetishLikeIcon = ({ size = 24, className = '', filled = false, animate = false }: IconProps) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    whileHover={animate ? { scale: 1.1 } : undefined}
    whileTap={animate ? { scale: 0.9 } : undefined}
  >
    <PetishGradientDef />
    <motion.path
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      fill={filled ? "url(#petish-gradient)" : "none"}
      stroke={filled ? "none" : "url(#petish-gradient)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={false}
      animate={animate && filled ? { scale: [1, 1.2, 1] } : undefined}
      transition={{ duration: 0.3 }}
    />
  </motion.svg>
);

// Comment Icon - Rounded speech bubble
export const PetishCommentIcon = ({ size = 24, className = '', filled = false, animate = false }: IconProps) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    whileHover={animate ? { scale: 1.05, rotate: -5 } : undefined}
    whileTap={animate ? { scale: 0.95 } : undefined}
  >
    <PetishGradientDef />
    <path
      d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
      fill={filled ? "url(#petish-gradient)" : "none"}
      stroke={filled ? "none" : "url(#petish-gradient)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </motion.svg>
);

// Share Icon - Curved arrow
export const PetishShareIcon = ({ size = 24, className = '', filled = false, animate = false }: IconProps) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    whileHover={animate ? { scale: 1.05, x: 2 } : undefined}
    whileTap={animate ? { scale: 0.95 } : undefined}
  >
    <PetishGradientDef />
    <path
      d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"
      stroke="url(#petish-gradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="16 6 12 2 8 6"
      stroke="url(#petish-gradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="12" y1="2" x2="12" y2="15"
      stroke="url(#petish-gradient)"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </motion.svg>
);

// Messages Icon - Envelope overlay
export const PetishMessagesIcon = ({ size = 24, className = '', filled = false, animate = false }: IconProps) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    whileHover={animate ? { scale: 1.05 } : undefined}
    whileTap={animate ? { scale: 0.95 } : undefined}
  >
    <PetishGradientDef />
    <path
      d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6z"
      fill={filled ? "url(#petish-gradient)" : "none"}
      stroke={filled ? "none" : "url(#petish-gradient)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="22,6 12,13 2,6"
      stroke={filled ? "white" : "url(#petish-gradient)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </motion.svg>
);

// Story Camera Icon - Instagram style with gradient
export const PetishStoryCameraIcon = ({ size = 24, className = '', filled = false, animate = false }: IconProps) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    whileHover={animate ? { scale: 1.05 } : undefined}
    whileTap={animate ? { scale: 0.95 } : undefined}
  >
    <PetishGradientDef />
    <rect
      x="2" y="4" width="20" height="16" rx="3"
      fill={filled ? "url(#petish-gradient)" : "none"}
      stroke={filled ? "none" : "url(#petish-gradient)"}
      strokeWidth="2"
    />
    <circle
      cx="12" cy="12" r="4"
      fill={filled ? "white" : "none"}
      stroke={filled ? "white" : "url(#petish-gradient)"}
      strokeWidth="2"
    />
    <circle
      cx="18" cy="7" r="1.5"
      fill={filled ? "white" : "url(#petish-gradient)"}
    />
  </motion.svg>
);

// Story Ring Icon - Circular frame with signature gradient
export const PetishStoryRingIcon = ({ size = 24, className = '', filled = false, animate = false }: IconProps) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    animate={animate ? { 
      rotate: [0, 360],
    } : undefined}
    transition={animate ? { 
      duration: 8,
      repeat: Infinity,
      ease: "linear"
    } : undefined}
  >
    <PetishGradientDef />
    <circle
      cx="12" cy="12" r="10"
      fill="none"
      stroke="url(#petish-gradient)"
      strokeWidth="2.5"
      strokeDasharray={filled ? "0" : "4 2"}
    />
    <circle
      cx="12" cy="12" r="6"
      fill={filled ? "url(#petish-gradient)" : "none"}
      stroke={filled ? "none" : "url(#petish-gradient)"}
      strokeWidth="1.5"
    />
  </motion.svg>
);

// Profile Icon - Pet head silhouette
export const PetishProfileIcon = ({ size = 24, className = '', filled = false, animate = false }: IconProps) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    whileHover={animate ? { scale: 1.05 } : undefined}
    whileTap={animate ? { scale: 0.95 } : undefined}
  >
    <PetishGradientDef />
    {/* Dog head silhouette */}
    <path
      d="M12 2C8.5 2 5.5 4.5 5.5 8c0 1.5.5 3 1.5 4-1.5 1-2.5 2.5-2.5 4.5 0 3 2.5 5.5 7.5 5.5s7.5-2.5 7.5-5.5c0-2-1-3.5-2.5-4.5 1-1 1.5-2.5 1.5-4 0-3.5-3-6-6.5-6z"
      fill={filled ? "url(#petish-gradient)" : "none"}
      stroke={filled ? "none" : "url(#petish-gradient)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Ears */}
    <path
      d="M6 6c-1-2-2-3-3-2.5s0 3 1 4.5"
      stroke={filled ? "white" : "url(#petish-gradient)"}
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M18 6c1-2 2-3 3-2.5s0 3-1 4.5"
      stroke={filled ? "white" : "url(#petish-gradient)"}
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
  </motion.svg>
);

// Highlight Star Icon
export const PetishHighlightStarIcon = ({ size = 24, className = '', filled = false, animate = false }: IconProps) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    whileHover={animate ? { scale: 1.1, rotate: 15 } : undefined}
    whileTap={animate ? { scale: 0.9 } : undefined}
    animate={animate && filled ? {
      scale: [1, 1.1, 1],
    } : undefined}
    transition={{ duration: 0.5, repeat: animate && filled ? Infinity : 0 }}
  >
    <PetishGradientDef />
    <path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      fill={filled ? "url(#petish-gradient)" : "none"}
      stroke={filled ? "none" : "url(#petish-gradient)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </motion.svg>
);

// Paw Icon
export const PetishPawIcon = ({ size = 24, className = '', filled = false, animate = false }: IconProps) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    whileHover={animate ? { scale: 1.1, rotate: -10 } : undefined}
    whileTap={animate ? { scale: 0.9 } : undefined}
  >
    <PetishGradientDef />
    {/* Main pad */}
    <ellipse
      cx="12" cy="15" rx="5" ry="4"
      fill={filled ? "url(#petish-gradient)" : "none"}
      stroke={filled ? "none" : "url(#petish-gradient)"}
      strokeWidth="2"
    />
    {/* Toe pads */}
    <circle cx="7" cy="9" r="2.5" fill={filled ? "url(#petish-gradient)" : "none"} stroke={filled ? "none" : "url(#petish-gradient)"} strokeWidth="2" />
    <circle cx="12" cy="6" r="2.5" fill={filled ? "url(#petish-gradient)" : "none"} stroke={filled ? "none" : "url(#petish-gradient)"} strokeWidth="2" />
    <circle cx="17" cy="9" r="2.5" fill={filled ? "url(#petish-gradient)" : "none"} stroke={filled ? "none" : "url(#petish-gradient)"} strokeWidth="2" />
  </motion.svg>
);

// Notification Bell Icon with Badge
export const PetishNotificationBellIcon = ({ size = 24, className = '', filled = false, animate = false, badgeCount = 0 }: IconProps & { badgeCount?: number }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    whileHover={animate ? { scale: 1.05 } : undefined}
    whileTap={animate ? { scale: 0.95 } : undefined}
    animate={animate && badgeCount > 0 ? {
      rotate: [0, -10, 10, -10, 10, 0],
    } : undefined}
    transition={{ duration: 0.5 }}
  >
    <PetishGradientDef />
    <path
      d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"
      fill={filled ? "url(#petish-gradient)" : "none"}
      stroke={filled ? "none" : "url(#petish-gradient)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.73 21a2 2 0 01-3.46 0"
      stroke={filled ? "white" : "url(#petish-gradient)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {badgeCount > 0 && (
      <>
        <circle cx="18" cy="6" r="5" fill="hsl(342, 100%, 69%)" />
        <text x="18" y="8" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold">
          {badgeCount > 9 ? '9+' : badgeCount}
        </text>
      </>
    )}
  </motion.svg>
);

// Bookmark / Save Icon
export const PetishBookmarkIcon = ({ size = 24, className = '', filled = false, animate = false }: IconProps) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    whileHover={animate ? { scale: 1.05, y: -2 } : undefined}
    whileTap={animate ? { scale: 0.95 } : undefined}
  >
    <PetishGradientDef />
    <path
      d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"
      fill={filled ? "url(#petish-gradient)" : "none"}
      stroke={filled ? "none" : "url(#petish-gradient)"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </motion.svg>
);

// Export all icons
export const PetishIcons = {
  Like: PetishLikeIcon,
  Comment: PetishCommentIcon,
  Share: PetishShareIcon,
  Messages: PetishMessagesIcon,
  StoryCamera: PetishStoryCameraIcon,
  StoryRing: PetishStoryRingIcon,
  Profile: PetishProfileIcon,
  HighlightStar: PetishHighlightStarIcon,
  Paw: PetishPawIcon,
  NotificationBell: PetishNotificationBellIcon,
  Bookmark: PetishBookmarkIcon,
};

export default PetishIcons;
