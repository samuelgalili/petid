import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Feed Post Skeleton with shimmer
export const PostCardSkeleton = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <Skeleton variant="shimmer" className="w-8 h-8 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton variant="shimmer" className="h-3.5 w-24 rounded" />
          <Skeleton variant="shimmer" className="h-2.5 w-16 rounded" />
        </div>
        <Skeleton variant="shimmer" className="w-6 h-6 rounded" />
      </div>

      {/* Image */}
      <Skeleton variant="shimmer" className="aspect-square w-full" />

      {/* Actions */}
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <Skeleton variant="shimmer" className="w-6 h-6 rounded" />
            <Skeleton variant="shimmer" className="w-6 h-6 rounded" />
            <Skeleton variant="shimmer" className="w-6 h-6 rounded" />
          </div>
          <Skeleton variant="shimmer" className="w-6 h-6 rounded" />
        </div>
        <Skeleton variant="shimmer" className="h-3.5 w-20 rounded" />
        <div className="space-y-1.5">
          <Skeleton variant="shimmer" className="h-3 w-full rounded" />
          <Skeleton variant="shimmer" className="h-3 w-2/3 rounded" />
        </div>
      </div>
    </motion.div>
  );
};

// Stories Bar Skeleton
export const StoriesBarSkeleton = () => {
  return (
    <div className="flex gap-4 px-4 py-3 overflow-hidden">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          className="flex flex-col items-center gap-1.5"
        >
          <Skeleton variant="shimmer" className="w-16 h-16 rounded-full" />
          <Skeleton variant="shimmer" className="h-2.5 w-12 rounded" />
        </motion.div>
      ))}
    </div>
  );
};

// Profile Page Skeleton
export const ProfileSkeleton = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-6">
        <Skeleton variant="shimmer" className="w-20 h-20 rounded-full" />
        <div className="flex-1 flex justify-around">
          {[1, 2, 3].map(i => (
            <div key={i} className="text-center space-y-1">
              <Skeleton variant="shimmer" className="h-5 w-8 mx-auto rounded" />
              <Skeleton variant="shimmer" className="h-3 w-12 mx-auto rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Skeleton variant="shimmer" className="h-4 w-32 rounded" />
        <Skeleton variant="shimmer" className="h-3 w-48 rounded" />
        <Skeleton variant="shimmer" className="h-3 w-40 rounded" />
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <Skeleton variant="shimmer" className="h-9 flex-1 rounded-lg" />
        <Skeleton variant="shimmer" className="h-9 flex-1 rounded-lg" />
        <Skeleton variant="shimmer" className="h-9 w-12 rounded-lg" />
      </div>

      {/* Highlights */}
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton variant="shimmer" className="w-16 h-16 rounded-full" />
            <Skeleton variant="shimmer" className="h-2 w-10 rounded" />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-t border-border">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex-1 py-3 flex justify-center">
            <Skeleton variant="shimmer" className="w-6 h-6 rounded" />
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-0.5">
        {[...Array(9)].map((_, i) => (
          <Skeleton key={i} variant="shimmer" className="aspect-square" />
        ))}
      </div>
    </motion.div>
  );
};

// Challenge Card Skeleton
export const ChallengeCardSkeleton = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-w-[220px] rounded-xl overflow-hidden bg-card"
    >
      <Skeleton variant="shimmer" className="h-24 w-full" />
      <div className="p-3.5 space-y-3">
        <div className="space-y-1">
          <Skeleton variant="shimmer" className="h-4 w-3/4 rounded" />
          <Skeleton variant="shimmer" className="h-3 w-full rounded" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton variant="shimmer" className="h-6 w-24 rounded-full" />
          <Skeleton variant="shimmer" className="h-8 w-16 rounded-full" />
        </div>
      </div>
    </motion.div>
  );
};

// Shop Product Skeleton
export const ProductCardSkeleton = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden bg-card"
    >
      <Skeleton variant="shimmer" className="aspect-square w-full" />
      <div className="p-3 space-y-2">
        <Skeleton variant="shimmer" className="h-4 w-3/4 rounded" />
        <Skeleton variant="shimmer" className="h-3 w-1/2 rounded" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton variant="shimmer" className="h-5 w-16 rounded" />
          <Skeleton variant="shimmer" className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </motion.div>
  );
};

// Chat Message Skeleton
export const MessageSkeleton = ({ isOwn = false }: { isOwn?: boolean }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: isOwn ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn("flex gap-2", isOwn ? "flex-row-reverse" : "flex-row")}
    >
      {!isOwn && <Skeleton variant="shimmer" className="w-8 h-8 rounded-full flex-shrink-0" />}
      <div className={cn("space-y-1", isOwn ? "items-end" : "items-start")}>
        <Skeleton 
          variant="shimmer" 
          className={cn(
            "h-10 rounded-2xl",
            isOwn ? "w-32 rounded-br-sm" : "w-40 rounded-bl-sm"
          )} 
        />
        <Skeleton variant="shimmer" className="h-2 w-12 rounded" />
      </div>
    </motion.div>
  );
};

// Notification Skeleton
export const NotificationSkeleton = () => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 p-4 border-b border-border"
    >
      <Skeleton variant="shimmer" className="w-11 h-11 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton variant="shimmer" className="h-3.5 w-3/4 rounded" />
        <Skeleton variant="shimmer" className="h-2.5 w-1/2 rounded" />
      </div>
      <Skeleton variant="shimmer" className="w-10 h-10 rounded-lg" />
    </motion.div>
  );
};

// Full Page Loading
export const FullPageSkeleton = ({ type = "feed" }: { type?: "feed" | "profile" | "shop" | "chat" }) => {
  if (type === "profile") return <ProfileSkeleton />;

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      {type === "feed" && (
        <>
          <StoriesBarSkeleton />
          {[1, 2].map(i => (
            <PostCardSkeleton key={i} />
          ))}
        </>
      )}
      {type === "shop" && (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}
      {type === "chat" && (
        <div className="space-y-4">
          {[false, true, false, true, false].map((isOwn, i) => (
            <MessageSkeleton key={i} isOwn={isOwn} />
          ))}
        </div>
      )}
    </div>
  );
};
