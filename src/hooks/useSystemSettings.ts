import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';

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

const defaultSettings: SystemSettings = {
  general: {
    siteName: 'PetID',
    defaultLanguage: 'he',
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
    enableAdoption: true,
    enableStories: true,
    enableReels: true,
    enableChat: true,
  },
  moderation: {
    allowReportUsers: true,
    allowReportPosts: true,
    requireVerificationForPosting: false,
    autoHideReportedContent: false,
    reportThreshold: 3,
  },
};

export const useSystemSettings = () => {
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value');

      if (error) throw error;

      const settingsMap: SystemSettings = JSON.parse(JSON.stringify(defaultSettings));
      
      (data || []).forEach((row: { key: string; value: unknown }) => {
        const key = row.key as keyof SystemSettings;
        if (key in settingsMap && row.value) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (settingsMap as any)[key] = row.value;
        }
      });

      return settingsMap;
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Convert to plain object for Supabase
      const jsonValue = JSON.parse(JSON.stringify(value));
      
      const { error } = await supabase
        .from('system_settings')
        .update({ 
          value: jsonValue,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq('key', key);

      if (error) throw error;

      await logAction({
        action_type: 'settings.updated',
        entity_type: 'settings',
        entity_id: key,
        new_values: jsonValue,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
    onError: (error) => {
      console.error('Failed to update settings:', error);
      toast({
        title: 'שגיאה',
        description: 'נכשל בעדכון ההגדרות',
        variant: 'destructive',
      });
    },
  });

  const saveAllSettings = async (newSettings: SystemSettings) => {
    const keys = Object.keys(newSettings) as (keyof SystemSettings)[];
    
    for (const key of keys) {
      const settingValue = newSettings[key];
      await updateSettingsMutation.mutateAsync({ 
        key, 
        value: settingValue 
      });
    }

    toast({ title: 'ההגדרות נשמרו בהצלחה' });
  };

  return {
    settings: settings || defaultSettings,
    isLoading,
    error,
    updateSettings: updateSettingsMutation.mutate,
    saveAllSettings,
    isSaving: updateSettingsMutation.isPending,
  };
};

// Hook for checking specific feature flags (can be used anywhere in the app)
export const useFeatureFlag = (feature: keyof FeatureSettings) => {
  const { settings, isLoading } = useSystemSettings();
  return {
    enabled: settings.features[feature],
    isLoading,
  };
};

// Hook for checking moderation settings
export const useModerationSettings = () => {
  const { settings, isLoading } = useSystemSettings();
  return {
    ...settings.moderation,
    isLoading,
  };
};
