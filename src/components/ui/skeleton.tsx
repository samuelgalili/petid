import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
  variant?: "default" | "shimmer" | "pulse" | "wave";
}

function Skeleton({ className, style, variant = "shimmer" }: SkeletonProps) {
  if (variant === "shimmer") {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-md bg-muted",
          className
        )}
        style={style}
      >
        <motion.div
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
          animate={{
            translateX: ["-100%", "100%"],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            repeatDelay: 0.5,
          }}
        />
      </div>
    );
  }

  if (variant === "wave") {
    return (
      <div
        className={cn("relative overflow-hidden rounded-md bg-muted", className)}
        style={style}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.1) 50%, transparent 100%)",
          }}
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: [0.4, 0, 0.2, 1],
          }}
        />
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <motion.div
        className={cn("rounded-md bg-muted", className)}
        style={style}
        animate={{
          opacity: [0.5, 1, 0.5],
          scale: [1, 1.01, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    );
  }

  // Default
  return (
    <motion.div
      animate={{
        backgroundColor: [
          "hsl(var(--muted))",
          "hsl(var(--muted) / 0.5)",
          "hsl(var(--muted))",
        ],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      className={cn("rounded-md bg-muted", className)}
      style={style}
    />
  );
}

// Pre-built skeleton components for common use cases
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <Skeleton className="h-48 w-full rounded-xl" variant="shimmer" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" variant="shimmer" />
        <Skeleton className="h-4 w-1/2" variant="shimmer" />
      </div>
    </div>
  );
}

function SkeletonAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };
  return <Skeleton className={cn("rounded-full", sizes[size])} variant="pulse" />;
}

function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ width: `${100 - i * 15}%` }}
          variant="shimmer"
        />
      ))}
    </div>
  );
}

function SkeletonPost() {
  return (
    <div className="space-y-3 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SkeletonAvatar size="md" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-32" variant="shimmer" />
          <Skeleton className="h-3 w-20" variant="shimmer" />
        </div>
      </div>
      {/* Image */}
      <Skeleton className="h-72 w-full rounded-lg" variant="wave" />
      {/* Actions */}
      <div className="flex gap-4">
        <Skeleton className="h-6 w-6 rounded-full" variant="pulse" />
        <Skeleton className="h-6 w-6 rounded-full" variant="pulse" />
        <Skeleton className="h-6 w-6 rounded-full" variant="pulse" />
      </div>
      {/* Text */}
      <SkeletonText lines={2} />
    </div>
  );
}

function SkeletonProduct() {
  return (
    <div className="space-y-2">
      <Skeleton className="aspect-square w-full rounded-lg" variant="shimmer" />
      <Skeleton className="h-4 w-3/4" variant="shimmer" />
      <Skeleton className="h-4 w-1/2" variant="shimmer" />
    </div>
  );
}

function SkeletonProductGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-[1px] bg-muted">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          className="aspect-square bg-background"
        >
          <Skeleton className="h-full w-full" variant="shimmer" />
        </motion.div>
      ))}
    </div>
  );
}

export { 
  Skeleton, 
  SkeletonCard, 
  SkeletonAvatar, 
  SkeletonText, 
  SkeletonPost, 
  SkeletonProduct,
  SkeletonProductGrid
};
