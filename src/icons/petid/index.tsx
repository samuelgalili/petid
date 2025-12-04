// Petid Icons - Commercial Brand
// Clean, professional, minimal aesthetic
// Single color: var(--petid-primary) or #1C1C1E

import React from 'react';
import { motion } from 'framer-motion';

interface IconProps {
  size?: number;
  className?: string;
  filled?: boolean;
  animate?: boolean;
}

// Wallet Icon
export const PetidWalletIcon = ({ size = 24, className = '', filled = false, animate = false }: IconProps) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`text-petid-primary ${className}`}
    whileHover={animate ? { scale: 1.03 } : undefined}
    whileTap={animate ? { scale: 0.97 } : undefined}
  >
    <rect
      x="2" y="5" width="20" height="14" rx="2"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M16 12h4v4h-4a2 2 0 010-4z"
      fill={filled ? "white" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <circle cx="17" cy="14" r="1" fill={filled ? "currentColor" : "white"} />
    <path d="M6 5V3a1 1 0 011-1h10a1 1 0 011 1v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </motion.svg>
);

// Shop Bag Icon
export const PetidShopBagIcon = ({ size = 24, className = '', filled = false, animate = false }: IconProps) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`text-petid-primary ${className}`}
    whileHover={animate ? { scale: 1.03 } : undefined}
    whileTap={animate ? { scale: 0.97 } : undefined}
  >
    <path
      d="M6 6h12l1.5 14H4.5L6 6z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 6V4a3 3 0 016 0v2"
      stroke={filled ? "white" : "currentColor"}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </motion.svg>
);

// Rewards / Gift Icon
export const PetidRewardsIcon = ({ size = 24, className = '', filled = false, animate = false }: IconProps) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`text-petid-primary ${className}`}
    whileHover={animate ? { scale: 1.03 } : undefined}
    whileTap={animate ? { scale: 0.97 } : undefined}
  >
    <rect
      x="3" y="8" width="18" height="13" rx="2"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M12 8V21M3 12h18"
      stroke={filled ? "white" : "currentColor"}
      strokeWidth="1.5"
    />
    <path
      d="M7.5 8c1.5 0 3-1 4.5-4 1.5 3 3 4 4.5 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
  </motion.svg>
);

// Loyalty Badge Icon
export const PetidLoyaltyBadgeIcon = ({ size = 24, className = '', filled = false, animate = false }: IconProps) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`text-petid-primary ${className}`}
    whileHover={animate ? { scale: 1.03 } : undefined}
    whileTap={animate ? { scale: 0.97 } : undefined}
  >
    <path
      d="M12 2l2.4 4.8 5.3.8-3.85 3.75.9 5.3L12 14.25l-4.75 2.4.9-5.3L4.3 7.6l5.3-.8L12 2z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 18l-2 4h12l-2-4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </motion.svg>
);

// Info Icon
export const PetidInfoIcon = ({ size = 24, className = '', filled = false, animate = false }: IconProps) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`text-petid-primary ${className}`}
    whileHover={animate ? { scale: 1.03 } : undefined}
    whileTap={animate ? { scale: 0.97 } : undefined}
  >
    <circle
      cx="12" cy="12" r="10"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <line
      x1="12" y1="16" x2="12" y2="12"
      stroke={filled ? "white" : "currentColor"}
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle
      cx="12" cy="8" r="0.5"
      fill={filled ? "white" : "currentColor"}
      stroke={filled ? "white" : "currentColor"}
    />
  </motion.svg>
);

// Cart Icon
export const PetidCartIcon = ({ size = 24, className = '', filled = false, animate = false, itemCount = 0 }: IconProps & { itemCount?: number }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`text-petid-primary ${className}`}
    whileHover={animate ? { scale: 1.03 } : undefined}
    whileTap={animate ? { scale: 0.97 } : undefined}
  >
    <path
      d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="9" cy="21" r="1.5" fill="currentColor" />
    <circle cx="20" cy="21" r="1.5" fill="currentColor" />
    {itemCount > 0 && (
      <>
        <circle cx="18" cy="4" r="4" fill="hsl(209, 79%, 52%)" />
        <text x="18" y="6" textAnchor="middle" fill="white" fontSize="6" fontWeight="bold">
          {itemCount > 9 ? '9+' : itemCount}
        </text>
      </>
    )}
  </motion.svg>
);

// Truck / Delivery Icon
export const PetidTruckIcon = ({ size = 24, className = '', filled = false, animate = false }: IconProps) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`text-petid-primary ${className}`}
    whileHover={animate ? { scale: 1.03, x: 2 } : undefined}
    whileTap={animate ? { scale: 0.97 } : undefined}
  >
    <rect
      x="1" y="6" width="14" height="10" rx="1"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M15 10h4l3 4v2h-7v-6z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <circle cx="6" cy="18" r="2" fill={filled ? "white" : "none"} stroke="currentColor" strokeWidth="1.5" />
    <circle cx="18" cy="18" r="2" fill={filled ? "white" : "none"} stroke="currentColor" strokeWidth="1.5" />
  </motion.svg>
);

// Tag / Promotions Icon
export const PetidTagIcon = ({ size = 24, className = '', filled = false, animate = false }: IconProps) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`text-petid-primary ${className}`}
    whileHover={animate ? { scale: 1.03, rotate: -5 } : undefined}
    whileTap={animate ? { scale: 0.97 } : undefined}
  >
    <path
      d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="7" cy="7" r="2" fill={filled ? "white" : "none"} stroke={filled ? "white" : "currentColor"} strokeWidth="1.5" />
  </motion.svg>
);

// Home Icon
export const PetidHomeIcon = ({ size = 24, className = '', filled = false, animate = false }: IconProps) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`text-petid-primary ${className}`}
    whileHover={animate ? { scale: 1.03 } : undefined}
    whileTap={animate ? { scale: 0.97 } : undefined}
  >
    <path
      d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 22V12h6v10"
      stroke={filled ? "white" : "currentColor"}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </motion.svg>
);

// Petitting / Loyalty Club Icon
export const PetidClubIcon = ({ size = 24, className = '', filled = false, animate = false }: IconProps) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`text-petid-primary ${className}`}
    whileHover={animate ? { scale: 1.03 } : undefined}
    whileTap={animate ? { scale: 0.97 } : undefined}
  >
    <path
      d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <circle
      cx="9" cy="7" r="4"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M23 21v-2a4 4 0 00-3-3.87"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M16 3.13a4 4 0 010 7.75"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
  </motion.svg>
);

// Filter Icon
export const PetidFilterIcon = ({ size = 24, className = '', filled = false, animate = false }: IconProps) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`text-petid-primary ${className}`}
    whileHover={animate ? { scale: 1.03 } : undefined}
    whileTap={animate ? { scale: 0.97 } : undefined}
  >
    <path
      d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </motion.svg>
);

// Settings Icon
export const PetidSettingsIcon = ({ size = 24, className = '', filled = false, animate = false }: IconProps) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`text-petid-primary ${className}`}
    whileHover={animate ? { scale: 1.03, rotate: 45 } : undefined}
    whileTap={animate ? { scale: 0.97 } : undefined}
    transition={{ duration: 0.3 }}
  >
    <circle
      cx="12" cy="12" r="3"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </motion.svg>
);

// Export all icons
export const PetidIcons = {
  Wallet: PetidWalletIcon,
  ShopBag: PetidShopBagIcon,
  Rewards: PetidRewardsIcon,
  LoyaltyBadge: PetidLoyaltyBadgeIcon,
  Info: PetidInfoIcon,
  Cart: PetidCartIcon,
  Truck: PetidTruckIcon,
  Tag: PetidTagIcon,
  Home: PetidHomeIcon,
  Club: PetidClubIcon,
  Filter: PetidFilterIcon,
  Settings: PetidSettingsIcon,
};

export default PetidIcons;
