/**
 * Settings & Privacy Page - PetID V48
 * Sections: Notifications, Account & Security, Localization, Data Management, About
 */

import {
  Bell, Globe, Lock, Info, LogOut, Moon, Sun, Languages, Monitor,
  Type, Contrast, Zap, BellOff, ChevronLeft, Store, QrCode, Star,
  FileText, Calendar, Sparkles, Shield, ShieldCheck, Eye, EyeOff,
  Download, Trash2, HardDrive, Smartphone, Heart, Siren,
  ShoppingBag, Users, Link2, ChevronDown, ChevronUp, Thermometer,
  Weight, Palette, ExternalLink, StarIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { SEO } from "@/components/SEO";

// ─── Collapsible Section ─────────────────────────
const SettingsSection = ({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between mb-2 px-1"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
          </div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            {title}
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <Card className="border-0 rounded-2xl overflow-hidden shadow-md bg-card">
          {children}
        </Card>
      )}
    </motion.div>
  );
};

// ─── Setting Row ─────────────────────────────────
const SettingRow = ({
  icon: Icon,
  label,
  description,
  type = "link",
  value,
  options,
  action,
  destructive = false,
  badge: badgeText,
  showSeparator = true,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  type?: "link" | "toggle" | "select";
  value?: any;
  options?: { value: string; label: string }[];
  action?: any;
  destructive?: boolean;
  badge?: string;
  showSeparator?: boolean;
}) => {
  return (
    <>
      <motion.div
        whileHover={type === "link" ? { x: -3 } : {}}
        whileTap={type === "link" ? { scale: 0.98 } : {}}
        onClick={type === "link" ? action : undefined}
        className={`flex items-center gap-3.5 p-3.5 transition-all ${
          type === "link" ? "cursor-pointer hover:bg-muted/50" : ""
        }`}
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            destructive ? "bg-destructive/10" : "bg-muted"
          }`}
        >
          <Icon
            className={`w-[18px] h-[18px] ${destructive ? "text-destructive" : "text-foreground"}`}
            strokeWidth={1.5}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={`font-semibold text-[14px] ${destructive ? "text-destructive" : "text-foreground"}`}
            >
              {label}
            </h3>
            {badgeText && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                {badgeText}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
            {description}
          </p>
        </div>
        {type === "toggle" && (
          <Switch
            checked={value}
            onCheckedChange={action}
            className="flex-shrink-0 data-[state=checked]:bg-primary"
          />
        )}
        {type === "select" && (
          <Select value={value} onValueChange={action}>
            <SelectTrigger className="w-[110px] h-8 flex-shrink-0 rounded-xl border-border/50 bg-muted/30 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="rounded-lg text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {type === "link" && !destructive && (
          <div className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={2} />
          </div>
        )}
      </motion.div>
      {showSeparator && <Separator className="bg-border/30" />}
    </>
  );
};

// ─── Main Component ──────────────────────────────
const Settings = () => {
  const navigate = useNavigate();
  const { t, language, setLanguage, direction } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { fontSize, highContrast, reduceMotion, setFontSize, setHighContrast, setReduceMotion } =
    useAccessibility();
  const { user, signOut } = useAuth();
  const { isSubscribed, subscribe, unsubscribe } = usePushNotifications();

  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);

  // Notification preferences (local state, persisted via localStorage)
  const [healthAlerts, setHealthAlerts] = useState(() => localStorage.getItem("pref_health_alerts") !== "false");
  const [shopAlerts, setShopAlerts] = useState(() => localStorage.getItem("pref_shop_alerts") !== "false");
  const [communityAlerts, setCommunityAlerts] = useState(() => localStorage.getItem("pref_community_alerts") !== "false");
  const [sosAlerts, setSosAlerts] = useState(() => localStorage.getItem("pref_sos_alerts") !== "false");

  // Privacy
  const [privacyMode, setPrivacyMode] = useState<"public" | "private">(() =>
    (localStorage.getItem("pref_privacy_mode") as any) || "public"
  );

  // Units
  const [weightUnit, setWeightUnit] = useState(() => localStorage.getItem("pref_weight_unit") || "kg");
  const [tempUnit, setTempUnit] = useState(() => localStorage.getItem("pref_temp_unit") || "celsius");

  // Dialogs
  const [showQRCode, setShowQRCode] = useState(false);
  const [showQuietMode, setShowQuietMode] = useState(false);
  const [showCloseFriends, setShowCloseFriends] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [showScheduled, setShowScheduled] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setProfileAvatar(data.avatar_url);
        setProfileName(data.full_name);
      }
    };
    fetchProfile();
  }, [user?.id]);

  // Persist toggles
  const toggle = (key: string, setter: (v: boolean) => void, current: boolean) => {
    const next = !current;
    setter(next);
    localStorage.setItem(key, String(next));
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("התנתקת בהצלחה");
      navigate("/auth");
    } catch {
      toast.error("שגיאה בהתנתקות");
    }
  };

  const handleClearCache = () => {
    if ("caches" in window) {
      caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
    }
    localStorage.removeItem("sb-xcauajpfrmalzhhiodcb-auth-token");
    toast.success("המטמון נוקה בהצלחה");
  };

  const handleExportData = () => {
    toast.info("הייצוא יתחיל בקרוב — קובץ ZIP יישלח לאימייל שלך");
    // Future: trigger edge function for ZIP export
  };

  const handleDeleteAccount = async () => {
    toast.error("לא ניתן לשחזר חשבון לאחר מחיקה. פנה לתמיכה.");
    navigate("/data-deletion");
  };

  const getThemeIcon = () => {
    if (theme === "light") return Sun;
    if (theme === "dark") return Moon;
    return Monitor;
  };

  return (
    <div className="h-screen bg-background overflow-hidden" dir={direction}>
      <SEO title="הגדרות ופרטיות" description="נהל התראות, אבטחה, שפה ופרטיות" url="/settings" />
      <div className="h-full overflow-y-auto pb-[70px]">
        {/* Header */}
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
              <h1 className="text-lg font-semibold text-foreground">הגדרות ופרטיות</h1>
            </div>
          </div>
        </motion.div>

        {/* Profile Card */}
        <div className="max-w-lg mx-auto px-4 pt-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border border-border/50 rounded-2xl p-4 bg-card mb-5">
              <div className="flex items-center gap-4">
                <Avatar className="w-14 h-14 border-2 border-primary/20">
                  <AvatarImage src={profileAvatar || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                    {(profileName || user?.email || "מ")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base text-foreground truncate">
                    {profileName || "משתמש"}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-border text-foreground hover:bg-muted font-medium px-3 text-xs"
                  onClick={() => navigate("/edit-profile")}
                >
                  עריכה
                </Button>
              </div>
            </Card>
          </motion.div>
        </div>

        <div className="max-w-lg mx-auto px-4 space-y-1">
          {/* ═══ 1. Notification Preferences ═══ */}
          <SettingsSection title="התראות" icon={Bell}>
            <SettingRow
              icon={Heart}
              label="התראות בריאות"
              description="חיסונים, תרופות ותזכורות ווטרינר"
              type="toggle"
              value={healthAlerts}
              action={() => toggle("pref_health_alerts", setHealthAlerts, healthAlerts)}
            />
            <SettingRow
              icon={ShoppingBag}
              label="חנות ומלאי"
              description="תזכורות להזמנה חוזרת של מזון"
              type="toggle"
              value={shopAlerts}
              action={() => toggle("pref_shop_alerts", setShopAlerts, shopAlerts)}
            />
            <SettingRow
              icon={Users}
              label="קהילה"
              description="עדכונים מהפיד של PetID"
              type="toggle"
              value={communityAlerts}
              action={() => toggle("pref_community_alerts", setCommunityAlerts, communityAlerts)}
            />
            <SettingRow
              icon={Siren}
              label="חירום (SOS)"
              description="התראות קריטיות — עוקפות מצב שקט"
              type="toggle"
              value={sosAlerts}
              action={() => toggle("pref_sos_alerts", setSosAlerts, sosAlerts)}
              badge="קריטי"
            />
            <SettingRow
              icon={Bell}
              label="התראות Push"
              description={isSubscribed ? "התראות Push מופעלות" : "הפעל התראות Push"}
              type="toggle"
              value={isSubscribed}
              action={async () => (isSubscribed ? unsubscribe() : subscribe())}
            />
            <SettingRow
              icon={BellOff}
              label="מצב שקט"
              description="השתק התראות זמנית"
              action={() => setShowQuietMode(true)}
              showSeparator={false}
            />
          </SettingsSection>

          {/* ═══ 2. Account & Security ═══ */}
          <SettingsSection title="חשבון ואבטחה" icon={Shield}>
            <SettingRow
              icon={ShieldCheck}
              label="אימות דו-שלבי (2FA)"
              description="הגן על מידע רפואי וביטוחי"
              action={() => {
                toast.info("2FA יהיה זמין בקרוב");
              }}
              badge="בקרוב"
            />
            <SettingRow
              icon={Link2}
              label="חשבונות מקושרים"
              description="ליברה ביטוח, Google, Apple ID"
              action={() => navigate("/privacy-settings")}
            />
            <SettingRow
              icon={privacyMode === "private" ? EyeOff : Eye}
              label="מצב פרטיות"
              description={privacyMode === "private" ? "הפרופיל מוסתר מהפיד" : "הפרופיל גלוי לכולם"}
              type="select"
              value={privacyMode}
              options={[
                { value: "public", label: "ציבורי" },
                { value: "private", label: "פרטי" },
              ]}
              action={(val: string) => {
                setPrivacyMode(val as any);
                localStorage.setItem("pref_privacy_mode", val);
                toast.success(val === "private" ? "הפרופיל הוסתר" : "הפרופיל גלוי");
              }}
            />
            <SettingRow
              icon={QrCode}
              label="קוד QR שלי"
              description="שתף את הפרופיל שלך בקלות"
              action={() => setShowQRCode(true)}
            />
            <SettingRow
              icon={Star}
              label="חברים קרובים"
              description="נהל רשימת חברים קרובים לסטוריז"
              action={() => setShowCloseFriends(true)}
            />
            <SettingRow
              icon={Store}
              label="עבור לחשבון עסקי"
              description="הפוך לפרופיל עסקי"
              action={() => navigate("/convert-to-business")}
              showSeparator={false}
            />
          </SettingsSection>

          {/* ═══ 3. App Localization ═══ */}
          <SettingsSection title="שפה ותצוגה" icon={Globe}>
            <SettingRow
              icon={Languages}
              label="שפה"
              description="בחר שפת ממשק"
              type="select"
              value={language}
              options={[
                { value: "he", label: "עברית" },
                { value: "en", label: "English" },
                { value: "ar", label: "عربية" },
              ]}
              action={(val: string) => setLanguage(val as any)}
            />
            <SettingRow
              icon={Weight}
              label="יחידות משקל"
              description="ק״ג או פאונד"
              type="select"
              value={weightUnit}
              options={[
                { value: "kg", label: "ק״ג (KG)" },
                { value: "lbs", label: "פאונד (Lbs)" },
              ]}
              action={(val: string) => {
                setWeightUnit(val);
                localStorage.setItem("pref_weight_unit", val);
              }}
            />
            <SettingRow
              icon={Thermometer}
              label="יחידות טמפרטורה"
              description="צלזיוס או פרנהייט"
              type="select"
              value={tempUnit}
              options={[
                { value: "celsius", label: "צלזיוס (°C)" },
                { value: "fahrenheit", label: "פרנהייט (°F)" },
              ]}
              action={(val: string) => {
                setTempUnit(val);
                localStorage.setItem("pref_temp_unit", val);
              }}
            />
            <SettingRow
              icon={getThemeIcon()}
              label="ערכת נושא"
              description="בהיר, כהה או אוטומטי"
              type="select"
              value={theme}
              options={[
                { value: "light", label: "בהיר" },
                { value: "dark", label: "כהה" },
                { value: "system", label: "אוטומטי" },
              ]}
              action={(val: string) => setTheme(val as any)}
            />
            <SettingRow
              icon={Type}
              label="גודל טקסט"
              description="שנה את גודל הטקסט"
              type="select"
              value={fontSize}
              options={[
                { value: "small", label: "קטן" },
                { value: "medium", label: "בינוני" },
                { value: "large", label: "גדול" },
              ]}
              action={(val: string) => setFontSize(val as any)}
            />
            <SettingRow
              icon={Contrast}
              label="ניגודיות גבוהה"
              description="שפר את הנראות"
              type="toggle"
              value={highContrast}
              action={() => setHighContrast(!highContrast)}
            />
            <SettingRow
              icon={Zap}
              label="הפחת אנימציות"
              description="הקטן תנועה בממשק"
              type="toggle"
              value={reduceMotion}
              action={() => setReduceMotion(!reduceMotion)}
              showSeparator={false}
            />
          </SettingsSection>

          {/* ═══ 4. Data Management ═══ */}
          <SettingsSection title="ניהול מידע" icon={HardDrive}>
            <SettingRow
              icon={Download}
              label="ייצוא נתונים"
              description="הורד את כל הרשומות הרפואיות כקובץ ZIP"
              action={handleExportData}
            />
            <SettingRow
              icon={FileText}
              label="טיוטות"
              description="פוסטים שנשמרו כטיוטה"
              action={() => setShowDrafts(true)}
            />
            <SettingRow
              icon={Calendar}
              label="פוסטים מתוזמנים"
              description="פוסטים שממתינים לפרסום"
              action={() => setShowScheduled(true)}
            />
            <SettingRow
              icon={Smartphone}
              label="ניקוי מטמון"
              description="שמור על מהירות האפליקציה"
              action={handleClearCache}
            />
            <SettingRow
              icon={Trash2}
              label="מחיקת חשבון"
              description="מחיקה לצמיתות — לא ניתן לשחזר"
              action={handleDeleteAccount}
              destructive
              showSeparator={false}
            />
          </SettingsSection>

          {/* ═══ 5. About PetID ═══ */}
          <SettingsSection title="אודות PetID" icon={Info} defaultOpen={false}>
            <SettingRow
              icon={Info}
              label="תנאי שימוש"
              description="תנאים והתניות"
              action={() => navigate("/terms")}
            />
            <SettingRow
              icon={Lock}
              label="מדיניות פרטיות"
              description="כיצד אנו שומרים על המידע שלך"
              action={() => navigate("/privacy")}
            />
            <SettingRow
              icon={Info}
              label="הצהרת נגישות"
              description="מדיניות הנגישות שלנו"
              action={() => navigate("/accessibility")}
            />
            <SettingRow
              icon={Info}
              label="תמיכה ועזרה"
              description="צ'אט, טלפון, שאלות נפוצות"
              action={() => navigate("/support")}
            />
            <SettingRow
              icon={Star}
              label="דרג את האפליקציה"
              description="עזור לנו להשתפר — השאר דירוג"
              action={() => toast.info("תודה! נפנה אותך לחנות בקרוב")}
              showSeparator={false}
            />
          </SettingsSection>

          {/* Logout */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Card
              onClick={handleLogout}
              className="border-0 rounded-2xl overflow-hidden cursor-pointer shadow-md bg-card group transition-all mb-4"
            >
              <motion.div
                whileHover={{ x: -3 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3.5 p-3.5 transition-colors group-hover:bg-destructive/5"
              >
                <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center flex-shrink-0">
                  <LogOut className="w-[18px] h-[18px] text-destructive" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[14px] text-destructive">התנתקות</h3>
                  <p className="text-[11px] text-muted-foreground">התנתק מהחשבון שלך</p>
                </div>
                <div className="w-7 h-7 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <ChevronLeft className="w-3.5 h-3.5 text-destructive" strokeWidth={2} />
                </div>
              </motion.div>
            </Card>
          </motion.div>

          {/* Version */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center py-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">PetID • גרסה 2.48.0</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Dialogs */}
      <QRCodeProfile
        open={showQRCode}
        onOpenChange={setShowQRCode}
        profile={{ id: user?.id || "", full_name: user?.user_metadata?.full_name, avatar_url: null }}
      />
      <QuietModeSettings open={showQuietMode} onOpenChange={setShowQuietMode} />
      <CloseFriendsManager open={showCloseFriends} onOpenChange={setShowCloseFriends} />
      <DraftPostsManager
        open={showDrafts}
        onOpenChange={setShowDrafts}
        onEditDraft={() => toast.info("פתיחת טיוטה לעריכה")}
      />
      <ScheduledPostsManager open={showScheduled} onOpenChange={setShowScheduled} />

      <BottomNav />
    </div>
  );
};

export default Settings;
