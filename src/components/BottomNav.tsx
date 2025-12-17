import { Home, ShoppingBag, Users, Grid3x3, MessageCircle, Mail, User, Newspaper, Bell, Search, PlusSquare, Clapperboard, Compass } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { buttonTap, ANIMATION_DURATION } from "@/lib/animations";
import { getAccessibleLinkProps, TAP_TARGET } from "@/lib/accessibility";
import { ARIA_LABELS } from "@/lib/microcopy";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  Camera, 
  FileText, 
  Heart, 
  Shield, 
  Trees, 
  GraduationCap, 
  Scissors, 
  CheckSquare,
  Gift
} from "lucide-react";
import { CreatePostDialog } from "@/components/CreatePostDialog";

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string>("");
  const prevCountRef = useRef(0);

  // Check if we're on social network pages
  const socialRoutes = ['/', '/feed', '/user/', '/post/', '/story/', '/highlight/', '/messages', '/profile'];
  const isSocialPage = socialRoutes.some(route => 
    route === '/' ? location.pathname === '/' : location.pathname.startsWith(route)
  );

  // Fetch user avatar
  useEffect(() => {
    const fetchUserAvatar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .single();
        if (data?.avatar_url) {
          setUserAvatar(data.avatar_url);
        }
      }
    };
    fetchUserAvatar();
  }, []);

  // Play notification sound using Web Audio API
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Create a pleasant notification tone
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1047, audioContext.currentTime + 0.1);
      
      oscillator.type = 'sine';
      
      // Fade in and out for a softer sound
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  };

  // Fetch unread notifications count with realtime updates
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const fetchUnreadCount = async (isInitial = false) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      const newCount = count || 0;
      
      // Trigger pulse animation and sound if count increased (not on initial load)
      if (!isInitial && newCount > prevCountRef.current) {
        setIsPulsing(true);
        playNotificationSound();
        setTimeout(() => setIsPulsing(false), 1000);
      }
      
      prevCountRef.current = newCount;
      setUnreadCount(newCount);
      return user.id;
    };

    const setupRealtime = async () => {
      const userId = await fetchUnreadCount(true);
      if (!userId) return;

      // Subscribe to realtime changes on notifications table
      channel = supabase
        .channel('notifications-count')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          },
          () => {
            fetchUnreadCount(false);
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [location.pathname]);

  // Regular app navigation
  const appNavItems = [
    { icon: Home, label: "בית", path: "/" },
    { icon: ShoppingBag, label: "חנות", path: "/shop" },
    { icon: Users, label: "קהילה", path: "/" },
    { 
      icon: Grid3x3, 
      label: "עוד", 
      onClick: () => setIsMoreSheetOpen(true),
      isButton: true 
    },
    { icon: MessageCircle, label: "צ'אט", path: "/chat" },
  ];

  const moreCategories = [
    { icon: Home, label: "בית", path: "/home", color: "#262626" },
    { icon: FileText, label: "מסמכים", path: "/documents", color: "#0095F6" },
    { icon: Camera, label: "אלבום תמונות", path: "/photos", color: "#8134AF" },
    { icon: Heart, label: "אימוץ", path: "/adoption", color: "#ED4956" },
    { icon: Shield, label: "ביטוח", path: "/insurance", color: "#0095F6" },
    { icon: Trees, label: "גינות כלבים", path: "/parks", color: "#00A676" },
    { icon: GraduationCap, label: "אילוף", path: "/training", color: "#F58529" },
    { icon: Scissors, label: "מספרה", path: "/grooming", color: "#DD2A7B" },
    { icon: CheckSquare, label: "משימות", path: "/tasks", color: "#515BD4" },
    { icon: Gift, label: "פרסים", path: "/rewards", color: "#F58529" },
    { icon: MessageCircle, label: "צ'אט AI", path: "/chat", color: "#0095F6" },
  ];

  // Instagram-style social navigation render
  if (isSocialPage) {
    return (
      <>
        <nav 
          className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100"
          role="navigation"
          aria-label="ניווט רשת חברתית"
        >
          <div className="flex justify-around items-center h-[50px] max-w-lg mx-auto px-2">
            {/* Home/Feed */}
            <Link
              to="/"
              className="flex items-center justify-center p-2 active:opacity-50"
            >
              <Home 
                className={`w-[26px] h-[26px] ${location.pathname === '/' ? 'text-[#262626]' : 'text-[#262626]'}`}
                strokeWidth={location.pathname === '/' ? 2.5 : 1.5}
                fill={location.pathname === '/' ? '#262626' : 'none'}
              />
            </Link>

            {/* Search/Explore */}
            <Link
              to="/adoption"
              className="flex items-center justify-center p-2 active:opacity-50"
            >
              <Compass 
                className={`w-[26px] h-[26px] ${location.pathname === '/adoption' ? 'text-[#262626]' : 'text-[#262626]'}`}
                strokeWidth={location.pathname === '/adoption' ? 2.5 : 1.5}
                fill={location.pathname === '/adoption' ? '#262626' : 'none'}
              />
            </Link>

            {/* Categories - Opens More Sheet */}
            <button
              onClick={() => setIsMoreSheetOpen(true)}
              className="flex items-center justify-center p-2 active:opacity-50"
            >
              <div className="relative">
                <PlusSquare 
                  className="w-[26px] h-[26px] text-[#262626]" 
                  strokeWidth={1.5}
                />
              </div>
            </button>

            {/* Shop */}
            <Link
              to="/shop"
              className="flex items-center justify-center p-2 active:opacity-50"
            >
              <ShoppingBag 
                className={`w-[26px] h-[26px] ${location.pathname === '/shop' ? 'text-[#262626]' : 'text-[#262626]'}`}
                strokeWidth={location.pathname === '/shop' ? 2.5 : 1.5}
                fill={location.pathname === '/shop' ? '#262626' : 'none'}
              />
            </Link>

            {/* Profile */}
            <Link
              to="/profile"
              className="flex items-center justify-center p-2 active:opacity-50"
            >
              <div className={cn(
                "w-[26px] h-[26px] rounded-full overflow-hidden",
                location.pathname === '/profile' && "ring-2 ring-[#262626]"
              )}>
                <Avatar className="w-full h-full">
                  <AvatarImage src={userAvatar} />
                  <AvatarFallback className="bg-gray-200 text-gray-600 text-[10px]">
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              </div>
            </Link>
          </div>
          
          {/* Safe area for notched devices */}
          <div className="h-[env(safe-area-inset-bottom)] bg-white" />
        </nav>

        {/* Floating Action Button for Create Post - positioned above nav */}
        <button
          onClick={() => setCreatePostOpen(true)}
          className="fixed bottom-[70px] left-4 z-40 w-12 h-12 bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          <Camera className="w-5 h-5 text-white" strokeWidth={2} />
        </button>

        {/* Create Post Dialog */}
        <CreatePostDialog
          open={createPostOpen}
          onOpenChange={setCreatePostOpen}
          onPostCreated={() => {
            // Refresh will be handled by realtime subscription
          }}
        />

        {/* Categories Sheet */}
        <Sheet open={isMoreSheetOpen} onOpenChange={setIsMoreSheetOpen}>
          <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-xl bg-white border-0">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-2 mb-4" />
            
            <div className="grid grid-cols-4 gap-2 px-4 pb-8">
              {moreCategories.map((category) => {
                const CategoryIcon = category.icon;
                return (
                  <Link
                    key={category.path}
                    to={category.path}
                    onClick={() => setIsMoreSheetOpen(false)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl active:bg-gray-100 transition-colors"
                  >
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${category.color}15` }}
                    >
                      <CategoryIcon className="w-5 h-5" style={{ color: category.color }} strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] font-normal text-center text-[#262626] leading-tight">
                      {category.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Regular app navigation
  return (
    <>
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200"
        role="navigation"
        aria-label={ARIA_LABELS.navigation}
      >
        <div className="flex justify-around items-center h-12 max-w-lg mx-auto">
          {appNavItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = !item.isButton && location.pathname === item.path;
            const key = item.path || `button-${index}`;
            
            const content = (
              <div className="relative flex items-center justify-center p-3">
                <Icon 
                  className={cn(
                    "w-6 h-6 transition-transform active:scale-90",
                    isActive ? "text-[#262626]" : "text-[#262626]"
                  )} 
                  strokeWidth={isActive ? 2.5 : 1.5}
                />
              </div>
            );

            if (item.isButton) {
              return (
                <button
                  key={key}
                  onClick={item.onClick}
                  className="flex items-center justify-center active:opacity-50 transition-opacity"
                  aria-label={item.label}
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={key}
                to={item.path!}
                className="flex items-center justify-center active:opacity-50 transition-opacity"
                {...getAccessibleLinkProps(item.label)}
              >
                {content}
              </Link>
            );
          })}
        </div>
        
        {/* Safe area for notched devices */}
        <div className="h-[env(safe-area-inset-bottom)] bg-white" />
      </nav>

      {/* More Options Sheet */}
      <Sheet open={isMoreSheetOpen} onOpenChange={setIsMoreSheetOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-xl bg-white border-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-2 mb-4" />
          
          <div className="grid grid-cols-4 gap-2 px-4 pb-8">
            {moreCategories.map((category) => {
              const CategoryIcon = category.icon;
              return (
                <Link
                  key={category.path}
                  to={category.path}
                  onClick={() => setIsMoreSheetOpen(false)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl active:bg-gray-100 transition-colors"
                >
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${category.color}15` }}
                  >
                    <CategoryIcon className="w-5 h-5" style={{ color: category.color }} strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-normal text-center text-[#262626] leading-tight">
                    {category.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default BottomNav;
