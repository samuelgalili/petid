import { Pin } from "lucide-react";

interface PinnedPostsBadgeProps {
  isPinned: boolean;
  onClick?: () => void;
  showLabel?: boolean;
}

export const PinnedPostsBadge = ({ isPinned, onClick, showLabel = false }: PinnedPostsBadgeProps) => {
  if (!isPinned) return null;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm"
    >
      <Pin className="w-3 h-3 text-primary" fill="currentColor" />
      {showLabel && (
        <span className="text-[10px] font-medium text-foreground">מוצמד</span>
      )}
    </button>
  );
};