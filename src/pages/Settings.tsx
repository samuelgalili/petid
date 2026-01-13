import { User, Bell, Globe, Lock, Info, LogOut, Moon, Sun, Languages, Monitor, Type, Contrast, Zap, BellOff, Palette, ChevronLeft, Store, QrCode, Star, FileText, Calendar, Settings as SettingsIcon, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import BottomNav from "@/components/BottomNav";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { QRCodeProfile } from "@/components/QRCodeProfile";
import { QuietModeSettings } from "@/components/QuietModeSettings";
import { CloseFriendsManager } from "@/components/CloseFriendsManager";
import { DraftPostsManager } from "@/components/DraftPostsManager";
import { ScheduledPostsManager } from "@/components/ScheduledPostsManager";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const navigate = useNavigate();
  const { t, language, setLanguage, direction } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { fontSize, highContrast, reduceMotion, setFontSize, setHighContrast, setReduceMotion } = useAccessibility();
  const { user, signOut } = useAuth();
  const { isSubscribed, isLoading, subscribe, unsubscribe, sendTestNotification } = usePushNotifications();
  const [notifications, setNotifications] = useState(true);
  const [location, setLocation] = useState(true);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showQuietMode, setShowQuietMode] = useState(false);
  const [showCloseFriends, setShowCloseFriends] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [showScheduled, setShowScheduled] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);

  // Fetch profile data from profiles table
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setProfileAvatar(data.avatar_url);
        setProfileName(data.full_name);
      }
    };
    
    fetchProfile();
  }, [user?.id]);

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("התנתקת בהצלחה");
      navigate("/auth");
    } catch (error) {
      toast.error("שגיאה בהתנתקות");
    }
  };

  const handlePushNotificationToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const getThemeIcon = () => {
    if (theme === "light") return Sun;
    if (theme === "dark") return Moon;
    return Monitor;
  };

  const settingsSections = [
    {
      title: t("settings.account"),
      items: [
        {
          icon: User,
          label: t("settings.profile"),
          description: t("settings.profileDesc"),
          action: () => navigate("/profile"),
          type: "link",
        },
        {
          icon: Store,
          label: "עבור לחשבון עסקי",
          description: "הפוך את הפרופיל שלך לפרופיל עסקי",
          action: () => navigate("/convert-to-business"),
          type: "link",
        },
        {
          icon: QrCode,
          label: "קוד QR שלי",
          description: "שתף את הפרופיל שלך עם קוד QR",
          action: () => setShowQRCode(true),
          type: "link",
        },
        {
          icon: Star,
          label: "חברים קרובים",
          description: "נהל רשימת חברים קרובים לסטוריז",
          action: () => setShowCloseFriends(true),
          type: "link",
        },
        {
          icon: FileText,
          label: "טיוטות",
          description: "פוסטים שנשמרו כטיוטה",
          action: () => setShowDrafts(true),
          type: "link",
        },
        {
          icon: Calendar,
          label: "פוסטים מתוזמנים",
          description: "פוסטים שממתינים לפרסום",
          action: () => setShowScheduled(true),
          type: "link",
        },
      ],
    },
    {
      title: t("settings.preferences"),
      items: [
        {
          icon: Bell,
          label: "התראות Push",
          description: isSubscribed ? "התראות Push מופעלות" : "הפעל התראות Push לעדכונים",
          action: handlePushNotificationToggle,
          type: "toggle",
          value: isSubscribed,
        },
        {
          icon: BellOff,
          label: "מצב שקט",
          description: "השתק התראות זמנית",
          action: () => setShowQuietMode(true),
          type: "link",
        },
        {
          icon: Bell,
          label: t("settings.notifications"),
          description: t("settings.notificationsDesc"),
          action: () => setNotifications(!notifications),
          type: "toggle",
          value: notifications,
        },
        {
          icon: getThemeIcon(),
          label: "ערכת נושא",
          description: "בחר בהיר, כהה או אוטומטי",
          type: "select",
          value: theme,
          options: [
            { value: "light", label: "בהיר" },
            { value: "dark", label: "כהה" },
            { value: "system", label: "אוטומטי" },
          ],
          action: (value: string) => setTheme(value as any),
        },
        {
          icon: Globe,
          label: t("settings.location"),
          description: t("settings.locationDesc"),
          action: () => setLocation(!location),
          type: "toggle",
          value: location,
        },
        {
          icon: Languages,
          label: t("settings.language"),
          description: t("settings.languageDesc"),
          type: "select",
          value: language,
          options: [
            { value: "he", label: t("languages.he") },
            { value: "en", label: t("languages.en") },
            { value: "ar", label: t("languages.ar") },
          ],
          action: (value: string) => setLanguage(value as "he" | "en" | "ar"),
        },
      ],
    },
    {
      title: "נגישות",
      items: [
        {
          icon: Type,
          label: "גודל טקסט",
          description: "שנה את גודל הטקסט",
          type: "select",
          value: fontSize,
          options: [
            { value: "small", label: "קטן" },
            { value: "medium", label: "בינוני" },
            { value: "large", label: "גדול" },
          ],
          action: (value: string) => setFontSize(value as any),
        },
        {
          icon: Contrast,
          label: "ניגודיות גבוהה",
          description: "שפר את הנראות",
          action: () => setHighContrast(!highContrast),
          type: "toggle",
          value: highContrast,
        },
        {
          icon: Zap,
          label: "הפחת אנימציות",
          description: "הקטן תנועה בממשק",
          action: () => setReduceMotion(!reduceMotion),
          type: "toggle",
          value: reduceMotion,
        },
      ],
    },
    {
      title: t("settings.privacySecurity"),
      items: [
        {
          icon: Lock,
          label: "הגדרות פרטיות",
          description: "מיקום, נראות פרופיל, הודעות",
          action: () => navigate("/privacy-settings"),
          type: "link",
        },
      ],
    },
    {
      title: "עזרה ותמיכה",
      items: [
        {
          icon: Info,
          label: "תמיכה ועזרה",
          description: "צ'אט, טלפון, שאלות נפוצות",
          action: () => navigate("/support"),
          type: "link",
        },
        {
          icon: Info,
          label: "הצהרת נגישות",
          description: "מדיניות הנגישות שלנו",
          action: () => navigate("/accessibility"),
          type: "link",
        },
      ],
    },
    {
      title: "ניהול חשבון",
      items: [
        {
          icon: Info,
          label: "מחיקת חשבון",
          description: "מחק את כל המידע שלך",
          action: () => navigate("/data-deletion"),
          type: "link",
        },
      ],
    },
  ];

  // Unified icon style - Instagram-like minimal
  const getIconStyle = () => {
    return "bg-muted text-foreground";
  };

  return (
    <div className="min-h-screen bg-background pb-20" dir={direction}>
      {/* Clean Instagram-style Header */}
      <motion.div 
        className="sticky top-0 z-40 bg-background/98 backdrop-blur-xl border-b border-border/40"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-muted/60 transition-all active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-lg font-semibold text-foreground">{t("settings.title")}</h1>
          </div>
        </div>
      </motion.div>

      {/* Profile Card */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border border-border/50 rounded-2xl p-4 bg-card">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-16 h-16 border-2 border-primary/20">
                  <AvatarImage src={profileAvatar || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                    {(profileName || user?.email || "מ")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base text-foreground truncate">
                  {profileName || "משתמש"}
                </h3>
                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-border text-foreground hover:bg-muted font-medium px-4"
                onClick={() => navigate("/profile")}
              >
                {t("settings.edit")}
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Settings Sections */}
      <div className="px-4 pt-6 space-y-5">
        {settingsSections.map((section, sectionIndex) => (
          <motion.div
            key={sectionIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + sectionIndex * 0.1 }}
          >
            <h2 className="text-xs font-bold text-muted-foreground mb-3 mr-2 uppercase tracking-wide">
              {section.title}
            </h2>
            <Card className="border-0 rounded-2xl overflow-hidden shadow-md bg-card">
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                const iconStyle = getIconStyle();
                return (
                  <div key={itemIndex}>
                    {itemIndex > 0 && <Separator className="bg-border/50" />}
                    <motion.div
                      whileHover={item.type === "link" ? { x: -4 } : {}}
                      whileTap={item.type === "link" ? { scale: 0.98 } : {}}
                      onClick={item.type === "link" ? item.action : undefined}
                      className={`flex items-center gap-4 p-4 transition-all duration-200 ${
                        item.type === "link"
                          ? "cursor-pointer hover:bg-muted/50"
                          : ""
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconStyle}`}>
                        <Icon className="w-5 h-5" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[15px] text-foreground mb-0.5">{item.label}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                      </div>
                      {item.type === "toggle" && (
                        <Switch
                          checked={item.value}
                          onCheckedChange={item.action}
                          className="flex-shrink-0 data-[state=checked]:bg-primary"
                        />
                      )}
                      {item.type === "select" && (
                        <Select
                          value={item.value}
                          onValueChange={item.action}
                        >
                          <SelectTrigger className="w-[120px] h-9 flex-shrink-0 rounded-xl border-border/50 bg-muted/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {item.options?.map((option) => (
                              <SelectItem key={option.value} value={option.value} className="rounded-lg">
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {item.type === "link" && (
                        <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
                          <ChevronLeft className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
                        </div>
                      )}
                    </motion.div>
                  </div>
                );
              })}
            </Card>
          </motion.div>
        ))}

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 + settingsSections.length * 0.1 }}
        >
          <Card
            onClick={handleLogout}
            className="border-0 rounded-2xl overflow-hidden cursor-pointer shadow-md bg-card group transition-all duration-200 hover:shadow-lg"
          >
            <motion.div 
              whileHover={{ x: -4 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-4 p-4 transition-colors group-hover:bg-destructive/5"
            >
              <div className="w-11 h-11 rounded-2xl bg-destructive/15 flex items-center justify-center flex-shrink-0 group-hover:bg-destructive/20 transition-colors">
                <LogOut className="w-5 h-5 text-destructive" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[15px] text-destructive">{t("settings.logout")}</h3>
                <p className="text-xs text-muted-foreground">התנתק מהחשבון שלך</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 group-hover:bg-destructive/15 transition-colors">
                <ChevronLeft className="w-4 h-4 text-destructive" strokeWidth={2} />
              </div>
            </motion.div>
          </Card>
        </motion.div>

        {/* App Version */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center py-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">{t("settings.appName")} • {t("settings.version")}</span>
          </div>
        </motion.div>
      </div>

      {/* Dialogs */}
      <QRCodeProfile 
        open={showQRCode} 
        onOpenChange={setShowQRCode}
        profile={{ id: user?.id || '', full_name: user?.user_metadata?.full_name, avatar_url: null }}
      />
      <QuietModeSettings open={showQuietMode} onOpenChange={setShowQuietMode} />
      <CloseFriendsManager open={showCloseFriends} onOpenChange={setShowCloseFriends} />
      <DraftPostsManager 
        open={showDrafts} 
        onOpenChange={setShowDrafts}
        onEditDraft={(draft) => {
          toast.info("פתיחת טיוטה לעריכה");
        }}
      />
      <ScheduledPostsManager open={showScheduled} onOpenChange={setShowScheduled} />

      <BottomNav />
    </div>
  );
};

export default Settings;
