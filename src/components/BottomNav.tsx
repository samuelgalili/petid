import { Home, MapPin, Grid3x3, ShoppingBag, MessageCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { buttonTap, celebrate, ANIMATION_DURATION } from "@/lib/animations";
import { getAccessibleLinkProps, TAP_TARGET } from "@/lib/accessibility";
import { ARIA_LABELS } from "@/lib/microcopy";

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
      <div className="fixed bottom-[72px] left-0 right-0 bg-background border-t border-border/30 z-40">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex justify-center items-center gap-3 flex-wrap text-xs">
            <a href="#" className="text-muted-foreground hover:text-primary hover:underline font-jakarta transition-colors">הצהרת נגישות</a>
            <span className="text-border">|</span>
            <a href="#" className="text-muted-foreground hover:text-primary hover:underline font-jakarta transition-colors">תנאי המועדון</a>
            <span className="text-border">|</span>
            <a href="#" className="text-muted-foreground hover:text-primary hover:underline font-jakarta transition-colors">מדיניות פרטיות</a>
            <span className="text-border">|</span>
            <a href="#" className="text-muted-foreground hover:text-primary hover:underline font-jakarta transition-colors">תנאי שימוש</a>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav 
        className="fixed bottom-0 left-0 right-0 bg-background border-t border-border/30 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]"
        role="navigation"
        aria-label={ARIA_LABELS.navigation}
      >
        <div className="flex justify-around items-end py-2 max-w-md mx-auto px-2 relative">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg",
                  item.isCenter ? "min-w-[70px] -mt-8" : "min-w-[60px]"
                )}
                style={{ minHeight: TAP_TARGET.comfortable }}
                {...getAccessibleLinkProps(item.label)}
              >
                {item.isCenter ? (
                  // Large elevated center button - Primary Action
                  <motion.div
                    variants={celebrate}
                    whileHover={{ scale: 1.05 }}
                    whileTap={buttonTap}
                    transition={{ duration: ANIMATION_DURATION.fast }}
                    className="w-16 h-16 rounded-full bg-accent flex items-center justify-center shadow-[0_4px_20px_rgba(251,214,106,0.4)] mb-1 ring-2 ring-accent/20"
                  >
                    <MessageCircle className="w-7 h-7 text-error stroke-[2.5]" />
                  </motion.div>
                ) : (
                  <motion.div
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={buttonTap}
                    transition={{ duration: ANIMATION_DURATION.fast }}
                    className="relative"
                  >
                    <Icon className={cn(
                      "w-6 h-6 transition-all",
                      isActive ? "stroke-[2.5] text-foreground" : "stroke-[2] text-muted-foreground"
                    )} />
                    {/* Active indicator dot */}
                    {isActive && (
                      <motion.div
                        layoutId="activeNavDot"
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </motion.div>
                )}
                
                <span className={cn(
                  "text-[9px] font-medium font-jakarta transition-colors text-center leading-tight",
                  item.isCenter ? "text-foreground font-bold" : (isActive ? "text-foreground" : "text-muted-foreground")
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
