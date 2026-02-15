/**
 * SoundtrackFeed - TikTok-style vertical snap-scroll feed
 * Refactored: logic in useSoundtrackFeed, card in SoundtrackPostCard
 */

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import BottomNav from "@/components/BottomNav";
import {
  FeedPullToRefresh,
  FeedSkeletonList,
  FeedProgressBar,
  NewPostToast,
  DailyStreak,
  FeedOnboarding,
} from "@/components/feed";
import { SoundtrackPostCard } from "@/components/feed/SoundtrackPostCard";
import { DailyInsightCard } from "@/components/feed/DailyInsightCard";
import { LocalEventsCard } from "@/components/feed/LocalEventsCard";
import { useSoundtrackFeed } from "@/hooks/useSoundtrackFeed";

const SoundtrackFeed = () => {
  const navigate = useNavigate();
  const { unreadCount } = useRealtimeNotifications();
  const {
    posts,
    loading,
    error,
    activeTab,
    setActiveTab,
    currentIndex,
    muted,
    setMuted,
    containerRef,
    newPostCount,
    pullDistance,
    isRefreshing,
    progress,
    shouldTrigger,
    pullHandlers,
    handleNewPostTap,
    handleLike,
    handleSave,
    handleFollow,
    handleScroll,
    fetchPosts,
    userId,
  } = useSoundtrackFeed();

  if (loading) {
    return (
      <div className="h-screen bg-background overflow-hidden" dir="rtl">
        <div className="h-full pb-[70px] overflow-hidden">
          <FeedSkeletonList />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background overflow-hidden" dir="rtl">
      <FeedProgressBar current={currentIndex} total={posts.length} />

      <FeedPullToRefresh
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        progress={progress}
        shouldTrigger={shouldTrigger}
      />

      <NewPostToast visible={newPostCount > 0} count={newPostCount} onTap={handleNewPostTap} />
      <FeedOnboarding />

      {/* Header */}
      <motion.header
        className="absolute top-0 left-0 right-0 z-50 pointer-events-none pt-2"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center justify-between h-12 relative pointer-events-auto px-4">
          {/* Left: DailyStreak */}
          <div className="w-10 flex items-center justify-center">
            <DailyStreak />
          </div>

          {/* Center: Tabs — absolutely centered */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "discover" | "following")}
            >
              <TabsList className="bg-transparent gap-6 h-auto p-0">
                <TabsTrigger
                  value="following"
                  className={cn(
                    "bg-transparent border-0 shadow-none text-[15px] font-bold px-1 py-1.5 rounded-none transition-all duration-200",
                    "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                    activeTab === "following"
                      ? "text-white border-b-[2.5px] border-white"
                      : "text-white/50 hover:text-white/70"
                  )}
                  style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
                >
                  עוקבים
                </TabsTrigger>
                <TabsTrigger
                  value="discover"
                  className={cn(
                    "bg-transparent border-0 shadow-none text-[15px] font-bold px-1 py-1.5 rounded-none transition-all duration-200",
                    "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                    activeTab === "discover"
                      ? "text-white border-b-[2.5px] border-white"
                      : "text-white/50 hover:text-white/70"
                  )}
                  style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
                >
                  גלה
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Right: Heart/Notifications */}
          <button
            onClick={() => navigate('/notifications')}
            className="relative w-10 h-10 flex items-center justify-center"
            aria-label="התראות"
          >
            <Heart className="w-[26px] h-[26px] text-white" strokeWidth={1.5} style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.5))' }} />
            <AnimatePresence mode="wait">
              {unreadCount > 0 && (
                <motion.span
                  key={unreadCount}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center px-1"
                  style={{ background: 'linear-gradient(135deg, #FF3B30, #FF1744)', boxShadow: '0 2px 6px rgba(255,59,48,0.5)' }}
                >
                  <span className="text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.header>

      {/* Feed */}
      <div
        ref={containerRef}
        className="h-full pb-[70px] overflow-y-auto snap-y snap-mandatory scroll-smooth"
        onScroll={handleScroll}
        style={{ scrollSnapType: "y mandatory", scrollPaddingTop: "8px" }}
        {...pullHandlers}
      >
        {error ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
            <p className="text-lg">{error}</p>
            <button
              onClick={fetchPosts}
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={{ backgroundColor: "#FF8C42", color: "white" }}
            >
              נסה שוב
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <p className="text-lg">אין פוסטים להצגה</p>
            <p className="text-sm mt-2">
              {activeTab === "following"
                ? "עקוב אחרי משתמשים כדי לראות את הפוסטים שלהם"
                : "בקרוב יופיעו כאן פוסטים"}
            </p>
          </div>
        ) : (
          <>
            {/* Daily Insight — First card */}
            {activeTab === "discover" && <DailyInsightCard />}

            {posts.map((post, index) => (
              <SoundtrackPostCard
                key={post.id}
                post={post}
                index={index}
                currentIndex={currentIndex}
                muted={muted}
                setMuted={setMuted}
                onLike={handleLike}
                onSave={handleSave}
                onFollow={handleFollow}
                userId={userId}
              />
            ))}

            {/* Local Events — After posts */}
            {activeTab === "discover" && <LocalEventsCard />}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default SoundtrackFeed;
