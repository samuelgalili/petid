import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, Share2, User, ShoppingBag, PawPrint, Info, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

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

/** Stagger animation for action buttons */
const actionStagger = {
  hidden: { opacity: 0, x: 20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.3 + i * 0.08, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

export const FeedVideoView = ({ items, currentUserId, onLike, onSave }: FeedVideoViewProps) => {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState<string | null>(null);
  const lastTapRef = useRef<{ time: number; id: string }>({ time: 0, id: '' });
  const shareLongPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Include product items too
  const visualItems = items.filter(item =>
    item.type === 'post' || item.type === 'suggested' || item.type === 'adoption' || item.type === 'challenge' || item.type === 'product'
  );

  const getItemImage = useCallback((item: FeedItem): string => {
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
  }, []);

  const getItemCaption = useCallback((item: FeedItem): string => {
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
  }, []);

  const getUsername = useCallback((item: FeedItem): string => {
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
  }, []);

  // #15 Double-tap to like
  const handleDoubleTap = useCallback((item: FeedItem) => {
    const now = Date.now();
    const last = lastTapRef.current;
    if (last.id === item.data.id && now - last.time < 300) {
      // Double tap detected
      if ((item.type === 'post' || item.type === 'suggested') && onLike) {
        onLike(item.data.id);
        haptic("success"); // #16
        setShowDoubleTapHeart(item.data.id);
        setTimeout(() => setShowDoubleTapHeart(null), 900);
      }
      lastTapRef.current = { time: 0, id: '' };
    } else {
      lastTapRef.current = { time: now, id: item.data.id };
    }
  }, [onLike]);

  const handleShare = useCallback(async (item: FeedItem) => {
    haptic("light"); // #16
    const url = `${window.location.origin}/post/${item.data.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: getItemCaption(item), url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('הקישור הועתק');
    }
  }, [getItemCaption]);

  // #18 Long press share opens sheet (simulated with copy + toast for now)
  const handleShareLongPress = useCallback((item: FeedItem) => {
    shareLongPressRef.current = setTimeout(() => {
      haptic("medium");
      const url = `${window.location.origin}/post/${item.data.id}`;
      navigator.clipboard.writeText(url);
      toast.success('הקישור הועתק! שתף עם חברים 🐾');
    }, 500);
  }, []);

  const cancelShareLongPress = useCallback(() => {
    if (shareLongPressRef.current) {
      clearTimeout(shareLongPressRef.current);
      shareLongPressRef.current = null;
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
          transition={{ delay: index * 0.05 }}
        >
          {/* Full screen image/video — #15 double-tap zone */}
          <div
            className="absolute inset-0 bg-black"
            onClick={() => handleDoubleTap(item)}
          >
            <img
              src={getItemImage(item)}
              alt=""
              className="w-full h-full object-cover"
              loading={index < 3 ? "eager" : "lazy"}
            />
            {/* #12 Stronger gradient — starts from 40% */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent via-60% to-black/80" />
          </div>

          {/* #14 Double-tap heart animation */}
          <AnimatePresence>
            {showDoubleTapHeart === item.data.id && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Heart className="w-24 h-24 text-white fill-rose-500 drop-shadow-2xl" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* #20 Progress bar (thin white line at bottom) */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/20 z-10">
            <motion.div
              className="h-full bg-white/80 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 15, ease: "linear", repeat: Infinity }}
            />
          </div>

          {/* Right side actions — #1 right-2, #2 bottom-44, #3 gap-6, #8 drop-shadow */}
          <motion.div
            className="absolute right-2 bottom-44 flex flex-col items-center gap-6"
            initial="hidden"
            animate="visible"
          >
            {/* Profile — #5 w-[52px], #6 w-[18px] plus, #11 border (1px) */}
            <motion.button
              custom={0}
              variants={actionStagger}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                haptic("light");
                if (item.type === 'post' || item.type === 'suggested') {
                  navigate(`/profile/${item.data.user_id}`);
                }
              }}
              className="relative mb-1"
            >
              <div className="w-[52px] h-[52px] rounded-full border border-white overflow-hidden">
                {(item.type === 'post' || item.type === 'suggested') && item.data.user?.avatar_url ? (
                  <img src={item.data.user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-700">
                    <User className="w-6 h-6 text-white/70" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-[18px] h-[18px] bg-rose-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-lg">
                +
              </div>
            </motion.button>

            {/* Like — #4 w-8, #8 drop-shadow, #9 font-bold text-[12px] */}
            <motion.button
              custom={1}
              variants={actionStagger}
              whileTap={{ scale: 0.8 }}
              onClick={() => {
                haptic("light"); // #16
                if ((item.type === 'post' || item.type === 'suggested') && onLike) {
                  onLike(item.data.id);
                }
              }}
              className="flex flex-col items-center gap-1"
            >
              <Heart
                className={`w-8 h-8 drop-shadow-lg ${item.data.is_liked ? 'fill-rose-500 text-rose-500' : 'text-white'}`}
                strokeWidth={1.5}
              />
              <span className="text-white text-[12px] font-bold drop-shadow-md">
                {formatCount(item.data.likes_count || 0)}
              </span>
            </motion.button>

            {/* Comment — #4 w-8, #17 stagger */}
            <motion.button
              custom={2}
              variants={actionStagger}
              whileTap={{ scale: 0.8 }}
              onClick={() => {
                haptic("light"); // #16
                if (item.type === 'post' || item.type === 'suggested') {
                  navigate(`/post/${item.data.id}`);
                } else if (item.type === 'product') {
                  navigate(`/product/${item.data.id}`);
                } else if (item.type === 'adoption') {
                  navigate(`/adoption?pet=${item.data.id}`);
                }
              }}
              className="flex flex-col items-center gap-1"
            >
              <MessageCircle className="w-8 h-8 text-white drop-shadow-lg" strokeWidth={1.5} />
              <span className="text-white text-[12px] font-bold drop-shadow-md">
                {formatCount(item.data.comments_count || 0)}
              </span>
            </motion.button>

            {/* Share — #18 long press */}
            <motion.button
              custom={3}
              variants={actionStagger}
              whileTap={{ scale: 0.8 }}
              onClick={() => handleShare(item)}
              onTouchStart={() => handleShareLongPress(item)}
              onTouchEnd={cancelShareLongPress}
              onMouseDown={() => handleShareLongPress(item)}
              onMouseUp={cancelShareLongPress}
              onMouseLeave={cancelShareLongPress}
              className="flex flex-col items-center gap-1"
            >
              <Share2 className="w-8 h-8 text-white drop-shadow-lg" strokeWidth={1.5} />
              <span className="text-white text-[12px] font-bold drop-shadow-md">
                {formatCount(item.data.shares_count || 0)}
              </span>
            </motion.button>

            {/* Spinning music disc — #10 bg-neutral-900 */}
            <motion.div
              custom={4}
              variants={actionStagger}
              className="relative mt-1"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 rounded-full border-[3px] border-neutral-600 overflow-hidden bg-neutral-900 shadow-lg"
              >
                <img
                  src={(item.type === 'post' || item.type === 'suggested') && item.data.user?.avatar_url
                    ? item.data.user.avatar_url
                    : 'https://api.dicebear.com/7.x/bottts/svg?seed=petid'}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </motion.div>
              {/* Disc center hole */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-600" />
            </motion.div>
          </motion.div>

          {/* Bottom info — #7 bottom-16 above nav, #13 text-base font-extrabold */}
          <div className="absolute bottom-16 left-3 right-16 text-white z-10" dir="rtl">
            {/* Username — #13 */}
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-extrabold text-base drop-shadow-md">@{getUsername(item)}</span>
              {item.type === 'adoption' && (
                <span className="bg-rose-500/80 px-2 py-0.5 rounded-full text-[11px] font-medium">לאימוץ</span>
              )}
              {item.type === 'challenge' && (
                <span className="bg-amber-500/80 px-2 py-0.5 rounded-full text-[11px] font-medium">אתגר</span>
              )}
              {item.type === 'product' && (
                <span className="bg-emerald-500/80 px-2 py-0.5 rounded-full text-[11px] font-medium">מוצר</span>
              )}
            </div>

            {/* Caption */}
            <p className="text-[13px] line-clamp-2 mb-2 drop-shadow-sm">
              {getItemCaption(item)}
            </p>

            {/* Product details bar */}
            {item.type === 'product' && (
              <div className="mb-2 space-y-2">
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
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { haptic("light"); navigate(`/product/${item.data.id}`); }}
                  className="flex items-center justify-between w-full bg-emerald-500 hover:bg-emerald-600 transition-colors rounded-lg px-3 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    <span className="text-sm font-bold">קנה עכשיו</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Info className="w-4 h-4 opacity-70" onClick={(e) => { e.stopPropagation(); navigate(`/product/${item.data.id}`); }} />
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
                    <span className="bg-white/10 rounded-full px-2 py-1 text-[11px]">🐕 {item.data.breed}</span>
                  )}
                  {item.data.age_years && (
                    <span className="bg-white/10 rounded-full px-2 py-1 text-[11px]">📅 {item.data.age_years} שנים</span>
                  )}
                  {item.data.size && (
                    <span className="bg-white/10 rounded-full px-2 py-1 text-[11px]">📏 {item.data.size}</span>
                  )}
                  {item.data.gender && (
                    <span className="bg-white/10 rounded-full px-2 py-1 text-[11px]">
                      {item.data.gender === 'male' ? '♂️ זכר' : '♀️ נקבה'}
                    </span>
                  )}
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { haptic("light"); navigate(`/adoption?pet=${item.data.id}`); }}
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

            {/* #19 Sound/Music bar — marquee scrolling */}
            <div className="flex items-center gap-2 overflow-hidden">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <span className="text-sm">♫</span>
              </motion.div>
              <div className="overflow-hidden flex-1 relative">
                <motion.span
                  animate={{ x: ["0%", "-50%"] }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className="text-xs whitespace-nowrap inline-block"
                >
                  🐾 PetID • Original Sound &nbsp;&nbsp;&nbsp;&nbsp; 🐾 PetID • Original Sound
                </motion.span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
