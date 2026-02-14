import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CardComWebhookPayload {
  [key: string]: string | number | undefined;
  ResponseCode?: string | number;
  OperationResponse?: string | number;
  DealResponse?: string | number;
  Description?: string;
  InternalDealNumber?: string | number;
  LowProfileCode?: string | number;
  LowProfileDealId?: string | number;
  LowProfileId?: string | number;
  TransactionId?: string | number;
  TranzactionId?: string | number;
  Amount?: string | number;
  ReturnValue?: string;
  Last4Digits?: string;
  CardType?: string | number;
  NumOfPayments?: string | number;
}

const CARDCOM_WEBHOOK_SECRET = Deno.env.get('CARDCOM_WEBHOOK_SECRET');
const CARDCOM_TERMINAL = Deno.env.get('CARDCOM_TERMINAL_NUMBER');
const CARDCOM_USERNAME = Deno.env.get('CARDCOM_USERNAME') || Deno.env.get('CARDCOM_API_NAME');
const CARDCOM_INDICATOR_URL = 'https://secure.cardcom.solutions/Interface/BillGoldGetLowProfileIndicator.aspx';

function getStringValue(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];
    if (value === null || value === undefined) continue;
    const normalized = String(value).trim();
    if (normalized.length > 0) return normalized;
  }
  return null;
}

function getNumberValue(source: Record<string, unknown>, keys: string[]): number | null {
  const raw = getStringValue(source, keys);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseReturnValue(rawReturnValue: string | null): { orderId: string | null; orderNumber: string | null } {
  if (!rawReturnValue) {
    return { orderId: null, orderNumber: null };
  }

  const tryParse = (value: string): { orderId: string | null; orderNumber: string | null } | null => {
    try {
      const parsed = JSON.parse(value);
      return {
        orderId: parsed?.order_id ? String(parsed.order_id) : null,
        orderNumber: parsed?.order_number ? String(parsed.order_number) : null,
      };
    } catch {
      return null;
    }
  };

  const parsedDirect = tryParse(rawReturnValue);
  if (parsedDirect) return parsedDirect;

  try {
    const decoded = decodeURIComponent(rawReturnValue);
    const parsedDecoded = tryParse(decoded);
    if (parsedDecoded) return parsedDecoded;
  } catch {
    // ignore decode errors and return fallback below
  }

  return { orderId: null, orderNumber: null };
}

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
    return signature === expectedSignature;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

async function fetchLowProfileIndicator(lowProfileCode: string): Promise<Record<string, string>> {
  if (!CARDCOM_TERMINAL || !CARDCOM_USERNAME) {
    throw new Error('Missing CardCom credentials for indicator validation');
  }

  const params = new URLSearchParams({
    TerminalNumber: CARDCOM_TERMINAL,
    UserName: CARDCOM_USERNAME,
    LowProfileCode: lowProfileCode,
  });

  const indicatorUrl = `${CARDCOM_INDICATOR_URL}?${params.toString()}`;
  const indicatorResponse = await fetch(indicatorUrl, { method: 'GET' });
  const indicatorText = await indicatorResponse.text();

  if (!indicatorResponse.ok) {
    throw new Error(`Indicator request failed (${indicatorResponse.status}): ${indicatorText}`);
  }

  const indicatorParams = new URLSearchParams(indicatorText);
  return Object.fromEntries(indicatorParams.entries());
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

    const requestUrl = new URL(req.url);
    const queryPayload = Object.fromEntries(requestUrl.searchParams.entries());
    const rawBody = req.method === 'GET' ? '' : await req.text();
    const signature = req.headers.get('X-CardCom-Signature') || req.headers.get('x-cardcom-signature');

    // Verify signature
    if (rawBody.length > 0) {
      const isValid = await verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: corsHeaders }
        );
      }
    }

    let bodyPayload: Record<string, unknown> = {};
    if (rawBody.length > 0) {
      try {
        bodyPayload = JSON.parse(rawBody);
      } catch {
        bodyPayload = Object.fromEntries(new URLSearchParams(rawBody).entries());
      }
    }

    const payload: CardComWebhookPayload = {
      ...queryPayload,
      ...bodyPayload,
    } as CardComWebhookPayload;

    console.log('Shop payment webhook received:', payload);

    const lowProfileCode = getStringValue(payload, [
      'LowProfileCode',
      'lowprofilecode',
      'LowProfileId',
      'LowProfileDealId',
    ]);

    if (!lowProfileCode) {
      console.error('Missing LowProfileCode in webhook payload');
      return new Response(
        JSON.stringify({ error: 'Missing LowProfileCode' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Step 2 verification according to CardCom low-profile flow.
    // Do not trust callback payload status directly.
    const indicatorPayload = await fetchLowProfileIndicator(lowProfileCode);
    console.log('CardCom indicator response:', indicatorPayload);

    const operationResponse = getNumberValue(indicatorPayload, ['OperationResponse', 'operationresponse']);
    if (operationResponse === null) {
      console.error('Missing OperationResponse in indicator response');
      return new Response(
        JSON.stringify({ error: 'Invalid indicator response: missing OperationResponse' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const dealResponse = getNumberValue(indicatorPayload, ['DealResponse', 'dealresponse']);

    // Extract order info from ReturnValue
    const returnValue = getStringValue(indicatorPayload, ['ReturnValue', 'returnvalue']) ||
      getStringValue(payload, ['ReturnValue', 'returnvalue']);
    const { orderId, orderNumber } = parseReturnValue(returnValue);

    if (!orderId) {
      console.error('No order_id in webhook payload');
      return new Response(
        JSON.stringify({ error: 'Missing order_id' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const transactionId = getStringValue(indicatorPayload, [
      'TranzactionId',
      'TransactionId',
      'InternalDealNumber',
      'DealNumber',
      'LowProfileDealId',
    ]) || getStringValue(payload, [
      'TranzactionId',
      'TransactionId',
      'InternalDealNumber',
      'LowProfileDealId',
    ]) || lowProfileCode;

    // CardCom success is decided by OperationResponse, and DealResponse when present.
    const isSuccess = operationResponse === 0 && (dealResponse === null || dealResponse === 0);

    // Log the event with both incoming callback payload and verified indicator payload
    await supabaseAdmin
      .from('cardcom_events')
      .insert({
        payload_json: {
          method: req.method,
          incoming: payload,
          indicator: indicatorPayload,
          operation_response: operationResponse,
          deal_response: dealResponse,
        }
      });

    console.log(`Processing payment for order ${orderId}, success: ${isSuccess}`);

    // Prevent status regressions/duplicates on repeated callbacks.
    const { data: currentOrder, error: currentOrderError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, order_number, total, payment_status')
      .eq('id', orderId)
      .single();

    if (currentOrderError || !currentOrder) {
      console.error('Order not found for webhook:', currentOrderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    if (isSuccess) {
      if (currentOrder.payment_status === 'paid') {
        return new Response(
          JSON.stringify({ received: true, already_processed: true }),
          { status: 200, headers: corsHeaders }
        );
      }

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

      // Create notification for user
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: currentOrder.user_id,
          title: 'התשלום התקבל בהצלחה! ✅',
          message: `ההזמנה ${currentOrder.order_number} בסך ₪${Number(currentOrder.total).toFixed(2)} שולמה בהצלחה. ההזמנה בהכנה.`,
          type: 'order_status',
          is_read: false,
        });

      console.log(`Payment successful for order ${orderNumber || currentOrder.order_number}, notification sent`);
    } else {
      // Don't downgrade a paid order because of a delayed/duplicate failed callback
      if (currentOrder.payment_status === 'paid') {
        return new Response(
          JSON.stringify({ received: true, ignored: 'already_paid' }),
          { status: 200, headers: corsHeaders }
        );
      }

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

      if (currentOrder.payment_status !== 'failed') {
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: currentOrder.user_id,
            title: 'התשלום נכשל ❌',
            message: `התשלום עבור הזמנה ${currentOrder.order_number} נכשל. אנא נסה שוב.`,
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
