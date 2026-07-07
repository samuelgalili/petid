import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";

export interface GeneralSettings {
  siteName: string;
  defaultLanguage: string;
  maintenanceMode: boolean;
}

export interface SecuritySettings {
  requireEmailVerification: boolean;
  maxLoginAttempts: number;
  sessionTimeout: number;
  enable2FA: boolean;
}

export interface NotificationSettings {
  enablePushNotifications: boolean;
  enableEmailNotifications: boolean;
  notifyOnNewUser: boolean;
  notifyOnNewOrder: boolean;
  notifyOnReport: boolean;
}

export interface FeatureSettings {
  enableShop: boolean;
  enableAdoption: boolean;
  enableStories: boolean;
  enableReels: boolean;
  enableChat: boolean;
}

export interface ModerationSettings {
  allowReportUsers: boolean;
  allowReportPosts: boolean;
  requireVerificationForPosting: boolean;
  autoHideReportedContent: boolean;
  reportThreshold: number;
}

export interface SystemSettings {
  general: GeneralSettings;
  security: SecuritySettings;
  notifications: NotificationSettings;
  features: FeatureSettings;
  moderation: ModerationSettings;
}

const STORAGE_KEY = "mipo-system-settings";

const defaultSettings: SystemSettings = {
  general: {
    siteName: "MIPO",
    defaultLanguage: "he",
    maintenanceMode: false,
  },
  security: {
    requireEmailVerification: true,
    maxLoginAttempts: 5,
    sessionTimeout: 60,
    enable2FA: false,
  },
  notifications: {
    enablePushNotifications: true,
    enableEmailNotifications: true,
    notifyOnNewUser: true,
    notifyOnNewOrder: true,
    notifyOnReport: true,
  },
  features: {
    enableShop: true,
    enableAdoption: false,
    enableStories: false,
    enableReels: false,
    enableChat: true,
  },
  moderation: {
    allowReportUsers: true,
    allowReportPosts: false,
    requireVerificationForPosting: false,
    autoHideReportedContent: false,
    reportThreshold: 3,
  },
};

const readSettings = (): SystemSettings => {
  try {
    return { ...defaultSettings, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return defaultSettings;
  }
};

export const useSystemSettings = () => {
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSettings(readSettings());
    setIsLoading(false);
  }, []);

  const saveAllSettings = useCallback(async (newSettings: SystemSettings) => {
    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
      await logAction({
        action_type: "settings.updated",
        entity_type: "settings",
        entity_id: "local",
        new_values: newSettings as unknown as Record<string, unknown>,
      });
      toast({ title: "ההגדרות נשמרו בהצלחה" });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        title: "שגיאה",
        description: "נכשל בעדכון ההגדרות",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [logAction, toast]);

  const updateSettings = useCallback((key: keyof SystemSettings, value: SystemSettings[keyof SystemSettings]) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [settings]);

  return {
    settings,
    isLoading,
    error: null,
    updateSettings,
    saveAllSettings,
    isSaving,
  };
};

export const useFeatureFlag = (feature: keyof FeatureSettings) => {
  const { settings, isLoading } = useSystemSettings();
  return {
    enabled: settings.features[feature],
    isLoading,
  };
};

export const useModerationSettings = () => {
  const { settings, isLoading } = useSystemSettings();
  return {
    ...settings.moderation,
    isLoading,
  };
};
