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
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
      oscillator.frequency.setValueAtTime(1047, audioContext.currentTime + 0.1); // C6 note
      
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
            // Refetch count on any change
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
    { icon: Users, label: "Petish", path: "/feed" },
    { 
      icon: Grid3x3, 
      label: "אפשרויות", 
      onClick: () => setIsMoreSheetOpen(true),
      isButton: true 
    },
    { icon: MessageCircle, label: "צ'אט", path: "/chat" },
  ];

  // Social network navigation
  const socialNavItems = [
    { icon: Home, label: "חזרה לאפליקציה", path: "/home" },
    { icon: Mail, label: "הודעות", path: "/messages" },
    { icon: Bell, label: "התראות", path: "/notifications", badge: unreadCount },
    { icon: User, label: "הפרופיל שלי", path: "/profile" },
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
        className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50 h-16"
        role="navigation"
        aria-label={isSocialPage ? "ניווט רשת חברתית" : ARIA_LABELS.navigation}
      >
        <div className="flex justify-around items-center h-full max-w-md mx-auto px-2">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = !item.isButton && location.pathname === item.path;
            const key = item.path || `button-${index}`;
            const itemWidth = isSocialPage ? "w-[20%]" : "w-[20%]";
            
            const content = (
              <>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={buttonTap}
                  transition={{ duration: ANIMATION_DURATION.fast }}
                  className="relative"
                >
                  <Icon 
                    className={cn(
                      "w-[22px] h-[22px] transition-colors",
                      isActive ? "text-primary" : "text-foreground"
                    )} 
                    strokeWidth={1.5}
                  />
                  {/* Badge for unread count */}
                  {item.badge && item.badge > 0 && (
                    <motion.span 
                      className={cn(
                        "absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center",
                        isPulsing && item.path === '/notifications' && "animate-pulse"
                      )}
                      initial={false}
                      animate={isPulsing && item.path === '/notifications' ? {
                        scale: [1, 1.3, 1],
                        boxShadow: [
                          "0 0 0 0 rgba(239, 68, 68, 0)",
                          "0 0 0 8px rgba(239, 68, 68, 0.3)",
                          "0 0 0 0 rgba(239, 68, 68, 0)"
                        ]
                      } : {}}
                      transition={{ duration: 0.6, repeat: isPulsing ? 2 : 0 }}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </motion.span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId={isSocialPage ? "activeSocialNavDot" : "activeNavDot"}
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </motion.div>
                
                <span className={cn(
                  "text-[10px] font-medium font-jakarta transition-colors text-center leading-tight mt-1",
                  isActive ? "text-primary" : "text-foreground"
                )}>
                  {item.label}
                </span>
              </>
            );

            if (item.isButton) {
              return (
                <button
                  key={key}
                  onClick={item.onClick}
                  className={cn("flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg py-2", itemWidth)}
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
                className={cn("flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg py-2", itemWidth)}
                style={{ minHeight: TAP_TARGET.comfortable }}
                {...getAccessibleLinkProps(item.label)}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* More Options Sheet - Only for regular navigation */}
      {!isSocialPage && (
        <Sheet open={isMoreSheetOpen} onOpenChange={setIsMoreSheetOpen}>
          <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl bg-surface border-border">
            <SheetHeader className="mb-6">
              <SheetTitle className="text-center text-lg font-semibold text-foreground">
                כל הקטגוריות
              </SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-6 px-2">
              {moreCategories.map((category) => {
                const CategoryIcon = category.icon;
                return (
                  <Link
                    key={category.path}
                    to={category.path}
                    onClick={() => setIsMoreSheetOpen(false)}
                    className="flex flex-col items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors">
                      <CategoryIcon className={cn("w-6 h-6 text-foreground group-hover:text-primary transition-colors")} strokeWidth={1.5} />
                    </div>
                    <span className="text-xs font-medium text-center text-foreground leading-tight">
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
