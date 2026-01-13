import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

// CardCom API Configuration
const CARDCOM_TERMINAL = Deno.env.get('CARDCOM_TERMINAL_NUMBER');
const CARDCOM_API_NAME = Deno.env.get('CARDCOM_API_NAME');
const CARDCOM_API_PASSWORD = Deno.env.get('CARDCOM_API_PASSWORD');
const CARDCOM_API_URL = 'https://secure.cardcom.solutions/api/v11/LowProfile/Create';

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
  tax: number;
  total: number;
  coupon_id?: string;
  discount_amount?: number;
  success_url: string;
  cancel_url: string;
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
    
    console.log('Creating shop payment for user:', user.id, 'Total:', requestData.total);

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
          redirect_url: `${requestData.success_url}?order_id=${orderData.id}`
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check CardCom credentials
    if (!CARDCOM_TERMINAL || !CARDCOM_API_NAME || !CARDCOM_API_PASSWORD) {
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
          redirect_url: `${requestData.success_url}?order_id=${orderData.id}`
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

    // Build invoice lines in CardCom format
    const flatInvoiceLines: Record<string, any> = {};
    
    requestData.items.forEach((item, index) => {
      flatInvoiceLines[`Items[${index}].Description`] = item.name + (item.variant ? ` - ${item.variant}` : '') + (item.size ? ` (${item.size})` : '');
      flatInvoiceLines[`Items[${index}].UnitCost`] = item.price;
      flatInvoiceLines[`Items[${index}].Quantity`] = item.quantity;
    });

    // Add shipping if applicable
    if (requestData.shipping > 0) {
      const shippingIndex = requestData.items.length;
      flatInvoiceLines[`Items[${shippingIndex}].Description`] = 'משלוח';
      flatInvoiceLines[`Items[${shippingIndex}].UnitCost`] = requestData.shipping;
      flatInvoiceLines[`Items[${shippingIndex}].Quantity`] = 1;
    }
    
    // Add tax if applicable
    if (requestData.tax > 0) {
      const taxIndex = requestData.items.length + (requestData.shipping > 0 ? 1 : 0);
      flatInvoiceLines[`Items[${taxIndex}].Description`] = 'מע״מ (17%)';
      flatInvoiceLines[`Items[${taxIndex}].UnitCost`] = Math.round(requestData.tax * 100) / 100;
      flatInvoiceLines[`Items[${taxIndex}].Quantity`] = 1;
    }

    // Ensure total is a valid number with 2 decimal places
    const sumToBill = Math.round(requestData.total * 100) / 100;
    
    if (sumToBill <= 0) {
      console.error('Invalid total amount:', sumToBill);
      return new Response(
        JSON.stringify({ error: 'סכום ההזמנה חייב להיות גדול מ-0' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create CardCom payment request
    const cardcomRequest = {
      TerminalNumber: parseInt(CARDCOM_TERMINAL),
      ApiName: CARDCOM_API_NAME,
      ApiPassword: CARDCOM_API_PASSWORD,
      SumToBill: sumToBill, // Send as number, not string
      CoinID: 1, // ILS
      Language: 'he',
      SuccessRedirectUrl: `${requestData.success_url}?order_id=${orderData.id}`,
      FailedRedirectUrl: `${requestData.cancel_url}?order_id=${orderData.id}`,
      WebHookUrl: webhookUrl,
      ReturnValue: JSON.stringify({ 
        order_id: orderData.id,
        order_number: orderNumber 
      }),
      MaxNumOfPayments: requestData.installments || 1,
      ProductName: itemsDescription.substring(0, 50),
      ShowInvoiceHead: true,
      InvoiceHeadOperation: 1, // Create invoice head automatically
      'InvoiceHead.CustName': requestData.shipping_address.fullName,
      'InvoiceHead.SendByEmail': true,
      'InvoiceHead.Email': requestData.shipping_address.email,
      'InvoiceHead.CustMobilePH': requestData.shipping_address.phone,
      'InvoiceHead.CustAddresLine1': requestData.shipping_address.address,
      'InvoiceHead.CustCity': requestData.shipping_address.city,
      'InvoiceHead.CustZipCode': requestData.shipping_address.zipCode,
      ...flatInvoiceLines,
    };
    
    console.log('CardCom request SumToBill:', sumToBill);

    console.log('Calling CardCom API...');

    // Call CardCom API
    const cardcomResponse = await fetch(CARDCOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cardcomRequest),
    });

    const cardcomData = await cardcomResponse.json();
    console.log('CardCom response:', cardcomData);

    if (cardcomData.ResponseCode !== 0 && cardcomData.ResponseCode !== undefined) {
      console.error('CardCom error:', cardcomData);
      
      // Mark order as payment failed
      await supabaseAdmin
        .from("orders")
        .update({ payment_status: "failed" })
        .eq("id", orderData.id);

      return new Response(
        JSON.stringify({ 
          error: 'שגיאה ביצירת עמוד תשלום',
          details: cardcomData.Description || 'Unknown error'
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
        payment_url: cardcomData.Url || cardcomData.url,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in create-shop-payment:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
