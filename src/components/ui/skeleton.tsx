import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

function Skeleton({ className, style }: SkeletonProps) {
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

export { Skeleton };
