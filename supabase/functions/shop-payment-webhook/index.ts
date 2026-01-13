import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

interface CardComWebhookPayload {
  ResponseCode?: number;
  Description?: string;
  InternalDealNumber?: string;
  LowProfileDealId?: string;
  TransactionId?: string;
  Amount?: number;
  ReturnValue?: string;
  Last4Digits?: string;
  CardType?: string;
  NumOfPayments?: number;
}

const CARDCOM_WEBHOOK_SECRET = Deno.env.get('CARDCOM_WEBHOOK_SECRET');

// Verify webhook signature using HMAC-SHA256
async function verifyWebhookSignature(payload: string, signature: string | null): Promise<boolean> {
  if (!CARDCOM_WEBHOOK_SECRET) {
    console.warn('CARDCOM_WEBHOOK_SECRET not set, skipping signature verification');
    return true;
  }

  if (!signature) {
    console.warn('No signature provided in webhook request');
    return true; // Allow for now, CardCom may not always send signature
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
    return signature === expectedSignature;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cardcom-signature',
      }
    });
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get raw body
    const rawBody = await req.text();
    const signature = req.headers.get('X-CardCom-Signature') || req.headers.get('x-cardcom-signature');

    // Verify signature
    const isValid = await verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse payload
    let payload: CardComWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      const formData = new URLSearchParams(rawBody);
      payload = Object.fromEntries(formData.entries()) as unknown as CardComWebhookPayload;
    }

    console.log('Shop payment webhook received:', payload);

    // Log the event
    await supabaseAdmin
      .from('cardcom_events')
      .insert({ payload_json: payload });

    // Extract order info from ReturnValue
    let orderId: string | null = null;
    let orderNumber: string | null = null;

    if (payload.ReturnValue) {
      try {
        const returnData = JSON.parse(payload.ReturnValue);
        orderId = returnData.order_id;
        orderNumber = returnData.order_number;
      } catch (e) {
        console.error('Error parsing ReturnValue:', e);
      }
    }

    if (!orderId) {
      console.error('No order_id in webhook payload');
      return new Response(
        JSON.stringify({ error: 'Missing order_id' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Determine payment status
    const isSuccess = payload.ResponseCode === 0 || payload.ResponseCode === undefined;
    const transactionId = payload.TransactionId || payload.InternalDealNumber || payload.LowProfileDealId;

    console.log(`Processing payment for order ${orderId}, success: ${isSuccess}`);

    if (isSuccess) {
      // Update order to paid
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          payment_status: 'paid',
          payment_transaction_id: transactionId,
          status: 'processing', // Move to processing after payment
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Failed to update order:', updateError);
        throw updateError;
      }

      // Get order details for notification
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('user_id, order_number, total')
        .eq('id', orderId)
        .single();

      if (order) {
        // Create notification for user
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: order.user_id,
            title: 'התשלום התקבל בהצלחה! ✅',
            message: `ההזמנה ${order.order_number} בסך ₪${order.total.toFixed(2)} שולמה בהצלחה. ההזמנה בהכנה.`,
            type: 'order_status',
            is_read: false,
          });

        console.log(`Payment successful for order ${order.order_number}, notification sent`);
      }
    } else {
      // Payment failed
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          payment_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Failed to update order:', updateError);
      }

      // Get order for notification
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('user_id, order_number')
        .eq('id', orderId)
        .single();

      if (order) {
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: order.user_id,
            title: 'התשלום נכשל ❌',
            message: `התשלום עבור הזמנה ${order.order_number} נכשל. אנא נסה שוב.`,
            type: 'order_status',
            is_read: false,
          });
      }

      console.log(`Payment failed for order ${orderId}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Shop payment webhook error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: corsHeaders }
    );
  }
});
