import { Home, ShoppingBag, Users, Grid3x3, MessageCircle, Mail, User, Newspaper, Bell } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { buttonTap, ANIMATION_DURATION } from "@/lib/animations";
import { getAccessibleLinkProps, TAP_TARGET } from "@/lib/accessibility";
import { ARIA_LABELS } from "@/lib/microcopy";
import { supabase } from "@/integrations/supabase/client";
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

const BottomNav = () => {
  const location = useLocation();
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);
  const prevCountRef = useRef(0);

  // Check if we're on social network pages
  const socialRoutes = ['/feed', '/user/', '/post/', '/story/', '/highlight/', '/messages', '/profile'];
  const isSocialPage = socialRoutes.some(route => location.pathname.startsWith(route));

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
    { icon: Home, label: "בית", path: "/home" },
    { icon: ShoppingBag, label: "חנות", path: "/shop" },
    { icon: Users, label: "קהילה", path: "/feed" },
    { 
      icon: Grid3x3, 
      label: "עוד", 
      onClick: () => setIsMoreSheetOpen(true),
      isButton: true 
    },
    { icon: MessageCircle, label: "צ'אט", path: "/chat" },
  ];

  // Social network navigation
  const socialNavItems = [
    { icon: Home, label: "חזרה", path: "/home" },
    { icon: Mail, label: "הודעות", path: "/messages" },
    { icon: Bell, label: "התראות", path: "/notifications", badge: unreadCount },
    { icon: User, label: "פרופיל", path: "/profile" },
    { icon: Newspaper, label: "פיד", path: "/feed" },
  ];

  const navItems = isSocialPage ? socialNavItems : appNavItems;

  const moreCategories = [
    { icon: FileText, label: "מסמכים", path: "/documents" },
    { icon: Camera, label: "אלבום תמונות", path: "/photos" },
    { icon: Heart, label: "אימוץ", path: "/adoption" },
    { icon: Shield, label: "ביטוח", path: "/insurance" },
    { icon: Trees, label: "גינות כלבים", path: "/parks" },
    { icon: GraduationCap, label: "אילוף", path: "/training" },
    { icon: Scissors, label: "מספרה", path: "/grooming" },
    { icon: CheckSquare, label: "משימות", path: "/tasks" },
    { icon: Gift, label: "פרסים", path: "/rewards" },
  ];

  return (
    <>
      {/* Instagram-style Bottom Navigation */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200"
        role="navigation"
        aria-label={isSocialPage ? "ניווט רשת חברתית" : ARIA_LABELS.navigation}
      >
        <div className="flex justify-around items-center h-12 max-w-lg mx-auto">
          {navItems.map((item, index) => {
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
                
                {/* Notification badge - Instagram red */}
                {item.badge && item.badge > 0 && (
                  <span 
                    className={cn(
                      "absolute top-1 right-1 min-w-[18px] h-[18px] px-1",
                      "bg-[#FF3040] text-white text-[11px] font-semibold",
                      "rounded-full flex items-center justify-center",
                      isPulsing && item.path === '/notifications' && "animate-pulse"
                    )}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
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
      {!isSocialPage && (
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
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <CategoryIcon className="w-5 h-5 text-black" strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] font-normal text-center text-black leading-tight">
                      {category.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
};

export default BottomNav;
