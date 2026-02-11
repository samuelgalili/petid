import { motion } from "framer-motion";

/** TikTok-style full-screen skeleton card with shimmer effect */
export const FeedSkeleton = () => (
  <div className="h-[calc(100vh-56px-70px)] w-full snap-start relative overflow-hidden bg-muted">
    {/* Shimmer overlay */}
    <motion.div
      className="absolute inset-0 z-10"
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
        backgroundSize: "200% 100%",
      }}
      animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
    />

    {/* Bottom gradient skeleton */}
    <div
      className="absolute inset-x-0 bottom-0 z-[5]"
      style={{
        height: "45%",
        background: "linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 100%)",
      }}
    />

    {/* Right sidebar skeleton */}
    <div className="absolute bottom-[120px] right-4 z-20 flex flex-col items-center gap-6">
      <div className="w-12 h-12 rounded-full bg-white/10 animate-pulse" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
          <div className="w-6 h-2 rounded bg-white/10 animate-pulse" />
        </div>
      ))}
    </div>

    {/* Bottom-left info skeleton */}
    <div className="absolute bottom-[120px] left-4 z-20 flex flex-col gap-2">
      <div className="w-20 h-6 rounded-full bg-white/10 animate-pulse" />
      <div className="w-32 h-5 rounded bg-white/10 animate-pulse" />
      <div className="w-48 h-4 rounded bg-white/10 animate-pulse" />
      <div className="w-40 h-4 rounded bg-white/10 animate-pulse" />
    </div>
  </div>
);

export const FeedSkeletonList = () => (
  <>
    <FeedSkeleton />
    <FeedSkeleton />
    <FeedSkeleton />
  </>
);
