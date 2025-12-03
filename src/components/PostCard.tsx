import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Share2, Bookmark, MoreVertical } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { OptimizedImage } from "@/components/OptimizedImage";
import { Button } from "@/components/ui/button";
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useFollow } from "@/hooks/useFollow";

// Custom Dog Tongue Icon Component
const DogTongueIcon = ({ isLicking, isLiked, className }: { isLicking: boolean; isLiked: boolean; className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Dog face outline */}
    <motion.ellipse
      cx="12"
      cy="10"
      rx="8"
      ry="7"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={isLiked ? "currentColor" : "none"}
      initial={false}
    />
    {/* Left ear */}
    <path
      d="M5 6C4 3 6 1 8 3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill={isLiked ? "currentColor" : "none"}
    />
    {/* Right ear */}
    <path
      d="M19 6C20 3 18 1 16 3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill={isLiked ? "currentColor" : "none"}
    />
    {/* Left eye */}
    <circle cx="9" cy="9" r="1.2" fill={isLiked ? "white" : "currentColor"} />
    {/* Right eye */}
    <circle cx="15" cy="9" r="1.2" fill={isLiked ? "white" : "currentColor"} />
    {/* Nose */}
    <ellipse cx="12" cy="12" rx="1.5" ry="1" fill={isLiked ? "white" : "currentColor"} />
    {/* Tongue with licking animation */}
    <motion.path
      d="M12 14C12 14 10 16 10 18C10 19.5 11 20.5 12 20.5C13 20.5 14 19.5 14 18C14 16 12 14 12 14Z"
      fill={isLiked ? "#FF69B4" : "#FF9999"}
      stroke={isLiked ? "#FF1493" : "#FF6B6B"}
      strokeWidth="0.5"
      initial={false}
      animate={isLicking ? {
        scaleY: [1, 1.3, 1, 1.2, 1],
        y: [0, 2, 0, 1, 0],
        rotate: [0, -5, 5, -3, 0]
      } : {}}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    />
  </svg>
);

interface PostCardProps {
  post: {
    id: string;
    user_id: string;
    image_url: string;
    caption: string;
    created_at: string;
    user: {
      id: string;
      full_name: string;
      avatar_url: string;
    };
    likes_count: number;
    comments_count: number;
    is_liked: boolean;
    is_saved: boolean;
  };
  currentUserId?: string;
  onLike: (postId: string) => void;
  onSave: (postId: string) => void;
  onDoubleTap: (postId: string) => void;
  showDoubleTapAnimation: boolean;
  getTimeAgo: (dateString: string) => string;
}

export const PostCard = ({
  post,
  currentUserId,
  onLike,
  onSave,
  onDoubleTap,
  showDoubleTapAnimation,
  getTimeAgo,
}: PostCardProps) => {
  const navigate = useNavigate();
  const { isFollowing, toggleFollow } = useFollow(post.user_id);
  const [isLicking, setIsLicking] = useState(false);

  const handleLike = () => {
    setIsLicking(true);
    onLike(post.id);
    setTimeout(() => setIsLicking(false), 500);
  };

  const handleDoubleTap = () => {
    setIsLicking(true);
    onDoubleTap(post.id);
    setTimeout(() => setIsLicking(false), 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-4"
    >
      {/* Post Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Avatar 
            className="w-11 h-11 ring-2 ring-gray-100 cursor-pointer"
            onClick={() => navigate(`/user/${post.user.id}`)}
          >
            <AvatarImage src={post.user.avatar_url} />
            <AvatarFallback className="bg-gradient-instagram text-white font-black text-sm">
              {post.user.full_name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div 
            className="cursor-pointer"
            onClick={() => navigate(`/user/${post.user.id}`)}
          >
            <p className="font-black text-gray-900 font-jakarta text-[15px]">{post.user.full_name || "משתמש"}</p>
            <p className="text-xs text-gray-500 font-jakarta">{getTimeAgo(post.created_at)}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {currentUserId !== post.user_id && (
            <Button
              variant="ghost"
              size="sm"
              className={`text-xs font-black px-3 py-1 rounded-lg ${
                isFollowing 
                  ? 'text-gray-600 hover:text-gray-900' 
                  : 'text-instagram-pink hover:text-instagram-purple'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                toggleFollow();
              }}
            >
              {isFollowing ? "עוקב" : "עקוב"}
            </Button>
          )}
          <button className="text-icon-base hover:text-icon-active p-2 transition-colors">
            <MoreVertical className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Post Image with Double Tap */}
      <div 
        className="relative cursor-pointer select-none"
        onDoubleClick={handleDoubleTap}
      >
        <OptimizedImage
          src={post.image_url}
          alt={post.caption || "פוסט"}
          className="w-full aspect-square"
          objectFit="cover"
          sizes="(max-width: 768px) 100vw, 672px"
        />
        
        {/* Double Tap Lick Animation */}
        {showDoubleTapAnimation && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <DogTongueIcon isLicking={true} isLiked={true} className="w-24 h-24 text-white drop-shadow-2xl" />
          </motion.div>
        )}
      </div>

      {/* Post Actions */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-5">
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={handleLike}
              className={`flex items-center gap-2 transition-all ${
                post.is_liked ? 'text-instagram-pink' : 'text-icon-base hover:text-icon-active'
              }`}
            >
              <DogTongueIcon isLicking={isLicking} isLiked={post.is_liked} className="w-7 h-7" />
              {post.likes_count > 0 && (
                <span className="font-black font-jakarta">{post.likes_count}</span>
              )}
            </motion.button>
            
            <motion.button 
              whileTap={{ scale: 0.9 }}
              className="flex items-center gap-2 text-icon-base hover:text-icon-active transition-colors"
              onClick={() => navigate(`/post/${post.id}`)}
            >
              <MessageCircle className="w-7 h-7" strokeWidth={1.5} />
              {post.comments_count > 0 && (
                <span className="font-black font-jakarta">{post.comments_count}</span>
              )}
            </motion.button>
            
            <motion.button 
              whileTap={{ scale: 0.9 }}
              className="text-icon-base hover:text-icon-active transition-colors"
            >
              <Share2 className="w-7 h-7" strokeWidth={1.5} />
            </motion.button>
          </div>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => onSave(post.id)}
            className={`transition-colors ${post.is_saved ? 'text-instagram-orange' : 'text-icon-base hover:text-icon-active'}`}
          >
            <Bookmark className={`w-7 h-7 ${post.is_saved ? 'fill-current' : ''}`} strokeWidth={1.5} />
          </motion.button>
        </div>

        {/* Liked by */}
        {post.likes_count > 0 && (
          <div className="mb-3">
            <p className="text-sm text-gray-900 font-jakarta">
              <span className="font-black">
                {post.likes_count} {post.likes_count === 1 ? 'לייק' : 'לייקים'}
              </span>
            </p>
          </div>
        )}

        {/* Post Caption */}
        {post.caption && (
          <div className="mb-2">
            <p className="text-gray-900 font-jakarta text-[15px]">
              <span 
                className="font-black cursor-pointer hover:text-instagram-pink transition-colors"
                onClick={() => navigate(`/user/${post.user.id}`)}
              >
                {post.user.full_name || "משתמש"}
              </span>{" "}
              {post.caption}
            </p>
          </div>
        )}

        {/* View Comments */}
        {post.comments_count > 0 && (
          <button 
            className="text-gray-500 text-sm font-jakarta hover:text-gray-700 font-semibold transition-colors"
            onClick={() => navigate(`/post/${post.id}`)}
          >
            הצג את כל {post.comments_count} התגובות
          </button>
        )}
      </div>
    </motion.div>
  );
};