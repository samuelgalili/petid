import { motion, HTMLMotionProps } from "framer-motion";
import { forwardRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

// Animated Like Button with heart burst
export const AnimatedLikeButton = forwardRef<
  HTMLButtonElement,
  {
    isLiked: boolean;
    onToggle: () => void;
    size?: "sm" | "md" | "lg";
    className?: string;
  }
>(({ isLiked, onToggle, size = "md", className }, ref) => {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <motion.button
      ref={ref}
      onClick={onToggle}
      className={cn("relative", className)}
      whileTap={{ scale: 0.8 }}
    >
      <motion.svg
        className={cn(sizeClasses[size], "transition-colors")}
        viewBox="0 0 24 24"
        fill={isLiked ? "#ED4956" : "none"}
        stroke={isLiked ? "#ED4956" : "currentColor"}
        strokeWidth="2"
        animate={
          isLiked
            ? {
                scale: [1, 1.3, 1],
              }
            : {}
        }
        transition={{ duration: 0.3 }}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </motion.svg>
      
      {/* Burst effect */}
      {isLiked && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 1, scale: 1 }}
          animate={{ opacity: 0, scale: 2 }}
          transition={{ duration: 0.4 }}
        >
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 bg-ig-red rounded-full"
              style={{
                left: "50%",
                top: "50%",
              }}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{
                x: Math.cos((i * 60 * Math.PI) / 180) * 20,
                y: Math.sin((i * 60 * Math.PI) / 180) * 20,
                opacity: 0,
              }}
              transition={{ duration: 0.4, delay: i * 0.02 }}
            />
          ))}
        </motion.div>
      )}
    </motion.button>
  );
});
AnimatedLikeButton.displayName = "AnimatedLikeButton";

// Press/Tap animated button wrapper
export const PressableButton = forwardRef<
  HTMLButtonElement,
  HTMLMotionProps<"button"> & { children: ReactNode }
>(({ children, className, ...props }, ref) => (
  <motion.button
    ref={ref}
    className={cn("transition-colors", className)}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.95 }}
    {...props}
  >
    {children}
  </motion.button>
));
PressableButton.displayName = "PressableButton";

// Staggered list animation wrapper
export const StaggeredList = ({
  children,
  className,
  staggerDelay = 0.05,
}: {
  children: ReactNode[];
  className?: string;
  staggerDelay?: number;
}) => (
  <div className={className}>
    {children.map((child, index) => (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * staggerDelay }}
      >
        {child}
      </motion.div>
    ))}
  </div>
);

// Floating action button with pulse
export const FloatingPulseButton = ({
  children,
  onClick,
  className,
  pulse = true,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  pulse?: boolean;
}) => (
  <motion.button
    onClick={onClick}
    className={cn(
      "relative rounded-full shadow-lg",
      className
    )}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
  >
    {pulse && (
      <motion.span
        className="absolute inset-0 rounded-full bg-primary/30"
        animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    )}
    {children}
  </motion.button>
);

// Slide in from bottom
export const SlideUp = ({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.3 }}
  >
    {children}
  </motion.div>
);

// Fade in component
export const FadeIn = ({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay, duration: 0.3 }}
  >
    {children}
  </motion.div>
);

// Scale in component
export const ScaleIn = ({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.3, type: "spring" }}
  >
    {children}
  </motion.div>
);

// Bounce notification badge
export const BounceBadge = ({
  count,
  className,
}: {
  count: number;
  className?: string;
}) => (
  <motion.span
    className={cn(
      "absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center",
      className
    )}
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: "spring", stiffness: 500, damping: 15 }}
    key={count}
  >
    {count > 99 ? "99+" : count}
  </motion.span>
);

// Ripple effect on tap
export const RippleButton = forwardRef<
  HTMLButtonElement,
  HTMLMotionProps<"button"> & { children: ReactNode; rippleColor?: string }
>(({ children, className, rippleColor = "rgba(255,255,255,0.3)", ...props }, ref) => {
  return (
    <motion.button
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {children}
    </motion.button>
  );
});
RippleButton.displayName = "RippleButton";

// Animated counter
export const AnimatedNumber = ({
  value,
  className,
}: {
  value: number;
  className?: string;
}) => (
  <motion.span
    key={value}
    className={className}
    initial={{ y: -10, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    exit={{ y: 10, opacity: 0 }}
    transition={{ duration: 0.2 }}
  >
    {value.toLocaleString()}
  </motion.span>
);
