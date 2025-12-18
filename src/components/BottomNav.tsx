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
    { icon: FileText, label: "מסמכים", path: "/documents", color: "#0095F6" },
    { icon: Camera, label: "אלבום תמונות", path: "/photos", color: "#8134AF" },
    { icon: Heart, label: "אימוץ", path: "/adoption", color: "#ED4956" },
    { icon: Shield, label: "ביטוח", path: "/insurance", color: "#0095F6" },
    { icon: Trees, label: "גינות כלבים", path: "/parks", color: "#00A676" },
    { icon: GraduationCap, label: "אילוף", path: "/training", color: "#F58529" },
    { icon: Scissors, label: "מספרה", path: "/grooming", color: "#DD2A7B" },
    { icon: CheckSquare, label: "משימות", path: "/tasks", color: "#515BD4" },
    { icon: Gift, label: "פרסים", path: "/rewards", color: "#F58529" },
    { icon: MessageCircle, label: "צ'אט AI", path: "/chat", color: "#0095F6" },
  ];

  return (
    <>
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        role="navigation"
        aria-label="ניווט ראשי"
      >
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
          {/* Home */}
          <NavItem
            to="/"
            icon={
              <div className={cn(
                "p-2 rounded-xl transition-all duration-200",
                isActive("/") && "bg-primary/10"
              )}>
                <Home 
                  className={cn(
                    "w-6 h-6 transition-colors",
                    isActive("/") ? "text-primary" : "text-muted-foreground"
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
                "p-2 rounded-xl transition-all duration-200",
                isActive("/explore") && "bg-primary/10"
              )}>
                <Compass 
                  className={cn(
                    "w-6 h-6 transition-colors",
                    isActive("/explore") ? "text-primary" : "text-muted-foreground"
                  )}
                  strokeWidth={isActive("/explore") ? 2.5 : 1.5}
                  fill={isActive("/explore") ? "currentColor" : "none"}
                />
              </div>
            }
            isActive={isActive("/explore")}
            label="חיפוש"
          />

          {/* Categories (+) */}
          <NavItem
            onClick={() => setCategoriesOpen(true)}
            icon={
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary via-[#E3A700] to-primary flex items-center justify-center shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 hover:scale-105">
                <Plus className="w-6 h-6 text-primary-foreground" strokeWidth={2.5} />
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
                "p-2 rounded-xl transition-all duration-200",
                isActive("/shop") && "bg-primary/10"
              )}>
                <ShoppingBag 
                  className={cn(
                    "w-6 h-6 transition-colors",
                    isActive("/shop") ? "text-primary" : "text-muted-foreground"
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
                "w-8 h-8 rounded-xl overflow-hidden transition-all duration-200",
                isActive("/profile") 
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-background" 
                  : "ring-1 ring-border"
              )}>
                <Avatar className="w-full h-full">
                  <AvatarImage src={userAvatar} className="object-cover" />
                  <AvatarFallback className="bg-secondary text-muted-foreground text-[10px]">
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              </div>
              {isActive("/profile") && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary"
                  initial={false}
                />
              )}
            </motion.div>
          </Link>
        </div>
        
        {/* Safe area for notched devices */}
        <div className="h-[env(safe-area-inset-bottom)] bg-background/80" />
      </nav>

      {/* Floating Action Button for Create Post */}
      <motion.button
        onClick={() => setCreatePostOpen(true)}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        className="fixed bottom-24 left-4 z-40 w-14 h-14 bg-gradient-instagram rounded-2xl flex items-center justify-center shadow-xl shadow-instagram/30 hover:shadow-2xl hover:shadow-instagram/40 transition-shadow duration-300"
        aria-label="יצירת פוסט חדש"
      >
        <Camera className="w-6 h-6 text-white" strokeWidth={2} />
      </motion.button>

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={createPostOpen}
        onOpenChange={setCreatePostOpen}
        onPostCreated={() => {}}
      />

      {/* Categories Sheet */}
      <Sheet open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-2xl bg-background border-0">
          <SheetTitle className="sr-only">קטגוריות</SheetTitle>
          <SheetDescription className="sr-only">בחר קטגוריה לניווט</SheetDescription>
          <div className="w-10 h-1 bg-muted rounded-full mx-auto mt-2 mb-6" />
          
          <motion.div 
            className="grid grid-cols-4 gap-3 px-4 pb-8"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.05
                }
              }
            }}
          >
            {categories.map((category) => {
              const CategoryIcon = category.icon;
              return (
                <motion.div
                  key={category.path}
                  variants={{
                    hidden: { opacity: 0, y: 20, scale: 0.8 },
                    visible: { opacity: 1, y: 0, scale: 1 }
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                >
                  <Link
                    to={category.path}
                    onClick={() => setCategoriesOpen(false)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl active:bg-muted transition-colors"
                  >
                    <motion.div 
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${category.color}15` }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <CategoryIcon className="w-5 h-5" style={{ color: category.color }} strokeWidth={1.5} />
                    </motion.div>
                    <span className="text-[11px] font-medium text-center text-foreground leading-tight">
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
