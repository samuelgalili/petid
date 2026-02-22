/**
 * SoundtrackFeed - TikTok-style vertical snap-scroll feed
 * Refactored: logic in useSoundtrackFeed, card in SoundtrackPostCard
 */

import React, { useState } from "react";
import { ComponentErrorBoundary } from "@/components/common/ComponentErrorBoundary";
import { motion, AnimatePresence } from "framer-motion";
import { useActivePet } from "@/hooks/useActivePet";
import { cn } from "@/lib/utils";
import { LayoutGrid } from "lucide-react";
import { Camera, ImagePlus, FileText, Menu, Shield, Store, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useNotificationsBadge } from "@/hooks/useNotificationsBadge";
import { HamburgerMenu } from "@/components/HamburgerMenu";
// BottomNav is rendered by MainShell — not needed here
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { CreateStoryDialog } from "@/components/CreateStoryDialog";
import { useLanguage } from "@/contexts/LanguageContext";
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
import { FeedProductCards } from "@/components/feed/FeedProductCards";
import { HealthScoreHighlight } from "@/components/feed/HealthScoreHighlight";
import { FeedPollCard } from "@/components/feed/FeedPollCard";
import { useSoundtrackFeed } from "@/hooks/useSoundtrackFeed";

const SoundtrackFeed = () => {
  const navigate = useNavigate();
  const { isAdmin, isBusiness } = useUserRole();
  const { unreadCount } = useNotificationsBadge();
  const { pet: activePet } = useActivePet();
  const { language, direction } = useLanguage();
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
        <div className="h-full overflow-hidden">
          <FeedSkeletonList />
        </div>
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

      <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* Floating Glass Header */}
      <motion.header
        className="absolute top-0 left-0 right-0 z-50 pointer-events-none"
        style={{ paddingTop: "calc(4px + env(safe-area-inset-top))" }}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center justify-between h-11 pointer-events-auto px-4">
          {/* Right (RTL): Menu */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => setIsMenuOpen(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(0,0,0,0.2)",
              backdropFilter: "blur(12px)",
            }}
            aria-label="תפריט"
          >
            <Menu className="w-[18px] h-[18px] text-white" strokeWidth={1.5} />
          </motion.button>

          {/* Center: For You / Following Switcher */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-5">
            <button
              onClick={() => setActiveTab("discover")}
              className="relative pb-1 transition-all duration-200"
            >
              <span
                className={cn(
                  "text-[15px] font-bold transition-colors duration-200",
                  activeTab === "discover" ? "text-white" : "text-white/50"
                )}
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
              >
                עבורי
              </span>
              {activeTab === "discover" && (
                <motion.div
                  layoutId="feedUnderline"
                  className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab("following")}
              className="relative pb-1 transition-all duration-200"
            >
              <span
                className={cn(
                  "text-[15px] font-bold transition-colors duration-200",
                  activeTab === "following" ? "text-white" : "text-white/50"
                )}
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
              >
                עוקבים
              </span>
              {activeTab === "following" && (
                <motion.div
                  layoutId="feedUnderline"
                  className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          </div>

          {/* Left (RTL): Bell + Role Icon */}
          <div className="flex items-center gap-1.5">
            {/* Admin/Business management icon */}
            {isAdmin && (
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => navigate("/admin/growo")}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  background: "rgba(0,0,0,0.2)",
                  backdropFilter: "blur(12px)",
                }}
                aria-label="ניהול"
              >
                <Shield className="w-[16px] h-[16px] text-white" strokeWidth={1.5} />
              </motion.button>
            )}
            {!isAdmin && isBusiness && (
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => navigate("/business-dashboard")}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  background: "rgba(0,0,0,0.2)",
                  backdropFilter: "blur(12px)",
                }}
                aria-label="חנות"
              >
                <Store className="w-[16px] h-[16px] text-white" strokeWidth={1.5} />
              </motion.button>
            )}

            {/* Notification Bell — always visible */}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => navigate("/notifications")}
              className="w-9 h-9 rounded-full flex items-center justify-center relative"
              style={{
                background: "rgba(0,0,0,0.2)",
                backdropFilter: "blur(12px)",
              }}
              aria-label="התראות"
            >
              <Bell className="w-[18px] h-[18px] text-white" strokeWidth={1.5} />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="absolute top-0.5 right-0.5 w-[8px] h-[8px] rounded-full"
                  style={{
                    background: "#FF6B9D",
                    boxShadow: "0 0 8px #FF6B9D",
                  }}
                />
              )}
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Feed */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto snap-y snap-mandatory scroll-smooth"
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
            {activeTab === "discover" && (
              <ComponentErrorBoundary fallbackMessage="שגיאה בטעינת תובנות יומיות">
                <DailyInsightCard />
              </ComponentErrorBoundary>
            )}

            {posts.map((post, index) => (
              <React.Fragment key={post.id}>
                <ComponentErrorBoundary fallbackMessage="שגיאה בטעינת פוסט">
                  <SoundtrackPostCard
                    post={post}
                    index={index}
                    currentIndex={currentIndex}
                    muted={muted}
                    setMuted={setMuted}
                    onLike={handleLike}
                    onSave={handleSave}
                    onFollow={handleFollow}
                    userId={userId}
                    activePet={activePet}
                  />
                </ComponentErrorBoundary>
                {/* Inject product cards after 3rd post */}
                {index === 2 && activeTab === "discover" && (
                  <ComponentErrorBoundary fallbackMessage="שגיאה בטעינת מוצרים">
                    <FeedProductCards />
                  </ComponentErrorBoundary>
                )}
                {/* Inject poll every 5th post */}
                {index === 4 && activeTab === "discover" && (
                  <ComponentErrorBoundary fallbackMessage="שגיאה בטעינת סקר">
                    <FeedPollCard />
                  </ComponentErrorBoundary>
                )}
                {/* Inject health score highlight after 7th post */}
                {index === 6 && activeTab === "discover" && (
                  <ComponentErrorBoundary fallbackMessage="שגיאה בטעינת ציון בריאות">
                    <HealthScoreHighlight />
                  </ComponentErrorBoundary>
                )}
              </React.Fragment>
            ))}

            {/* Local Events — After posts */}
            {activeTab === "discover" && (
              <ComponentErrorBoundary fallbackMessage="שגיאה בטעינת אירועים">
                <LocalEventsCard />
              </ComponentErrorBoundary>
            )}
          </>
        )}
      </div>

      {/* Upload FAB removed — handled by BottomNav FAB */}

      {/* Upload Menu */}
      <AnimatePresence>
        {showUploadMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
              onClick={() => setShowUploadMenu(false)}
            />
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 22, stiffness: 350 }}
              className="fixed bottom-[140px] inset-x-0 mx-auto w-fit z-[9999] flex items-center gap-6 px-6 py-4 bg-background/90 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl"
              dir={direction}
            >
              {[
                { icon: Camera, label: language === 'he' ? 'סטורי' : 'Story', action: "story" as const, color: "text-pink-500", bg: "bg-pink-500/10" },
                { icon: ImagePlus, label: language === 'he' ? 'פוסט' : 'Post', action: "post" as const, color: "text-blue-500", bg: "bg-blue-500/10" },
                { icon: FileText, label: language === 'he' ? 'מסמך' : 'Document', action: "document" as const, color: "text-amber-500", bg: "bg-amber-500/10" },
              ].map((item) => (
                <motion.button
                  key={item.action}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setShowUploadMenu(false);
                    if (item.action === "story") setShowCreateStory(true);
                    else if (item.action === "post") setShowCreatePost(true);
                    else navigate("/documents");
                  }}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", item.bg)}>
                    <item.icon className={cn("w-6 h-6", item.color)} strokeWidth={1.5} />
                  </div>
                  <span className="text-xs font-medium text-foreground">{item.label}</span>
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CreatePostDialog open={showCreatePost} onOpenChange={setShowCreatePost} onPostCreated={() => setShowCreatePost(false)} />
      <CreateStoryDialog open={showCreateStory} onOpenChange={setShowCreateStory} onStoryCreated={() => setShowCreateStory(false)} />

      
    </div>
  );
};

export default SoundtrackFeed;
