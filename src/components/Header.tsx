import { Menu, Bell, User, Search, ShoppingCart, X } from "lucide-react";
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
  const { getTotalItems, items, getSubtotal, removeFromCart } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCartPreview, setShowCartPreview] = useState(false);
  
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
              <div 
                className="relative"
                onMouseEnter={() => setShowCartPreview(true)}
                onMouseLeave={() => setShowCartPreview(false)}
              >
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

                {/* Mini Cart Preview Dropdown */}
                <AnimatePresence>
                  {showCartPreview && cartItemCount > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-bold text-gray-900 dark:text-white">Shopping Cart</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}</p>
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
                                      toast({ title: "Removed from cart", description: `${item.name} removed` });
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                                    aria-label="Remove item"
                                  >
                                    <X className="w-4 h-4 text-red-500" />
                                  </button>
                                </div>
                                {item.variant && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400">{item.variant}</p>
                                )}
                                {item.size && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400">Size: {item.size}</p>
                                )}
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs text-gray-600 dark:text-gray-400">Qty: {item.quantity}</span>
                                  <span className="font-bold text-sm text-gray-900 dark:text-white">₪{(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {items.length > 3 && (
                          <div className="p-4 text-center text-sm text-gray-600 dark:text-gray-400">
                            +{items.length - 3} more {items.length - 3 === 1 ? 'item' : 'items'}
                          </div>
                        )}
                      </div>

                      <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-semibold text-gray-900 dark:text-white">Subtotal:</span>
                          <span className="font-bold text-lg text-gray-900 dark:text-white">₪{getSubtotal().toFixed(2)}</span>
                        </div>
                        <Button 
                          onClick={() => {
                            setShowCartPreview(false);
                            navigate('/cart');
                          }}
                          className="w-full bg-[#FBD66A] hover:bg-[#F4C542] text-gray-900 font-bold rounded-xl"
                        >
                          View Cart
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
