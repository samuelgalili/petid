import { Home, ShoppingBag, User, Compass, Clapperboard, Plus, Grid3X3 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
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
  Gift,
  MessageCircle
} from "lucide-react";

interface NavItemProps {
  to?: string;
  icon: React.ReactNode;
  isActive: boolean;
  label: string;
  onClick?: () => void;
}

const NavItem = ({ to, icon, isActive, label, onClick }: NavItemProps) => {
  const content = (
    <motion.div
      whileTap={{ scale: 0.92 }}
      className="relative"
    >
      {icon}
    </motion.div>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="flex flex-col items-center justify-center flex-1 py-2 active:opacity-50 transition-opacity"
        aria-label={label}
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      to={to || "/"}
      className="flex flex-col items-center justify-center flex-1 py-2 active:opacity-50 transition-opacity"
      aria-label={label}
    >
      {content}
    </Link>
  );
};

const BottomNav = () => {
  const location = useLocation();
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string>("");

  // Auth pages where we don't show bottom nav
  const authRoutes = ['/auth', '/signup', '/forgot-password', '/reset-password', '/splash', '/add-pet', '/onboarding'];
  const isAuthPage = authRoutes.some(route => location.pathname.startsWith(route));
  
  if (isAuthPage) return null;

  // Fetch user avatar
  useEffect(() => {
    const fetchUserAvatar = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        if (data?.avatar_url) {
          setUserAvatar(data.avatar_url);
        }
      }
    };
    fetchUserAvatar();
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const categories = [
    { icon: FileText, label: "מסמכים", path: "/documents", color: "#1E5799" },
    { icon: Camera, label: "אלבום תמונות", path: "/photos", color: "#7DB9E8" },
    { icon: Heart, label: "אימוץ", path: "/adoption", color: "#4ECDC4" },
    { icon: Shield, label: "ביטוח", path: "/insurance", color: "#1E5799" },
    { icon: Trees, label: "גינות כלבים", path: "/parks", color: "#4ECDC4" },
    { icon: GraduationCap, label: "אילוף", path: "/training", color: "#7DB9E8" },
    { icon: Scissors, label: "מספרה", path: "/grooming", color: "#4ECDC4" },
    { icon: CheckSquare, label: "משימות", path: "/tasks", color: "#1E5799" },
    { icon: Gift, label: "פרסים", path: "/rewards", color: "#4ECDC4" },
    { icon: MessageCircle, label: "צ'אט AI", path: "/chat", color: "#1E5799" },
  ];

  return (
    <>
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-background via-background/98 to-background/90 backdrop-blur-2xl border-t border-primary/10 shadow-[0_-8px_32px_rgba(0,0,0,0.12)]"
        role="navigation"
        aria-label="ניווט ראשי"
      >
        {/* Decorative glow line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        
        <div className="flex justify-around items-center h-18 max-w-lg mx-auto px-3 py-1">
          {/* Home */}
          <NavItem
            to="/"
            icon={
              <div className={cn(
                "p-2.5 rounded-2xl transition-all duration-300 relative",
                isActive("/") && "bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25"
              )}>
                {isActive("/") && (
                  <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-pulse" />
                )}
                <Home 
                  className={cn(
                    "w-6 h-6 transition-all duration-300 relative z-10",
                    isActive("/") ? "text-primary-foreground drop-shadow-sm" : "text-muted-foreground"
                  )}
                  strokeWidth={isActive("/") ? 2.5 : 1.5}
                  fill={isActive("/") ? "currentColor" : "none"}
                />
              </div>
            }
            isActive={isActive("/")}
            label="בית"
          />

          {/* Explore */}
          <NavItem
            to="/explore"
            icon={
              <div className={cn(
                "p-2.5 rounded-2xl transition-all duration-300 relative",
                isActive("/explore") && "bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25"
              )}>
                {isActive("/explore") && (
                  <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-pulse" />
                )}
                <Compass 
                  className={cn(
                    "w-6 h-6 transition-all duration-300 relative z-10",
                    isActive("/explore") ? "text-primary-foreground drop-shadow-sm" : "text-muted-foreground"
                  )}
                  strokeWidth={isActive("/explore") ? 2.5 : 1.5}
                  fill={isActive("/explore") ? "currentColor" : "none"}
                />
              </div>
            }
            isActive={isActive("/explore")}
            label="חיפוש"
          />

          {/* Categories (+) - Center Button */}
          <NavItem
            onClick={() => setCategoriesOpen(true)}
            icon={
              <div className="relative group">
                {/* Outer glow ring */}
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-[#1E5799] via-[#4ECDC4] to-[#7DB9E8] opacity-60 blur-md group-hover:opacity-80 transition-opacity" />
                {/* Main button */}
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1E5799] via-[#4ECDC4] to-[#7DB9E8] flex items-center justify-center shadow-xl shadow-[#4ECDC4]/40 group-hover:shadow-2xl group-hover:shadow-[#4ECDC4]/50 transition-all duration-300 group-hover:scale-105">
                  {/* Inner shine */}
                  <div className="absolute inset-[2px] rounded-[14px] bg-gradient-to-br from-white/20 to-transparent" />
                  <Plus className="w-7 h-7 text-white drop-shadow-sm relative z-10" strokeWidth={2.5} />
                </div>
              </div>
            }
            isActive={false}
            label="קטגוריות"
          />

          {/* Shop */}
          <NavItem
            to="/shop"
            icon={
              <div className={cn(
                "p-2.5 rounded-2xl transition-all duration-300 relative",
                isActive("/shop") && "bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25"
              )}>
                {isActive("/shop") && (
                  <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-pulse" />
                )}
                <ShoppingBag 
                  className={cn(
                    "w-6 h-6 transition-all duration-300 relative z-10",
                    isActive("/shop") ? "text-primary-foreground drop-shadow-sm" : "text-muted-foreground"
                  )}
                  strokeWidth={isActive("/shop") ? 2.5 : 1.5}
                  fill={isActive("/shop") ? "currentColor" : "none"}
                />
              </div>
            }
            isActive={isActive("/shop")}
            label="חנות"
          />

          {/* Profile with Avatar */}
          <Link
            to="/profile"
            className="flex flex-col items-center justify-center flex-1 py-2 active:opacity-50"
            aria-label="פרופיל"
          >
            <motion.div whileTap={{ scale: 0.9 }} className="relative">
              <div className={cn(
                "w-9 h-9 rounded-2xl overflow-hidden transition-all duration-300 relative",
                isActive("/profile") 
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg shadow-primary/20" 
                  : "ring-1 ring-border/50"
              )}>
                {isActive("/profile") && (
                  <div className="absolute inset-0 bg-primary/10 z-10" />
                )}
                <Avatar className="w-full h-full">
                  <AvatarImage src={userAvatar} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-secondary to-muted text-muted-foreground text-[10px]">
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              </div>
            </motion.div>
          </Link>
        </div>
        
        {/* Safe area for notched devices */}
        <div className="h-[env(safe-area-inset-bottom)] bg-background" />
      </nav>

      {/* Floating Action Button for Create Post */}
      <motion.button
        onClick={() => setCreatePostOpen(true)}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        className="fixed bottom-24 left-4 z-40 w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden group"
        aria-label="יצירת פוסט חדש"
      >
        {/* Animated gradient border */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#1E5799] via-[#4ECDC4] to-[#7DB9E8] bg-[length:200%_100%] animate-[shimmer_3s_linear_infinite] p-[2px]">
          <div className="w-full h-full rounded-[14px] bg-background/95 backdrop-blur-md flex items-center justify-center">
            <Camera className="w-6 h-6 text-[#1E5799]" strokeWidth={2} />
          </div>
        </div>
      </motion.button>

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={createPostOpen}
        onOpenChange={setCreatePostOpen}
        onPostCreated={() => {}}
      />

      {/* Categories Sheet */}
      <Sheet open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[75vh] rounded-t-3xl bg-gradient-to-b from-background to-background/98 border-0 shadow-[0_-16px_48px_rgba(0,0,0,0.15)]">
          <SheetTitle className="sr-only">קטגוריות</SheetTitle>
          <SheetDescription className="sr-only">בחר קטגוריה לניווט</SheetDescription>
          
          {/* Handle bar */}
          <div className="w-12 h-1.5 bg-gradient-to-r from-muted via-[#4ECDC4]/50 to-muted rounded-full mx-auto mt-3 mb-4" />
          
          {/* Header */}
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-foreground">קטגוריות</h3>
            <p className="text-sm text-muted-foreground">בחר קטגוריה לניווט</p>
          </div>
          
          <motion.div 
            className="grid grid-cols-4 gap-4 px-4 pb-10"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.04,
                  delayChildren: 0.1
                }
              }
            }}
          >
            {categories.map((category, index) => {
              const CategoryIcon = category.icon;
              return (
                <motion.div
                  key={category.path}
                  variants={{
                    hidden: { opacity: 0, y: 30, scale: 0.7 },
                    visible: { opacity: 1, y: 0, scale: 1 }
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Link
                    to={category.path}
                    onClick={() => setCategoriesOpen(false)}
                    className="flex flex-col items-center gap-2.5 p-3 rounded-2xl active:bg-muted/50 hover:bg-muted/30 transition-all duration-200 group"
                  >
                    <motion.div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center relative overflow-hidden shadow-sm"
                      style={{ backgroundColor: `${category.color}15` }}
                      whileHover={{ scale: 1.08, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {/* Glow effect on hover */}
                      <div 
                        className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-300 blur-sm"
                        style={{ backgroundColor: category.color }}
                      />
                      {/* Icon border ring */}
                      <div 
                        className="absolute inset-0 rounded-2xl border-2 opacity-20"
                        style={{ borderColor: category.color }}
                      />
                      <CategoryIcon 
                        className="w-6 h-6 relative z-10 transition-transform group-hover:scale-110" 
                        style={{ color: category.color }} 
                        strokeWidth={1.5} 
                      />
                    </motion.div>
                    <span className="text-xs font-semibold text-center text-foreground leading-tight group-hover:text-primary transition-colors">
                      {category.label}
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default BottomNav;
