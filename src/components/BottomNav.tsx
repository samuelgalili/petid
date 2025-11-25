import { Home, Calendar, Bell, MapPin, ShoppingCart, Shield } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Badge } from "@/components/ui/badge";

const BottomNav = () => {
  const location = useLocation();
  const { getTotalItems } = useCart();
  const { isAdmin } = useAdmin();
  const cartItemCount = getTotalItems();

  const navItems = [
    { icon: Home, label: "Home", path: "/home" },
    { icon: Calendar, label: "Diary", path: "/tracker" },
    { icon: Bell, label: "Updates", path: "/feed" },
    { icon: ShoppingCart, label: "Cart", path: "/cart" },
    ...(isAdmin ? [{ icon: Shield, label: "Admin", path: "/admin/dashboard" }] : [{ icon: MapPin, label: "Shop", path: "/shop" }]),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white backdrop-blur-sm border-t border-gray-200 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex justify-around items-center h-14 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center justify-center w-12 h-12 transition-all duration-200 relative group rounded-full",
                isActive ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {isActive && (
                <motion.span 
                  layoutId="activeIndicator"
                  className="absolute inset-0 bg-gradient-to-r from-[#FBD66A]/20 to-[#F4C542]/20 rounded-full shadow-sm"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <motion.div
                animate={{ scale: isActive ? 1.15 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative z-10"
              >
                <Icon className={cn(
                  "w-6 h-6 transition-all",
                  isActive ? "stroke-[2.5]" : "stroke-[2] group-hover:scale-110"
                )} />
                {item.path === "/cart" && cartItemCount > 0 && (
                  <Badge 
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold border-2 border-white"
                  >
                    {cartItemCount > 9 ? "9+" : cartItemCount}
                  </Badge>
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
