import { Heart, Search, X } from "lucide-react";
import petidLogo from "@/assets/petid-logo.png";
import petidIcon from "@/assets/petid-icon.png";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useRealtimeNotifications();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Don't render header on auth, signup, add-pet, or home pages
  const hideHeaderPaths = ['/auth', '/signup', '/add-pet', '/forgot-password', '/reset-password', '/home'];
  if (hideHeaderPaths.includes(location.pathname)) {
    return null;
  }

  return (
    <>
      <TooltipProvider delayDuration={200}>
        {/* Hamburger Menu */}
        <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        
        {/* Header - Fixed at Top - Clean Instagram-style */}
        <div className="fixed top-0 left-0 right-0 bg-background border-b border-border px-3 z-40 transition-colors" style={{ height: 'calc(44px + env(safe-area-inset-top, 0px))', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <div className="flex items-center justify-between h-full" dir="rtl">
            
            {/* Right Side: Heart/Notifications Icon */}
            <div className="flex items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full hover:bg-muted transition-all relative h-9 w-9"
                    onClick={() => navigate('/notifications')}
                    aria-label="התראות"
                  >
                    <Heart className="w-[26px] h-[26px] text-foreground" strokeWidth={1.5} />
                    <AnimatePresence mode="wait">
                      {unreadCount > 0 && (
                        <motion.span
                          key={unreadCount}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#FF3B30] text-white rounded-full text-[10px] font-bold flex items-center justify-center"
                        >
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-semibold">התראות {unreadCount > 0 && `(${unreadCount})`}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Center: Search Bar */}
            <div className="flex-1 mx-3 max-w-md">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" strokeWidth={1.5} />
                <input 
                  type="text" 
                  placeholder="חיפוש..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  className="w-full h-9 pr-9 pl-3 rounded-xl bg-muted/60 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  dir="rtl"
                />
              </div>
            </div>

            {/* Left Side: Logo with Icon - Bold Font */}
            <div className="flex items-center gap-1.5">
              <span className="text-[20px] font-black tracking-tight text-foreground" style={{ fontFamily: 'Assistant, sans-serif' }}>
                PetID
              </span>
              <img src={petidIcon} alt="PetID" className="h-7 w-7 object-contain" />
            </div>
          </div>
        </div>

        {/* Spacer for fixed header */}
        <div style={{ height: 'calc(44px + env(safe-area-inset-top, 0px))' }}></div>
      </TooltipProvider>
    </>
  );
};
