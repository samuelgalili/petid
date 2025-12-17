import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-button hover:bg-primary-hover hover:shadow-button-hover hover:opacity-90 active:opacity-70 active:scale-[0.98] transform",
        accent: "bg-accent text-accent-foreground shadow-button hover:bg-accent-hover hover:shadow-button-hover hover:opacity-90 active:opacity-70 active:scale-[0.98] transform",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:opacity-90 active:opacity-70 active:scale-[0.98] transform",
        outline: "border border-border bg-transparent hover:bg-muted/50 hover:border-muted-foreground/30 active:bg-muted active:scale-[0.98] transform",
        secondary: "bg-secondary text-secondary-foreground shadow-md hover:bg-secondary-light hover:opacity-90 active:opacity-70 active:scale-[0.98] transform",
        ghost: "bg-transparent hover:bg-muted/50 active:bg-muted active:scale-[0.98] transform",
        link: "text-primary underline-offset-4 hover:underline hover:opacity-80 active:opacity-60",
        success: "bg-success text-success-foreground hover:bg-success-dark hover:opacity-90 active:opacity-70 active:scale-[0.98] transform",
        instagram: "bg-[#0095F6] text-white font-semibold hover:bg-[#1877F2] hover:opacity-90 active:opacity-70 active:scale-[0.98] transform",
        instagramSecondary: "bg-transparent text-[#0095F6] font-semibold hover:text-[#1877F2] hover:opacity-80 active:opacity-60",
      },
      size: {
        default: "h-11 px-6 py-3",
        sm: "h-9 rounded-md px-4 py-2",
        lg: "h-12 rounded-lg px-8 py-3",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
