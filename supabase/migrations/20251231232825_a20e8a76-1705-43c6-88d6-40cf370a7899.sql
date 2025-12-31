-- Create system_settings table for admin settings
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read settings
CREATE POLICY "Admins can view settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update settings
CREATE POLICY "Admins can update settings"
ON public.system_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert settings
CREATE POLICY "Admins can insert settings"
ON public.system_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.system_settings (key, value) VALUES
('general', '{"siteName": "PetID", "defaultLanguage": "he", "maintenanceMode": false}'),
('security', '{"requireEmailVerification": true, "maxLoginAttempts": 5, "sessionTimeout": 60, "enable2FA": false}'),
('notifications', '{"enablePushNotifications": true, "enableEmailNotifications": true, "notifyOnNewUser": true, "notifyOnNewOrder": true, "notifyOnReport": true}'),
('features', '{"enableShop": true, "enableAdoption": true, "enableStories": true, "enableReels": true, "enableChat": true}'),
('moderation', '{"allowReportUsers": true, "allowReportPosts": true, "requireVerificationForPosting": false, "autoHideReportedContent": false, "reportThreshold": 3}');