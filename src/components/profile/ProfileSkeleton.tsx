import { motion } from 'framer-motion';

interface ProfileSkeletonProps {
  className?: string;
}

export const ProfileSkeleton = ({ className }: ProfileSkeletonProps) => {
  return (
    <div className={`min-h-screen bg-background pb-20 ${className}`} dir="rtl">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <motion.div 
              className="h-5 w-24 bg-muted rounded"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
          <motion.div 
            className="h-6 w-6 bg-muted rounded"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
          />
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Avatar and Stats Row */}
        <div className="flex items-center gap-6 mb-4">
          <motion.div 
            className="w-20 h-20 rounded-full bg-muted"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
          />
          <div className="flex-1 flex justify-around">
            {[0, 1, 2].map((i) => (
              <div key={i} className="text-center space-y-1">
                <motion.div 
                  className="h-5 w-10 bg-muted rounded mx-auto"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 * i }}
                />
                <motion.div 
                  className="h-3 w-14 bg-muted rounded mx-auto"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.15 * i }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Bio Section */}
        <div className="mb-4 space-y-2">
          <motion.div 
            className="h-4 w-32 bg-muted rounded"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
          />
          <motion.div 
            className="h-3 w-48 bg-muted rounded"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.35 }}
          />
          <motion.div 
            className="h-3 w-40 bg-muted rounded"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <motion.div 
              key={i}
              className={`h-9 bg-muted rounded ${i <= 2 ? 'flex-1' : 'w-12'}`}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 * i }}
            />
          ))}
        </div>

        {/* Highlights */}
        <div className="flex gap-4 overflow-x-auto pb-2 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <motion.div 
                className="w-16 h-16 rounded-full bg-muted"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 * i }}
              />
              <motion.div 
                className="h-2 w-10 bg-muted rounded"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.15 * i }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex border-t border-border">
        {[1, 2, 3].map((i) => (
          <motion.div 
            key={i}
            className="flex-1 h-12 flex items-center justify-center"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 * i }}
          >
            <div className="w-5 h-5 bg-muted rounded" />
          </motion.div>
        ))}
      </div>

      {/* Grid Skeleton */}
      <div className="grid grid-cols-3 gap-0.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <motion.div 
            key={i}
            className="aspect-square bg-muted"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.05 * i }}
          />
        ))}
      </div>
    </div>
  );
};
