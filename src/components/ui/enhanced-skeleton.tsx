import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: ["0%", "200%"] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear",
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
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex flex-col items-center gap-1">
        <EnhancedSkeleton className="w-16 h-16" variant="circular" />
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
  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
    {[...Array(count)].map((_, i) => (
      <SkeletonProduct key={i} />
    ))}
  </div>
);
