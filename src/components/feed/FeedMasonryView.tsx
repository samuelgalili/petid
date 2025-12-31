import { motion } from "framer-motion";
import { Heart, MessageCircle, ShoppingBag, Play, Bookmark, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface FeedItem {
  type: 'post' | 'adoption' | 'product' | 'ad' | 'suggested' | 'challenge';
  data: any;
  created_at: string;
}

interface FeedMasonryViewProps {
  items: FeedItem[];
}

export const FeedMasonryView = ({ items }: FeedMasonryViewProps) => {
  const navigate = useNavigate();

  const handleItemClick = (item: FeedItem) => {
    if (item.type === 'post' || item.type === 'suggested') {
      navigate(`/post/${item.data.id}`);
    } else if (item.type === 'adoption') {
      navigate(`/adoption?pet=${item.data.id}`);
    } else if (item.type === 'product') {
      navigate(`/shop`);
    } else if (item.type === 'challenge') {
      navigate(`/explore?challenge=${item.data.id}`);
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

  // Split items into two columns for masonry effect
  const leftColumn = items.filter((_, i) => i % 2 === 0);
  const rightColumn = items.filter((_, i) => i % 2 === 1);

  const renderCard = (item: FeedItem, index: number, isLeft: boolean) => {
    const image = getItemImage(item);
    // Vary heights for Pinterest effect
    const heights = ['h-48', 'h-64', 'h-56', 'h-72', 'h-52'];
    const height = heights[(index + (isLeft ? 0 : 2)) % heights.length];

    return (
      <motion.div
        key={`${item.type}-${item.data.id}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.05, 0.3) }}
        onClick={() => handleItemClick(item)}
        className={cn(
          "relative rounded-2xl overflow-hidden cursor-pointer group mb-3",
          height
        )}
      >
        {/* Image */}
        <img
          src={image}
          alt=""
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Type badge */}
        <div className={cn(
          "absolute top-2 right-2 px-2 py-1 rounded-full text-[10px] font-medium text-white backdrop-blur-sm",
          item.type === 'adoption' && "bg-rose-500/80",
          item.type === 'product' && "bg-primary/80",
          item.type === 'challenge' && "bg-amber-500/80",
          item.type === 'ad' && "bg-blue-500/80",
          (item.type === 'post' || item.type === 'suggested') && "bg-black/40"
        )}>
          {item.type === 'adoption' && '🐾 לאימוץ'}
          {item.type === 'product' && '🛍️ מוצר'}
          {item.type === 'challenge' && '🔥 אתגר'}
          {item.type === 'ad' && '📢 מודעה'}
          {(item.type === 'post' || item.type === 'suggested') && '📷 פוסט'}
        </div>

        {/* Bottom info - shows on hover */}
        <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Stats for posts */}
          {(item.type === 'post' || item.type === 'suggested') && (
            <div className="flex items-center gap-3 text-white text-xs">
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3 fill-white" />
                {item.data.likes_count || 0}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {item.data.comments_count || 0}
              </span>
            </div>
          )}

          {/* Price for products */}
          {item.type === 'product' && (
            <div className="flex items-center justify-between text-white">
              <span className="font-bold text-sm">{item.data.price}</span>
              {item.data.originalPrice && (
                <span className="text-xs line-through opacity-70">{item.data.originalPrice}</span>
              )}
            </div>
          )}

          {/* Name for adoption */}
          {item.type === 'adoption' && (
            <div className="text-white">
              <p className="font-bold text-sm">{item.data.name}</p>
              <p className="text-xs opacity-80">{item.data.breed || item.data.type}</p>
            </div>
          )}

          {/* Participants for challenges */}
          {item.type === 'challenge' && (
            <div className="text-white">
              <p className="font-bold text-sm">{item.data.title_he || item.data.title}</p>
              <p className="text-xs opacity-80">{item.data.participant_count} משתתפים</p>
            </div>
          )}
        </div>

        {/* Save button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            // Handle save
          }}
          className="absolute top-2 left-2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Bookmark className="w-4 h-4 text-white" />
        </motion.button>
      </motion.div>
    );
  };

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        <p>אין תוכן להצגה</p>
      </div>
    );
  }

  return (
    <div className="px-2 pt-2">
      <div className="flex gap-2">
        {/* Left column */}
        <div className="flex-1 flex flex-col">
          {leftColumn.map((item, index) => renderCard(item, index, true))}
        </div>
        
        {/* Right column */}
        <div className="flex-1 flex flex-col pt-4">
          {rightColumn.map((item, index) => renderCard(item, index, false))}
        </div>
      </div>
    </div>
  );
};
