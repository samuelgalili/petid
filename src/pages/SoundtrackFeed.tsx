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
        <div className="flex items-center justify-center h-10 relative pointer-events-auto">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <DailyStreak />
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "discover" | "following")}
          >
            <TabsList className="bg-transparent gap-8">
              <TabsTrigger
                value="following"
                className={cn(
                  "bg-transparent border-0 shadow-none text-base font-semibold px-0 py-1.5",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  activeTab === "following"
                    ? "text-white drop-shadow-md border-b-2 border-white rounded-none"
                    : "text-white/60"
                )}
              >
                עוקבים
              </TabsTrigger>
              <TabsTrigger
                value="discover"
                className={cn(
                  "bg-transparent border-0 shadow-none text-base font-semibold px-0 py-1.5",
                  "data-[state=active]:bg-transparent data-[state=active]:shadow-none",
                  activeTab === "discover"
                    ? "text-white drop-shadow-md border-b-2 border-white rounded-none"
                    : "text-white/60"
                )}
              >
                גלה
              </TabsTrigger>
            </TabsList>
          </Tabs>
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
          posts.map((post, index) => (
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
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default SoundtrackFeed;
