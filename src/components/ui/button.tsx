import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-button hover:bg-primary-hover hover:shadow-button-hover hover:opacity-95 active:opacity-80 active:scale-[0.98] transform",
        accent: "bg-accent text-accent-foreground shadow-button hover:bg-accent-hover hover:shadow-button-hover hover:opacity-95 active:opacity-80 active:scale-[0.98] transform",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:opacity-95 active:opacity-80 active:scale-[0.98] transform",
        outline: "border-2 border-border bg-transparent hover:bg-muted/50 hover:border-primary/50 active:bg-muted active:scale-[0.98] transform",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary-light hover:opacity-95 active:opacity-80 active:scale-[0.98] transform",
        ghost: "bg-transparent hover:bg-muted/50 active:bg-muted active:scale-[0.98] transform",
        link: "text-primary underline-offset-4 hover:underline hover:opacity-80 active:opacity-60",
        success: "bg-success text-success-foreground hover:bg-success-dark hover:opacity-95 active:opacity-80 active:scale-[0.98] transform",
        // PetID specific variants
        petid: "bg-gradient-petid text-white font-semibold shadow-button hover:shadow-button-hover hover:opacity-95 active:opacity-80 active:scale-[0.98] transform",
        warm: "bg-gradient-warm text-white font-semibold shadow-button hover:shadow-button-hover hover:opacity-95 active:opacity-80 active:scale-[0.98] transform",
        gold: "bg-petid-gold text-petid-gold-foreground font-semibold shadow-button hover:opacity-95 active:opacity-80 active:scale-[0.98] transform",
        coral: "bg-petid-coral text-white font-semibold shadow-button hover:opacity-95 active:opacity-80 active:scale-[0.98] transform",
        // Legacy aliases
        instagram: "bg-primary text-primary-foreground font-semibold hover:bg-primary-hover hover:opacity-95 active:opacity-80 active:scale-[0.98] transform",
        instagramSecondary: "bg-transparent text-primary font-semibold hover:text-primary/80 hover:opacity-80 active:opacity-60",
      },
      size: {
        default: "h-11 px-6 py-3",
        sm: "h-9 rounded-lg px-4 py-2",
        lg: "h-12 rounded-2xl px-8 py-3",
        xl: "h-14 rounded-2xl px-10 py-4 text-base",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface RippleStyle {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  disableRipple?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, disableRipple = false, onClick, ...props }, ref) => {
    const [ripples, setRipples] = React.useState<RippleStyle[]>([]);
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    
    // Merge refs
    React.useImperativeHandle(ref, () => buttonRef.current!);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!disableRipple && !asChild && buttonRef.current) {
        const button = buttonRef.current;
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 2;
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        const newRipple = { left: x, top: y, width: size, height: size };
        setRipples(prev => [...prev, newRipple]);
        
        // Remove ripple after animation
        setTimeout(() => {
          setRipples(prev => prev.slice(1));
        }, 600);
      }
      
      onClick?.(e);
    };

    if (asChild) {
      return <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
    }

    return (
      <button 
        className={cn(buttonVariants({ variant, size, className }))} 
        ref={buttonRef} 
        onClick={handleClick}
        {...props}
      >
        {props.children}
        {ripples.map((ripple, index) => (
          <span
            key={index}
            className="absolute rounded-full pointer-events-none animate-ripple"
            style={{
              left: ripple.left,
              top: ripple.top,
              width: ripple.width,
              height: ripple.height,
              backgroundColor: variant === 'ghost' || variant === 'outline' 
                ? 'rgba(0, 0, 0, 0.1)' 
                : 'rgba(255, 255, 255, 0.3)',
            }}
          />
        ))}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
