import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export const FeedCardSkeleton = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-[28px] p-5 flex gap-4 overflow-hidden"
      style={{ backgroundColor: '#F5F5F5' }}
    >
      <Skeleton variant="shimmer" className="w-28 h-28 rounded-2xl flex-shrink-0" />
      
      <div className="flex-1 flex flex-col justify-between min-h-[112px]">
        <div className="space-y-2">
          <Skeleton variant="shimmer" className="h-5 w-3/4 rounded-lg" />
          <Skeleton variant="shimmer" className="h-4 w-full rounded-lg" />
          <Skeleton variant="shimmer" className="h-4 w-2/3 rounded-lg" />
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <Skeleton variant="shimmer" className="h-9 w-24 rounded-full" />
          <Skeleton variant="shimmer" className="h-4 w-20 rounded-lg" />
        </div>
      </div>
    </motion.div>
  );
};

export const StatsCardSkeleton = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-[28px] p-6 overflow-hidden"
      style={{ backgroundColor: '#F5F5F5' }}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 space-y-2">
          <Skeleton variant="shimmer" className="h-6 w-3/4 rounded-lg" />
          <Skeleton variant="shimmer" className="h-6 w-2/3 rounded-lg" />
          <Skeleton variant="shimmer" className="h-4 w-1/2 rounded-lg mt-2" />
        </div>
        <Skeleton variant="shimmer" className="w-16 h-16 rounded-full flex-shrink-0" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-3">
            <Skeleton variant="shimmer" className="w-16 h-16 rounded-full" />
            <Skeleton variant="shimmer" className="h-3 w-16 rounded-lg" />
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export const CategoryCardSkeleton = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-[1.75rem] p-4 flex flex-col items-center justify-center gap-2 min-h-[130px]"
      style={{ backgroundColor: '#F5F5F5' }}
    >
      <Skeleton variant="shimmer" className="w-4 h-4 rounded-full absolute top-3 right-3" />
      <Skeleton variant="shimmer" className="w-12 h-12 rounded-full" />
      <Skeleton variant="shimmer" className="h-4 w-16 rounded-lg" />
      <Skeleton variant="shimmer" className="h-3 w-20 rounded-lg" />
    </motion.div>
  );
};

export const HomePageSkeleton = () => {
  return (
    <div className="px-6 pt-6 space-y-4 max-w-md mx-auto">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <Skeleton variant="shimmer" className="h-12 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton variant="shimmer" key={i} className="h-10 rounded-full" />
          ))}
        </div>
        <div className="flex gap-2">
          <Skeleton variant="shimmer" className="h-10 w-32 rounded-full" />
          <Skeleton variant="shimmer" className="h-10 w-40 rounded-full" />
        </div>
      </div>

      {/* Categories Grid Skeleton */}
      <div className="grid grid-cols-3 gap-3 mt-6">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <CategoryCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

export const FeedPageSkeleton = () => {
  return (
    <div className="px-5 pt-5 space-y-4 max-w-md mx-auto">
      <StatsCardSkeleton />
      <FeedCardSkeleton />
      <FeedCardSkeleton />
    </div>
  );
};

export const PetCardSkeleton = () => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 bg-white border-2 border-gray-200 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
    >
      <div className="flex items-start gap-4">
        <div className="relative">
          <Skeleton variant="shimmer" className="w-16 h-16 rounded-full" />
          <Skeleton variant="shimmer" className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full" />
        </div>
        <div className="flex-1 space-y-2">
          <Skeleton variant="shimmer" className="h-5 w-24 rounded-lg" />
          <Skeleton variant="shimmer" className="h-4 w-16 rounded-lg" />
          <div className="flex items-center gap-2 mt-2">
            <Skeleton variant="shimmer" className="h-4 w-32 rounded-lg" />
            <Skeleton variant="shimmer" className="h-5 w-5 rounded-full" />
          </div>
          <Skeleton variant="shimmer" className="h-3 w-20 rounded-lg" />
        </div>
        <Skeleton variant="shimmer" className="w-9 h-9 rounded-xl self-center" />
      </div>
    </motion.div>
  );
};
