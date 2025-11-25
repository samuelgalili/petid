import { Home, Calendar, Bell, MapPin, Heart } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "Home", path: "/home" },
    { icon: Calendar, label: "Diary", path: "/tracker" },
    { icon: Bell, label: "Updates", path: "/feed" },
    { icon: MapPin, label: "Shop", path: "/shop" },
    { icon: Heart, label: "Adopt", path: "/adoption" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white backdrop-blur-sm border-t border-gray-200 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-all duration-200 relative group",
                isActive ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {isActive && (
                <motion.span 
                  layoutId="activeIndicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-[#FBD66A] to-[#F4C542] rounded-full shadow-md"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <motion.div
                animate={{ scale: isActive ? 1.15 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={cn(
                  "rounded-full p-1.5 transition-all",
                  isActive && "bg-[#FBD66A]/10"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5 mb-0.5 transition-all",
                  isActive ? "stroke-[2.5]" : "stroke-[2] group-hover:scale-110"
                )} />
              </motion.div>
              <span className={cn(
                "text-[10px] font-jakarta transition-all mt-0.5",
                isActive ? "font-bold" : "font-medium"
              )}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
