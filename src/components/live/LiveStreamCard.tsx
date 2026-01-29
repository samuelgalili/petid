import { useState } from "react";
import { Radio, Eye, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface LiveStreamCardProps {
  stream: {
    id: string;
    title: string | null;
    thumbnail_url: string | null;
    viewer_count: number;
    status: string;
    user_id: string;
    started_at: string | null;
  };
  user?: {
    username: string;
    avatar_url: string | null;
  };
}

export const LiveStreamCard = ({ stream, user }: LiveStreamCardProps) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    navigate(`/live/${stream.id}`);
  };

  return (
    <div
      className="relative cursor-pointer rounded-xl overflow-hidden group"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-muted relative">
        {stream.thumbnail_url ? (
          <img
            src={stream.thumbnail_url}
            alt={stream.title || "Live stream"}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-pink-500 via-red-500 to-orange-500 flex items-center justify-center">
            <Radio className="w-12 h-12 text-white animate-pulse" />
          </div>
        )}

        {/* Live Badge */}
        {stream.status === "live" && (
          <Badge className="absolute top-2 right-2 bg-red-600 text-white border-none gap-1">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            LIVE
          </Badge>
        )}

        {/* Viewer Count */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
          <Eye className="w-3 h-3" />
          {stream.viewer_count.toLocaleString()}
        </div>

        {/* Gradient Overlay on Hover */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-200 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>

      {/* User Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center gap-2" dir="rtl">
        <Avatar className="w-8 h-8 ring-2 ring-red-500">
          <AvatarImage src={user?.avatar_url || undefined} />
          <AvatarFallback>{user?.username?.[0] || "?"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">
            {user?.username || "משתמש"}
          </p>
          {stream.title && (
            <p className="text-white/70 text-xs truncate">{stream.title}</p>
          )}
        </div>
      </div>
    </div>
  );
};
