import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

export const AuthLoadingSkeleton = () => {
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4" 
      dir="ltr" 
      style={{ background: 'linear-gradient(135deg, hsl(174 43% 88%) 0%, hsl(180 40% 92%) 100%)' }}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[420px] border-0 overflow-hidden bg-background/95 backdrop-blur-sm rounded-[32px] p-12"
        style={{ boxShadow: '0 8px 32px rgba(93, 213, 200, 0.15)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="w-24 h-8 rounded-full" />
          <Skeleton className="w-6 h-6 rounded-full" />
        </div>

        {/* Banner */}
        <Skeleton className="w-full h-16 rounded-[20px] mb-5" />

        {/* Image */}
        <div className="flex justify-center mb-6">
          <Skeleton className="w-[230px] h-[230px] rounded-full" />
        </div>

        {/* Title */}
        <div className="text-center mb-8 space-y-2">
          <Skeleton className="h-10 w-32 mx-auto rounded-lg" />
          <Skeleton className="h-4 w-24 mx-auto rounded-lg" />
        </div>

        {/* Welcome */}
        <div className="mb-6 space-y-2">
          <Skeleton className="h-8 w-40 mx-auto rounded-lg" />
          <Skeleton className="h-4 w-48 mx-auto rounded-lg" />
          <Skeleton className="h-4 w-44 mx-auto rounded-lg" />
        </div>

        {/* Form */}
        <div className="space-y-4 mb-6">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>

        {/* Button */}
        <Skeleton className="h-12 w-full rounded-full mb-6" />

        {/* Social */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Skeleton className="h-20 rounded-[1.25rem]" />
          <Skeleton className="h-20 rounded-[1.25rem]" />
          <Skeleton className="h-20 rounded-[1.25rem]" />
        </div>

        {/* Links */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-32 mx-auto rounded-lg" />
          <Skeleton className="h-4 w-40 mx-auto rounded-lg" />
        </div>
      </motion.div>
    </div>
  );
};
