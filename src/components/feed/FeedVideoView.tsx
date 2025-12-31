import { motion } from "framer-motion";
import { Heart, MessageCircle, Share2, Bookmark, Music2, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface FeedItem {
  type: 'post' | 'adoption' | 'product' | 'ad' | 'suggested' | 'challenge';
  data: any;
  created_at: string;
}

interface FeedVideoViewProps {
  items: FeedItem[];
  currentUserId?: string;
  onLike?: (postId: string) => void;
  onSave?: (postId: string) => void;
}

export const FeedVideoView = ({ items, currentUserId, onLike, onSave }: FeedVideoViewProps) => {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);

  // Filter to show only visual content
  const visualItems = items.filter(item => 
    item.type === 'post' || item.type === 'suggested' || item.type === 'adoption' || item.type === 'challenge'
  );

  const getItemImage = (item: FeedItem): string => {
    switch (item.type) {
      case 'post':
      case 'suggested':
        return item.data.image_url;
      case 'adoption':
        return item.data.image_url || 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800';
      case 'challenge':
        return item.data.cover_image_url || 'https://images.unsplash.com/photo-1544568100-847a948585b9?w=800';
      default:
        return '';
    }
  };

  const getItemCaption = (item: FeedItem): string => {
    switch (item.type) {
      case 'post':
      case 'suggested':
        return item.data.caption || '';
      case 'adoption':
        return `🐾 ${item.data.name} מחפש בית חם`;
      case 'challenge':
        return `🔥 ${item.data.title_he || item.data.title}`;
      default:
        return '';
    }
  };

  const getUsername = (item: FeedItem): string => {
    switch (item.type) {
      case 'post':
      case 'suggested':
        return item.data.user?.full_name || 'משתמש';
      case 'adoption':
        return 'עמותת הצלה';
      case 'challenge':
        return 'PetID אתגר';
      default:
        return '';
    }
  };

  if (visualItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
        <p>אין תוכן וידאו להצגה</p>
      </div>
    );
  }

  return (
    <div className="snap-y snap-mandatory h-[calc(100vh-180px)] overflow-y-auto scrollbar-hide">
      {visualItems.map((item, index) => (
        <motion.div
          key={`${item.type}-${item.data.id}`}
          className="snap-start h-[calc(100vh-180px)] relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 }}
        >
          {/* Full screen image/video */}
          <div className="absolute inset-0 bg-black">
            <img
              src={getItemImage(item)}
              alt=""
              className="w-full h-full object-cover"
              loading={index < 3 ? "eager" : "lazy"}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />
          </div>

          {/* Right side actions */}
          <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">
            {/* Profile */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (item.type === 'post' || item.type === 'suggested') {
                  navigate(`/profile/${item.data.user_id}`);
                }
              }}
              className="relative"
            >
              <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-muted">
                {(item.type === 'post' || item.type === 'suggested') && item.data.user?.avatar_url ? (
                  <img src={item.data.user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                +
              </div>
            </motion.button>

            {/* Like */}
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={() => {
                if ((item.type === 'post' || item.type === 'suggested') && onLike) {
                  onLike(item.data.id);
                }
              }}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Heart 
                  className={`w-6 h-6 ${item.data.is_liked ? 'fill-rose-500 text-rose-500' : 'text-white'}`} 
                />
              </div>
              <span className="text-white text-xs font-medium">
                {item.data.likes_count || 0}
              </span>
            </motion.button>

            {/* Comment */}
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={() => {
                if (item.type === 'post' || item.type === 'suggested') {
                  navigate(`/post/${item.data.id}`);
                }
              }}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-xs font-medium">
                {item.data.comments_count || 0}
              </span>
            </motion.button>

            {/* Save */}
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={() => {
                if ((item.type === 'post' || item.type === 'suggested') && onSave) {
                  onSave(item.data.id);
                }
              }}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Bookmark 
                  className={`w-6 h-6 ${item.data.is_saved ? 'fill-white text-white' : 'text-white'}`} 
                />
              </div>
            </motion.button>

            {/* Share */}
            <motion.button
              whileTap={{ scale: 0.8 }}
              className="flex flex-col items-center gap-1"
            >
              <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <Share2 className="w-6 h-6 text-white" />
              </div>
            </motion.button>
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-6 left-3 right-16 text-white" dir="rtl">
            {/* Username */}
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-sm">@{getUsername(item)}</span>
              {item.type === 'adoption' && (
                <span className="bg-rose-500/80 px-2 py-0.5 rounded-full text-xs">לאימוץ</span>
              )}
              {item.type === 'challenge' && (
                <span className="bg-amber-500/80 px-2 py-0.5 rounded-full text-xs">אתגר</span>
              )}
            </div>

            {/* Caption */}
            <p className="text-sm line-clamp-2 mb-3">
              {getItemCaption(item)}
            </p>

            {/* Sound/Music bar */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 w-fit">
              <Music2 className="w-3 h-3" />
              <span className="text-xs">🐾 PetID • Original Sound</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
