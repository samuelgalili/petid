/**
 * Settings & Privacy Page - MIPO V48
 * Sections: Notifications, Account & Security, Localization, Data Management, About
 */

import {
  Globe, Lock, Info, LogOut, Moon, Sun, Languages, Monitor,
  Type, Contrast, Zap, ChevronLeft, Sparkles, Shield, Eye, EyeOff,
  Download, Trash2, HardDrive, Smartphone, Mail,
  ChevronDown, ChevronUp,
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
import { motion } from "framer-motion";
import { SEO } from "@/components/SEO";
import {
  deleteMyAccount,
  getCurrentUser,
  getMyDataExport,
  updateMyMarketingConsent,
  updateMyProfile,
} from "@/lib/mipoApi";

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
        <Card className="mipo-card overflow-hidden border-0">
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
  value?: unknown;
  options?: { value: string; label: string }[];
  action?: unknown;
  destructive?: boolean;
  badge?: string;
  showSeparator?: boolean;
}) => {
  const runAction = (nextValue?: string | boolean) => {
    if (typeof action === "function") {
      (action as (value?: string | boolean) => void | Promise<void>)(nextValue);
    }
  };

  return (
    <>
      <motion.div
        whileHover={type === "link" ? { x: -3 } : {}}
        whileTap={type === "link" ? { scale: 0.98 } : {}}
        onClick={type === "link" ? () => runAction() : undefined}
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
            checked={Boolean(value)}
            onCheckedChange={(checked) => runAction(checked)}
            className="flex-shrink-0 data-[state=checked]:bg-primary"
          />
        )}
        {type === "select" && (
          <Select value={typeof value === "string" ? value : ""} onValueChange={(nextValue) => runAction(nextValue)}>
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

  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const [privacyMode, setPrivacyMode] = useState<"public" | "private">("private");
  const [aiConsent, setAiConsent] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      const data = (await getCurrentUser())?.profile;
      if (data) {
        setProfileAvatar(data.avatar_url || null);
        setProfileName(data.full_name || null);
        setMarketingConsent(data.marketing_consent ?? false);
        setPrivacyMode(data.profile_visibility === "public" ? "public" : "private");
        setAiConsent(data.ai_consent_given === true);
      }
    };
    fetchProfile();
  }, [user?.id]);

  const handleMarketingConsentToggle = async () => {
    if (!user?.id) return;
    const next = !marketingConsent;
    setMarketingConsent(next);
    try {
      const profile = await updateMyMarketingConsent(next);
      setMarketingConsent(profile.marketing_consent ?? next);
      toast.success(next ? "הסכמה לשיווק הופעלה" : "הוסרת מרשימת השיווק");
    } catch {
      setMarketingConsent(!next);
      toast.error("שגיאה בעדכון הסכמה לשיווק");
    }
  };

  const handlePrivacyModeChange = async (value: string) => {
    if (value !== "public" && value !== "private") return;
    const previous = privacyMode;
    setPrivacyMode(value);
    try {
      const result = await updateMyProfile({ profile_visibility: value });
      setPrivacyMode(result.profile?.profile_visibility === "public" ? "public" : "private");
      toast.success(value === "private" ? "הפרופיל הוגדר כפרטי" : "הפרופיל הוגדר כציבורי");
    } catch {
      setPrivacyMode(previous);
      toast.error("שגיאה בעדכון הפרטיות");
    }
  };

  const handleAiConsentChange = async (enabled?: boolean) => {
    const next = Boolean(enabled);
    const previous = aiConsent;
    setAiConsent(next);
    try {
      const result = await updateMyProfile({ ai_consent_given: next });
      setAiConsent(result.profile?.ai_consent_given === true);
      toast.success(next ? "הסכמה לעיבוד AI נשמרה" : "הסכמה לעיבוד AI בוטלה");
    } catch {
      setAiConsent(previous);
      toast.error("שגיאה בעדכון הסכמת AI");
    }
  };

  const handleLogout = async () => {
    const result = await signOut();
    if (result.error) {
      toast.error(result.error.message || "שגיאה בהתנתקות");
      return;
    }
    toast.success("התנתקת בהצלחה");
    navigate("/auth");
  };

  const handleClearCache = async () => {
    try {
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }
      toast.success("המטמון נוקה בהצלחה");
    } catch {
      toast.error("לא ניתן לנקות את המטמון כרגע");
    }
  };

  const handleExportData = async () => {
    toast.info("מכין ייצוא נתונים...");
    try {
      const dataExport = await getMyDataExport();
      // Download as JSON
      const blob = new Blob([JSON.stringify(dataExport, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mipo-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("הנתונים הורדו בהצלחה");
    } catch {
      toast.error("שגיאה בייצוא הנתונים");
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "האם את/ה בטוח/ה? החשבון, פרטי חיות המחמד והמידע הפרטי יימחקו לצמיתות. רשומות הזמנה שנדרש לשמור לצרכים תפעוליים או חוקיים יעברו אנונימיזציה.\n\nפעולה זו אינה הפיכה."
    );
    if (!confirmed) return;

    toast.info("מייצא נתונים לפני מחיקה...");
    try {
      const dataExport = await deleteMyAccount();

      // Auto-download export before deletion
      const blob = new Blob([JSON.stringify(dataExport, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mipo-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("החשבון נמחק. הנתונים הורדו למכשיר שלך.");
      await signOut();
      navigate("/auth");
    } catch {
      toast.error("שגיאה במחיקת החשבון — פנה לתמיכה");
    }
  };

  const getThemeIcon = () => {
    if (theme === "light") return Sun;
    if (theme === "dark") return Moon;
    return Monitor;
  };

  return (
    <div className="mipo-shell h-screen overflow-hidden bg-white" dir={direction}>
      <SEO title="הגדרות ופרטיות" description="נהל התראות, אבטחה, שפה ופרטיות" url="/settings" />
      <div className="h-full overflow-y-auto pb-[70px]">
        {/* Header */}
        <motion.div
          className="sticky top-0 z-40 border-b border-black/[0.05] bg-white/90 backdrop-blur-xl"
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
            <Card className="mipo-card mb-5 p-4">
              <div className="flex items-center gap-4">
                <div className="mipo-gradient-ring h-14 w-14 shrink-0"><Avatar className="h-full w-full border-2 border-white">
                  <AvatarImage src={profileAvatar || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                    {(profileName || user?.email || "מ")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar></div>
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
          <SettingsSection title="פרטיות ותקשורת" icon={Shield}>
            <SettingRow
              icon={privacyMode === "private" ? EyeOff : Eye}
              label="נראות הפרופיל"
              description={privacyMode === "private" ? "הפרופיל פרטי" : "הפרופיל זמין בתצוגות ציבוריות נתמכות"}
              type="select"
              value={privacyMode}
              options={[
                { value: "public", label: "ציבורי" },
                { value: "private", label: "פרטי" },
              ]}
              action={handlePrivacyModeChange}
            />
            <SettingRow
              icon={Sparkles}
              label="עיבוד באמצעות AI"
              description="שליחת פרטי פרופיל, חיית מחמד וקבצים מצורפים ל-Google Gemini בעת שימוש בצ'אט"
              type="toggle"
              value={aiConsent}
              action={handleAiConsentChange}
            />
            <SettingRow
              icon={Mail}
              label="הסכמה לשיווק"
              description="קבל עדכונים, מבצעים ותוכן מותאם"
              type="toggle"
              value={marketingConsent}
              action={handleMarketingConsentToggle}
              showSeparator={false}
            />
          </SettingsSection>

          {/* App Localization */}
          <SettingsSection title="שפה ותצוגה" icon={Globe}>
            <SettingRow
              icon={Languages}
              label="שפה"
              description="בחירת שפת ממשק"
              type="select"
              value={language}
              options={[
                { value: "he", label: "עברית" },
                { value: "en", label: "English" },
                { value: "ar", label: "عربية" },
              ]}
              action={(val: string) => setLanguage(val as "he" | "en" | "ar")}
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
              action={(val: string) => setTheme(val as "light" | "dark" | "system")}
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
              action={(val: string) => setFontSize(val as "small" | "medium" | "large")}
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
              description="הורד עותק של נתוני החשבון כקובץ JSON"
              action={handleExportData}
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

          {/* ═══ 5. About MIPO ═══ */}
          <SettingsSection title="אודות MIPO" icon={Info} defaultOpen={false}>
            <SettingRow
              icon={Info}
              label="תנאי שימוש"
              description="תנאים והתניות"
              action={() => window.dispatchEvent(new CustomEvent("open-legal-drawer", { detail: { key: "terms" } }))}
            />
            <SettingRow
              icon={Shield}
              label="זכויות צרכן וביטול"
              description="מדיניות ביטול והחזרים — חוק הגנת הצרכן"
              action={() => window.dispatchEvent(new CustomEvent("open-legal-drawer", { detail: { key: "consumer-protection" } }))}
            />
            <SettingRow
              icon={Lock}
              label="מדיניות פרטיות"
              description="כיצד אנו שומרים על המידע שלך"
              action={() => window.dispatchEvent(new CustomEvent("open-legal-drawer", { detail: { key: "privacy-policy" } }))}
            />
            <SettingRow
              icon={Info}
              label="הצהרת נגישות"
              description="מדיניות הנגישות שלנו"
              action={() => window.dispatchEvent(new CustomEvent("open-legal-drawer", { detail: { key: "accessibility" } }))}
            />
            <SettingRow
              icon={Info}
              label="תמיכה ועזרה"
              description="צ'אט, טלפון, שאלות נפוצות"
              action={() => navigate("/support")}
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

        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Settings;
