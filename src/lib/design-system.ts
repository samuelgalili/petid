/**
 * PETID UNIFIED DESIGN SYSTEM
 * ============================
 * Single source of truth for all design tokens and layout constants.
 * All pages MUST use these values for consistency.
 */

// ===========================
// SPACING (8px grid)
// ===========================
export const SPACING = {
  /** Extra small: 4px */
  xs: "1",
  /** Small: 8px */
  sm: "2",
  /** Medium: 16px */
  md: "4",
  /** Large: 24px */
  lg: "6",
  /** Extra large: 32px */
  xl: "8",
  /** 2XL: 40px */
  "2xl": "10",
} as const;

// ===========================
// LAYOUT CONSTANTS
// ===========================
export const LAYOUT = {
  /** Standard page horizontal padding */
  pagePadding: "px-4",
  /** Standard page vertical padding */
  pageVerticalPadding: "py-4",
  /** Header height (44px) - UNIFIED across all pages */
  headerHeight: "h-11",
  /** Header spacer - matches header height */
  headerSpacer: "h-11",
  /** Bottom nav height (48px) */
  bottomNavHeight: "h-12",
  /** Page bottom padding to account for bottom nav - UNIFIED pb-20 */
  pageBottomPadding: "pb-20",
  /** Max content width */
  maxContentWidth: "max-w-lg",
  /** Section gap */
  sectionGap: "space-y-4",
  /** Card padding */
  cardPadding: "p-4",
  /** Card gap in lists */
  cardGap: "gap-4",
} as const;

// ===========================
// BORDER RADIUS - UNIFIED organic style
// ===========================
export const RADIUS = {
  /** Small: 8px */
  sm: "rounded-lg",
  /** Medium: 12px */
  md: "rounded-xl",
  /** Large: 16px */
  lg: "rounded-2xl",
  /** Extra large: 22px (organic) - PRIMARY card style */
  xl: "rounded-organic",
  /** Full/pill */
  full: "rounded-full",
} as const;

// ===========================
// TYPOGRAPHY - UNIFIED font sizes
// ===========================
export const TYPOGRAPHY = {
  /** Page title - 20px semibold */
  pageTitle: "text-xl font-semibold",
  /** Section title - 18px semibold */
  sectionTitle: "text-lg font-semibold",
  /** Card title - 16px semibold */
  cardTitle: "text-base font-semibold",
  /** Body text - 14px regular */
  body: "text-sm",
  /** Caption/small text - 12px muted */
  caption: "text-xs text-muted-foreground",
  /** Label - 14px medium */
  label: "text-sm font-medium",
} as const;

// ===========================
// SHADOWS - UNIFIED shadow system
// ===========================
export const SHADOWS = {
  /** Card shadow - default for all cards */
  card: "shadow-card",
  /** Elevated shadow - for hover/active states */
  elevated: "shadow-elevated",
  /** Button shadow */
  button: "shadow-button",
  /** No shadow */
  none: "shadow-none",
} as const;

// ===========================
// COMPONENT STYLES - UNIFIED components
// ===========================
export const COMPONENT_STYLES = {
  /** Standard card - USE THIS for all cards */
  card: "rounded-organic border border-card-border bg-card shadow-card",
  /** Interactive card - for clickable cards */
  cardInteractive: "rounded-organic border border-card-border bg-card shadow-card hover:shadow-elevated transition-shadow cursor-pointer",
  /** Section container */
  section: "px-4 py-4",
  /** List container */
  list: "space-y-4",
  /** Grid 2 columns */
  grid2: "grid grid-cols-2 gap-4",
  /** Grid 3 columns */
  grid3: "grid grid-cols-3 gap-4",
  /** Grid 4 columns */
  grid4: "grid grid-cols-4 gap-2",
  /** Button container (bottom sticky) */
  stickyButton: "fixed bottom-20 left-4 right-4 z-30",
  /** Empty state container */
  emptyState: "flex flex-col items-center justify-center py-12 text-center",
  /** Icon button */
  iconButton: "h-9 w-9 rounded-full",
  /** Badge */
  badge: "px-3 py-1 rounded-full text-xs font-medium",
  /** Filter chip active */
  filterChipActive: "px-4 py-2 rounded-full text-sm font-medium bg-primary text-primary-foreground",
  /** Filter chip inactive */
  filterChipInactive: "px-4 py-2 rounded-full text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80",
} as const;

// ===========================
// PAGE WRAPPER STYLES - USE THESE
// ===========================
export const PAGE_STYLES = {
  /** Full page wrapper - STANDARD for all pages */
  page: "min-h-screen bg-background pb-20",
  /** Page with RTL */
  pageRTL: "min-h-screen bg-background pb-20",
  /** Content area (below header) */
  content: "px-4 py-4",
  /** Content with sections */
  contentSections: "px-4 py-4 space-y-4",
} as const;

// ===========================
// HEADER STYLES - UNIFIED h-11
// ===========================
export const HEADER_STYLES = {
  /** Fixed header wrapper */
  wrapper: "fixed top-0 left-0 right-0 h-11 bg-background border-b border-border px-4 z-40",
  /** Header content container */
  content: "flex items-center justify-between h-full",
  /** Header title */
  title: "text-base font-semibold text-foreground",
  /** Header spacer (add below fixed header) */
  spacer: "h-11",
} as const;

// ===========================
// ICON SIZES - UNIFIED
// ===========================
export const ICON_SIZES = {
  /** Extra small: 16px */
  xs: "w-4 h-4",
  /** Small: 20px */
  sm: "w-5 h-5",
  /** Medium: 24px */
  md: "w-6 h-6",
  /** Large: 32px */
  lg: "w-8 h-8",
  /** Extra large: 40px */
  xl: "w-10 h-10",
} as const;

// ===========================
// ANIMATION - UNIFIED timing
// ===========================
export const ANIMATION = {
  /** Standard transition */
  transition: "transition-all duration-200",
  /** Fast transition */
  transitionFast: "transition-all duration-150",
  /** Slow transition */
  transitionSlow: "transition-all duration-300",
} as const;

// ===========================
// UTILITY CLASSES
// ===========================

/** Generate page wrapper classes */
export const pageClasses = (options?: { noPadding?: boolean }) => {
  const base = "min-h-screen bg-background";
  const padding = options?.noPadding ? "" : "pb-20";
  return `${base} ${padding}`.trim();
};

/** Generate content classes */
export const contentClasses = (options?: { noHorizontalPadding?: boolean }) => {
  const padding = options?.noHorizontalPadding ? "py-4" : "px-4 py-4";
  return padding;
};

/** Generate card classes */
export const cardClasses = (options?: { interactive?: boolean }) => {
  return options?.interactive 
    ? COMPONENT_STYLES.cardInteractive 
    : COMPONENT_STYLES.card;
};

/** RTL icon-text combo - icon on RIGHT */
export const iconTextClasses = "flex items-center gap-2 flex-row-reverse";
