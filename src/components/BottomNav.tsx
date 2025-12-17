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
      whileTap={{ scale: 0.9 }}
      className="relative"
    >
      {icon}
      {isActive && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
          initial={false}
        />
      )}
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
        className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border"
        role="navigation"
        aria-label="ניווט ראשי"
      >
        <div className="flex justify-around items-center h-14 max-w-lg mx-auto px-1">
          {/* Home */}
          <NavItem
            to="/"
            icon={
              <Home 
                className="w-6 h-6 text-foreground"
                strokeWidth={isActive("/") ? 2.5 : 1.5}
                fill={isActive("/") ? "currentColor" : "none"}
              />
            }
            isActive={isActive("/")}
            label="בית"
          />

          {/* Explore */}
          <NavItem
            to="/explore"
            icon={
              <Compass 
                className="w-6 h-6 text-foreground"
                strokeWidth={isActive("/explore") ? 2.5 : 1.5}
                fill={isActive("/explore") ? "currentColor" : "none"}
              />
            }
            isActive={isActive("/explore")}
            label="חיפוש"
          />

          {/* Categories (+) */}
          <NavItem
            onClick={() => setCategoriesOpen(true)}
            icon={
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-[#E3A700] flex items-center justify-center">
                <Plus className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
              </div>
            }
            isActive={false}
            label="קטגוריות"
          />

          {/* Shop */}
          <NavItem
            to="/shop"
            icon={
              <ShoppingBag 
                className="w-6 h-6 text-foreground"
                strokeWidth={isActive("/shop") ? 2.5 : 1.5}
                fill={isActive("/shop") ? "currentColor" : "none"}
              />
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
                "w-6 h-6 rounded-full overflow-hidden transition-all",
                isActive("/profile") && "ring-2 ring-primary ring-offset-1 ring-offset-background"
              )}>
                <Avatar className="w-full h-full">
                  <AvatarImage src={userAvatar} />
                  <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                    <User className="w-3.5 h-3.5" />
                  </AvatarFallback>
                </Avatar>
              </div>
              {isActive("/profile") && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                  initial={false}
                />
              )}
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
        className="fixed bottom-20 left-4 z-40 w-12 h-12 bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] rounded-full flex items-center justify-center shadow-lg"
        aria-label="יצירת פוסט חדש"
      >
        <Camera className="w-5 h-5 text-white" strokeWidth={2} />
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
          
          <div className="grid grid-cols-4 gap-3 px-4 pb-8">
            {categories.map((category) => {
              const CategoryIcon = category.icon;
              return (
                <Link
                  key={category.path}
                  to={category.path}
                  onClick={() => setCategoriesOpen(false)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl active:bg-muted transition-colors"
                >
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${category.color}15` }}
                  >
                    <CategoryIcon className="w-5 h-5" style={{ color: category.color }} strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-medium text-center text-foreground leading-tight">
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
