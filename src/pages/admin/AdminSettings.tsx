import { useState } from "react";
import { 
  Settings, Shield, Bell, Palette, Globe, 
  Key, Database, Save, RefreshCw
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
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";

const AdminSettings = () => {
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);

  // Settings state (would be loaded from backend in production)
  const [settings, setSettings] = useState({
    // General
    siteName: "PetID",
    defaultLanguage: "he",
    maintenanceMode: false,
    
    // Security
    requireEmailVerification: true,
    maxLoginAttempts: 5,
    sessionTimeout: 60,
    enable2FA: false,
    
    // Notifications
    enablePushNotifications: true,
    enableEmailNotifications: true,
    notifyOnNewUser: true,
    notifyOnNewOrder: true,
    notifyOnReport: true,
    
    // Features
    enableShop: true,
    enableAdoption: true,
    enableStories: true,
    enableReels: true,
    enableChat: true,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      // In production, save to backend
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      await logAction({
        action_type: "settings.updated",
        entity_type: "settings",
        new_values: settings,
      });
      
      toast({ title: "ההגדרות נשמרו בהצלחה" });
    } catch (error) {
      toast({ title: "שגיאה", description: "השמירה נכשלה", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="הגדרות מערכת" breadcrumbs={[{ label: "הגדרות" }]}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="w-4 h-4" />
            כללי
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            אבטחה
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
                    value={settings.siteName}
                    onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  />
                </div>

                <div>
                  <Label>שפת ברירת מחדל</Label>
                  <Select 
                    value={settings.defaultLanguage} 
                    onValueChange={(value) => setSettings({ ...settings, defaultLanguage: value })}
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
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
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
                  checked={settings.requireEmailVerification}
                  onCheckedChange={(checked) => setSettings({ ...settings, requireEmailVerification: checked })}
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
                  checked={settings.enable2FA}
                  onCheckedChange={(checked) => setSettings({ ...settings, enable2FA: checked })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>מקסימום ניסיונות התחברות</Label>
                  <Input
                    type="number"
                    min="1"
                    value={settings.maxLoginAttempts}
                    onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) })}
                  />
                </div>

                <div>
                  <Label>פקיעת Session (דקות)</Label>
                  <Input
                    type="number"
                    min="5"
                    value={settings.sessionTimeout}
                    onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                  />
                </div>
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
                  checked={settings.enablePushNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, enablePushNotifications: checked })}
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
                  checked={settings.enableEmailNotifications}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableEmailNotifications: checked })}
                />
              </div>

              <hr />

              <h3 className="font-medium">התראות מנהל</h3>

              <div className="flex items-center justify-between">
                <Label>משתמש חדש</Label>
                <Switch
                  checked={settings.notifyOnNewUser}
                  onCheckedChange={(checked) => setSettings({ ...settings, notifyOnNewUser: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>הזמנה חדשה</Label>
                <Switch
                  checked={settings.notifyOnNewOrder}
                  onCheckedChange={(checked) => setSettings({ ...settings, notifyOnNewOrder: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>דיווח חדש</Label>
                <Switch
                  checked={settings.notifyOnReport}
                  onCheckedChange={(checked) => setSettings({ ...settings, notifyOnReport: checked })}
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
                  checked={settings.enableShop}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableShop: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>אימוץ</Label>
                  <p className="text-sm text-muted-foreground">הפעל את מודול האימוץ</p>
                </div>
                <Switch
                  checked={settings.enableAdoption}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableAdoption: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>סטוריז</Label>
                  <p className="text-sm text-muted-foreground">אפשר סטוריז</p>
                </div>
                <Switch
                  checked={settings.enableStories}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableStories: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Reels</Label>
                  <p className="text-sm text-muted-foreground">אפשר Reels</p>
                </div>
                <Switch
                  checked={settings.enableReels}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableReels: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>צ׳אט</Label>
                  <p className="text-sm text-muted-foreground">אפשר הודעות פרטיות</p>
                </div>
                <Switch
                  checked={settings.enableChat}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableChat: checked })}
                />
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="fixed bottom-4 left-4 right-4 lg:left-auto lg:right-6 lg:bottom-6">
        <Button onClick={handleSave} disabled={saving} className="w-full lg:w-auto shadow-lg">
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 ml-2 animate-spin" />
              שומר...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 ml-2" />
              שמור שינויים
            </>
          )}
        </Button>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
