import { Eye } from "lucide-react";

interface ViewsCounterProps {
  count: number;
  className?: string;
}

export const ViewsCounter = ({ count, className = "" }: ViewsCounterProps) => {
  if (count === 0) return null;

  const formatCount = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  return (
    <div className={`flex items-center gap-1 text-[13px] text-[#8E8E8E] ${className}`}>
      <Eye className="w-3.5 h-3.5" />
      <span>{formatCount(count)} צפיות</span>
    </div>
  );
};
