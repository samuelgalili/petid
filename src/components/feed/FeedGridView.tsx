import { motion } from "framer-motion";
import { Heart, MessageCircle, Play, Images, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface FeedItem {
  type: 'post' | 'adoption' | 'product' | 'ad' | 'suggested' | 'challenge';
  data: any;
  created_at: string;
}

interface FeedGridViewProps {
  items: FeedItem[];
}

export const FeedGridView = ({ items }: FeedGridViewProps) => {
  const navigate = useNavigate();

  const handleItemClick = (item: FeedItem) => {
    if (item.type === 'post' || item.type === 'suggested') {
      navigate(`/post/${item.data.id}`);
    } else if (item.type === 'adoption') {
      navigate(`/adoption?pet=${item.data.id}`);
    } else if (item.type === 'product') {
      navigate(`/shop`);
    }
  };

  const getItemImage = (item: FeedItem): string => {
    switch (item.type) {
      case 'post':
      case 'suggested':
        return item.data.image_url;
      case 'adoption':
        return item.data.image_url || 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400';
      case 'product':
        return item.data.image;
      case 'ad':
        return item.data.image;
      case 'challenge':
        return item.data.cover_image_url || 'https://images.unsplash.com/photo-1544568100-847a948585b9?w=400';
      default:
        return '';
    }
  };

  const getItemOverlay = (item: FeedItem) => {
    switch (item.type) {
      case 'post':
      case 'suggested':
        return (
          <div className="flex items-center gap-3 text-white text-sm font-medium">
            <span className="flex items-center gap-1">
              <Heart className="w-4 h-4 fill-white" />
              {item.data.likes_count || 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4 fill-white" />
              {item.data.comments_count || 0}
            </span>
          </div>
        );
      case 'adoption':
        return (
          <div className="text-white text-sm font-medium">
            <span className="bg-primary/80 px-2 py-0.5 rounded-full">
              🐾 {item.data.name}
            </span>
          </div>
        );
      case 'product':
        return (
          <div className="flex items-center gap-2 text-white text-sm font-medium">
            <ShoppingBag className="w-4 h-4" />
            <span>{item.data.price}</span>
          </div>
        );
      case 'challenge':
        return (
          <div className="text-white text-sm font-medium">
            <span className="bg-primary/80 px-2 py-0.5 rounded-full">
              🔥 {item.data.participant_count} משתתפים
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  const getBadge = (item: FeedItem) => {
    if (item.type === 'adoption') {
      return <Heart className="w-3 h-3 text-white fill-rose-500" />;
    }
    if (item.type === 'product') {
      return <ShoppingBag className="w-3 h-3 text-white" />;
    }
    if (item.type === 'challenge') {
      return <Play className="w-3 h-3 text-white fill-white" />;
    }
    // Check if post has multiple images (mock check)
    if ((item.type === 'post' || item.type === 'suggested') && item.data.image_url?.includes(',')) {
      return <Images className="w-3 h-3 text-white" />;
    }
    return null;
  };

  return (
    <div className="grid grid-cols-3 gap-0.5 px-0.5">
      {items.map((item, index) => {
        const image = getItemImage(item);
        const badge = getBadge(item);
        
        return (
          <motion.button
            key={`${item.type}-${item.data.id}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(index * 0.02, 0.2) }}
            onClick={() => handleItemClick(item)}
            className="relative aspect-square overflow-hidden bg-muted group"
          >
            <img
              src={image}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {getItemOverlay(item)}
            </div>
            
            {/* Badge */}
            {badge && (
              <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1.5">
                {badge}
              </div>
            )}
            
            {/* Type indicator for non-posts */}
            {item.type !== 'post' && item.type !== 'suggested' && (
              <div className={cn(
                "absolute bottom-0 left-0 right-0 py-1 px-2 text-[10px] font-medium text-white text-center",
                item.type === 'adoption' && "bg-gradient-to-t from-rose-500/80",
                item.type === 'product' && "bg-gradient-to-t from-primary/80",
                item.type === 'challenge' && "bg-gradient-to-t from-amber-500/80",
                item.type === 'ad' && "bg-gradient-to-t from-blue-500/80"
              )}>
                {item.type === 'adoption' && 'אימוץ'}
                {item.type === 'product' && 'מוצר'}
                {item.type === 'challenge' && 'אתגר'}
                {item.type === 'ad' && 'מודעה'}
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};
