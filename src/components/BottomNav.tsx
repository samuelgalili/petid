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
      {/* PetID-style bottom nav - warm, organic feel */}
      <nav className="fixed bottom-0 left-0 right-0 z-[9999] bg-card/95 backdrop-blur-md border-t border-border/30 shadow-[0_-4px_20px_rgba(46,184,166,0.08)]" style={{
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
        }} icon={<Home className={cn("w-6 h-6 transition-colors", isActive("/") ? "text-primary" : "text-muted-foreground")} strokeWidth={1.5} fill={isActive("/") ? "currentColor" : "none"} />} isActive={isActive("/")} label="בית" />

          {/* Explore */}
          <NavItem to="/explore" icon={<Compass className={cn("w-6 h-6 transition-colors", isActive("/explore") ? "text-primary" : "text-muted-foreground")} strokeWidth={1.5} fill={isActive("/explore") ? "currentColor" : "none"} />} isActive={isActive("/explore")} label="חיפוש" />

          {/* Categories - Center button with accent */}
          <NavItem onClick={() => setCategoriesOpen(true)} icon={
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
              categoriesOpen ? "bg-primary shadow-md" : "bg-primary/10"
            )}>
              <Grid3X3 className={cn("w-5 h-5", categoriesOpen ? "text-primary-foreground" : "text-primary")} strokeWidth={1.5} />
            </div>
          } isActive={false} label="קטגוריות" />

          {/* Shop */}
          <NavItem to="/shop" icon={<ShoppingBag className={cn("w-6 h-6 transition-colors", isActive("/shop") ? "text-primary" : "text-muted-foreground")} strokeWidth={1.5} fill={isActive("/shop") ? "currentColor" : "none"} />} isActive={isActive("/shop")} label="חנות" />

          {/* Profile with Avatar */}
          <Link to="/profile" className="flex items-center justify-center flex-1 py-2" aria-label="פרופיל">
            <div className={cn("w-7 h-7 rounded-full overflow-hidden transition-all", isActive("/profile") ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : "")}>
              <Avatar className="w-full h-full">
                <AvatarImage src={userAvatar} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                  <User className="w-3.5 h-3.5" />
                </AvatarFallback>
              </Avatar>
            </div>
          </Link>
        </div>
        
        {/* Safe area for notched devices */}
        <div className="h-[env(safe-area-inset-bottom)] bg-card" />
      </nav>


      {/* Create Post Dialog */}
      <CreatePostDialog open={createPostOpen} onOpenChange={setCreatePostOpen} onPostCreated={() => {}} />

      {/* Categories Sheet - PetID styled */}
      <Sheet open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-3xl bg-card border-t border-border/30 shadow-elevated">
          <SheetTitle className="sr-only">קטגוריות</SheetTitle>
          <SheetDescription className="sr-only">בחר קטגוריה לניווט</SheetDescription>
          
          {/* Handle bar */}
          <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mt-3 mb-6" />
          
          <div className="grid grid-cols-4 gap-3 px-4 pb-8">
            {categories.map((category) => {
            const CategoryIcon = category.icon;
            return <Link key={category.path} to={category.path} onClick={() => setCategoriesOpen(false)} className="flex flex-col items-center gap-2 p-3 rounded-2xl active:bg-muted/50 hover:bg-muted/30 transition-all">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <CategoryIcon className="w-6 h-6 text-primary" strokeWidth={1.5} />
                  </div>
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