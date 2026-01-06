import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Heart, MessageCircle, Share2, Music2, Volume2, VolumeX, Plus, MoreVertical } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';
import CreateReelDialog from '@/components/CreateReelDialog';

interface Reel {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  duration: number | null;
  view_count: number;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
}

const Reels = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch reels
  const { data: reels = [], isLoading } = useQuery({
    queryKey: ['reels'],
    queryFn: async () => {
      const { data: reelsData, error } = await supabase
        .from('reels')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get user profiles and counts
      const reelsWithData = await Promise.all(
        (reelsData || []).map(async (reel) => {
          const [profileRes, likesRes, commentsRes, userLikeRes] = await Promise.all([
            supabase.from('profiles').select('id, full_name, avatar_url').eq('id', reel.user_id).maybeSingle(),
            supabase.from('reel_likes').select('id', { count: 'exact' }).eq('reel_id', reel.id),
            supabase.from('reel_comments').select('id', { count: 'exact' }).eq('reel_id', reel.id),
            user ? supabase.from('reel_likes').select('id').eq('reel_id', reel.id).eq('user_id', user.id).maybeSingle() : Promise.resolve({ data: null })
          ]);

          return {
            ...reel,
            profiles: profileRes.data,
            likes_count: likesRes.count || 0,
            comments_count: commentsRes.count || 0,
            is_liked: !!userLikeRes.data
          } as Reel;
        })
      );

      return reelsWithData;
    }
  });

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async (reelId: string) => {
      if (!user) throw new Error('Must be logged in');
      
      const { data: existing } = await supabase
        .from('reel_likes')
        .select('id')
        .eq('reel_id', reelId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase.from('reel_likes').delete().eq('id', existing.id);
        return { action: 'unliked' };
      } else {
        await supabase.from('reel_likes').insert({ reel_id: reelId, user_id: user.id });
        return { action: 'liked' };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reels'] });
    }
  });

  // Handle scroll to change reels
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const height = container.clientHeight;
      const newIndex = Math.round(scrollTop / height);
      
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < reels.length) {
        setCurrentIndex(newIndex);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentIndex, reels.length]);

  // Play/pause videos based on current index
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video) {
        if (index === currentIndex) {
          video.play().catch(() => {});
        } else {
          video.pause();
          video.currentTime = 0;
        }
      }
    });
  }, [currentIndex]);

  // Update view count
  useEffect(() => {
    if (reels[currentIndex]) {
      supabase
        .from('reels')
        .update({ view_count: (reels[currentIndex].view_count || 0) + 1 })
        .eq('id', reels[currentIndex].id)
        .then(() => {});
    }
  }, [currentIndex, reels]);

  const handleDoubleTap = (reelId: string) => {
    if (!user) {
      toast.error('יש להתחבר כדי לעשות לייק');
      return;
    }
    likeMutation.mutate(reelId);
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="loading-spinner border-white" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-black relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center">
        <h1 className="text-white text-xl font-bold">סרטונים</h1>
        <Button
          variant="ghost"
          size="icon"
          className="text-white"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Reels Container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        {reels.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white">
            <Music2 className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg">אין סרטונים עדיין</p>
            <Button
              className="mt-4"
              onClick={() => setShowCreateDialog(true)}
            >
              צור את הסרטון הראשון שלך
            </Button>
          </div>
        ) : (
          reels.map((reel, index) => (
            <div
              key={reel.id}
              className="h-full w-full snap-start relative flex items-center justify-center"
              style={{ scrollSnapAlign: 'start' }}
              onDoubleClick={() => handleDoubleTap(reel.id)}
            >
              {/* Video */}
              <video
                ref={(el) => (videoRefs.current[index] = el)}
                src={reel.video_url}
                className="h-full w-full object-cover"
                loop
                muted={isMuted}
                playsInline
                poster={reel.thumbnail_url || undefined}
              />

              {/* Like Animation */}
              <AnimatePresence>
                {reel.is_liked && index === currentIndex && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <Heart className="w-24 h-24 text-instagram-red fill-instagram-red" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom Gradient */}
              <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />

              {/* User Info & Caption */}
              <div className="absolute bottom-24 left-4 right-16">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar
                    className="w-10 h-10 border-2 border-white cursor-pointer"
                    onClick={() => navigate(`/user/${reel.user_id}`)}
                  >
                    <AvatarImage src={reel.profiles?.avatar_url || ''} />
                    <AvatarFallback>{reel.profiles?.full_name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <span className="text-white font-semibold">{reel.profiles?.full_name || 'משתמש'}</span>
                  {user && user.id !== reel.user_id && (
                    <Button variant="outline" size="sm" className="text-white border-white h-7">
                      עקוב
                    </Button>
                  )}
                </div>
                {reel.caption && (
                  <p className="text-white text-sm line-clamp-2">{reel.caption}</p>
                )}
              </div>

              {/* Right Actions */}
              <div className="absolute bottom-32 right-4 flex flex-col items-center gap-6">
                <button
                  className="flex flex-col items-center"
                  onClick={() => {
                    if (!user) {
                      toast.error('יש להתחבר');
                      return;
                    }
                    likeMutation.mutate(reel.id);
                  }}
                >
                  <Heart
                    className={cn(
                      'w-8 h-8',
                      reel.is_liked ? 'text-instagram-red fill-instagram-red' : 'text-white'
                    )}
                  />
                  <span className="text-white text-xs mt-1">{reel.likes_count}</span>
                </button>

                <button className="flex flex-col items-center">
                  <MessageCircle className="w-8 h-8 text-white" />
                  <span className="text-white text-xs mt-1">{reel.comments_count}</span>
                </button>

                <button className="flex flex-col items-center">
                  <Share2 className="w-8 h-8 text-white" />
                </button>

                <button onClick={() => setIsMuted(!isMuted)}>
                  {isMuted ? (
                    <VolumeX className="w-7 h-7 text-white" />
                  ) : (
                    <Volume2 className="w-7 h-7 text-white" />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav />

      <CreateReelDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
};

export default Reels;
