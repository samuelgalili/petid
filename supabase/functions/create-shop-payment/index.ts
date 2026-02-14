import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

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
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    image?: string;
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
  subtotal: number;
  shipping: number;
  original_shipping?: number; // Shipping before discount
  shipping_discount?: number; // Shipping discount amount (for free shipping coupons)
  tax: number;
  total: number;
  coupon_id?: string;
  discount_amount?: number;
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
      total: requestData.total,
      payment_method: requestData.payment_method,
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
        subtotal: requestData.subtotal,
        shipping: requestData.shipping,
        tax: requestData.tax,
        total: requestData.total,
        payment_method: requestData.payment_method,
        shipping_address: requestData.shipping_address,
        coupon_id: requestData.coupon_id || null,
        discount_amount: requestData.discount_amount || 0,
        payment_installments: requestData.installments,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Order creation error:', orderError);
      throw new Error('שגיאה ביצירת הזמנה');
    }

    // Insert order items
    const orderItems = requestData.items.map((item) => ({
      order_id: orderData.id,
      product_name: item.name,
      product_image: item.image || '',
      quantity: item.quantity,
      price: item.price,
      variant: item.variant || null,
      size: item.size || null,
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

    // Check CardCom credentials
    if (!CARDCOM_TERMINAL || !CARDCOM_USERNAME || !CARDCOM_API_PASSWORD) {
      console.error('CardCom credentials not configured');
      // For development - allow order without real payment
      console.warn('DEV MODE: Processing without CardCom');
      
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

    // Build item description for CardCom
    const itemsDescription = requestData.items
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
    
    // Products
    for (const item of requestData.items) {
      const qty = Number(item.quantity ?? 1);
      const unit = Number(item.price ?? 0);
      const safeUnit = Number.isFinite(unit) ? unit : 0;
      
      const description = item.name + (item.variant ? ` - ${item.variant}` : '') + (item.size ? ` (${item.size})` : '');
      
      flatInvoiceLines[`InvoiceLines${lineIndex}.Description`] = String(description);
      flatInvoiceLines[`InvoiceLines${lineIndex}.Quantity`] = String(qty);
      flatInvoiceLines[`InvoiceLines${lineIndex}.Price`] = toMoneyStr(safeUnit);
      lineIndex++;
    }

    // Add shipping if applicable
    const shippingToShow = requestData.original_shipping ?? requestData.shipping;
    if (shippingToShow > 0) {
      flatInvoiceLines[`InvoiceLines${lineIndex}.Description`] = 'משלוח';
      flatInvoiceLines[`InvoiceLines${lineIndex}.Quantity`] = '1';
      flatInvoiceLines[`InvoiceLines${lineIndex}.Price`] = toMoneyStr(shippingToShow);
      lineIndex++;
    }
    
    // Add shipping discount as negative line if applicable (for free shipping coupons)
    if (requestData.shipping_discount && requestData.shipping_discount > 0) {
      flatInvoiceLines[`InvoiceLines${lineIndex}.Description`] = 'משלוח חינם (קופון)';
      flatInvoiceLines[`InvoiceLines${lineIndex}.Quantity`] = '1';
      flatInvoiceLines[`InvoiceLines${lineIndex}.Price`] = toMoneyStr(-requestData.shipping_discount);
      lineIndex++;
    }
    
    // Add discount as negative line if applicable
    if (requestData.discount_amount && requestData.discount_amount > 0) {
      flatInvoiceLines[`InvoiceLines${lineIndex}.Description`] = 'קופון';
      flatInvoiceLines[`InvoiceLines${lineIndex}.Quantity`] = '1';
      flatInvoiceLines[`InvoiceLines${lineIndex}.Price`] = toMoneyStr(-requestData.discount_amount);
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
      requestData_total: requestData.total,
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
