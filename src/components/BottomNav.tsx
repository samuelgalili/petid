import { Home, Target, Store, Gift, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { 
      icon: Target, 
      label: "Tasks", 
      path: "/tasks",
      customIcon: true, // Will render custom yellow circle with red dog
    },
    { icon: Gift, label: "Rewards", path: "/rewards" },
    { icon: Store, label: "Shop", path: "/shop" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white backdrop-blur-sm border-t border-gray-200 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex justify-around items-center py-2 max-w-md mx-auto px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center gap-1 transition-all duration-200 relative group min-w-[60px]"
            >
              {item.customIcon ? (
                // Custom yellow circle with red dog for Tasks
                <motion.div
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all",
                    isActive 
                      ? "bg-[#F4D35E] shadow-[0_4px_16px_rgba(244,211,94,0.5)]" 
                      : "bg-[#F4D35E] shadow-[0_2px_12px_rgba(244,211,94,0.3)]"
                  )}
                >
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-[#E63946]">
                    <path d="M14 5C9.5 5 7 8 7 11.5C7 14 8.5 16.5 11 17.5L12 21L16 21L17 17.5C19.5 16.5 21 14 21 11.5C21 8 18.5 5 14 5Z" fill="currentColor"/>
                    <circle cx="11.5" cy="11" r="1.5" fill="white"/>
                    <circle cx="16.5" cy="11" r="1.5" fill="white"/>
                    <path d="M8.5 7.5C8.5 6 7 5 5.5 6.5C4 8 5 10 6.5 10C7.5 10 8.5 9 8.5 7.5Z" fill="currentColor"/>
                    <path d="M19.5 7.5C19.5 6 21 5 22.5 6.5C24 8 23 10 21.5 10C20.5 10 19.5 9 19.5 7.5Z" fill="currentColor"/>
                  </svg>
                </motion.div>
              ) : (
                <motion.div
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="relative"
                >
                  <Icon className={cn(
                    "w-6 h-6 transition-all",
                    isActive ? "stroke-[2.5] text-gray-900" : "stroke-[2] text-gray-500"
                  )} />
                </motion.div>
              )}
              
              <span className={cn(
                "text-[10px] font-bold font-jakarta transition-colors",
                isActive ? "text-gray-900" : "text-gray-500"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
