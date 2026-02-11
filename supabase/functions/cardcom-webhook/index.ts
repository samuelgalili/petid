import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cardcom-signature',
};

// CardCom Webhook Secret for verification
const CARDCOM_WEBHOOK_SECRET = Deno.env.get('CARDCOM_WEBHOOK_SECRET');

// Verify webhook signature using HMAC-SHA256
async function verifyWebhookSignature(payload: string, signature: string | null): Promise<boolean> {
  if (!CARDCOM_WEBHOOK_SECRET) {
    console.error('CARDCOM_WEBHOOK_SECRET not configured - rejecting webhook');
    return false;
  }

  if (!signature) {
    console.error('No signature provided in webhook request');
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(CARDCOM_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );
    
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
    const isValid = signature === expectedSignature;
    
    if (!isValid) {
      console.error('Webhook signature mismatch');
    }
    
    return isValid;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

interface CardComWebhookPayload {
  // TODO: Update based on actual CardCom webhook payload structure
  ResponseCode?: number;
  Description?: string;
  InternalDealNumber?: string;
  LowProfileDealId?: string;
  TransactionId?: string;
  Amount?: number;
  ReturnValue?: string; // Custom data we passed (e.g., payment_id or subscription_id)
  SubscriptionId?: string;
  EventType?: string; // e.g., 'payment', 'subscription_created', 'subscription_canceled'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get('X-CardCom-Signature') || req.headers.get('x-cardcom-signature');

    // Verify webhook signature
    const isValidSignature = await verifyWebhookSignature(rawBody, signature);
    if (!isValidSignature) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the payload
    let payload: CardComWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      // CardCom might send form-encoded data
      const formData = new URLSearchParams(rawBody);
      payload = Object.fromEntries(formData.entries()) as unknown as CardComWebhookPayload;
    }

    console.log('Received CardCom webhook:', payload);

    // Log the raw event for debugging
    const { error: logError } = await supabaseAdmin
      .from('cardcom_events')
      .insert({
        payload_json: payload
      });

    if (logError) {
      console.error('Failed to log webhook event:', logError);
    }

    // Determine event type and process accordingly
    // TODO: Adjust based on actual CardCom webhook event structure
    const isSuccess = payload.ResponseCode === 0 || payload.ResponseCode === undefined;
    const transactionId = payload.TransactionId || payload.InternalDealNumber || payload.LowProfileDealId;

    // Check if this is a payment or subscription event
    // CardCom typically includes a ReturnValue or similar field with our custom data
    const customData = payload.ReturnValue ? JSON.parse(payload.ReturnValue) : {};
    const paymentId = customData.payment_id;
    const subscriptionId = customData.subscription_id || payload.SubscriptionId;

    if (paymentId) {
      // Update payment status
      const newStatus = isSuccess ? 'paid' : 'failed';
      
      const { error: updateError } = await supabaseAdmin
        .from('cardcom_payments')
        .update({
          status: newStatus,
          cardcom_transaction_id: transactionId
        })
        .eq('id', paymentId);

      if (updateError) {
        console.error('Failed to update payment:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update payment' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Payment ${paymentId} updated to ${newStatus}`);
    }

    if (subscriptionId) {
      // Determine subscription status based on event
      let newStatus = 'pending';
      
      if (isSuccess) {
        // Check event type for subscription-specific events
        const eventType = payload.EventType?.toLowerCase() || '';
        
        if (eventType.includes('cancel')) {
          newStatus = 'canceled';
        } else if (eventType.includes('fail') || eventType.includes('past_due')) {
          newStatus = 'past_due';
        } else {
          newStatus = 'active';
        }
      } else {
        newStatus = 'past_due';
      }

      const { error: updateError } = await supabaseAdmin
        .from('cardcom_subscriptions')
        .update({
          status: newStatus,
          cardcom_subscription_id: transactionId
        })
        .eq('id', subscriptionId);

      if (updateError) {
        console.error('Failed to update subscription:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update subscription' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Subscription ${subscriptionId} updated to ${newStatus}`);
    }

    // CardCom expects a 200 OK response
    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
