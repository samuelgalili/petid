import { Menu, Bell, User, Search, ShoppingCart, X } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { getTotalItems, items, getSubtotal, removeFromCart } = useCart();
  const { unreadCount } = useRealtimeNotifications();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCartPreview, setShowCartPreview] = useState(false);
  const [leaveTimeout, setLeaveTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const cartItemCount = getTotalItems();

  const handleMouseEnter = () => {
    if (leaveTimeout) {
      clearTimeout(leaveTimeout);
      setLeaveTimeout(null);
    }
    setShowCartPreview(true);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setShowCartPreview(false);
    }, 300);
    setLeaveTimeout(timeout);
  };

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
                  <Menu className="w-5 h-5 text-[#262626] dark:text-gray-300" strokeWidth={1.5} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-semibold">Menu</p>
              </TooltipContent>
            </Tooltip>
            
            {/* Center: Petid Logo with Icon */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2">
              <img src={petidIcon} alt="Petid Icon" className="h-7 w-7 object-contain" />
              <img src={petidLogo} alt="Petid" className="h-6 w-auto" />
            </div>
            
            {/* Right: Cart, User, Notifications, Search - Close together */}
            <div className="flex items-center -space-x-2">
              <div 
                className="relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all relative focus-visible-ring group"
                      onClick={() => navigate('/cart')}
                      aria-label="Shopping cart"
                    >
                      <motion.div
                        animate={cartItemCount === 0 ? {
                          rotate: [0, -8, 8, -6, 6, -3, 3, 0],
                          x: [0, -2, 2, -1, 1, 0]
                        } : {}}
                        transition={{
                          duration: 0.6,
                          ease: "easeInOut",
                          repeat: Infinity,
                          repeatDelay: 3
                        }}
                        whileHover={cartItemCount === 0 ? {
                          rotate: [0, -12, 12, -8, 8, -4, 4, 0],
                          scale: [1, 1.1, 1],
                          transition: { duration: 0.5 }
                        } : {}}
                      >
                        <ShoppingCart 
                          className={`w-5 h-5 transition-colors ${
                            cartItemCount === 0 
                              ? 'text-gray-400 dark:text-gray-500 group-hover:text-accent' 
                              : 'text-foreground dark:text-gray-300 hover:text-primary'
                          }`} 
                          strokeWidth={1.5} 
                        />
                      </motion.div>
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
                            className="absolute -top-1 -right-1 w-6 h-6 bg-white border-2 border-gray-200 text-gray-900 rounded-full text-xs font-bold flex items-center justify-center shadow-md"
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

                {/* Mini Cart Preview Dropdown */}
                <AnimatePresence>
                  {showCartPreview && cartItemCount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute left-auto right-0 top-full mt-1 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
                      style={{ transform: 'translateX(0)' }}
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-bold text-gray-900 dark:text-white">עגלת קניות</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{cartItemCount} {cartItemCount === 1 ? 'פריט' : 'פריטים'}</p>
                      </div>

                      <div className="max-h-80 overflow-y-auto">
                        {items.slice(0, 3).map((item) => (
                          <div key={`${item.id}-${item.variant || ''}-${item.size || ''}`} className="p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                            <div className="flex gap-3">
                              <img 
                                src={item.image} 
                                alt={item.name}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">{item.name}</h4>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeFromCart(item.id);
                                      toast({ title: "הוסר מהעגלה", description: `${item.name} הוסר` });
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                                    aria-label="Remove item"
                                  >
                                    <X className="w-4 h-4 text-red-500" strokeWidth={1.5} />
                                  </button>
                                </div>
                                {item.variant && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400">{item.variant}</p>
                                )}
                                {item.size && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400">גודל: {item.size}</p>
                                )}
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs text-gray-600 dark:text-gray-400">כמות: {item.quantity}</span>
                                  <span className="font-bold text-sm text-gray-900 dark:text-white">₪{(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {items.length > 3 && (
                          <div className="p-4 text-center text-sm text-gray-600 dark:text-gray-400">
                            +{items.length - 3} {items.length - 3 === 1 ? 'פריט נוסף' : 'פריטים נוספים'}
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-semibold text-gray-900 dark:text-white">סך הכל:</span>
                          <span className="font-bold text-lg text-gray-900 dark:text-white">₪{getSubtotal().toFixed(2)}</span>
                        </div>
                        <Button
                          onClick={() => {
                            setShowCartPreview(false);
                            navigate('/cart');
                          }}
                          className="w-full bg-accent hover:bg-accent-hover text-text-inverse font-semibold rounded-xl"
                        >
                          צפה בעגלה
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all focus-visible-ring"
                    onClick={() => navigate('/settings')}
                    aria-label="User profile"
                  >
                    <User className="w-5 h-5 text-foreground dark:text-gray-300 hover:text-primary transition-colors" strokeWidth={1.5} />
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
                    onClick={() => navigate('/notifications')}
                    aria-label="View notifications"
                  >
                    <Bell className="w-5 h-5 text-foreground dark:text-gray-300 hover:text-accent transition-colors" strokeWidth={1.5} />
                    <AnimatePresence mode="wait">
                      {unreadCount > 0 && (
                        <motion.span
                          key={unreadCount}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ 
                            type: "spring",
                            stiffness: 500,
                            damping: 25
                          }}
                          className="absolute -top-1 -right-1 w-6 h-6 bg-error text-white rounded-full text-xs font-black flex items-center justify-center shadow-lg animate-pulse border-2 border-white"
                        >
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="font-semibold">
                    התראות {unreadCount > 0 && `(${unreadCount})`}
                  </p>
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
                      <Search className="w-5 h-5 text-foreground dark:text-gray-300 hover:text-primary transition-colors" strokeWidth={1.5} />
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
                      className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white border-2 border-success text-sm text-gray-900 placeholder:text-gray-400 font-jakarta shadow-lg focus-visible-ring"
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
