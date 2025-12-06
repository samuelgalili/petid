import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        jakarta: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
        black: '900',
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.25', letterSpacing: '0' }],
        'sm': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0' }],
        'base': ['1rem', { lineHeight: '1.5', letterSpacing: '0' }],
        'lg': ['1.125rem', { lineHeight: '1.5', letterSpacing: '0' }],
        'xl': ['1.25rem', { lineHeight: '1.5', letterSpacing: '0' }],
        '2xl': ['1.5rem', { lineHeight: '1.4', letterSpacing: '-0.01em' }],
        '3xl': ['1.875rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        '4xl': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        '5xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        /* ===========================
         * YELLOW BRAND COLORS
         * =========================== */
        yellow: {
          primary: "hsl(var(--yellow-primary))",
          "gradient-top": "hsl(var(--yellow-gradient-top))",
          "gradient-bottom": "hsl(var(--yellow-gradient-bottom))",
          hover: "hsl(var(--yellow-hover))",
          pressed: "hsl(var(--yellow-pressed))",
          red: "hsl(var(--yellow-red))",
          dark: "hsl(var(--yellow-dark))",
          "gray-600": "hsl(var(--yellow-gray-600))",
          "gray-400": "hsl(var(--yellow-gray-400))",
          white: "hsl(var(--yellow-white))",
          "gray-100": "hsl(var(--yellow-gray-100))",
          "gray-200": "hsl(var(--yellow-gray-200))",
        },
        
        /* Icon Colors */
        icon: {
          base: "hsl(var(--icon-base))",
          blue: "hsl(var(--icon-blue))",
          "dark-blue": "hsl(var(--icon-dark-blue))",
          orange: "hsl(var(--icon-orange))",
          active: "hsl(var(--icon-active))",
          disabled: "hsl(var(--icon-disabled))",
        },
        
        /* Primary - Yellow */
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          light: "hsl(var(--primary-light))",
          dark: "hsl(var(--primary-dark))",
          hover: "hsl(var(--primary-hover))",
          pressed: "hsl(var(--primary-pressed))",
        },
        
        /* Secondary */
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          light: "hsl(var(--secondary-light))",
          dark: "hsl(var(--secondary-dark))",
        },
        
        /* Accent - Red */
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          hover: "hsl(var(--accent-hover))",
          light: "hsl(var(--accent-light))",
        },
        
        /* Success */
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          light: "hsl(var(--success-light))",
          dark: "hsl(var(--success-dark))",
        },
        
        /* Warning */
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          light: "hsl(var(--warning-light))",
        },
        
        /* Error */
        error: {
          DEFAULT: "hsl(var(--error))",
          foreground: "hsl(var(--error-foreground))",
          light: "hsl(var(--error-light))",
        },
        
        /* Info */
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          light: "hsl(var(--info-light))",
        },
        
        /* Destructive */
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        
        /* Muted */
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        
        /* Popover */
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        
        /* Card */
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          border: "hsl(var(--card-border))",
        },
        
        /* Surface */
        surface: {
          DEFAULT: "hsl(var(--surface))",
          elevated: "hsl(var(--surface-elevated))",
        },
        
        /* Sidebar */
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        
        /* Component-specific colors */
        header: {
          bg: "hsl(var(--header-bg))",
          text: "hsl(var(--header-text))",
        },
        
        footer: {
          bg: "hsl(var(--footer-bg))",
          text: "hsl(var(--footer-text))",
        },
        
        toast: {
          bg: "hsl(var(--toast-bg))",
          border: "hsl(var(--toast-border))",
          text: "hsl(var(--toast-text))",
        },
        
        tag: {
          bg: "hsl(var(--tag-bg))",
          text: "hsl(var(--tag-text))",
          border: "hsl(var(--tag-border))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        xl: "var(--radius-lg)",
        "2xl": "1.375rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-md)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        card: 'var(--shadow-card)',
        elevated: 'var(--shadow-elevated)',
        button: 'var(--shadow-button)',
        'button-hover': 'var(--shadow-button-hover)',
        yellow: 'var(--shadow-yellow)',
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-yellow': 'var(--gradient-yellow)',
        'gradient-hero': 'var(--gradient-hero)',
        'gradient-warm': 'var(--gradient-warm)',
        'gradient-card': 'var(--gradient-card)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-yellow": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsla(45, 100%, 48%, 0.4)" },
          "50%": { boxShadow: "0 0 0 12px hsla(45, 100%, 48%, 0)" },
        },
        "bounce-in": {
          "0%": { opacity: "0", transform: "scale(0.3)" },
          "50%": { transform: "scale(1.05)" },
          "70%": { transform: "scale(0.9)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-yellow": "pulse-yellow 2s ease-in-out infinite",
        "bounce-in": "bounce-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "slide-up": "slide-up 0.3s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "shimmer": "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
