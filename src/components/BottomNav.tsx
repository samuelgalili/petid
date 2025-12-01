import { Home, ShoppingBag, Users, LayoutGrid, MessageCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { buttonTap, ANIMATION_DURATION } from "@/lib/animations";
import { getAccessibleLinkProps, TAP_TARGET } from "@/lib/accessibility";
import { ARIA_LABELS } from "@/lib/microcopy";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  Camera, 
  FileText, 
  Heart, 
  Shield, 
  Trees, 
  GraduationCap, 
  Scissors, 
  CheckSquare,
  Gift
} from "lucide-react";

const BottomNav = () => {
  const location = useLocation();
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);

  const navItems = [
    { icon: Home, label: "בית", path: "/home" },
    { icon: ShoppingBag, label: "חנות", path: "/shop" },
    { icon: Users, label: "רשת חברתית", path: "/feed" },
    { 
      icon: LayoutGrid, 
      label: "אפשרויות", 
      onClick: () => setIsMoreSheetOpen(true),
      isButton: true 
    },
    { icon: MessageCircle, label: "צ'אט", path: "/chat" },
  ];

  const moreCategories = [
    { icon: FileText, label: "מסמכים", path: "/documents", color: "text-blue-600" },
    { icon: Camera, label: "אלבום תמונות", path: "/photos", color: "text-purple-600" },
    { icon: Heart, label: "אימוץ", path: "/adoption", color: "text-pink-600" },
    { icon: Shield, label: "ביטוח", path: "/insurance", color: "text-green-600" },
    { icon: Trees, label: "גינות כלבים", path: "/parks", color: "text-emerald-600" },
    { icon: GraduationCap, label: "אילוף", path: "/training", color: "text-indigo-600" },
    { icon: Scissors, label: "מספרה", path: "/grooming", color: "text-orange-600" },
    { icon: CheckSquare, label: "משימות", path: "/tasks", color: "text-yellow-600" },
    { icon: Gift, label: "פרסים", path: "/rewards", color: "text-rose-600" },
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
        className="fixed bottom-0 left-0 right-0 bg-[#F5F5F3] border-t border-[#E1E1E1] z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] h-16"
        role="navigation"
        aria-label={ARIA_LABELS.navigation}
      >
        <div className="flex justify-around items-center h-full max-w-md mx-auto px-2">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = !item.isButton && location.pathname === item.path;
            const key = item.path || `button-${index}`;
            
            const content = (
              <>
                <motion.div
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={buttonTap}
                  transition={{ duration: ANIMATION_DURATION.fast }}
                  className="relative"
                >
                  <Icon 
                    className={cn(
                      "w-[22px] h-[22px] transition-all",
                      isActive ? "text-primary" : "text-secondary"
                    )} 
                    strokeWidth={1.5}
                  />
                  {isActive && (
                    <motion.div
                      layoutId="activeNavDot"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </motion.div>
                
                <span className={cn(
                  "text-[10px] font-medium font-jakarta transition-colors text-center leading-tight",
                  isActive ? "text-primary" : "text-secondary"
                )}>
                  {item.label}
                </span>
              </>
            );

            if (item.isButton) {
              return (
                <button
                  key={key}
                  onClick={item.onClick}
                  className="flex flex-col items-center justify-center gap-1 w-[20%] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
                  style={{ minHeight: TAP_TARGET.comfortable }}
                  aria-label={item.label}
                >
                  {content}
                </button>
              );
            }

            return (
              <Link
                key={key}
                to={item.path!}
                className="flex flex-col items-center justify-center gap-1 w-[20%] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
                style={{ minHeight: TAP_TARGET.comfortable }}
                {...getAccessibleLinkProps(item.label)}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* More Options Sheet */}
      <Sheet open={isMoreSheetOpen} onOpenChange={setIsMoreSheetOpen}>
        <SheetContent side="bottom" className="h-[60vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-center text-lg font-bold text-foreground">
              כל הקטגוריות
            </SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-4 mt-6 px-2">
            {moreCategories.map((category) => {
              const CategoryIcon = category.icon;
              return (
                <Link
                  key={category.path}
                  to={category.path}
                  onClick={() => setIsMoreSheetOpen(false)}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="w-14 h-14 rounded-full bg-muted border border-border flex items-center justify-center">
                    <CategoryIcon className={cn("w-6 h-6", category.color)} strokeWidth={1.5} />
                  </div>
                  <span className="text-xs font-medium text-center text-foreground leading-tight">
                    {category.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default BottomNav;
