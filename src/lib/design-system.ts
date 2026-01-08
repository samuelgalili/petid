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
  /** Header height (44px) */
  headerHeight: "h-11",
  /** Header spacer */
  headerSpacer: "h-11",
  /** Bottom nav height (48px) */
  bottomNavHeight: "h-12",
  /** Page bottom padding to account for bottom nav */
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
// BORDER RADIUS
// ===========================
export const RADIUS = {
  /** Small: 8px */
  sm: "rounded-lg",
  /** Medium: 12px */
  md: "rounded-xl",
  /** Large: 16px */
  lg: "rounded-2xl",
  /** Extra large: 22px (organic) */
  xl: "rounded-organic",
  /** Full/pill */
  full: "rounded-full",
} as const;

// ===========================
// TYPOGRAPHY
// ===========================
export const TYPOGRAPHY = {
  /** Page title */
  pageTitle: "text-xl font-semibold",
  /** Section title */
  sectionTitle: "text-lg font-semibold",
  /** Card title */
  cardTitle: "text-base font-semibold",
  /** Body text */
  body: "text-sm",
  /** Caption/small text */
  caption: "text-xs text-muted-foreground",
  /** Label */
  label: "text-sm font-medium",
} as const;

// ===========================
// SHADOWS
// ===========================
export const SHADOWS = {
  /** Card shadow */
  card: "shadow-card",
  /** Elevated shadow */
  elevated: "shadow-elevated",
  /** Button shadow */
  button: "shadow-button",
  /** No shadow */
  none: "shadow-none",
} as const;

// ===========================
// COMPONENT STYLES
// ===========================
export const COMPONENT_STYLES = {
  /** Standard card */
  card: "rounded-organic border border-card-border bg-card shadow-card",
  /** Interactive card */
  cardInteractive: "rounded-organic border border-card-border bg-card shadow-card hover:shadow-elevated transition-shadow cursor-pointer",
  /** Section container */
  section: "px-4 py-4",
  /** List container */
  list: "space-y-4",
  /** Grid 2 columns */
  grid2: "grid grid-cols-2 gap-4",
  /** Button container (bottom sticky) */
  stickyButton: "fixed bottom-20 left-4 right-4 z-30",
  /** Empty state container */
  emptyState: "flex flex-col items-center justify-center py-12 text-center",
  /** Icon button */
  iconButton: "h-9 w-9 rounded-full",
  /** Badge */
  badge: "px-3 py-1 rounded-full text-xs font-medium",
} as const;

// ===========================
// PAGE WRAPPER STYLES
// ===========================
export const PAGE_STYLES = {
  /** Full page wrapper */
  page: "min-h-screen bg-background pb-20",
  /** Page with RTL */
  pageRTL: "min-h-screen bg-background pb-20",
  /** Content area (below header) */
  content: "px-4 py-4",
  /** Content with sections */
  contentSections: "px-4 py-4 space-y-4",
} as const;

// ===========================
// ICON SIZES
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
// ANIMATION
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
export const pageClasses = (options?: { noPadding?: boolean }) => {
  const base = "min-h-screen bg-background";
  const padding = options?.noPadding ? "" : "pb-20";
  return `${base} ${padding}`.trim();
};

export const contentClasses = (options?: { noHorizontalPadding?: boolean }) => {
  const padding = options?.noHorizontalPadding ? "py-4" : "px-4 py-4";
  return padding;
};
