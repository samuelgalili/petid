/**
 * Accessibility utilities following WCAG 2.1 AA standards
 * Based on Nielsen Norman Group & W3C guidelines
 */

// Minimum tap target sizes (in pixels) - Apple HIG & Material Design
export const TAP_TARGET = {
  minimum: 44, // WCAG 2.1 AA - 44x44px
  comfortable: 48, // Material Design recommendation
  large: 56, // For primary actions
} as const;

// WCAG contrast ratios
export const CONTRAST_RATIO = {
  normalText: 4.5, // WCAG AA for normal text
  largeText: 3, // WCAG AA for large text (18pt+ or 14pt bold+)
  graphical: 3, // WCAG AA for UI components and graphics
  enhanced: 7, // WCAG AAA
} as const;

// Font size scale for accessibility
export const FONT_SIZE = {
  xs: "0.75rem", // 12px
  sm: "0.875rem", // 14px
  base: "1rem", // 16px - minimum for body text
  lg: "1.125rem", // 18px - considered "large text"
  xl: "1.25rem", // 20px
  "2xl": "1.5rem", // 24px
  "3xl": "1.875rem", // 30px
} as const;

// Focus styles for keyboard navigation
export const FOCUS_STYLES = {
  outline: "2px solid hsl(var(--primary))",
  outlineOffset: "2px",
  borderRadius: "0.375rem",
} as const;

// Helper: Check if element is keyboard accessible
export const getKeyboardAccessibleProps = (onClick?: () => void) => {
  if (!onClick) return {};
  
  return {
    role: "button",
    tabIndex: 0,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    },
  };
};

// Helper: Generate accessible button props
export const getAccessibleButtonProps = (label: string, isPressed?: boolean) => ({
  "aria-label": label,
  "aria-pressed": isPressed,
  role: "button",
  tabIndex: 0,
});

// Helper: Generate accessible link props
export const getAccessibleLinkProps = (label: string, isExternal?: boolean) => ({
  "aria-label": label,
  ...(isExternal && {
    target: "_blank",
    rel: "noopener noreferrer",
    "aria-label": `${label} (נפתח בחלון חדש)`,
  }),
});

// Helper: Generate loading state props
export const getLoadingStateProps = (isLoading: boolean, loadingText = "טוען...") => ({
  "aria-busy": isLoading,
  "aria-live": "polite",
  ...(isLoading && { "aria-label": loadingText }),
});

// Helper: Check if text meets contrast requirements
export const meetsContrastRequirement = (
  foreground: string,
  background: string,
  requirement: keyof typeof CONTRAST_RATIO = "normalText"
): boolean => {
  // This is a simplified check - in production, use a proper color contrast library
  // like polished.js or tinycolor2
  const requiredRatio = CONTRAST_RATIO[requirement];
  // Implementation would calculate actual contrast ratio
  return true; // Placeholder
};

// Helper: Generate screen reader only text
export const srOnly = {
  position: "absolute" as const,
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap" as const,
  borderWidth: "0",
};

// Helper: Skip to main content link (for keyboard users)
export const skipLinkStyles = `
  .skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    padding: 8px;
    text-decoration: none;
    z-index: 100;
  }
  
  .skip-link:focus {
    top: 0;
  }
`;

// Reduced motion preference
export const prefersReducedMotion = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

// Safe animation wrapper that respects user preferences
export const getSafeAnimation = (animation: any) => {
  return prefersReducedMotion() ? {} : animation;
};

// Touch target size helper
export const ensureTapTarget = (size: keyof typeof TAP_TARGET = "minimum") => ({
  minWidth: `${TAP_TARGET[size]}px`,
  minHeight: `${TAP_TARGET[size]}px`,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
});

// Form field accessibility
export const getFormFieldProps = (
  id: string,
  label: string,
  error?: string,
  required?: boolean
) => ({
  field: {
    id,
    "aria-invalid": !!error,
    "aria-describedby": error ? `${id}-error` : undefined,
    "aria-required": required,
  },
  label: {
    htmlFor: id,
    "aria-label": label,
  },
  error: error
    ? {
        id: `${id}-error`,
        role: "alert",
        "aria-live": "polite",
      }
    : undefined,
});
