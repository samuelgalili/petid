import { Home, ShoppingBag, User, PlusSquare, Compass, MessageCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
  Gift
} from "lucide-react";
import { CreatePostDialog } from "@/components/CreatePostDialog";

const BottomNav = () => {
  const location = useLocation();
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [createPostOpen, setCreatePostOpen] = useState(false);
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
          .single();
        if (data?.avatar_url) {
          setUserAvatar(data.avatar_url);
        }
      }
    };
    fetchUserAvatar();
  }, []);

  const moreCategories = [
    { icon: Home, label: "בית", path: "/home", color: "#262626" },
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

  // Always show social-style navigation
  return (
    <>
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100"
        role="navigation"
        aria-label="ניווט ראשי"
      >
        <div className="flex justify-around items-center h-[50px] max-w-lg mx-auto px-2">
          {/* Home/Feed */}
          <Link
            to="/"
            className="flex items-center justify-center p-2 active:opacity-50"
          >
            <Home 
              className={`w-[26px] h-[26px] ${location.pathname === '/' ? 'text-[#262626]' : 'text-[#262626]'}`}
              strokeWidth={location.pathname === '/' ? 2.5 : 1.5}
              fill={location.pathname === '/' ? '#262626' : 'none'}
            />
          </Link>

          {/* Search/Explore */}
          <Link
            to="/adoption"
            className="flex items-center justify-center p-2 active:opacity-50"
          >
            <Compass 
              className={`w-[26px] h-[26px] ${location.pathname === '/adoption' ? 'text-[#262626]' : 'text-[#262626]'}`}
              strokeWidth={location.pathname === '/adoption' ? 2.5 : 1.5}
              fill={location.pathname === '/adoption' ? '#262626' : 'none'}
            />
          </Link>

          {/* Categories - Opens More Sheet */}
          <button
            onClick={() => setIsMoreSheetOpen(true)}
            className="flex items-center justify-center p-2 active:opacity-50"
          >
            <div className="relative">
              <PlusSquare 
                className="w-[26px] h-[26px] text-[#262626]" 
                strokeWidth={1.5}
              />
            </div>
          </button>

          {/* Shop */}
          <Link
            to="/shop"
            className="flex items-center justify-center p-2 active:opacity-50"
          >
            <ShoppingBag 
              className={`w-[26px] h-[26px] ${location.pathname === '/shop' ? 'text-[#262626]' : 'text-[#262626]'}`}
              strokeWidth={location.pathname === '/shop' ? 2.5 : 1.5}
              fill={location.pathname === '/shop' ? '#262626' : 'none'}
            />
          </Link>

          {/* Profile */}
          <Link
            to="/profile"
            className="flex items-center justify-center p-2 active:opacity-50"
          >
            <div className={cn(
              "w-[26px] h-[26px] rounded-full overflow-hidden",
              location.pathname === '/profile' && "ring-2 ring-[#262626]"
            )}>
              <Avatar className="w-full h-full">
                <AvatarImage src={userAvatar} />
                <AvatarFallback className="bg-gray-200 text-gray-600 text-[10px]">
                  <User className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
            </div>
          </Link>
        </div>
        
        {/* Safe area for notched devices */}
        <div className="h-[env(safe-area-inset-bottom)] bg-white" />
      </nav>

      {/* Floating Action Button for Create Post - positioned above nav */}
      <button
        onClick={() => setCreatePostOpen(true)}
        className="fixed bottom-[70px] left-4 z-40 w-12 h-12 bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      >
        <Camera className="w-5 h-5 text-white" strokeWidth={2} />
      </button>

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={createPostOpen}
        onOpenChange={setCreatePostOpen}
        onPostCreated={() => {
          // Refresh will be handled by realtime subscription
        }}
      />

      {/* Categories Sheet */}
      <Sheet open={isMoreSheetOpen} onOpenChange={setIsMoreSheetOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-xl bg-white border-0" aria-describedby="categories-description">
          <SheetTitle className="sr-only">קטגוריות</SheetTitle>
          <SheetDescription id="categories-description" className="sr-only">בחר קטגוריה לניווט</SheetDescription>
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-2 mb-4" />
          
          <div className="grid grid-cols-4 gap-2 px-4 pb-8">
            {moreCategories.map((category) => {
              const CategoryIcon = category.icon;
              return (
                <Link
                  key={category.path}
                  to={category.path}
                  onClick={() => setIsMoreSheetOpen(false)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl active:bg-gray-100 transition-colors"
                >
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${category.color}15` }}
                  >
                    <CategoryIcon className="w-5 h-5" style={{ color: category.color }} strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] font-normal text-center text-[#262626] leading-tight">
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
