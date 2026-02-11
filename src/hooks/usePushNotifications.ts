import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// VAPID public key from environment
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [isiOS, setIsiOS] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsiOS(isIOSDevice);

    // Detect PWA mode (standalone)
    const isPWAMode = window.matchMedia('(display-mode: standalone)').matches || 
                      (navigator as any).standalone === true;
    setIsPWA(isPWAMode);

    // Check support
    const checkSupport = () => {
      const hasServiceWorker = 'serviceWorker' in navigator;
      const hasPushManager = 'PushManager' in window;
      const hasNotification = 'Notification' in window;

      // CRITICAL: On iOS, push only works when running as PWA
      if (isIOSDevice && !isPWAMode) {
        setIsSupported(false);
        return;
      }

      setIsSupported(hasServiceWorker && hasPushManager && hasNotification);
    };

    checkSupport();

    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    checkSubscription();
  }, [user]);

  const checkSubscription = useCallback(async () => {
    try {
      if (!('serviceWorker' in navigator)) return;

      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!registration) {
        setIsSubscribed(false);
        return;
      }

      const subscription = await (registration as any).pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('[Push] Error checking subscription:', error);
      setIsSubscribed(false);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: "לא נתמך",
        description: isiOS && !isPWA 
          ? "יש להוסיף את האפליקציה למסך הבית כדי לקבל התראות"
          : "הדפדפן שלך אינו תומך בהתראות",
        variant: "destructive",
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        return true;
      } else if (result === "denied") {
        toast({
          title: "❌ הרשאה נדחתה",
          description: "לא תוכלו לקבל התראות. ניתן לשנות בהגדרות הדפדפן.",
          variant: "destructive",
        });
        return false;
      }
      return false;
    } catch (error) {
      console.error('[Push] Error requesting permission:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בבקשת הרשאה להתראות",
        variant: "destructive",
      });
      return false;
    }
  }, [isSupported, isiOS, isPWA, toast]);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Push notifications are not supported');
    }

    if (!user) {
      toast({
        title: "נדרשת התחברות",
        description: "יש להתחבר כדי לקבל התראות",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);

    try {
      // Request permission (MUST be triggered by user gesture)
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[Push] Service worker registered:', registration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      if (!VAPID_PUBLIC_KEY) {
        throw new Error('VAPID public key not configured');
      }

      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer
      });

      console.log('[Push] Push subscription:', subscription);

      // Extract keys
      const p256dhKey = subscription.getKey('p256dh');
      const authKey = subscription.getKey('auth');

      if (!p256dhKey || !authKey) {
        throw new Error('Failed to get subscription keys');
      }

      const p256dh = btoa(String.fromCharCode(...new Uint8Array(p256dhKey)));
      const auth = btoa(String.fromCharCode(...new Uint8Array(authKey)));

      // Store subscription in database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh,
          auth
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) {
        console.error('[Push] Error storing subscription:', error);
        throw error;
      }

      setIsSubscribed(true);
      toast({
        title: "✅ התראות הופעלו",
        description: "תקבלו התראות על פעילות חדשה באפליקציה",
      });
      
      console.log('[Push] Successfully subscribed to push notifications');
      return true;

    } catch (error: any) {
      console.error('[Push] Error subscribing:', error);
      toast({
        title: "שגיאה",
        description: error.message || "שגיאה בהרשמה להתראות",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user, toast]);

  const unsubscribe = useCallback(async () => {
    if (!user) return false;
    
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!registration) {
        setIsSubscribed(false);
        return true;
      }

      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }

      setIsSubscribed(false);
      toast({
        title: "✅ התראות בוטלו",
        description: "לא תקבלו עוד התראות",
      });
      
      console.log('[Push] Successfully unsubscribed from push notifications');
      return true;

    } catch (error) {
      console.error('[Push] Error unsubscribing:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בביטול התראות",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const sendTestNotification = useCallback(async () => {
    if (!user || !isSubscribed) {
      toast({
        title: "לא ניתן לשלוח",
        description: "יש להפעיל התראות קודם",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: user.id,
          payload: {
            title: 'התראת בדיקה מ-Petid 🐾',
            body: 'ההתראות עובדות מצוין!',
            url: '/home'
          }
        }
      });

      if (error) throw error;

      toast({
        title: "✅ התראה נשלחה",
        description: "התראת בדיקה נשלחה בהצלחה",
      });
    } catch (error: any) {
      console.error('[Push] Error sending test notification:', error);
      toast({
        title: "שגיאה",
        description: "שגיאה בשליחת התראת בדיקה",
        variant: "destructive",
      });
    }
  }, [user, isSubscribed, toast]);

  return {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    isiOS,
    isPWA,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}

// Keep the old export for backwards compatibility
export const usePushNotificationsLegacy = usePushNotifications;
