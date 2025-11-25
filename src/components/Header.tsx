import { Menu, Bell, User, Search, ShoppingCart } from "lucide-react";
import petidLogo from "@/assets/petid-logo.png";
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
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import { motion, AnimatePresence } from "framer-motion";

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { getTotalItems } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const cartItemCount = getTotalItems();

  // Don't render header on auth, signup, or add-pet pages
  const hideHeaderPaths = ['/auth', '/signup', '/add-pet', '/forgot-password', '/reset-password'];
  if (hideHeaderPaths.includes(location.pathname)) {
    return null;
  }

  return (
    <>
      <TooltipProvider delayDuration={200}>
        {/* Hamburger Menu */}
        <HamburgerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
        
        {/* Header - Fixed at Top */}
        <div className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 shadow-sm z-40 transition-colors">
          <div className="flex items-center justify-between">
            {/* Left: Hamburger Menu */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all focus-visible-ring"
                  onClick={() => setIsMenuOpen(true)}
                  aria-label="Open menu"
                >
                  <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-semibold">Menu</p>
              </TooltipContent>
            </Tooltip>
            
            {/* Center: Petid Logo */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <img src={petidLogo} alt="Petid" className="h-6 w-auto" />
            </div>
            
            {/* Right: Cart, User, Notifications, Search - Close together */}
            <div className="flex items-center -space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all relative focus-visible-ring"
                    onClick={() => navigate('/cart')}
                    aria-label="Shopping cart"
                  >
                    <ShoppingCart className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    <AnimatePresence mode="wait">
                      {cartItemCount > 0 && (
                        <motion.span
                          key={cartItemCount}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ 
                            type: "spring",
                            stiffness: 500,
                            damping: 25
                          }}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-[#FBD66A] text-gray-900 rounded-full text-xs font-bold flex items-center justify-center"
                        >
                          {cartItemCount > 9 ? '9+' : cartItemCount}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-semibold">Cart ({cartItemCount})</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all focus-visible-ring"
                    onClick={() => navigate('/settings')}
                    aria-label="User profile"
                  >
                    <User className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-semibold">Profile & Settings</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all relative focus-visible-ring"
                    onClick={() => toast({ title: "🔔 Notifications", description: "No new notifications" })}
                    aria-label="View notifications"
                  >
                    <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-[#7DD3C0] rounded-full animate-pulse" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-semibold">Notifications</p>
                </TooltipContent>
              </Tooltip>

              {!isSearchOpen ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all focus-visible-ring"
                      onClick={() => setIsSearchOpen(true)}
                      aria-label="Open search"
                    >
                      <Search className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="font-semibold">Search</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div className="fixed left-4 right-16 top-3 z-50 animate-fade-in">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <input 
                      type="text" 
                      placeholder="Search products, pets, and more..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onBlur={() => {
                        if (!searchQuery) setIsSearchOpen(false);
                      }}
                      autoFocus
                      aria-label="Search products"
                      className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white border-2 border-[#7DD3C0] text-sm text-gray-900 placeholder:text-gray-400 font-jakarta shadow-lg focus-visible-ring"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Spacer for fixed header */}
        <div className="h-16"></div>
      </TooltipProvider>
    </>
  );
};
