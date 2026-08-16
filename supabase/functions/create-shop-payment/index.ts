import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { priceOrder } from "../_shared/pricing.ts";

/**
 * CardCom Payment Integration - Shop Orders
 *
 * This function creates payment requests using CardCom's Legacy LowProfile API.
 *
 * API Documentation:
 * - Endpoint: https://secure.cardcom.solutions/Interface/LowProfile.aspx
 * - Doc: https://support.cardcom.solutions/hc/he/articles/360021519340-Low-profile-interface-EN-Step-1-2
 * - Support: dev@secure.cardcom.co.il | 03-9436100 (press 2)
 *
 * Required Parameters (Legacy LowProfile.aspx):
 * - TerminalNumber: Merchant terminal ID
 * - UserName: API username
 * - ApiPassword: API password
 * - APILevel: API version ("10" for current)
 * - codepage: Character encoding ("65001" for UTF-8)
 * - Operation: "1" for charge
 * - SumToBill: Amount in ILS (string with 2 decimals)
 * - CoinId: Currency ("1" for ILS)
 * - SuccessRedirectUrl: Redirect after successful payment
 * - ErrorRedirectUrl: Redirect after failed payment (note: legacy uses "ErrorRedirectUrl", not "FailedRedirectUrl")
 *
 * Response Validation:
 * - Check "ResponseCode" field (0 = success)
 * - "LowProfileCode" contains the payment session ID
 * - "Url" contains the payment page URL to redirect the customer
 *
 * Future Migration:
 * - Consider migrating to CardCom API v11: https://secure.cardcom.solutions/api/v11/LowProfile/Create
 * - v11 uses JSON request/response format and "Amount" instead of "SumToBill"
 *
 * Last updated: 2026-01-31
 */

// CardCom API Configuration
const CARDCOM_TERMINAL = Deno.env.get('CARDCOM_TERMINAL_NUMBER');
const CARDCOM_USERNAME = Deno.env.get('CARDCOM_USERNAME') || Deno.env.get('CARDCOM_API_NAME');
const CARDCOM_API_PASSWORD = Deno.env.get('CARDCOM_API_PASSWORD');

// Legacy LowProfile endpoint - form-urlencoded request/response
const CARDCOM_API_URL = 'https://secure.cardcom.solutions/Interface/LowProfile.aspx';
const FUNCTION_VERSION = 'create-shop-payment@2026-02-14-debug-v1';
const AUTH_PARAM_NAME = 'UserName';

interface ShopPaymentRequest {
  // Only identity and quantity come from the client. Every price, discount
  // and total is resolved from the database by priceOrder().
  items: Array<{
    product_id: string;
    quantity: number;
    variant?: string;
    size?: string;
  }>;
  shipping_address: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    zipCode: string;
  };
  payment_method: string;
  installments: number;
  coupon_code?: string;
  success_url: string;
  cancel_url: string;
  client_request_id?: string;
}

serve(async (req: Request): Promise<Response> => {
  const corsResponse = handleCorsPreflightRequest(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'נדרשת התחברות' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'שגיאת אימות' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parse request body
    const requestData: ShopPaymentRequest = await req.json();
    const rawClientRequestId = requestData.client_request_id ? String(requestData.client_request_id).trim() : '';
    const clientRequestId = rawClientRequestId || crypto.randomUUID();
    const baseDebug = {
      function_version: FUNCTION_VERSION,
      client_request_id: clientRequestId,
      cardcom_endpoint: CARDCOM_API_URL,
      auth_param_name: AUTH_PARAM_NAME,
      has_terminal: Boolean(CARDCOM_TERMINAL),
      has_username: Boolean(CARDCOM_USERNAME),
      has_password: Boolean(CARDCOM_API_PASSWORD),
    };
    
    console.log('PAYMENT_TRACE_START', JSON.stringify({
      ...baseDebug,
      user_id: user.id,
      item_count: Array.isArray(requestData.items) ? requestData.items.length : 0,
      payment_method: requestData.payment_method,
    }));

    // Resolve every price from the database. Nothing the client sent about
    // money is used, so a tampered cart cannot change what is charged.
    const pricing = await priceOrder(supabaseAdmin, {
      items: requestData.items,
      couponCode: requestData.coupon_code ?? null,
      userId: user.id,
      paymentMethod: requestData.payment_method,
    });

    if (!pricing.ok) {
      console.warn('PRICING_REJECTED', JSON.stringify({
        client_request_id: clientRequestId,
        user_id: user.id,
        code: pricing.code,
        details: pricing.details,
      }));
      return new Response(
        JSON.stringify({
          error: pricing.message,
          code: pricing.code,
          debug: { ...baseDebug, stage: 'pricing_rejected' },
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log('PRICING_RESOLVED', JSON.stringify({
      client_request_id: clientRequestId,
      subtotal: pricing.subtotal,
      shipping: pricing.shipping,
      discount: pricing.discount,
      total: pricing.total,
    }));

    // Generate order number
    const orderNumber = `PID-${Date.now()}`;

    // Create order with pending payment status
    const { data: orderData, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        status: "pending",
        payment_status: "pending",
        subtotal: pricing.subtotal,
        shipping: pricing.shipping,
        tax: 0,
        total: pricing.total,
        payment_method: requestData.payment_method,
        shipping_address: requestData.shipping_address,
        coupon_id: pricing.coupon?.id ?? null,
        discount_amount: pricing.discount,
        payment_installments: requestData.installments,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      throw new Error('שגיאה ביצירת הזמנה');
    }

    // Insert order items using the server-resolved names and prices.
    const orderItems = pricing.items.map((item) => ({
      order_id: orderData.id,
      product_name: item.name,
      product_image: item.image,
      quantity: item.quantity,
      price: item.unit_price,
      variant: item.variant,
      size: item.size,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error('Order items error:', itemsError);
      // Rollback order
      await supabaseAdmin.from("orders").delete().eq("id", orderData.id);
      throw new Error('שגיאה בהוספת פריטים להזמנה');
    }

    // Record the coupon redemption. coupon_uses is what priceOrder() counts
    // against max_uses, so this row is what actually enforces the limit.
    if (pricing.coupon) {
      const { error: useError } = await supabaseAdmin.from("coupon_uses").insert({
        coupon_id: pricing.coupon.id,
        user_id: user.id,
        order_id: orderData.id,
      });
      if (useError) {
        console.error('Coupon use insert failed:', useError.message);
      }

      // Mirror the count onto coupons.used_count, which the admin screen
      // displays. Best effort: coupon_uses remains the source of truth.
      const { count: totalUses } = await supabaseAdmin
        .from("coupon_uses")
        .select("id", { count: "exact", head: true })
        .eq("coupon_id", pricing.coupon.id);

      if (typeof totalUses === "number") {
        await supabaseAdmin
          .from("coupons")
          .update({ used_count: totalUses })
          .eq("id", pricing.coupon.id);
      }
    }

    // For cash on delivery - no payment processing needed
    if (requestData.payment_method === "cash-on-delivery") {
      // Mark as awaiting payment on delivery
      await supabaseAdmin
        .from("orders")
        .update({ payment_status: "awaiting_cod" })
        .eq("id", orderData.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          order_id: orderData.id,
          order_number: orderNumber,
          payment_method: "cash-on-delivery",
          redirect_url: `${requestData.success_url}?order_id=${orderData.id}`,
          debug: { ...baseDebug, stage: 'cash_on_delivery' }
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check CardCom credentials.
    // Missing credentials is a configuration failure, never an approval:
    // treating it as one turns a bad deploy into free orders. Bypassing the
    // processor requires opting in explicitly via ALLOW_PAYMENTLESS_ORDERS.
    if (!CARDCOM_TERMINAL || !CARDCOM_USERNAME || !CARDCOM_API_PASSWORD) {
      const allowPaymentless = Deno.env.get('ALLOW_PAYMENTLESS_ORDERS') === 'true';

      if (!allowPaymentless) {
        console.error('CardCom credentials not configured - refusing to approve order');

        await supabaseAdmin
          .from("orders")
          .update({ payment_status: "failed" })
          .eq("id", orderData.id);

        return new Response(
          JSON.stringify({
            error: 'שירות התשלומים אינו זמין כרגע. אנא נסו שוב מאוחר יותר.',
            debug: { ...baseDebug, stage: 'cardcom_not_configured' }
          }),
          { status: 503, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.warn('ALLOW_PAYMENTLESS_ORDERS is on: approving order without CardCom');

      await supabaseAdmin
        .from("orders")
        .update({ payment_status: "dev_approved" })
        .eq("id", orderData.id);

      return new Response(
        JSON.stringify({
          success: true,
          order_id: orderData.id,
          order_number: orderNumber,
          dev_mode: true,
          redirect_url: `${requestData.success_url}?order_id=${orderData.id}`,
          debug: { ...baseDebug, stage: 'dev_mode_no_credentials' }
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Build webhook URL
    const webhookUrl = `${supabaseUrl}/functions/v1/shop-payment-webhook`;

    // Build item description for CardCom from the server-resolved names
    const itemsDescription = pricing.items
      .map(item => `${item.name} x${item.quantity}`)
      .join(', ');

    // Helper function for CardCom money formatting - always return string with 2 decimals
    const toMoneyStr = (n: any): string => {
      const v = Number(n);
      if (!Number.isFinite(v)) return "0.00";
      return v.toFixed(2);
    };

    // Build invoice lines in CardCom format (index starts from 1)
    // ALL values as STRINGS - this is what CardCom expects
    const flatInvoiceLines: Record<string, string> = {};
    let lineIndex = 1;
    
    // Products, priced by the server.
    for (const item of pricing.items) {
      const description = item.name + (item.variant ? ` - ${item.variant}` : '') + (item.size ? ` (${item.size})` : '');

      flatInvoiceLines[`InvoiceLines${lineIndex}.Description`] = String(description);
      flatInvoiceLines[`InvoiceLines${lineIndex}.Quantity`] = String(item.quantity);
      flatInvoiceLines[`InvoiceLines${lineIndex}.Price`] = toMoneyStr(item.unit_price);
      lineIndex++;
    }

    // Show shipping at full price, then the coupon discount as its own line.
    if (pricing.base_shipping > 0) {
      flatInvoiceLines[`InvoiceLines${lineIndex}.Description`] = 'משלוח';
      flatInvoiceLines[`InvoiceLines${lineIndex}.Quantity`] = '1';
      flatInvoiceLines[`InvoiceLines${lineIndex}.Price`] = toMoneyStr(pricing.base_shipping);
      lineIndex++;
    }

    if (pricing.shipping_discount > 0) {
      flatInvoiceLines[`InvoiceLines${lineIndex}.Description`] = 'משלוח חינם (קופון)';
      flatInvoiceLines[`InvoiceLines${lineIndex}.Quantity`] = '1';
      flatInvoiceLines[`InvoiceLines${lineIndex}.Price`] = toMoneyStr(-pricing.shipping_discount);
      lineIndex++;
    }

    if (pricing.discount > 0) {
      flatInvoiceLines[`InvoiceLines${lineIndex}.Description`] = 'קופון';
      flatInvoiceLines[`InvoiceLines${lineIndex}.Quantity`] = '1';
      flatInvoiceLines[`InvoiceLines${lineIndex}.Price`] = toMoneyStr(-pricing.discount);
      lineIndex++;
    }

    if (pricing.cod_surcharge > 0) {
      flatInvoiceLines[`InvoiceLines${lineIndex}.Description`] = 'תוספת תשלום במזומן';
      flatInvoiceLines[`InvoiceLines${lineIndex}.Quantity`] = '1';
      flatInvoiceLines[`InvoiceLines${lineIndex}.Price`] = toMoneyStr(pricing.cod_surcharge);
      lineIndex++;
    }
    
    console.log('CardCom InvoiceLines:', JSON.stringify(flatInvoiceLines));

    // Calculate SumToBill from invoice lines
    let sumFromLines = 0;
    for (let i = 1; i < lineIndex; i++) {
      const qty = Number(flatInvoiceLines[`InvoiceLines${i}.Quantity`] ?? 1);
      const price = Number(flatInvoiceLines[`InvoiceLines${i}.Price`] ?? 0);
      sumFromLines += qty * price;
    }
    
    const sumToBill = toMoneyStr(sumFromLines);
    
    console.log('CARDcom_request_amounts', JSON.stringify({
      order_total: pricing.total,
      sumFromLines: sumFromLines,
      sumToBill: sumToBill,
      invoiceLineCount: lineIndex - 1
    }));

    // GUARDRAIL: Block payment if calculated sum is zero or negative
    if (sumFromLines <= 0) {
      console.error('BLOCK_CARDcom_ZERO_AMOUNT', { sumToBill, sumFromLines, flatInvoiceLines });
      return new Response(
        JSON.stringify({
          error: 'INVALID_AMOUNT',
          message: 'הסכום לתשלום הוא 0. בדוק מוצרים/משלוח/קופון.',
          debug: {
            ...baseDebug,
            stage: 'invalid_amount',
            sum_to_bill: sumToBill,
            sum_from_lines: sumFromLines,
          }
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // The invoice lines and the stored order total are derived from the same
    // priced items, so any drift means a bug in this function rather than a
    // tampered request. Refuse to bill an amount the order does not record.
    if (Math.abs(sumFromLines - pricing.total) > 0.01) {
      console.error('BLOCK_CARDcom_TOTAL_MISMATCH', {
        sum_from_lines: sumFromLines,
        order_total: pricing.total,
      });
      await supabaseAdmin
        .from("orders")
        .update({ payment_status: "failed" })
        .eq("id", orderData.id);

      return new Response(
        JSON.stringify({
          error: 'אירעה שגיאה בחישוב הסכום. ההזמנה לא חויבה.',
          debug: {
            ...baseDebug,
            stage: 'total_mismatch',
            sum_from_lines: sumFromLines,
            order_total: pricing.total,
          }
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create CardCom payment request using URLSearchParams (form-urlencoded)
    // CardCom Legacy LowProfile.aspx requires this format
    const formData = new URLSearchParams();

    // Authentication parameters
    formData.append('TerminalNumber', CARDCOM_TERMINAL);
    formData.append('UserName', CARDCOM_USERNAME);
    formData.append('ApiPassword', CARDCOM_API_PASSWORD);

    // Required legacy API parameters (missing these caused failures)
    formData.append('APILevel', '10');      // API version - required for legacy endpoint
    formData.append('codepage', '65001');   // UTF-8 encoding - required for Hebrew text

    // Transaction parameters
    formData.append('Operation', '1');      // 1 = Charge (bill the card)
    formData.append('SumToBill', sumToBill);
    formData.append('CoinId', '1');         // 1 = ILS (Israeli Shekel)
    formData.append('Language', 'he');      // Hebrew interface

    // Redirect URLs - note: legacy API uses "ErrorRedirectUrl" not "FailedRedirectUrl"
    formData.append('SuccessRedirectUrl', `${requestData.success_url}?order_id=${orderData.id}`);
    formData.append('ErrorRedirectUrl', `${requestData.cancel_url}?order_id=${orderData.id}`);

    // Invoice header details.
    // Some terminals enforce invoice creation and reject requests without InvoiceHead fields (e.g., ResponseCode 5046).
    const customerName = (requestData.shipping_address.fullName || '').trim() || 'Customer';
    const customerEmail = (requestData.shipping_address.email || '').trim();
    const customerAddress = (requestData.shipping_address.address || '').trim() || customerName;
    const customerCity = (requestData.shipping_address.city || '').trim() || 'Unknown';
    const customerPhone = (requestData.shipping_address.phone || '').trim();
    const shouldSendInvoiceByEmail = customerEmail.length > 0;

    formData.append('InvoiceHeadOperation', '1'); // Create invoice from provided InvoiceHead/InvoiceLines data
    formData.append('InvoiceHead.CustName', customerName);
    formData.append('InvoiceHead.CustAddresLine1', customerAddress);
    formData.append('InvoiceHead.CustCity', customerCity);
    formData.append('InvoiceHead.CoinID', '1');
    formData.append('InvoiceHead.Language', 'he');
    formData.append('InvoiceHead.SendByEmail', shouldSendInvoiceByEmail ? 'true' : 'false');
    if (shouldSendInvoiceByEmail) {
      formData.append('InvoiceHead.Email', customerEmail);
    }
    if (customerPhone.length > 0) {
      formData.append('InvoiceHead.CustMobilePH', customerPhone);
    }

    // Webhook for payment result notification
    formData.append('WebHookUrl', webhookUrl);
    formData.append('IndicatorUrl', webhookUrl); // Legacy API alternative webhook parameter

    // Custom data to identify the order in webhook callback
    formData.append('ReturnValue', JSON.stringify({
      order_id: orderData.id,
      order_number: orderNumber
    }));

    // Payment options
    formData.append('MaxNumOfPayments', String(requestData.installments || 1));
    formData.append('ProductName', itemsDescription.substring(0, 50));
    formData.append('HideSumField', 'true');
    formData.append('SumInStar498', 'false');

    // Append invoice lines with product details
    // IMPORTANT: These must be included for CardCom to process the payment correctly
    for (const [key, value] of Object.entries(flatInvoiceLines)) {
      formData.append(key, value);
    }
    console.log('CardCom: Invoice lines appended, count:', lineIndex - 1);
    
    console.log('CardCom request SumToBill:', sumToBill);

    const requestParamKeys = [...new Set(Array.from(formData.keys()))];
    console.log('CARDcom_payload_debug', JSON.stringify({
      ...baseDebug,
      stage: 'cardcom_request',
      request_param_keys: requestParamKeys,
      has_user_name_param: requestParamKeys.includes('UserName'),
      has_api_name_param: requestParamKeys.includes('ApiName'),
      sum_to_bill: sumToBill,
    }));

    console.log('Calling CardCom API with form-urlencoded...');

    // Call CardCom API with form-urlencoded
    const cardcomResponse = await fetch(CARDCOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    // Legacy endpoint returns form-encoded, not JSON
    const responseText = await cardcomResponse.text();
    console.log('CardCom raw response:', responseText);

    // Parse form-encoded response
    const cardcomParams = new URLSearchParams(responseText);

    // CardCom response field mapping:
    // - ResponseCode: General response code (0 = success)
    // - OperationResponse: Operation-specific response (0 = success) - some docs refer to this
    // - LowProfileCode: The payment session identifier
    // - Url/url: The payment page URL to redirect the customer to
    const responseCode = parseInt(cardcomParams.get('ResponseCode') || cardcomParams.get('OperationResponse') || '-1');
    const cardcomData = {
      ResponseCode: responseCode,
      OperationResponse: parseInt(cardcomParams.get('OperationResponse') || '-1'),
      Description: cardcomParams.get('Description') || cardcomParams.get('ErrorDescription') || '',
      LowProfileId: cardcomParams.get('LowProfileCode') || cardcomParams.get('LowProfileId') || '',
      Url: cardcomParams.get('Url') || cardcomParams.get('url') || cardcomParams.get('LowProfileUrl') || '',
    };
    console.log('CardCom parsed response:', cardcomData);

    // Check for success: ResponseCode should be 0
    // Also accept if we got a valid URL even without explicit success code
    const isSuccess = responseCode === 0 || (cardcomData.Url && cardcomData.Url.length > 0 && responseCode === -1);

    if (!isSuccess) {
      console.error('CardCom error:', cardcomData);
      
      // Mark order as payment failed
      await supabaseAdmin
        .from("orders")
        .update({ payment_status: "failed" })
        .eq("id", orderData.id);

      return new Response(
        JSON.stringify({ 
          error: 'שגיאה ביצירת עמוד תשלום',
          details: cardcomData.Description || 'Unknown error',
          cardcom_response_code: cardcomData.ResponseCode,
          cardcom_operation_response: cardcomData.OperationResponse,
          cardcom_raw_response: responseText.substring(0, 500),
          debug: {
            ...baseDebug,
            stage: 'cardcom_error',
            request_param_keys: requestParamKeys,
            has_user_name_param: requestParamKeys.includes('UserName'),
            has_api_name_param: requestParamKeys.includes('ApiName'),
            sum_to_bill: sumToBill,
          }
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Store CardCom LowProfileId in order
    if (cardcomData.LowProfileId) {
      await supabaseAdmin
        .from("orders")
        .update({ payment_transaction_id: cardcomData.LowProfileId })
        .eq("id", orderData.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        order_id: orderData.id,
        order_number: orderNumber,
        payment_url: cardcomData.Url,
        debug: {
          ...baseDebug,
          stage: 'cardcom_success',
          request_param_keys: requestParamKeys,
          has_user_name_param: requestParamKeys.includes('UserName'),
          has_api_name_param: requestParamKeys.includes('ApiName'),
          sum_to_bill: sumToBill,
        }
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in create-shop-payment:", error);
    return new Response(
      JSON.stringify({
        error: errorMessage,
        debug: {
          function_version: FUNCTION_VERSION,
          stage: 'exception',
          auth_param_name: AUTH_PARAM_NAME,
        }
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
