import { Home, ShoppingBag, User, Compass, Clapperboard, Plus, Grid3X3 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CreatePostDialog } from "@/components/CreatePostDialog";
import { motion } from "framer-motion";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Camera, FileText, Heart, Shield, Trees, GraduationCap, Scissors, CheckSquare, Gift, MessageCircle } from "lucide-react";
interface NavItemProps {
  to?: string;
  icon: React.ReactNode;
  isActive: boolean;
  label: string;
  onClick?: () => void;
}
const NavItem = ({
  to,
  icon,
  isActive,
  label,
  onClick
}: NavItemProps) => {
  const content = <motion.div whileTap={{
    scale: 0.92
  }} className="relative">
      {icon}
    </motion.div>;
  if (onClick) {
    return <button onClick={onClick} className="flex flex-col items-center justify-center flex-1 py-2 active:opacity-50 transition-opacity" aria-label={label}>
        {content}
      </button>;
  }
  return <Link to={to || "/"} className="flex flex-col items-center justify-center flex-1 py-2 active:opacity-50 transition-opacity" aria-label={label}>
      {content}
    </Link>;
};
const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
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
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        const {
          data
        } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
        if (data?.avatar_url) {
          setUserAvatar(data.avatar_url);
        }
      }
    };
    fetchUserAvatar();
  }, []);
  const isActive = (path: string) => location.pathname === path;
  const categories = [{
    icon: FileText,
    label: "מסמכים",
    path: "/documents",
    color: "#1E5799"
  }, {
    icon: Camera,
    label: "אלבום תמונות",
    path: "/photos",
    color: "#7DB9E8"
  }, {
    icon: Heart,
    label: "אימוץ",
    path: "/adoption",
    color: "#4ECDC4"
  }, {
    icon: Shield,
    label: "ביטוח",
    path: "/insurance",
    color: "#1E5799"
  }, {
    icon: Trees,
    label: "גינות כלבים",
    path: "/parks",
    color: "#4ECDC4"
  }, {
    icon: GraduationCap,
    label: "אילוף",
    path: "/training",
    color: "#7DB9E8"
  }, {
    icon: Scissors,
    label: "מספרה",
    path: "/grooming",
    color: "#4ECDC4"
  }, {
    icon: CheckSquare,
    label: "משימות",
    path: "/tasks",
    color: "#1E5799"
  }, {
    icon: Gift,
    label: "פרסים",
    path: "/rewards",
    color: "#4ECDC4"
  }, {
    icon: MessageCircle,
    label: "צ'אט AI",
    path: "/chat",
    color: "#1E5799"
  }];
  return <>
      <nav className="fixed bottom-0 left-0 right-0 z-[9999] bg-background border-t border-border" style={{
      position: 'fixed',
      bottom: 0
    }} role="navigation" aria-label="ניווט ראשי">
        <div className="flex justify-around items-center h-14 w-full max-w-2xl mx-auto px-2">
          {/* Home */}
          <NavItem onClick={() => {
          if (location.pathname === "/") {
            window.scrollTo({
              top: 0,
              behavior: 'smooth'
            });
            window.dispatchEvent(new CustomEvent('refresh-feed'));
          } else {
            navigate("/");
          }
        }} icon={<div className="p-2">
                <Home className={cn("w-6 h-6 transition-colors", isActive("/") ? "text-foreground" : "text-muted-foreground")} strokeWidth={isActive("/") ? 2 : 1.5} fill={isActive("/") ? "currentColor" : "none"} />
              </div>} isActive={isActive("/")} label="בית" />

          {/* Explore */}
          <NavItem to="/explore" icon={<div className="p-2">
                <Compass className={cn("w-6 h-6 transition-colors", isActive("/explore") ? "text-foreground" : "text-muted-foreground")} strokeWidth={isActive("/explore") ? 2 : 1.5} fill={isActive("/explore") ? "currentColor" : "none"} />
              </div>} isActive={isActive("/explore")} label="חיפוש" />

          {/* Categories - Center Button */}
          <NavItem onClick={() => setCategoriesOpen(true)} icon={<div className="p-2">
                <Grid3X3 className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
              </div>} isActive={false} label="קטגוריות" />

          {/* Shop */}
          <NavItem to="/shop" icon={<div className="p-2">
                <ShoppingBag className={cn("w-6 h-6 transition-colors", isActive("/shop") ? "text-foreground" : "text-muted-foreground")} strokeWidth={isActive("/shop") ? 2 : 1.5} fill={isActive("/shop") ? "currentColor" : "none"} />
              </div>} isActive={isActive("/shop")} label="חנות" />

          {/* Profile with Avatar */}
          <Link to="/profile" className="flex flex-col items-center justify-center flex-1 py-2" aria-label="פרופיל">
            <div className="p-1">
              <div className={cn("w-7 h-7 rounded-full overflow-hidden transition-all", isActive("/profile") ? "ring-2 ring-foreground" : "ring-1 ring-border")}>
                <Avatar className="w-full h-full">
                  <AvatarImage src={userAvatar} className="object-cover" />
                  <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </Link>
        </div>
        
        {/* Safe area for notched devices */}
        <div className="h-[env(safe-area-inset-bottom)] bg-background" />
      </nav>


      {/* Create Post Dialog */}
      <CreatePostDialog open={createPostOpen} onOpenChange={setCreatePostOpen} onPostCreated={() => {}} />

      {/* Categories Sheet */}
      <Sheet open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-2xl bg-background border-t border-border">
          <SheetTitle className="sr-only">קטגוריות</SheetTitle>
          <SheetDescription className="sr-only">בחר קטגוריה לניווט</SheetDescription>
          
          {/* Handle bar */}
          <div className="w-10 h-1 bg-muted rounded-full mx-auto mt-2 mb-6" />
          
          <div className="grid grid-cols-4 gap-4 px-4 pb-8">
            {categories.map((category) => {
            const CategoryIcon = category.icon;
            return <Link key={category.path} to={category.path} onClick={() => setCategoriesOpen(false)} className="flex flex-col items-center gap-2 p-3 rounded-xl active:bg-muted transition-colors">
                  <CategoryIcon className="w-6 h-6 text-foreground" strokeWidth={1.5} />
                  <span className="text-xs font-medium text-foreground text-center leading-tight">
                    {category.label}
                  </span>
                </Link>;
          })}
          </div>
        </SheetContent>
      </Sheet>
    </>;
};
export default BottomNav;