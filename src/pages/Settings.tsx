import { User, Bell, Globe, Lock, Info, LogOut, Moon, Sun, Languages, Monitor, Type, Contrast, Zap, BellOff, Palette, ChevronLeft } from "lucide-react";
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
import { useState } from "react";
import BottomNav from "@/components/BottomNav";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { AppHeader } from "@/components/AppHeader";

const Settings = () => {
  const navigate = useNavigate();
  const { t, language, setLanguage, direction } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { fontSize, highContrast, reduceMotion, setFontSize, setHighContrast, setReduceMotion } = useAccessibility();
  const { user, signOut } = useAuth();
  const { isSubscribed, isLoading, subscribe, unsubscribe, sendTestNotification } = usePushNotifications();
  const [notifications, setNotifications] = useState(true);
  const [location, setLocation] = useState(true);

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
          label: t("settings.privacy"),
          description: t("settings.privacyDesc"),
          action: () => {},
          type: "link",
        },
      ],
    },
    {
      title: t("settings.info"),
      items: [
        {
          icon: Info,
          label: t("settings.about"),
          description: t("settings.aboutDesc"),
          action: () => {},
          type: "link",
        },
        {
          icon: Palette,
          label: "מערכת צבעים",
          description: "הצג את מערכת הצבעים והטוקנים הסמנטיים",
          action: () => navigate("/color-system"),
          type: "link",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 animate-fade-in" dir={direction}>
      <AppHeader 
        title={t("settings.title")} 
        showBackButton={true}
        showMenuButton={false}
      />

      {/* Profile Card */}
      <div className="px-6 pt-6 pb-4">
        <Card className="border border-border rounded-2xl p-5 hover:shadow-md transition-shadow animate-scale-in">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-border">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=user" />
              <AvatarFallback className="bg-muted text-foreground font-bold">יי</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-bold text-base mb-0.5">{user?.user_metadata?.full_name || "משתמש"}</h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl hover:bg-muted animate-press"
              onClick={() => navigate("/profile")}
            >
              {t("settings.edit")}
            </Button>
          </div>
        </Card>
      </div>

      {/* Settings Sections */}
      <div className="px-6 space-y-6">
        {settingsSections.map((section, sectionIndex) => (
          <div
            key={sectionIndex}
            className="animate-scale-in"
            style={{ animationDelay: `${(sectionIndex + 1) * 50}ms` }}
          >
            <h2 className="text-sm font-bold text-muted-foreground mb-3 mr-1">
              {section.title}
            </h2>
            <Card className="border border-border rounded-2xl overflow-hidden">
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                return (
                  <div key={itemIndex}>
                    {itemIndex > 0 && <Separator className="bg-border" />}
                    <div
                      onClick={item.type === "link" ? item.action : undefined}
                      className={`flex items-center gap-4 p-4 transition-colors ${
                        item.type === "link"
                          ? "cursor-pointer hover:bg-muted/30 active:bg-muted/50"
                          : ""
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-0.5">{item.label}</h3>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      {item.type === "toggle" && (
                        <Switch
                          checked={item.value}
                          onCheckedChange={item.action}
                          className="flex-shrink-0"
                        />
                      )}
                      {item.type === "select" && (
                        <Select
                          value={item.value}
                          onValueChange={item.action}
                        >
                          <SelectTrigger className="w-[130px] h-9 flex-shrink-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {item.options?.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {item.type === "link" && (
                        <ChevronLeft className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        ))}

        {/* Logout Button */}
        <Card
          onClick={handleLogout}
          className="border border-border rounded-2xl overflow-hidden cursor-pointer hover:bg-destructive/5 active:bg-destructive/10 transition-colors animate-scale-in"
          style={{ animationDelay: `${(settingsSections.length + 1) * 50}ms` }}
        >
          <div className="flex items-center gap-4 p-4">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <LogOut className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-destructive">{t("settings.logout")}</h3>
            </div>
          </div>
        </Card>

        {/* App Version */}
        <div className="text-center py-6 animate-fade-in" style={{ animationDelay: "400ms" }}>
          <p className="text-xs text-muted-foreground">{t("settings.appName")}</p>
          <p className="text-xs text-muted-foreground">{t("settings.version")}</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Settings;
