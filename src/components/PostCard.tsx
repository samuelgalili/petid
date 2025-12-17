import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Share2, Bookmark, MoreVertical, Smile } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFollow } from "@/hooks/useFollow";
import { useRequireAuth } from "@/hooks/useRequireAuth";

// Custom Dog Tongue Icon Component
const DogTongueIcon = ({ isLicking, isLiked, className }: { isLicking: boolean; isLiked: boolean; className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Dog face - rounded shape */}
    <motion.path
      d="M4 11C4 7 7 4 12 4C17 4 20 7 20 11C20 15 17 17 12 17C7 17 4 15 4 11Z"
      stroke="currentColor"
      strokeWidth="1.5"
      fill={isLiked ? "currentColor" : "none"}
      initial={false}
    />
    {/* Left floppy ear */}
    <path
      d="M5.5 8C4.5 5 3 3.5 2 4C1 4.5 1.5 7 3 9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill={isLiked ? "currentColor" : "none"}
    />
    {/* Right floppy ear */}
    <path
      d="M18.5 8C19.5 5 21 3.5 22 4C23 4.5 22.5 7 21 9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill={isLiked ? "currentColor" : "none"}
    />
    {/* Left eye */}
    <circle cx="8.5" cy="9.5" r="1.5" fill={isLiked ? "white" : "currentColor"} />
    {/* Left eye sparkle */}
    <circle cx="8" cy="9" r="0.5" fill={isLiked ? "currentColor" : "white"} />
    {/* Right eye */}
    <circle cx="15.5" cy="9.5" r="1.5" fill={isLiked ? "white" : "currentColor"} />
    {/* Right eye sparkle */}
    <circle cx="15" cy="9" r="0.5" fill={isLiked ? "currentColor" : "white"} />
    {/* Nose - heart shaped */}
    <path
      d="M12 11.5C12 11.5 10.5 11 10.5 12.5C10.5 13.5 12 14.5 12 14.5C12 14.5 13.5 13.5 13.5 12.5C13.5 11 12 11.5 12 11.5Z"
      fill={isLiked ? "#333" : "currentColor"}
    />
    {/* Nose highlight */}
    <ellipse cx="11.5" cy="12" rx="0.4" ry="0.3" fill={isLiked ? "#666" : "white"} opacity="0.6" />
    {/* Left whiskers */}
    <g stroke={isLiked ? "white" : "currentColor"} strokeWidth="0.5" strokeLinecap="round" opacity="0.7">
      <line x1="6" y1="11" x2="3" y2="10" />
      <line x1="6" y1="12" x2="3" y2="12" />
      <line x1="6" y1="13" x2="3" y2="14" />
    </g>
    {/* Right whiskers */}
    <g stroke={isLiked ? "white" : "currentColor"} strokeWidth="0.5" strokeLinecap="round" opacity="0.7">
      <line x1="18" y1="11" x2="21" y2="10" />
      <line x1="18" y1="12" x2="21" y2="12" />
      <line x1="18" y1="13" x2="21" y2="14" />
    </g>
    {/* Mouth line */}
    <path
      d="M10 14.5C10.5 15 11.5 15.5 12 15.5C12.5 15.5 13.5 15 14 14.5"
      stroke={isLiked ? "white" : "currentColor"}
      strokeWidth="0.8"
      strokeLinecap="round"
      fill="none"
    />
    {/* Tongue with licking animation */}
    <motion.path
      d="M12 15.5C12 15.5 10.5 17 10.5 19C10.5 20.5 11 21.5 12 21.5C13 21.5 13.5 20.5 13.5 19C13.5 17 12 15.5 12 15.5Z"
      fill={isLiked ? "#ED4956" : "#FF9999"}
      stroke={isLiked ? "#D62839" : "#FF6B6B"}
      strokeWidth="0.5"
      initial={false}
      animate={isLicking ? {
        scaleY: [1, 1.4, 0.9, 1.3, 1],
        y: [0, 3, -1, 2, 0],
        rotate: [0, -8, 8, -5, 0]
      } : {}}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    />
    {/* Tongue center line */}
    <motion.line
      x1="12"
      y1="16"
      x2="12"
      y2="20"
      stroke={isLiked ? "#D62839" : "#FF6B6B"}
      strokeWidth="0.3"
      opacity="0.5"
      initial={false}
      animate={isLicking ? {
        scaleY: [1, 1.4, 0.9, 1.3, 1],
        y: [0, 3, -1, 2, 0],
      } : {}}
      transition={{ duration: 0.6, ease: "easeInOut" }}
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
  currentUserAvatar?: string;
  onLike: (postId: string) => void;
  onSave: (postId: string) => void;
  onDoubleTap: (postId: string) => void;
  onComment?: (postId: string, comment: string) => void;
  showDoubleTapAnimation: boolean;
  getTimeAgo: (dateString: string) => string;
}

export const PostCard = ({
  post,
  currentUserId,
  currentUserAvatar,
  onLike,
  onSave,
  onDoubleTap,
  onComment,
  showDoubleTapAnimation,
  getTimeAgo,
}: PostCardProps) => {
  const navigate = useNavigate();
  const { isFollowing, toggleFollow } = useFollow(post.user_id);
  const { checkAuth, isAuthenticated } = useRequireAuth();
  const [isLicking, setIsLicking] = useState(false);
  const [commentText, setCommentText] = useState("");

  const handleComment = () => {
    if (!checkAuth("כדי להגיב על פוסטים, יש להתחבר")) return;
    if (commentText.trim() && onComment) {
      onComment(post.id, commentText.trim());
      setCommentText("");
    }
  };

  // Play lick sound using Web Audio API
  const playLickSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create a "slurp/lick" sound with multiple oscillators
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      
      // Setup filter for wet sound
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, audioContext.currentTime);
      filter.frequency.exponentialRampToValueAtTime(2000, audioContext.currentTime + 0.1);
      filter.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.2);
      
      oscillator1.connect(filter);
      oscillator2.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Sweeping frequency for lick effect
      oscillator1.type = 'sine';
      oscillator1.frequency.setValueAtTime(300, audioContext.currentTime);
      oscillator1.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.08);
      oscillator1.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.15);
      
      oscillator2.type = 'triangle';
      oscillator2.frequency.setValueAtTime(150, audioContext.currentTime);
      oscillator2.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
      
      // Volume envelope
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
      
      oscillator1.start(audioContext.currentTime);
      oscillator2.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 0.2);
      oscillator2.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.log('Could not play lick sound:', error);
    }
  };

  const handleLike = () => {
    if (!checkAuth("כדי לסמן לייק, יש להתחבר")) return;
    setIsLicking(true);
    playLickSound();
    onLike(post.id);
    setTimeout(() => setIsLicking(false), 500);
  };

  const handleDoubleTap = () => {
    if (!checkAuth("כדי לסמן לייק, יש להתחבר")) return;
    setIsLicking(true);
    playLickSound();
    onDoubleTap(post.id);
    setTimeout(() => setIsLicking(false), 500);
  };

  const handleSave = () => {
    if (!checkAuth("כדי לשמור פוסטים, יש להתחבר")) return;
    onSave(post.id);
  };

  const handleFollow = () => {
    if (!checkAuth("כדי לעקוב אחרי משתמשים, יש להתחבר")) return;
    toggleFollow();
  };

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Post Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-3">
          <div 
            className="cursor-pointer"
            onClick={() => navigate(`/user/${post.user.id}`)}
          >
            <Avatar className="w-8 h-8">
              <AvatarImage src={post.user.avatar_url} />
              <AvatarFallback className="bg-gray-100 text-gray-600 text-xs font-medium">
                {post.user.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
          <div 
            className="cursor-pointer"
            onClick={() => navigate(`/user/${post.user.id}`)}
          >
            <p className="font-semibold text-[#262626] text-[13px] leading-tight">{post.user.full_name || "משתמש"}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {currentUserId !== post.user_id && (
            <button
              className={`text-[13px] font-semibold ${
                isFollowing 
                  ? 'text-[#262626]' 
                  : 'text-[#0095F6]'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleFollow();
              }}
            >
              {isFollowing ? "" : "עקוב"}
            </button>
          )}
          <button className="text-[#262626] p-1">
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
        
        {/* Double Tap Like Animation - Instagram Style Heart */}
        <AnimatePresence>
          {showDoubleTapAnimation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
            >
              <motion.svg
                viewBox="0 0 24 24"
                className="w-28 h-28 drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
                initial={{ scale: 0, rotate: -15 }}
                animate={{ 
                  scale: [0, 1.3, 1.1, 1.2, 1],
                  rotate: [-15, 10, -5, 5, 0]
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ 
                  duration: 0.6,
                  times: [0, 0.3, 0.5, 0.7, 1],
                  ease: "easeOut"
                }}
              >
                <motion.path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  fill="white"
                  stroke="white"
                  strokeWidth="0.5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.svg>
              
              {/* Particle effects */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 rounded-full bg-white"
                  initial={{ 
                    scale: 0,
                    x: 0,
                    y: 0,
                    opacity: 1
                  }}
                  animate={{ 
                    scale: [0, 1, 0],
                    x: Math.cos((i / 8) * Math.PI * 2) * 80,
                    y: Math.sin((i / 8) * Math.PI * 2) * 80,
                    opacity: [1, 1, 0]
                  }}
                  transition={{ 
                    duration: 0.6,
                    delay: 0.1,
                    ease: "easeOut"
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Post Actions */}
      <div className="px-3 pt-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLike}
              className="active:opacity-50 transition-opacity"
            >
              <DogTongueIcon 
                isLicking={isLicking} 
                isLiked={post.is_liked} 
                className={`w-6 h-6 ${post.is_liked ? 'text-[#ED4956]' : 'text-[#262626]'}`} 
              />
            </button>
            
            <button 
              className="text-[#262626] active:opacity-50 transition-opacity"
              onClick={() => navigate(`/post/${post.id}`)}
            >
              <MessageCircle className="w-6 h-6" strokeWidth={1.5} />
            </button>
            
            <button className="text-[#262626] active:opacity-50 transition-opacity">
              <Share2 className="w-6 h-6" strokeWidth={1.5} />
            </button>
          </div>
          <button 
            onClick={handleSave}
            className="text-[#262626] active:opacity-50 transition-opacity"
          >
            <Bookmark className={`w-6 h-6 ${post.is_saved ? 'fill-[#262626]' : ''}`} strokeWidth={1.5} />
          </button>
        </div>

        {/* Likes count */}
        {post.likes_count > 0 && (
          <p className="text-[13px] text-[#262626] font-semibold mb-1">
            {post.likes_count.toLocaleString()} לייקים
          </p>
        )}

        {/* Post Caption */}
        {post.caption && (
          <p className="text-[#262626] text-[13px] leading-[18px] mb-1">
            <span 
              className="font-semibold cursor-pointer"
              onClick={() => navigate(`/user/${post.user.id}`)}
            >
              {post.user.full_name || "משתמש"}
            </span>{" "}
            {post.caption}
          </p>
        )}

        {/* View Comments */}
        {post.comments_count > 0 && (
          <button 
            className="text-[#8E8E8E] text-[13px] mb-1"
            onClick={() => navigate(`/post/${post.id}`)}
          >
            הצג את כל {post.comments_count} התגובות
          </button>
        )}

        {/* Time ago */}
        <p className="text-[#8E8E8E] text-[10px] uppercase tracking-wide">
          {getTimeAgo(post.created_at)}
        </p>
      </div>

      {/* Quick Reply Field */}
      <div className="flex items-center gap-3 px-3 py-3 border-t border-gray-100">
        <Avatar className="w-7 h-7 flex-shrink-0">
          <AvatarImage src={currentUserAvatar} />
          <AvatarFallback className="bg-gray-100 text-gray-500 text-[10px]">
            U
          </AvatarFallback>
        </Avatar>
        <input
          type="text"
          placeholder={isAuthenticated ? "הוסף תגובה..." : "התחבר כדי להגיב..."}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleComment()}
          onFocus={() => !isAuthenticated && checkAuth("כדי להגיב על פוסטים, יש להתחבר")}
          className="flex-1 bg-transparent text-[13px] text-[#262626] placeholder-[#8E8E8E] outline-none"
          readOnly={!isAuthenticated}
        />
        <button className="text-[#8E8E8E] p-1">
          <Smile className="w-5 h-5" strokeWidth={1.5} />
        </button>
        {commentText.trim() && (
          <button 
            onClick={handleComment}
            className="text-[#0095F6] text-[13px] font-semibold"
          >
            פרסם
          </button>
        )}
      </div>
    </div>
  );
};
