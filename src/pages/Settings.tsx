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

  // Icon color mapping for visual variety
  const getIconStyle = (icon: any) => {
    const iconStyles: Record<string, string> = {
      User: "bg-primary/15 text-primary",
      Store: "bg-accent/15 text-accent",
      QrCode: "bg-secondary/15 text-secondary",
      Star: "bg-yellow-500/15 text-yellow-600",
      FileText: "bg-blue-500/15 text-blue-600",
      Calendar: "bg-purple-500/15 text-purple-600",
      Bell: "bg-orange-500/15 text-orange-600",
      BellOff: "bg-slate-500/15 text-slate-600",
      Globe: "bg-green-500/15 text-green-600",
      Languages: "bg-indigo-500/15 text-indigo-600",
      Type: "bg-pink-500/15 text-pink-600",
      Contrast: "bg-amber-500/15 text-amber-600",
      Zap: "bg-cyan-500/15 text-cyan-600",
      Lock: "bg-red-500/15 text-red-600",
      Info: "bg-teal-500/15 text-teal-600",
      Palette: "bg-fuchsia-500/15 text-fuchsia-600",
      Moon: "bg-violet-500/15 text-violet-600",
      Sun: "bg-yellow-500/15 text-yellow-600",
      Monitor: "bg-gray-500/15 text-gray-600",
    };
    return iconStyles[icon.displayName || icon.name] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-background pb-20" dir={direction}>
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-secondary opacity-90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_50%)]" />
        
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => navigate(-1)}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>

        <div className="relative pt-16 pb-8 px-6">
          {/* Settings Icon */}
          <motion.div 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 0.6 }}
            className="flex justify-center mb-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <SettingsIcon className="w-8 h-8 text-white" />
            </div>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-white text-center mb-1"
          >
            {t("settings.title")}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white/80 text-center text-sm"
          >
            התאם אישית את החוויה שלך
          </motion.p>
        </div>
      </div>

      {/* Profile Card - Floating Style */}
      <div className="px-4 -mt-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 rounded-3xl p-5 shadow-xl bg-card">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-18 h-18 border-4 border-primary/20 shadow-lg">
                  <AvatarImage src={profileAvatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-bold text-lg">
                    {(profileName || user?.email || "מ")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center shadow-md">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg text-foreground truncate">
                  {profileName || "משתמש"}
                </h3>
                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-2xl border-primary/30 text-primary hover:bg-primary/10 hover:border-primary font-medium px-4 transition-all duration-200 hover:scale-105 active:scale-95"
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
                const iconStyle = getIconStyle(Icon);
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
