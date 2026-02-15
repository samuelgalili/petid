import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Bookmark,
  PawPrint,
  Store,
  ShieldCheck,
  Bell,
  MessageCircle,
  Camera,
  FileText,
  Package,
  ShoppingCart,
  Plus,
  Moon,
  Sun,
  Monitor,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Heart,
  Globe,
  Star,
  Check,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { RoleBadge } from "@/components/RoleBadge";
import { cn } from "@/lib/utils";
import { usePetPreference } from "@/contexts/PetPreferenceContext";
interface HamburgerMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Menu translations ────────────────────────────────
const menuStrings = {
  he: {
    viewProfile: "הצג פרופיל",
    login: "התחבר",
    editProfile: "עריכת פרופיל",
    myPets: "חיות המחמד שלי",
    addPet: "הוסף חיית מחמד",
    notifications: "התראות",
    messages: "הודעות",
    favorites: "מועדפים",
    shop: "חנות",
    cart: "עגלת קניות",
    orders: "ההזמנות שלי",
    adoption: "אימוץ",
    insurance: "ביטוח",
    photos: "אלבום תמונות",
    documents: "מסמכים",
    settings: "הגדרות",
    darkMode: "מצב לילה",
    lightMode: "מצב יום",
    systemMode: "מצב מערכת",
    theme: "ערכת נושא",
    language: "שפה",
    logout: "התנתק",
    logoutSuccess: "התנתקת בהצלחה",
    logoutDesc: "נתראה בקרוב! 👋",
    activePet: "חיית מחמד פעילה",
    noPet: "לא נבחרה חיית מחמד",
    new: "חדש",
    version: "PetID v1.0",
  },
  en: {
    viewProfile: "View Profile",
    login: "Sign In",
    editProfile: "Edit Profile",
    myPets: "My Pets",
    addPet: "Add Pet",
    notifications: "Notifications",
    messages: "Messages",
    favorites: "Favorites",
    shop: "Shop",
    cart: "Shopping Cart",
    orders: "My Orders",
    adoption: "Adoption",
    insurance: "Insurance",
    photos: "Photo Album",
    documents: "Documents",
    settings: "Settings",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    systemMode: "System",
    theme: "Theme",
    language: "Language",
    logout: "Log Out",
    logoutSuccess: "Logged out successfully",
    logoutDesc: "See you soon! 👋",
    activePet: "Active Pet",
    noPet: "No pet selected",
    new: "New",
    version: "PetID v1.0",
  },
  ar: {
    viewProfile: "عرض الملف",
    login: "تسجيل الدخول",
    editProfile: "تعديل الملف",
    myPets: "حيواناتي",
    addPet: "إضافة حيوان",
    notifications: "إشعارات",
    messages: "رسائل",
    favorites: "المفضلة",
    shop: "المتجر",
    cart: "سلة التسوق",
    orders: "طلباتي",
    adoption: "تبني",
    insurance: "تأمين",
    photos: "ألبوم الصور",
    documents: "مستندات",
    settings: "إعدادات",
    darkMode: "الوضع الداكن",
    lightMode: "الوضع الفاتح",
    systemMode: "النظام",
    theme: "المظهر",
    language: "اللغة",
    logout: "تسجيل الخروج",
    logoutSuccess: "تم تسجيل الخروج",
    logoutDesc: "👋 نراك قريباً",
    activePet: "الحيوان النشط",
    noPet: "لم يتم اختيار حيوان",
    new: "جديد",
    version: "PetID v1.0",
  },
};

// ── MenuItem ─────────────────────────────────────────
interface MenuItemProps {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  badge?: number;
  isNew?: boolean;
  isRtl: boolean;
}

const MenuItem = ({ icon: Icon, label, onClick, badge, isNew, isRtl }: MenuItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-5 py-3 hover:bg-muted/60 active:bg-muted transition-colors rounded-lg mx-1",
      isRtl ? "flex-row" : "flex-row"
    )}
  >
    <Icon className="w-5 h-5 text-muted-foreground shrink-0" strokeWidth={1.5} />
    <span className="flex-1 text-sm text-foreground" style={{ textAlign: isRtl ? "right" : "left" }}>
      {label}
    </span>
    {badge !== undefined && badge > 0 && (
      <span className="bg-destructive text-destructive-foreground text-[11px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
        {badge}
      </span>
    )}
    {isNew && (
      <span className="bg-destructive text-destructive-foreground text-[9px] font-bold px-1.5 py-0.5 rounded">
        {isRtl ? "חדש" : "New"}
      </span>
    )}
  </button>
);

const SectionDivider = () => <div className="h-px bg-border mx-5 my-2" />;

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-5 pt-3 pb-1">
    {children}
  </p>
);

// ── Main Component ───────────────────────────────────
export const HamburgerMenu = ({ isOpen, onClose }: HamburgerMenuProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, direction } = useLanguage();
  const { activePet, pets, switchPet: contextSwitchPet } = usePetPreference();
  const isRtl = direction === "rtl";
  const s = menuStrings[language] || menuStrings.he;

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showPetPicker, setShowPetPicker] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      if (!u) return;

      const [profileRes, notifRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.id).single(),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", u.id).eq("is_read", false),
      ]);

      setProfile(profileRes.data);
      setUnreadNotifications(notifRes.count || 0);
    })();
  }, [isOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: s.logoutSuccess, description: s.logoutDesc });
    navigate("/auth");
    onClose();
  };

  const go = (path: string) => { navigate(path); onClose(); };

  const themeOptions = [
    { key: "light" as const, icon: Sun, label: s.lightMode },
    { key: "dark" as const, icon: Moon, label: s.darkMode },
    { key: "system" as const, icon: Monitor, label: s.systemMode },
  ];

  const langOptions = [
    { key: "he" as const, label: "עברית", flag: "🇮🇱" },
    { key: "en" as const, label: "English", flag: "🇺🇸" },
  ];

  // Slide direction based on RTL/LTR
  const slideFrom = isRtl ? "100%" : "-100%";
  const slideTo = isRtl ? "100%" : "-100%";
  const positionClass = isRtl ? "right-0" : "left-0";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[100]"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: slideFrom }}
            animate={{ x: 0 }}
            exit={{ x: slideTo }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className={cn(
              "fixed top-0 h-full w-[82vw] max-w-[360px] bg-background z-[101] flex flex-col shadow-2xl",
              positionClass
            )}
            dir={direction}
          >
            {/* ── Header / Profile ─────────────── */}
            <div className="px-5 pt-5 pb-4 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-full transition-colors">
                  {isRtl ? (
                    <ChevronRight className="w-5 h-5 text-foreground" strokeWidth={1.5} />
                  ) : (
                    <ChevronLeft className="w-5 h-5 text-foreground" strokeWidth={1.5} />
                  )}
                </button>
              </div>

              {user ? (
                <button onClick={() => go("/")} className="flex items-center gap-3 w-full">
                  <Avatar className="w-14 h-14 ring-2 ring-primary/20">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                      {profile?.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1" style={{ textAlign: isRtl ? "right" : "left" }}>
                    <div className={cn("flex items-center gap-2", isRtl ? "flex-row-reverse justify-end" : "")}>
                      <p className="text-base font-semibold text-foreground">
                        {profile?.full_name || "User"}
                      </p>
                      <RoleBadge size="sm" />
                    </div>
                    <p className="text-xs text-muted-foreground">{s.viewProfile}</p>
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => go("/auth")}
                  className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
                >
                  {s.login}
                </button>
              )}
            </div>

            {/* ── Active Pet Card ──────────────── */}
            {activePet && (
              <div className="px-5 py-3 border-b border-border">
                <SectionLabel>{s.activePet}</SectionLabel>
                <button
                  onClick={() => setShowPetPicker(!showPetPicker)}
                  className="w-full flex items-center gap-3 p-2.5 bg-muted/50 rounded-xl hover:bg-muted transition-colors mt-1"
                >
                  <Avatar className="w-10 h-10 ring-1 ring-primary/30">
                    <AvatarImage src={activePet.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                      <PawPrint className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1" style={{ textAlign: isRtl ? "right" : "left" }}>
                    <p className="text-sm font-medium text-foreground">{activePet.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {activePet.breed || activePet.pet_type}
                    </p>
                  </div>
                  <ChevronLeft className={cn("w-4 h-4 text-muted-foreground transition-transform", showPetPicker && "rotate-90")} />
                </button>

                {/* Pet Picker Dropdown */}
                <AnimatePresence>
                  {showPetPicker && pets.length > 1 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-1.5 space-y-1"
                    >
                      {pets.filter(p => p.id !== activePet.id).map(pet => (
                        <button
                          key={pet.id}
                          onClick={() => { contextSwitchPet(pet.id); setShowPetPicker(false); }}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 transition-colors"
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={pet.avatar_url} />
                            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                              <PawPrint className="w-3 h-3" />
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-foreground">{pet.name}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ── Scrollable Menu ──────────────── */}
            <div className="flex-1 overflow-y-auto py-2 scrollbar-hide">
              {/* Profile & Pets */}
              <MenuItem icon={Settings} label={s.editProfile} onClick={() => go("/edit-profile")} isRtl={isRtl} />
              <MenuItem icon={PawPrint} label={s.myPets} onClick={() => go("/")} isRtl={isRtl} />
              <MenuItem icon={Plus} label={s.addPet} onClick={() => go("/add-pet")} isRtl={isRtl} />

              <SectionDivider />

              {/* Activity */}
              <MenuItem icon={Bell} label={s.notifications} onClick={() => go("/notifications")} badge={unreadNotifications} isRtl={isRtl} />
              <MenuItem icon={MessageCircle} label={s.messages} onClick={() => go("/messages")} isRtl={isRtl} />
              <MenuItem icon={Bookmark} label={s.favorites} onClick={() => go("/favorites")} isRtl={isRtl} />

              <SectionDivider />

              {/* Shopping */}
              <MenuItem icon={Store} label={s.shop} onClick={() => go("/shop")} isRtl={isRtl} />
              <MenuItem icon={ShoppingCart} label={s.cart} onClick={() => go("/cart")} isRtl={isRtl} />
              <MenuItem icon={Package} label={s.orders} onClick={() => go("/order-history")} isRtl={isRtl} />

              <SectionDivider />

              {/* Services */}
              <MenuItem icon={Heart} label={s.adoption} onClick={() => go("/adoption")} isNew isRtl={isRtl} />
              <MenuItem icon={ShieldCheck} label={s.insurance} onClick={() => go("/insurance")} isRtl={isRtl} />

              <SectionDivider />

              {/* Content */}
              <MenuItem icon={Camera} label={s.photos} onClick={() => go("/photos")} isRtl={isRtl} />
              <MenuItem icon={FileText} label={s.documents} onClick={() => go("/documents")} isRtl={isRtl} />

              <SectionDivider />

              {/* ── Theme Toggle ───────────────── */}
              <SectionLabel>{s.theme}</SectionLabel>
              <div className="flex gap-1.5 px-5 py-1.5">
                {themeOptions.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setTheme(opt.key)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all",
                      theme === opt.key
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <opt.icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* ── Language Switcher ──────────── */}
              <SectionLabel>{s.language}</SectionLabel>
              <div className="flex gap-1.5 px-5 py-1.5">
                {langOptions.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setLanguage(opt.key)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all",
                      language === opt.key
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <span>{opt.flag}</span>
                    {opt.label}
                    {language === opt.key && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>

              <SectionDivider />

              {/* Settings & Logout */}
              <MenuItem icon={Settings} label={s.settings} onClick={() => go("/settings")} isRtl={isRtl} />

              {user && (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-destructive/10 active:bg-destructive/20 transition-colors rounded-lg mx-1"
                >
                  <LogOut className="w-5 h-5 text-destructive" strokeWidth={1.5} />
                  <span className="flex-1 text-sm text-destructive font-medium" style={{ textAlign: isRtl ? "right" : "left" }}>
                    {s.logout}
                  </span>
                </button>
              )}
            </div>

            {/* ── Footer ───────────────────────── */}
            <div className="px-5 py-3 border-t border-border">
              <p className="text-[11px] text-muted-foreground text-center">
                {s.version}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
