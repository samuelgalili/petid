import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// CardCom API Configuration
const CARDCOM_TERMINAL = Deno.env.get('CARDCOM_TERMINAL_NUMBER');
const CARDCOM_API_NAME = Deno.env.get('CARDCOM_API_NAME');
const CARDCOM_API_PASSWORD = Deno.env.get('CARDCOM_API_PASSWORD');

// TODO: Update with actual CardCom API endpoint
const CARDCOM_API_URL = 'https://secure.cardcom.solutions/api/v11/LowProfile/Create';

interface CardComPaymentRequest {
  TerminalNumber: string;
  ApiName: string;
  ApiPassword: string;
  Amount: number;
  Currency: string; // '1' for ILS
  SuccessRedirectUrl: string;
  FailedRedirectUrl: string;
  WebHookUrl: string;
  Document: {
    Type: string; // '1' for Invoice
  };
  // TODO: Add additional CardCom fields as needed
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'נדרשת התחברות' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's token
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
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { product_id, success_url, cancel_url } = await req.json();

    if (!product_id) {
      return new Response(
        JSON.stringify({ error: 'נדרש מזהה מוצר' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Look up product
    const { data: product, error: productError } = await supabase
      .from('cardcom_products')
      .select('*')
      .eq('id', product_id)
      .eq('active', true)
      .eq('type', 'one_time')
      .maybeSingle();

    if (productError || !product) {
      console.error('Product error:', productError);
      return new Response(
        JSON.stringify({ error: 'מוצר לא נמצא' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create pending payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('cardcom_payments')
      .insert({
        user_id: user.id,
        product_id: product.id,
        amount_ils: product.price_ils,
        status: 'pending'
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Payment creation error:', paymentError);
      return new Response(
        JSON.stringify({ error: 'שגיאה ביצירת תשלום' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build webhook URL
    const webhookUrl = `${supabaseUrl}/functions/v1/cardcom-webhook`;

    console.log('Creating CardCom payment intent:', {
      terminal: CARDCOM_TERMINAL,
      amount: product.price_ils,
      paymentId: payment.id
    });

    // CardCom API Request
    const cardcomRequest: CardComPaymentRequest = {
      TerminalNumber: CARDCOM_TERMINAL || '',
      ApiName: CARDCOM_API_NAME || '',
      ApiPassword: CARDCOM_API_PASSWORD || '',
      Amount: product.price_ils,
      Currency: '1', // ILS
      SuccessRedirectUrl: success_url || `${req.headers.get('origin')}/payment-success?payment_id=${payment.id}`,
      FailedRedirectUrl: cancel_url || `${req.headers.get('origin')}/payment-failed?payment_id=${payment.id}`,
      WebHookUrl: webhookUrl,
      Document: {
        Type: '1'
      }
    };

    // Make actual CardCom API call
    const cardcomResponse = await fetch(CARDCOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cardcomRequest)
    });

    const cardcomData = await cardcomResponse.json();
    
    console.log('CardCom API response:', cardcomData);

    if (cardcomData.ResponseCode !== 0) {
      console.error('CardCom error:', cardcomData);
      
      // Update payment status to failed
      await supabaseAdmin
        .from('cardcom_payments')
        .update({ status: 'failed' })
        .eq('id', payment.id);
      
      return new Response(
        JSON.stringify({ error: 'שגיאה מהשרת של CardCom', details: cardcomData.Description }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentUrl = cardcomData.Url;

    console.log('Payment intent created successfully:', {
      paymentId: payment.id,
      url: paymentUrl
    });

    return new Response(
      JSON.stringify({ 
        payment_url: paymentUrl,
        payment_id: payment.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'שגיאה לא צפויה', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
