import { Home, ShoppingBag, Users, Grid3x3, MessageCircle } from "lucide-react";
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
    { icon: Users, label: "Petish", path: "/feed" },
    { 
      icon: Grid3x3, 
      label: "אפשרויות", 
      onClick: () => setIsMoreSheetOpen(true),
      isButton: true 
    },
    { icon: MessageCircle, label: "צ'אט", path: "/chat" },
  ];

  const moreCategories = [
    { icon: FileText, label: "מסמכים", path: "/documents" },
    { icon: Camera, label: "אלבום תמונות", path: "/photos" },
    { icon: Heart, label: "אימוץ", path: "/adoption" },
    { icon: Shield, label: "ביטוח", path: "/insurance" },
    { icon: Trees, label: "גינות כלבים", path: "/parks" },
    { icon: GraduationCap, label: "אילוף", path: "/training" },
    { icon: Scissors, label: "מספרה", path: "/grooming" },
    { icon: CheckSquare, label: "משימות", path: "/tasks" },
    { icon: Gift, label: "פרסים", path: "/rewards" },
  ];

  return (
    <>
      {/* Bottom Navigation */}
      <nav 
        className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50 h-16"
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
                  whileHover={{ scale: 1.05 }}
                  whileTap={buttonTap}
                  transition={{ duration: ANIMATION_DURATION.fast }}
                  className="relative"
                >
                  <Icon 
                    className={cn(
                      "w-[22px] h-[22px] transition-colors",
                      isActive ? "text-primary" : "text-foreground"
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
                  "text-[10px] font-medium font-jakarta transition-colors text-center leading-tight mt-1",
                  isActive ? "text-primary" : "text-foreground"
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
                  className="flex flex-col items-center justify-center w-[20%] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg py-2"
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
                className="flex flex-col items-center justify-center w-[20%] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg py-2"
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
        <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl bg-surface border-border">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-center text-lg font-semibold text-foreground">
              כל הקטגוריות
            </SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-6 px-2">
            {moreCategories.map((category) => {
              const CategoryIcon = category.icon;
              return (
                <Link
                  key={category.path}
                  to={category.path}
                  onClick={() => setIsMoreSheetOpen(false)}
                  className="flex flex-col items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors">
                    <CategoryIcon className={cn("w-6 h-6 text-foreground group-hover:text-primary transition-colors")} strokeWidth={1.5} />
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
