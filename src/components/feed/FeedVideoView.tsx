import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Share2, User, ShoppingBag, PawPrint, Info, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import { toast } from "sonner";

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

/** Format large numbers like TikTok (67.3k, 1.2M) */
const formatCount = (count: number): string => {
  if (!count) return '0';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return count.toString();
};

export const FeedVideoView = ({ items, currentUserId, onLike, onSave }: FeedVideoViewProps) => {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const [showProductDetails, setShowProductDetails] = useState<string | null>(null);

  // Include product items too
  const visualItems = items.filter(item =>
    item.type === 'post' || item.type === 'suggested' || item.type === 'adoption' || item.type === 'challenge' || item.type === 'product'
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
      case 'product':
        return item.data.image_url || item.data.images?.[0] || '';
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
      case 'product':
        return item.data.description || item.data.name || '';
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
      case 'product':
        return item.data.business_name || 'חנות';
      default:
        return '';
    }
  };

  const handleShare = useCallback(async (item: FeedItem) => {
    const url = `${window.location.origin}/post/${item.data.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: getItemCaption(item), url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('הקישור הועתק');
    }
  }, []);

  if (visualItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
        <p>אין תוכן וידאו להצגה</p>
      </div>
    );
  }

  return (
    <div className="snap-y snap-mandatory h-[calc(100vh-180px)] overflow-y-auto scrollbar-hide flex flex-col items-center">
      {visualItems.map((item, index) => (
        <motion.div
          key={`${item.type}-${item.data.id}`}
          className="snap-start w-full max-w-[calc((100vh-180px)*9/16)] aspect-[9/16] relative mx-auto"
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
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70" />
          </div>

          {/* Right side actions — no background circles, TikTok style */}
          <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5">
            {/* Profile */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (item.type === 'post' || item.type === 'suggested') {
                  navigate(`/profile/${item.data.user_id}`);
                }
              }}
              className="relative mb-2"
            >
              <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden bg-muted">
                {(item.type === 'post' || item.type === 'suggested') && item.data.user?.avatar_url ? (
                  <img src={item.data.user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-700">
                    <User className="w-6 h-6 text-white/70" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
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
              <Heart
                className={`w-7 h-7 ${item.data.is_liked ? 'fill-rose-500 text-rose-500' : 'text-white'}`}
                strokeWidth={1.5}
              />
              <span className="text-white text-[11px] font-semibold">
                {formatCount(item.data.likes_count || 0)}
              </span>
            </motion.button>

            {/* Comment */}
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={() => {
                if (item.type === 'post' || item.type === 'suggested') {
                  navigate(`/post/${item.data.id}`);
                } else if (item.type === 'product') {
                  navigate(`/shop/product/${item.data.id}`);
                } else if (item.type === 'adoption') {
                  navigate(`/adoption/${item.data.id}`);
                }
              }}
              className="flex flex-col items-center gap-1"
            >
              <MessageCircle className="w-7 h-7 text-white" strokeWidth={1.5} />
              <span className="text-white text-[11px] font-semibold">
                {formatCount(item.data.comments_count || 0)}
              </span>
            </motion.button>

            {/* Share */}
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={() => handleShare(item)}
              className="flex flex-col items-center gap-1"
            >
              <Share2 className="w-7 h-7 text-white" strokeWidth={1.5} />
              <span className="text-white text-[11px] font-semibold">
                {formatCount(item.data.shares_count || 0)}
              </span>
            </motion.button>

            {/* Spinning music disc */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="w-10 h-10 rounded-full border-2 border-neutral-600 overflow-hidden mt-2"
            >
              <img
                src={(item.type === 'post' || item.type === 'suggested') && item.data.user?.avatar_url
                  ? item.data.user.avatar_url
                  : 'https://api.dicebear.com/7.x/bottts/svg?seed=petid'}
                alt=""
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>

          {/* Bottom info */}
          <div className="absolute bottom-4 left-3 right-16 text-white" dir="rtl">
            {/* Username */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-bold text-[15px]">@{getUsername(item)}</span>
              {item.type === 'adoption' && (
                <span className="bg-rose-500/80 px-2 py-0.5 rounded-full text-[11px]">לאימוץ</span>
              )}
              {item.type === 'challenge' && (
                <span className="bg-amber-500/80 px-2 py-0.5 rounded-full text-[11px]">אתגר</span>
              )}
              {item.type === 'product' && (
                <span className="bg-emerald-500/80 px-2 py-0.5 rounded-full text-[11px]">מוצר</span>
              )}
            </div>

            {/* Caption */}
            <p className="text-[13px] line-clamp-2 mb-2">
              {getItemCaption(item)}
            </p>

            {/* Product details bar */}
            {item.type === 'product' && (
              <div className="mb-2 space-y-2">
                {/* Price + details */}
                <div className="flex items-center gap-2 flex-wrap">
                  {item.data.price && (
                    <span className="bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-bold">
                      ₪{item.data.price}
                    </span>
                  )}
                  {item.data.weight_unit && (
                    <span className="bg-white/10 rounded-full px-2 py-1 text-[11px]">
                      ⚖️ {item.data.weight_unit}
                    </span>
                  )}
                  {item.data.category && (
                    <span className="bg-white/10 rounded-full px-2 py-1 text-[11px]">
                      {item.data.category}
                    </span>
                  )}
                  {item.data.flavors?.length > 0 && (
                    <span className="bg-white/10 rounded-full px-2 py-1 text-[11px]">
                      🎨 {item.data.flavors.length} סוגים
                    </span>
                  )}
                </div>

                {/* CTA: Buy */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(`/shop/product/${item.data.id}`)}
                  className="flex items-center justify-between w-full bg-emerald-500 hover:bg-emerald-600 transition-colors rounded-lg px-3 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    <span className="text-sm font-bold">קנה עכשיו</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Info
                      className="w-4 h-4 opacity-70"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/shop/product/${item.data.id}`);
                      }}
                    />
                    <ChevronLeft className="w-4 h-4" />
                  </div>
                </motion.button>
              </div>
            )}

            {/* Adoption CTA */}
            {item.type === 'adoption' && (
              <div className="mb-2 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.data.breed && (
                    <span className="bg-white/10 rounded-full px-2 py-1 text-[11px]">
                      🐕 {item.data.breed}
                    </span>
                  )}
                  {item.data.age_years && (
                    <span className="bg-white/10 rounded-full px-2 py-1 text-[11px]">
                      📅 {item.data.age_years} שנים
                    </span>
                  )}
                  {item.data.size && (
                    <span className="bg-white/10 rounded-full px-2 py-1 text-[11px]">
                      📏 {item.data.size}
                    </span>
                  )}
                  {item.data.gender && (
                    <span className="bg-white/10 rounded-full px-2 py-1 text-[11px]">
                      {item.data.gender === 'male' ? '♂️' : '♀️'} {item.data.gender === 'male' ? 'זכר' : 'נקבה'}
                    </span>
                  )}
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(`/adoption/${item.data.id}`)}
                  className="flex items-center justify-between w-full bg-rose-500 hover:bg-rose-600 transition-colors rounded-lg px-3 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <PawPrint className="w-4 h-4" />
                    <span className="text-sm font-bold">אמץ עכשיו</span>
                  </div>
                  <ChevronLeft className="w-4 h-4" />
                </motion.button>
              </div>
            )}

            {/* Sound/Music bar */}
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <span className="text-xs">♫</span>
              </motion.div>
              <div className="overflow-hidden flex-1">
                <motion.span
                  animate={{ x: [0, -100, 0] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="text-xs whitespace-nowrap inline-block"
                >
                  🐾 PetID • Original Sound
                </motion.span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
