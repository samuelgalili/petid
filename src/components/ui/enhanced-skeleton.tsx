import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

 // Gradient shimmer animation
 const shimmerGradient = "bg-gradient-to-r from-transparent via-white/10 to-transparent";

interface EnhancedSkeletonProps {
  className?: string;
  variant?: "default" | "circular" | "rounded" | "text";
  animation?: "pulse" | "shimmer" | "wave";
  children?: React.ReactNode;
}

export const EnhancedSkeleton = ({
  className,
  variant = "default",
  animation = "shimmer",
  children,
}: EnhancedSkeletonProps) => {
  const baseClasses = cn(
    "bg-muted relative overflow-hidden",
    {
      "rounded-md": variant === "default",
      "rounded-full": variant === "circular",
      "rounded-lg": variant === "rounded",
      "rounded h-4": variant === "text",
    },
    className
  );

  if (animation === "shimmer") {
    return (
      <div className={baseClasses}>
        <motion.div
          className={cn("absolute inset-0 -translate-x-full", shimmerGradient)}
          animate={{ x: ["-100%", "100%"] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "linear",
            repeatDelay: 0.5,
          }}
        />
        {children}
      </div>
    );
  }

  if (animation === "wave") {
    return (
      <motion.div
        className={baseClasses}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={cn(baseClasses, "animate-pulse")}>
      {children}
    </div>
  );
};

// Pre-built skeleton components
export const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={cn("space-y-3", className)}>
    <EnhancedSkeleton className="w-full aspect-square" variant="rounded" />
    <div className="space-y-2">
      <EnhancedSkeleton className="h-4 w-3/4" variant="text" />
      <EnhancedSkeleton className="h-3 w-1/2" variant="text" />
    </div>
  </div>
);

export const SkeletonPost = ({ className }: { className?: string }) => (
  <div className={cn("space-y-3 p-4", className)}>
    {/* Header */}
    <div className="flex items-center gap-3">
      <EnhancedSkeleton className="w-10 h-10" variant="circular" />
      <div className="space-y-2 flex-1">
        <EnhancedSkeleton className="h-3 w-24" variant="text" />
        <EnhancedSkeleton className="h-2 w-16" variant="text" />
      </div>
    </div>
    {/* Image */}
    <EnhancedSkeleton className="w-full aspect-square" variant="rounded" />
    {/* Actions */}
    <div className="flex gap-4">
      <EnhancedSkeleton className="w-6 h-6" variant="circular" />
      <EnhancedSkeleton className="w-6 h-6" variant="circular" />
      <EnhancedSkeleton className="w-6 h-6" variant="circular" />
    </div>
    {/* Caption */}
    <div className="space-y-2">
      <EnhancedSkeleton className="h-3 w-full" variant="text" />
      <EnhancedSkeleton className="h-3 w-2/3" variant="text" />
    </div>
  </div>
);

export const SkeletonProduct = ({ className }: { className?: string }) => (
  <div className={cn("space-y-2", className)}>
    <EnhancedSkeleton className="w-full aspect-square" variant="rounded" />
    <EnhancedSkeleton className="h-3 w-full" variant="text" />
    <EnhancedSkeleton className="h-4 w-16" variant="text" />
  </div>
);

export const SkeletonAvatar = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-20 h-20",
  };
  return <EnhancedSkeleton className={sizeClasses[size]} variant="circular" />;
};

export const SkeletonStoriesBar = () => (
  <div className="flex gap-4 px-4 py-3 overflow-hidden">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="flex flex-col items-center gap-1">
        <EnhancedSkeleton className="w-16 h-16 ring-2 ring-muted" variant="circular" />
        <EnhancedSkeleton className="h-2 w-12" variant="text" />
      </div>
    ))}
  </div>
);

export const SkeletonFeed = () => (
  <div className="space-y-4">
    <SkeletonStoriesBar />
    {[...Array(2)].map((_, i) => (
      <SkeletonPost key={i} />
    ))}
  </div>
);

export const SkeletonProductGrid = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
    {[...Array(count)].map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05 }}
      >
        <SkeletonProduct />
      </motion.div>
    ))}
  </div>
);

// New skeleton components for improved UX
export const SkeletonProfileHeader = () => (
  <div className="p-4 space-y-4">
    <div className="flex items-center gap-4">
      <EnhancedSkeleton className="w-20 h-20" variant="circular" />
      <div className="flex-1 space-y-2">
        <EnhancedSkeleton className="h-5 w-32" variant="text" />
        <EnhancedSkeleton className="h-3 w-24" variant="text" />
        <div className="flex gap-4 mt-2">
          <EnhancedSkeleton className="h-8 w-16" variant="rounded" />
          <EnhancedSkeleton className="h-8 w-16" variant="rounded" />
          <EnhancedSkeleton className="h-8 w-16" variant="rounded" />
        </div>
      </div>
    </div>
  </div>
);

export const SkeletonPetCard = () => (
  <div className="p-4 rounded-xl border border-border bg-card space-y-3">
    <div className="flex items-center gap-3">
      <EnhancedSkeleton className="w-14 h-14" variant="circular" />
      <div className="flex-1 space-y-2">
        <EnhancedSkeleton className="h-4 w-20" variant="text" />
        <EnhancedSkeleton className="h-3 w-32" variant="text" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2">
      <EnhancedSkeleton className="h-16 rounded-lg" />
      <EnhancedSkeleton className="h-16 rounded-lg" />
      <EnhancedSkeleton className="h-16 rounded-lg" />
    </div>
  </div>
);

export const SkeletonServiceGrid = () => (
  <div className="grid grid-cols-4 gap-3 p-4">
    {[...Array(8)].map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: i * 0.03 }}
        className="flex flex-col items-center gap-2"
      >
        <EnhancedSkeleton className="w-12 h-12" variant="rounded" />
        <EnhancedSkeleton className="h-2 w-10" variant="text" />
      </motion.div>
    ))}
  </div>
);
