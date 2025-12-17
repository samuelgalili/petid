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
      {/* Bottom Navigation */}
      <nav 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "bg-white/95 backdrop-blur-xl",
          "border-t border-border/50",
          "shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        )}
        role="navigation"
        aria-label={isSocialPage ? "ניווט רשת חברתית" : ARIA_LABELS.navigation}
      >
        {/* Active indicator bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        
        <div className="flex justify-around items-center h-16 max-w-md mx-auto px-1">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = !item.isButton && location.pathname === item.path;
            const key = item.path || `button-${index}`;
            const itemWidth = "w-[20%]";
            
            const content = (
              <motion.div 
                className="flex flex-col items-center justify-center relative"
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {/* Active background pill */}
                {isActive && (
                  <motion.div
                    layoutId={isSocialPage ? "activeSocialBg" : "activeNavBg"}
                    className="absolute inset-0 -top-1 -bottom-1 rounded-2xl bg-primary/10"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                
                {/* Badge for unread count - positioned at top */}
                {item.badge && item.badge > 0 && (
                  <motion.span 
                    className={cn(
                      "absolute -top-1 right-1 min-w-[18px] h-[18px] px-1",
                      "bg-accent text-white text-[10px] font-bold",
                      "rounded-full flex items-center justify-center",
                      "shadow-lg shadow-accent/40 border-2 border-white",
                      isPulsing && item.path === '/notifications' && "animate-bounce"
                    )}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </motion.span>
                )}
                
                <div className="relative z-10">
                  <motion.div
                    initial={false}
                    animate={isActive ? { y: -2 } : { y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className={cn(
                      "p-2 rounded-xl transition-colors",
                      isActive && "bg-primary/15"
                    )}
                  >
                    <Icon 
                      className={cn(
                        "w-[22px] h-[22px] transition-all duration-200",
                        isActive 
                          ? "text-primary" 
                          : "text-muted-foreground"
                      )} 
                      strokeWidth={isActive ? 2.5 : 1.8}
                    />
                  </motion.div>
                </div>
                
                <span 
                  className={cn(
                    "text-[10px] font-semibold font-jakarta text-center leading-tight mt-0.5 relative z-10",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </motion.div>
            );

            if (item.isButton) {
              return (
                <button
                  key={key}
                  onClick={item.onClick}
                  className={cn(
                    "flex flex-col items-center justify-center",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    "rounded-2xl py-2 px-3",
                    "active:bg-muted/50 transition-colors",
                    itemWidth
                  )}
                  style={{ minHeight: TAP_TARGET.comfortable }}
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
                className={cn(
                  "flex flex-col items-center justify-center",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  "rounded-2xl py-2 px-3",
                  "active:bg-muted/50 transition-colors",
                  itemWidth
                )}
                style={{ minHeight: TAP_TARGET.comfortable }}
                {...getAccessibleLinkProps(item.label)}
              >
                {content}
              </Link>
            );
          })}
        </div>
        
        {/* Safe area for notched devices */}
        <div className="h-[env(safe-area-inset-bottom)] bg-white/95" />
      </nav>

      {/* More Options Sheet */}
      {!isSocialPage && (
        <Sheet open={isMoreSheetOpen} onOpenChange={setIsMoreSheetOpen}>
          <SheetContent side="bottom" className="h-[65vh] rounded-t-3xl bg-white border-0 shadow-2xl">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 rounded-full bg-muted" />
            
            <SheetHeader className="mb-6 pt-4">
              <SheetTitle className="text-center text-lg font-bold text-foreground">
                כל הקטגוריות
              </SheetTitle>
            </SheetHeader>
            
            <div className="grid grid-cols-3 gap-4 px-2 pb-8">
              {moreCategories.map((category, i) => {
                const CategoryIcon = category.icon;
                return (
                  <motion.div
                    key={category.path}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      to={category.path}
                      onClick={() => setIsMoreSheetOpen(false)}
                      className="flex flex-col items-center gap-2.5 p-4 rounded-2xl hover:bg-muted/50 active:bg-muted transition-all group"
                    >
                      <motion.div 
                        className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center shadow-sm"
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <CategoryIcon className="w-6 h-6 text-primary" strokeWidth={1.5} />
                      </motion.div>
                      <span className="text-xs font-semibold text-center text-foreground leading-tight">
                        {category.label}
                      </span>
                    </Link>
                  </motion.div>
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
