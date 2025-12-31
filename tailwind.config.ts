import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
		fontFamily: {
			sans: [
				'Assistant',
				'Inter',
				'-apple-system',
				'BlinkMacSystemFont',
				'Segoe UI',
				'Roboto',
				'sans-serif'
			],
			assistant: [
				'Assistant',
				'Inter',
				'-apple-system',
				'sans-serif'
			],
			heebo: [
				'Assistant',
				'Inter',
				'-apple-system',
				'sans-serif'
			],
			jakarta: [
				'Assistant',
				'Inter',
				'-apple-system',
				'sans-serif'
			],
			serif: [
				'Georgia',
				'Cambria',
				'Times New Roman',
				'Times',
				'serif'
			],
			mono: [
				'SF Mono',
				'ui-monospace',
				'SFMono-Regular',
				'Menlo',
				'Monaco',
				'Consolas',
				'monospace'
			]
		},
  		fontWeight: {
  			normal: '400',
  			medium: '500',
  			semibold: '600',
  			bold: '700',
  			extrabold: '800',
  			black: '900'
  		},
  		fontSize: {
  			xs: [
  				'0.75rem',
  				{
  					lineHeight: '1.25',
  					letterSpacing: '0'
  				}
  			],
  			sm: [
  				'0.875rem',
  				{
  					lineHeight: '1.5',
  					letterSpacing: '0'
  				}
  			],
  			base: [
  				'1rem',
  				{
  					lineHeight: '1.5',
  					letterSpacing: '0'
  				}
  			],
  			lg: [
  				'1.125rem',
  				{
  					lineHeight: '1.5',
  					letterSpacing: '0'
  				}
  			],
  			xl: [
  				'1.25rem',
  				{
  					lineHeight: '1.5',
  					letterSpacing: '0'
  				}
  			],
  			'2xl': [
  				'1.5rem',
  				{
  					lineHeight: '1.4',
  					letterSpacing: '-0.01em'
  				}
  			],
  			'3xl': [
  				'1.875rem',
  				{
  					lineHeight: '1.3',
  					letterSpacing: '-0.01em'
  				}
  			],
  			'4xl': [
  				'2.25rem',
  				{
  					lineHeight: '1.2',
  					letterSpacing: '-0.02em'
  				}
  			],
  			'5xl': [
  				'3rem',
  				{
  					lineHeight: '1.1',
  					letterSpacing: '-0.02em'
  				}
  			]
  		},
  		spacing: {
  			'18': '4.5rem',
  			'22': '5.5rem',
  			'26': '6.5rem',
  			'30': '7.5rem'
  		},
		colors: {
			border: 'hsl(var(--border))',
			input: 'hsl(var(--input))',
			ring: 'hsl(var(--ring))',
			background: 'hsl(var(--background))',
			foreground: 'hsl(var(--foreground))',
			petid: {
				blue: 'hsl(var(--petid-blue))',
				'blue-light': 'hsl(var(--petid-blue-light))',
				'blue-dark': 'hsl(var(--petid-blue-dark))',
				turquoise: 'hsl(var(--petid-turquoise))',
				'turquoise-light': 'hsl(var(--petid-turquoise-light))',
				'turquoise-dark': 'hsl(var(--petid-turquoise-dark))',
				gold: 'hsl(var(--petid-gold))',
				'gold-light': 'hsl(var(--petid-gold-light))',
				'gold-dark': 'hsl(var(--petid-gold-dark))',
				teal: 'hsl(var(--petid-teal))'
			},
			shop: {
				blue: 'hsl(var(--shop-blue))',
				turquoise: 'hsl(var(--shop-turquoise))',
				'light-blue': 'hsl(var(--shop-light-blue))'
			},
			instagram: {
				blue: 'hsl(var(--ig-blue))',
				red: 'hsl(var(--ig-red))',
				black: 'hsl(var(--ig-black))',
				'gray-dark': 'hsl(var(--ig-gray-dark))',
				gray: 'hsl(var(--ig-gray))',
				'gray-light': 'hsl(var(--ig-gray-light))',
				border: 'hsl(var(--ig-border))',
				'bg-light': 'hsl(var(--ig-bg-light))',
				white: 'hsl(var(--ig-white))'
			},
			icon: {
				base: 'hsl(var(--icon-base))',
				blue: 'hsl(var(--icon-blue))',
				'dark-blue': 'hsl(var(--icon-dark-blue))',
				orange: 'hsl(var(--icon-orange))',
				active: 'hsl(var(--icon-active))',
				disabled: 'hsl(var(--icon-disabled))'
			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))',
  				light: 'hsl(var(--primary-light))',
  				dark: 'hsl(var(--primary-dark))',
  				hover: 'hsl(var(--primary-hover))',
  				pressed: 'hsl(var(--primary-pressed))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))',
  				light: 'hsl(var(--secondary-light))',
  				dark: 'hsl(var(--secondary-dark))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))',
  				hover: 'hsl(var(--accent-hover))',
  				light: 'hsl(var(--accent-light))'
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))',
  				light: 'hsl(var(--success-light))',
  				dark: 'hsl(var(--success-dark))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))',
  				light: 'hsl(var(--warning-light))'
  			},
  			error: {
  				DEFAULT: 'hsl(var(--error))',
  				foreground: 'hsl(var(--error-foreground))',
  				light: 'hsl(var(--error-light))'
  			},
  			info: {
  				DEFAULT: 'hsl(var(--info))',
  				foreground: 'hsl(var(--info-foreground))',
  				light: 'hsl(var(--info-light))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))',
  				border: 'hsl(var(--card-border))'
  			},
  			surface: {
  				DEFAULT: 'hsl(var(--surface))',
  				elevated: 'hsl(var(--surface-elevated))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			header: {
  				bg: 'hsl(var(--header-bg))',
  				text: 'hsl(var(--header-text))'
  			},
  			footer: {
  				bg: 'hsl(var(--footer-bg))',
  				text: 'hsl(var(--footer-text))'
  			},
  			toast: {
  				bg: 'hsl(var(--toast-bg))',
  				border: 'hsl(var(--toast-border))',
  				text: 'hsl(var(--toast-text))'
  			},
  			tag: {
  				bg: 'hsl(var(--tag-bg))',
  				text: 'hsl(var(--tag-text))',
  				border: 'hsl(var(--tag-border))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 4px)',
  			sm: 'calc(var(--radius) - 8px)',
  			xl: 'var(--radius-lg)',
  			'2xl': '1.375rem',
  			'3xl': '1.75rem'
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
			shop: 'var(--shadow-shop)',
			'2xs': 'var(--shadow-2xs)',
			xs: 'var(--shadow-xs)',
			'2xl': 'var(--shadow-2xl)'
		},
		backgroundImage: {
			'gradient-primary': 'var(--gradient-primary)',
			'gradient-instagram': 'var(--gradient-instagram)',
			'gradient-petid': 'var(--gradient-instagram)',
			'gradient-shop': 'var(--gradient-shop)',
			'gradient-story': 'var(--gradient-story)',
			'gradient-hero': 'var(--gradient-hero)',
			'gradient-warm': 'var(--gradient-warm)',
			'gradient-card': 'var(--gradient-card)'
		},
		keyframes: {
			'accordion-down': {
				from: {
					height: '0'
				},
				to: {
					height: 'var(--radix-accordion-content-height)'
				}
			},
			'accordion-up': {
				from: {
					height: 'var(--radix-accordion-content-height)'
				},
				to: {
					height: '0'
				}
			},
			'pulse-petid': {
				'0%, 100%': {
					boxShadow: '0 0 0 0 hsla(204, 100%, 48%, 0.4)'
				},
				'50%': {
					boxShadow: '0 0 0 12px hsla(204, 100%, 48%, 0)'
				}
			},
			'gradient-rotate': {
				'0%': {
					backgroundPosition: '0% 50%'
				},
				'50%': {
					backgroundPosition: '100% 50%'
				},
				'100%': {
					backgroundPosition: '0% 50%'
				}
			},
  			'bounce-in': {
  				'0%': {
  					opacity: '0',
  					transform: 'scale(0.3)'
  				},
  				'50%': {
  					transform: 'scale(1.05)'
  				},
  				'70%': {
  					transform: 'scale(0.9)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'scale(1)'
  				}
  			},
  			'slide-up': {
  				from: {
  					opacity: '0',
  					transform: 'translateY(20px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'fade-in': {
  				from: {
  					opacity: '0',
  					transform: 'translateY(8px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'shimmer': {
  				'0%': {
  					backgroundPosition: '-200% 0'
  				},
  				'100%': {
  					backgroundPosition: '200% 0'
  				}
  			},
  			'ripple': {
  				'0%': {
  					transform: 'scale(0)',
  					opacity: '0.6'
  				},
  				'100%': {
  					transform: 'scale(1)',
  					opacity: '0'
  				}
  			},
  			'dialog-scale-in': {
  				'0%': {
  					opacity: '0',
  					transform: 'translate(-50%, -50%) scale(0.9)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translate(-50%, -50%) scale(1)'
  				}
  			},
  			'dialog-scale-out': {
  				'0%': {
  					opacity: '1',
  					transform: 'translate(-50%, -50%) scale(1)'
  				},
  				'100%': {
  					opacity: '0',
  					transform: 'translate(-50%, -50%) scale(0.95)'
  				}
  			},
  			'dialog-slide-in': {
  				'0%': {
  					opacity: '0',
  					transform: 'translate(-50%, -40%)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translate(-50%, -50%)'
  				}
  			},
  			'dialog-slide-out': {
  				'0%': {
  					opacity: '1',
  					transform: 'translate(-50%, -50%)'
  				},
  				'100%': {
  					opacity: '0',
  					transform: 'translate(-50%, -45%)'
  				}
  			},
  			'dialog-flip-in': {
  				'0%': {
  					opacity: '0',
  					transform: 'translate(-50%, -50%) perspective(1000px) rotateX(-15deg) scale(0.95)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translate(-50%, -50%) perspective(1000px) rotateX(0) scale(1)'
  				}
  			},
  			'dialog-flip-out': {
  				'0%': {
  					opacity: '1',
  					transform: 'translate(-50%, -50%) perspective(1000px) rotateX(0) scale(1)'
  				},
  				'100%': {
  					opacity: '0',
  					transform: 'translate(-50%, -50%) perspective(1000px) rotateX(10deg) scale(0.95)'
  				}
  			},
  			'dialog-bounce-in': {
  				'0%': {
  					opacity: '0',
  					transform: 'translate(-50%, -50%) scale(0.3)'
  				},
  				'50%': {
  					transform: 'translate(-50%, -50%) scale(1.05)'
  				},
  				'70%': {
  					transform: 'translate(-50%, -50%) scale(0.95)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translate(-50%, -50%) scale(1)'
  				}
  			},
  			'dialog-bounce-out': {
  				'0%': {
  					opacity: '1',
  					transform: 'translate(-50%, -50%) scale(1)'
  				},
  				'100%': {
  					opacity: '0',
  					transform: 'translate(-50%, -50%) scale(0.5)'
  				}
  			},
  			'toast-slide-in': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateX(100%) scale(0.9)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateX(0) scale(1)'
  				}
  			},
  			'toast-slide-out': {
  				'0%': {
  					opacity: '1',
  					transform: 'translateX(0) scale(1)'
  				},
  				'100%': {
  					opacity: '0',
  					transform: 'translateX(100%) scale(0.9)'
  				}
  			},
  			'toast-icon-pop': {
  				'0%': {
  					opacity: '0',
  					transform: 'scale(0) rotate(-180deg)'
  				},
  				'50%': {
  					transform: 'scale(1.2) rotate(10deg)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'scale(1) rotate(0deg)'
  				}
  			},
  			'toast-content-fade': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateX(-10px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateX(0)'
  				}
  			},
  			'wiggle': {
  				'0%, 100%': {
  					transform: 'rotate(0deg) scale(1)'
  				},
  				'25%': {
  					transform: 'rotate(-10deg) scale(1.15)'
  				},
  				'50%': {
  					transform: 'rotate(10deg) scale(1.2)'
  				},
  				'75%': {
  					transform: 'rotate(-5deg) scale(1.1)'
  				}
  			}
  		},
		animation: {
			'accordion-down': 'accordion-down 0.2s ease-out',
			'accordion-up': 'accordion-up 0.2s ease-out',
			'pulse-instagram': 'pulse-instagram 2s ease-in-out infinite',
			'gradient-rotate': 'gradient-rotate 3s ease infinite',
			'bounce-in': 'bounce-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
			'slide-up': 'slide-up 0.3s ease-out',
			'fade-in': 'fade-in 0.3s ease-out',
			'shimmer': 'shimmer 1.5s infinite',
			'ripple': 'ripple 0.6s ease-out forwards',
			'dialog-scale-in': 'dialog-scale-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
			'dialog-scale-out': 'dialog-scale-out 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
			'dialog-slide-in': 'dialog-slide-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
			'dialog-slide-out': 'dialog-slide-out 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
			'dialog-flip-in': 'dialog-flip-in 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
			'dialog-flip-out': 'dialog-flip-out 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
			'dialog-bounce-in': 'dialog-bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
			'dialog-bounce-out': 'dialog-bounce-out 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
			'toast-slide-in': 'toast-slide-in 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
			'toast-slide-out': 'toast-slide-out 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
			'toast-icon-pop': 'toast-icon-pop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
			'toast-content-fade': 'toast-content-fade 0.3s ease-out 0.1s both',
			'wiggle': 'wiggle 0.3s ease-in-out'
		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
