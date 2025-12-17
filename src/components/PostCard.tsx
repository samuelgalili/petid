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
      fill={isLiked ? "hsl(342, 100%, 69%)" : "#FF9999"}
      stroke={isLiked ? "hsl(342, 100%, 59%)" : "#FF6B6B"}
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
      stroke={isLiked ? "hsl(342, 100%, 59%)" : "#FF6B6B"}
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
    setIsLicking(true);
    playLickSound();
    onLike(post.id);
    setTimeout(() => setIsLicking(false), 500);
  };

  const handleDoubleTap = () => {
    setIsLicking(true);
    playLickSound();
    onDoubleTap(post.id);
    setTimeout(() => setIsLicking(false), 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      {/* Post Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <motion.div whileTap={{ scale: 0.95 }}>
            <Avatar 
              className="w-10 h-10 ring-2 ring-gray-100 cursor-pointer"
              onClick={() => navigate(`/user/${post.user.id}`)}
            >
              <AvatarImage src={post.user.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white font-bold text-sm">
                {post.user.full_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </motion.div>
          <div 
            className="cursor-pointer"
            onClick={() => navigate(`/user/${post.user.id}`)}
          >
            <p className="font-bold text-gray-900 font-jakarta text-sm">{post.user.full_name || "משתמש"}</p>
            <p className="text-xs text-gray-400 font-jakarta">{getTimeAgo(post.created_at)}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {currentUserId !== post.user_id && (
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="sm"
                className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                  isFollowing 
                    ? 'text-gray-500 hover:text-gray-700 bg-gray-100' 
                    : 'text-white bg-gradient-to-r from-[#FF6B9D] to-[#C44FE2] hover:opacity-90'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFollow();
                }}
              >
                {isFollowing ? "עוקב ✓" : "עקוב"}
              </Button>
            </motion.div>
          )}
          <button className="text-gray-400 hover:text-gray-600 p-2 transition-colors">
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
        
        {/* Double Tap Like Animation */}
        <AnimatePresence>
          {showDoubleTapAnimation && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/10"
            >
              <DogTongueIcon isLicking={true} isLiked={true} className="w-28 h-28 text-white drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Post Actions */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <motion.button 
              whileTap={{ scale: 0.85 }}
              onClick={handleLike}
              className={`flex items-center gap-1.5 transition-all ${
                post.is_liked ? 'text-[#FF6B9D]' : 'text-gray-600 hover:text-[#FF6B9D]'
              }`}
            >
              <DogTongueIcon isLicking={isLicking} isLiked={post.is_liked} className="w-6 h-6" />
              {post.likes_count > 0 && (
                <span className="font-bold font-jakarta text-sm">{post.likes_count}</span>
              )}
            </motion.button>
            
            <motion.button 
              whileTap={{ scale: 0.85 }}
              className="flex items-center gap-1.5 text-gray-600 hover:text-[#C44FE2] transition-colors"
              onClick={() => navigate(`/post/${post.id}`)}
            >
              <MessageCircle className="w-6 h-6" strokeWidth={1.5} />
              {post.comments_count > 0 && (
                <span className="font-bold font-jakarta text-sm">{post.comments_count}</span>
              )}
            </motion.button>
            
            <motion.button 
              whileTap={{ scale: 0.85 }}
              className="text-gray-600 hover:text-[#7B68EE] transition-colors"
            >
              <Share2 className="w-6 h-6" strokeWidth={1.5} />
            </motion.button>
          </div>
          <motion.button 
            whileTap={{ scale: 0.85 }}
            onClick={() => onSave(post.id)}
            className={`transition-colors ${post.is_saved ? 'text-[#FFC107]' : 'text-gray-600 hover:text-[#FFC107]'}`}
          >
            <Bookmark className={`w-6 h-6 ${post.is_saved ? 'fill-current' : ''}`} strokeWidth={1.5} />
          </motion.button>
        </div>

        {/* Likes count */}
        {post.likes_count > 0 && (
          <p className="text-sm text-gray-900 font-bold font-jakarta mb-2">
            {post.likes_count} {post.likes_count === 1 ? 'לייק' : 'לייקים'}
          </p>
        )}

        {/* Post Caption */}
        {post.caption && (
          <p className="text-gray-800 font-jakarta text-sm leading-relaxed mb-2">
            <span 
              className="font-bold cursor-pointer hover:text-[#C44FE2] transition-colors"
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
            className="text-gray-400 text-sm font-jakarta hover:text-[#C44FE2] transition-colors"
            onClick={() => navigate(`/post/${post.id}`)}
          >
            צפה בכל {post.comments_count} התגובות
          </button>
        )}
      </div>
    </motion.div>
  );
};
