import { useState, useEffect } from "react";
import { 
  Settings, Shield, Bell, Palette, Globe, 
  Save, RefreshCw, Flag, Loader2
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSystemSettings, SystemSettings } from "@/hooks/useSystemSettings";

const AdminSettings = () => {
  const { settings: savedSettings, isLoading, saveAllSettings, isSaving } = useSystemSettings();
  const [activeTab, setActiveTab] = useState("general");
  const [localSettings, setLocalSettings] = useState<SystemSettings | null>(null);

  // Initialize local settings when saved settings load
  useEffect(() => {
    if (savedSettings && !localSettings) {
      setLocalSettings(JSON.parse(JSON.stringify(savedSettings)));
    }
  }, [savedSettings, localSettings]);

  const handleSave = async () => {
    if (!localSettings) return;
    await saveAllSettings(localSettings);
  };

  // Check if there are unsaved changes
  const hasChanges = localSettings && JSON.stringify(localSettings) !== JSON.stringify(savedSettings);

  if (isLoading || !localSettings) {
    return (
      <AdminLayout title="הגדרות מערכת" breadcrumbs={[{ label: "הגדרות" }]}>
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="הגדרות מערכת" breadcrumbs={[{ label: "הגדרות" }]}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="w-4 h-4" />
            כללי
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            אבטחה
          </TabsTrigger>
          <TabsTrigger value="moderation" className="gap-2">
            <Flag className="w-4 h-4" />
            מודרציה
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            התראות
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <Palette className="w-4 h-4" />
            פיצ׳רים
          </TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general">
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4">הגדרות כלליות</h2>
            
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>שם האתר</Label>
                  <Input
                    value={localSettings.general.siteName}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      general: { ...localSettings.general, siteName: e.target.value }
                    })}
                  />
                </div>

                <div>
                  <Label>שפת ברירת מחדל</Label>
                  <Select 
                    value={localSettings.general.defaultLanguage} 
                    onValueChange={(value) => setLocalSettings({
                      ...localSettings,
                      general: { ...localSettings.general, defaultLanguage: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="he">עברית</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">العربية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg">
                <div>
                  <Label className="text-destructive">מצב תחזוקה</Label>
                  <p className="text-sm text-muted-foreground">
                    כאשר מופעל, רק מנהלים יכולים לגשת לאתר
                  </p>
                </div>
                <Switch
                  checked={localSettings.general.maintenanceMode}
                  onCheckedChange={(checked) => setLocalSettings({
                    ...localSettings,
                    general: { ...localSettings.general, maintenanceMode: checked }
                  })}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4">הגדרות אבטחה</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>אימות אימייל</Label>
                  <p className="text-sm text-muted-foreground">
                    דרוש אימות אימייל בהרשמה
                  </p>
                </div>
                <Switch
                  checked={localSettings.security.requireEmailVerification}
                  onCheckedChange={(checked) => setLocalSettings({
                    ...localSettings,
                    security: { ...localSettings.security, requireEmailVerification: checked }
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>אימות דו-שלבי (2FA)</Label>
                  <p className="text-sm text-muted-foreground">
                    דרוש 2FA לכניסה
                  </p>
                </div>
                <Switch
                  checked={localSettings.security.enable2FA}
                  onCheckedChange={(checked) => setLocalSettings({
                    ...localSettings,
                    security: { ...localSettings.security, enable2FA: checked }
                  })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>מקסימום ניסיונות התחברות</Label>
                  <Input
                    type="number"
                    min="1"
                    value={localSettings.security.maxLoginAttempts}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      security: { ...localSettings.security, maxLoginAttempts: parseInt(e.target.value) || 5 }
                    })}
                  />
                </div>

                <div>
                  <Label>פקיעת Session (דקות)</Label>
                  <Input
                    type="number"
                    min="5"
                    value={localSettings.security.sessionTimeout}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      security: { ...localSettings.security, sessionTimeout: parseInt(e.target.value) || 60 }
                    })}
                  />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Moderation - NEW */}
        <TabsContent value="moderation">
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4">הגדרות מודרציה</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>אפשר דיווח על משתמשים</Label>
                  <p className="text-sm text-muted-foreground">
                    משתמשים יכולים לדווח על פרופילים של אחרים
                  </p>
                </div>
                <Switch
                  checked={localSettings.moderation.allowReportUsers}
                  onCheckedChange={(checked) => setLocalSettings({
                    ...localSettings,
                    moderation: { ...localSettings.moderation, allowReportUsers: checked }
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>אפשר דיווח על פוסטים</Label>
                  <p className="text-sm text-muted-foreground">
                    משתמשים יכולים לדווח על פוסטים
                  </p>
                </div>
                <Switch
                  checked={localSettings.moderation.allowReportPosts}
                  onCheckedChange={(checked) => setLocalSettings({
                    ...localSettings,
                    moderation: { ...localSettings.moderation, allowReportPosts: checked }
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>דרוש אימות לפרסום</Label>
                  <p className="text-sm text-muted-foreground">
                    משתמשים חדשים צריכים לאמת אימייל לפני שיכולים לפרסם
                  </p>
                </div>
                <Switch
                  checked={localSettings.moderation.requireVerificationForPosting}
                  onCheckedChange={(checked) => setLocalSettings({
                    ...localSettings,
                    moderation: { ...localSettings.moderation, requireVerificationForPosting: checked }
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>הסתרה אוטומטית של תוכן מדווח</Label>
                  <p className="text-sm text-muted-foreground">
                    הסתר אוטומטית תוכן שקיבל מספר דיווחים
                  </p>
                </div>
                <Switch
                  checked={localSettings.moderation.autoHideReportedContent}
                  onCheckedChange={(checked) => setLocalSettings({
                    ...localSettings,
                    moderation: { ...localSettings.moderation, autoHideReportedContent: checked }
                  })}
                />
              </div>

              <div>
                <Label>סף דיווחים להסתרה אוטומטית</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  מספר הדיווחים הדרוש להסתרה אוטומטית
                </p>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={localSettings.moderation.reportThreshold}
                  onChange={(e) => setLocalSettings({
                    ...localSettings,
                    moderation: { ...localSettings.moderation, reportThreshold: parseInt(e.target.value) || 3 }
                  })}
                  className="w-24"
                  disabled={!localSettings.moderation.autoHideReportedContent}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4">הגדרות התראות</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>התראות Push</Label>
                  <p className="text-sm text-muted-foreground">
                    אפשר שליחת התראות Push
                  </p>
                </div>
                <Switch
                  checked={localSettings.notifications.enablePushNotifications}
                  onCheckedChange={(checked) => setLocalSettings({
                    ...localSettings,
                    notifications: { ...localSettings.notifications, enablePushNotifications: checked }
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>התראות אימייל</Label>
                  <p className="text-sm text-muted-foreground">
                    אפשר שליחת התראות במייל
                  </p>
                </div>
                <Switch
                  checked={localSettings.notifications.enableEmailNotifications}
                  onCheckedChange={(checked) => setLocalSettings({
                    ...localSettings,
                    notifications: { ...localSettings.notifications, enableEmailNotifications: checked }
                  })}
                />
              </div>

              <hr />

              <h3 className="font-medium">התראות מנהל</h3>

              <div className="flex items-center justify-between">
                <Label>משתמש חדש</Label>
                <Switch
                  checked={localSettings.notifications.notifyOnNewUser}
                  onCheckedChange={(checked) => setLocalSettings({
                    ...localSettings,
                    notifications: { ...localSettings.notifications, notifyOnNewUser: checked }
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>הזמנה חדשה</Label>
                <Switch
                  checked={localSettings.notifications.notifyOnNewOrder}
                  onCheckedChange={(checked) => setLocalSettings({
                    ...localSettings,
                    notifications: { ...localSettings.notifications, notifyOnNewOrder: checked }
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>דיווח חדש</Label>
                <Switch
                  checked={localSettings.notifications.notifyOnReport}
                  onCheckedChange={(checked) => setLocalSettings({
                    ...localSettings,
                    notifications: { ...localSettings.notifications, notifyOnReport: checked }
                  })}
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Features */}
        <TabsContent value="features">
          <Card className="p-6">
            <h2 className="text-lg font-bold mb-4">דגלי פיצ׳רים</h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>חנות</Label>
                  <p className="text-sm text-muted-foreground">הפעל את מודול החנות</p>
                </div>
                <Switch
                  checked={localSettings.features.enableShop}
                  onCheckedChange={(checked) => setLocalSettings({
                    ...localSettings,
                    features: { ...localSettings.features, enableShop: checked }
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>אימוץ</Label>
                  <p className="text-sm text-muted-foreground">הפעל את מודול האימוץ</p>
                </div>
                <Switch
                  checked={localSettings.features.enableAdoption}
                  onCheckedChange={(checked) => setLocalSettings({
                    ...localSettings,
                    features: { ...localSettings.features, enableAdoption: checked }
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>סטוריז</Label>
                  <p className="text-sm text-muted-foreground">אפשר סטוריז</p>
                </div>
                <Switch
                  checked={localSettings.features.enableStories}
                  onCheckedChange={(checked) => setLocalSettings({
                    ...localSettings,
                    features: { ...localSettings.features, enableStories: checked }
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Reels</Label>
                  <p className="text-sm text-muted-foreground">אפשר Reels</p>
                </div>
                <Switch
                  checked={localSettings.features.enableReels}
                  onCheckedChange={(checked) => setLocalSettings({
                    ...localSettings,
                    features: { ...localSettings.features, enableReels: checked }
                  })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>צ׳אט</Label>
                  <p className="text-sm text-muted-foreground">אפשר הודעות פרטיות</p>
                </div>
                <Switch
                  checked={localSettings.features.enableChat}
                  onCheckedChange={(checked) => setLocalSettings({
                    ...localSettings,
                    features: { ...localSettings.features, enableChat: checked }
                  })}
                />
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-6 lg:bottom-6 z-50">
        <Button 
          onClick={handleSave} 
          disabled={isSaving || !hasChanges} 
          className="w-full lg:w-auto shadow-lg"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              שומר...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 ml-2" />
              שמור שינויים
              {hasChanges && <span className="mr-2 px-1.5 py-0.5 bg-primary-foreground/20 rounded text-xs">יש שינויים</span>}
            </>
          )}
        </Button>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;