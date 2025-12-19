import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, any>;
  tag?: string;
  requireInteraction?: boolean;
}

serve(async (req) => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id, notification } = await req.json();

    if (!user_id || !notification) {
      return new Response(
        JSON.stringify({ error: 'Missing user_id or notification data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's push subscriptions
    const { data: subscriptions, error: fetchError } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (fetchError) {
      console.error('Error fetching subscriptions:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found for user:', user_id);
      return new Response(
        JSON.stringify({ message: 'No subscriptions found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending notifications to ${subscriptions.length} devices`);

    // Send push notifications to all user's devices
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription: PushSubscription) => {
        try {
          // Import web-push library dynamically
          const webpush = await import('https://esm.sh/web-push@3.6.6');
          
          // Configure VAPID keys (you'll need to set these as secrets)
          const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
          const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
          
          if (!vapidPublicKey || !vapidPrivateKey) {
            console.error('VAPID keys not configured');
            throw new Error('VAPID keys not configured');
          }

          webpush.setVapidDetails(
            'mailto:support@petid.app',
            vapidPublicKey,
            vapidPrivateKey
          );

          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          };

          const payload = JSON.stringify(notification);

          await webpush.sendNotification(pushSubscription, payload);
          console.log('Notification sent successfully to:', subscription.endpoint);
          
          return { success: true, endpoint: subscription.endpoint };
        } catch (error: any) {
          console.error('Error sending notification:', error);
          
          // If subscription is invalid (410 Gone), delete it
          if (error?.statusCode === 410) {
            await supabaseClient
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', subscription.endpoint);
            console.log('Deleted invalid subscription:', subscription.endpoint);
          }
          
          return { success: false, endpoint: subscription.endpoint, error: error?.message || 'Unknown error' };
        }
      })
    );

    const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    console.log(`Notification results: ${successful} successful, ${failed} failed`);

    return new Response(
      JSON.stringify({
        message: 'Push notifications sent',
        successful,
        failed,
        results: results.map((r) => r.status === 'fulfilled' ? r.value : { success: false }),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-push-notification function:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
