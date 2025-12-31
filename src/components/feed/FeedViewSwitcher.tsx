import { motion } from "framer-motion";
import { LayoutGrid, List, Play, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type FeedViewMode = "feed" | "grid" | "video" | "masonry";

interface FeedViewSwitcherProps {
  viewMode: FeedViewMode;
  onViewModeChange: (mode: FeedViewMode) => void;
}

const viewModes: { id: FeedViewMode; label: string; icon: React.ElementType }[] = [
  { id: "feed", label: "פיד", icon: List },
  { id: "grid", label: "גריד", icon: LayoutGrid },
  { id: "video", label: "וידאו", icon: Play },
  { id: "masonry", label: "Pinterest", icon: LayoutDashboard },
];

export const FeedViewSwitcher = ({ viewMode, onViewModeChange }: FeedViewSwitcherProps) => {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 bg-muted/50 rounded-full p-1">
        {viewModes.map((mode) => {
          const Icon = mode.icon;
          const isActive = viewMode === mode.id;
          
          return (
            <Tooltip key={mode.id}>
              <TooltipTrigger asChild>
                <motion.button
                  onClick={() => onViewModeChange(mode.id)}
                  className={cn(
                    "relative p-2 rounded-full transition-colors",
                    isActive 
                      ? "text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  whileTap={{ scale: 0.9 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeViewMode"
                      className="absolute inset-0 bg-primary rounded-full"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.3 }}
                    />
                  )}
                  <Icon className="w-4 h-4 relative z-10" />
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{mode.label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};
