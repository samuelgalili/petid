import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Heart, MessageCircle, Share2, ShoppingBag, Play, Pause, Volume2, VolumeX, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';

interface VideoPost {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  product_ids: string[];
  view_count: number;
  like_count: number;
  share_count: number;
  user_id: string;
  business_id: string | null;
  created_at: string;
}

interface LinkedProduct {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
  image_url: string;
  description: string | null;
  in_stock: boolean;
}

const ShopFeed = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<LinkedProduct | null>(null);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: videos = [] } = useQuery({
    queryKey: ['shop-feed-videos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('video_posts')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as VideoPost[];
    },
  });

  // Placeholder data when no videos exist
  const placeholderVideos = [
    { id: '1', caption: 'מזון פרימיום לכלבים — 30% הנחה 🐕', like_count: 1243, share_count: 89 },
    { id: '2', caption: 'הצעצוע שכל חתול חייב 🐱', like_count: 892, share_count: 45 },
    { id: '3', caption: 'שמפו טבעי — ללא כימיקלים 🌿', like_count: 2100, share_count: 167 },
  ];

  const displayItems = videos.length > 0 ? videos : placeholderVideos;

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const height = containerRef.current.clientHeight;
    const newIndex = Math.round(scrollTop / height);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  }, [currentIndex]);

  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  };

  return (
    <div className="min-h-screen bg-black" dir="rtl">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-12 bg-gradient-to-b from-black/60 to-transparent">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white">
          <ArrowRight className="w-5 h-5" />
        </Button>
        <h1 className="text-white font-semibold text-base">Shop Feed</h1>
        <div className="w-10" />
      </div>

      {/* Vertical Video Scroll */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-screen overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {displayItems.map((item, index) => (
          <div
            key={item.id}
            className="h-screen w-full snap-start relative flex items-center justify-center"
            style={{ scrollSnapAlign: 'start' }}
          >
            {/* Video/Placeholder Background */}
            {'video_url' in item && (item as VideoPost).video_url ? (
              <VideoPlayer
                src={(item as VideoPost).video_url}
                isActive={index === currentIndex}
                muted={muted}
                paused={paused}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-black to-primary/10 flex items-center justify-center">
                <div className="text-center px-8">
                  <ShoppingBag className="w-16 h-16 text-white/30 mx-auto mb-4" />
                  <p className="text-white/50 text-sm">תוכן וידאו בקרוב</p>
                </div>
              </div>
            )}

            {/* Bottom Caption */}
            <div className="absolute bottom-24 right-4 left-16 z-10">
              <p className="text-white text-sm font-medium leading-relaxed drop-shadow-lg">
                {item.caption || ''}
              </p>
            </div>

            {/* Right Sidebar Actions */}
            <div className="absolute left-3 bottom-32 z-10 flex flex-col items-center gap-5">
              <ActionButton
                icon={<Heart className="w-6 h-6" />}
                label={formatCount(item.like_count || 0)}
              />
              <ActionButton
                icon={<MessageCircle className="w-6 h-6" />}
                label="תגובות"
              />
              <ActionButton
                icon={<Share2 className="w-6 h-6" />}
                label={formatCount(('share_count' in item ? item.share_count : 0) || 0)}
              />
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => {
                  // Open product drawer with mock product
                  setSelectedProduct({
                    id: item.id,
                    name: item.caption?.split('—')[0]?.trim() || 'מוצר',
                    price: 89.90,
                    original_price: 129.90,
                    image_url: '',
                    description: item.caption || '',
                    in_stock: true,
                  });
                }}
                className="flex flex-col items-center gap-1"
              >
                <div className="w-11 h-11 rounded-full bg-primary/90 flex items-center justify-center shadow-lg shadow-primary/30">
                  <ShoppingBag className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-white text-[10px] font-semibold drop-shadow">קנה עכשיו</span>
              </motion.button>
            </div>

            {/* Media Controls */}
            <div className="absolute top-16 left-3 z-10 flex flex-col gap-2">
              <button
                onClick={() => setMuted(!muted)}
                className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
              >
                {muted ? (
                  <VolumeX className="w-4 h-4 text-white" />
                ) : (
                  <Volume2 className="w-4 h-4 text-white" />
                )}
              </button>
            </div>

            {/* Progress Dots */}
            <div className="absolute top-16 right-4 z-10">
              <Badge variant="secondary" className="bg-black/40 text-white border-0 text-[10px] backdrop-blur-sm">
                {index + 1}/{displayItems.length}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Product Detail Drawer */}
      <Sheet open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh] p-0">
          <SheetTitle className="sr-only">פרטי מוצר</SheetTitle>
          {selectedProduct && (
            <div className="p-6 space-y-4" dir="rtl">
              {/* Handle */}
              <div className="w-12 h-1.5 bg-muted rounded-full mx-auto" />

              {/* Product Image placeholder */}
              <div className="w-full h-48 rounded-2xl bg-muted flex items-center justify-center">
                {selectedProduct.image_url ? (
                  <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <ShoppingBag className="w-12 h-12 text-muted-foreground" />
                )}
              </div>

              {/* Product Info */}
              <div>
                <h3 className="text-lg font-bold">{selectedProduct.name}</h3>
                {selectedProduct.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedProduct.description}</p>
                )}
              </div>

              {/* Price */}
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-primary">₪{selectedProduct.price}</span>
                {selectedProduct.original_price && selectedProduct.original_price > selectedProduct.price && (
                  <span className="text-base text-muted-foreground line-through">₪{selectedProduct.original_price}</span>
                )}
                {selectedProduct.original_price && selectedProduct.original_price > selectedProduct.price && (
                  <Badge className="bg-destructive text-destructive-foreground">
                    {Math.round((1 - selectedProduct.price / selectedProduct.original_price) * 100)}% הנחה
                  </Badge>
                )}
              </div>

              {/* CTA */}
              <Button className="w-full h-12 rounded-xl text-base font-bold gap-2" disabled={!selectedProduct.in_stock}>
                <ShoppingBag className="w-5 h-5" />
                {selectedProduct.in_stock ? 'הוסף לסל' : 'אזל מהמלאי'}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <BottomNav />
    </div>
  );
};

/* Video Player Component */
const VideoPlayer = ({ src, isActive, muted, paused }: { src: string; isActive: boolean; muted: boolean; paused: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive && !paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isActive, paused]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  return (
    <video
      ref={videoRef}
      src={src}
      loop
      playsInline
      muted={muted}
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
};

/* Action Button */
const ActionButton = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <motion.button
    whileTap={{ scale: 0.85 }}
    className="flex flex-col items-center gap-1"
  >
    <div className="text-white drop-shadow-lg">{icon}</div>
    <span className="text-white text-[10px] font-medium drop-shadow">{label}</span>
  </motion.button>
);

export default ShopFeed;
