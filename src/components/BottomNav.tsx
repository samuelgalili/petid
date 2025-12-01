import { Home, MapPin, Grid3x3, ShoppingBag, MessageCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "בית", path: "/" },
    { icon: ShoppingBag, label: "מבצעים וקופונים", path: "/rewards" },
    { 
      icon: MessageCircle, 
      label: "צ'אט AI", 
      path: "/chat",
      isCenter: true, // Large elevated center button
    },
    { icon: Grid3x3, label: "פעילות", path: "/feed" },
    { icon: MapPin, label: "ניווט", path: "/parks" },
  ];

  return (
    <>
      {/* Footer Links - Above Bottom Nav */}
      <div className="fixed bottom-[72px] left-0 right-0 bg-white border-t border-gray-100 z-40">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex justify-center items-center gap-3 flex-wrap text-xs">
            <a href="#" className="text-secondary hover:underline font-jakarta">Accessibility Statement</a>
            <span className="text-gray-300">|</span>
            <a href="#" className="text-secondary hover:underline font-jakarta">Club Terms</a>
            <span className="text-gray-300">|</span>
            <a href="#" className="text-secondary hover:underline font-jakarta">Privacy Policy</a>
            <span className="text-gray-300">|</span>
            <a href="#" className="text-secondary hover:underline font-jakarta">Terms of Use</a>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-end py-2 max-w-md mx-auto px-2 relative">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-all duration-200 relative",
                  item.isCenter ? "min-w-[70px] -mt-8" : "min-w-[60px]"
                )}
              >
                {item.isCenter ? (
                  // Large elevated center button - Fuel Check-in
                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    className="w-16 h-16 rounded-full bg-accent flex items-center justify-center shadow-[0_4px_20px_rgba(251,214,106,0.4)] mb-1"
                  >
                    <MessageCircle className="w-7 h-7 text-error stroke-[2.5]" />
                  </motion.div>
                ) : (
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className="relative"
                  >
                    <Icon className={cn(
                      "w-6 h-6 transition-all",
                      isActive ? "stroke-[2.5] text-gray-900" : "stroke-[2] text-gray-600"
                    )} />
                  </motion.div>
                )}
                
                <span className={cn(
                  "text-[9px] font-medium font-jakarta transition-colors text-center leading-tight",
                  item.isCenter ? "text-gray-900 font-bold" : (isActive ? "text-gray-900" : "text-gray-600")
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
