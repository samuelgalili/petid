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
    <nav className="fixed bottom-0 left-0 right-0 bg-background/98 backdrop-blur-sm border-t border-border z-50">
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
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.span 
                  layoutId="activeIndicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-foreground rounded-full"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <motion.div
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Icon className={cn(
                  "w-[22px] h-[22px] mb-1 transition-transform",
                  isActive ? "" : "group-hover:scale-105"
                )} />
              </motion.div>
              <span className={cn(
                "text-[11px] font-medium transition-all",
                isActive ? "font-semibold" : ""
              )}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
