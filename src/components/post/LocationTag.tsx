import { MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LocationTagProps {
  locationName: string;
  className?: string;
}

export const LocationTag = ({ locationName, className = "" }: LocationTagProps) => {
  const navigate = useNavigate();

  if (!locationName) return null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigate(`/explore?location=${encodeURIComponent(locationName)}`);
      }}
      className={`flex items-center gap-1 text-[12px] text-[#8E8E8E] hover:text-[#262626] transition-colors ${className}`}
    >
      <MapPin className="w-3 h-3" />
      <span>{locationName}</span>
    </button>
  );
};
