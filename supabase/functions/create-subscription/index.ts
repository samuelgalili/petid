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

// TODO: Update with actual CardCom recurring API endpoint
const CARDCOM_RECURRING_URL = 'https://secure.cardcom.solutions/api/v11/LowProfile/Create';

interface CardComSubscriptionRequest {
  TerminalNumber: string;
  ApiName: string;
  ApiPassword: string;
  Amount: number;
  Currency: string;
  RecurringPayments: {
    TotalAmount: number;
    NumberOfPayments: number;
    FlexiblePayments: boolean;
  };
  SuccessRedirectUrl: string;
  FailedRedirectUrl: string;
  WebHookUrl: string;
  // TODO: Add additional CardCom recurring fields
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
      .eq('type', 'subscription')
      .maybeSingle();

    if (productError || !product) {
      console.error('Product error:', productError);
      return new Response(
        JSON.stringify({ error: 'מוצר לא נמצא' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate period end based on billing period
    const periodEnd = new Date();
    if (product.billing_period === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else if (product.billing_period === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // Create pending subscription record
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from('cardcom_subscriptions')
      .insert({
        user_id: user.id,
        product_id: product.id,
        status: 'pending',
        current_period_end: periodEnd.toISOString()
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error('Subscription creation error:', subscriptionError);
      return new Response(
        JSON.stringify({ error: 'שגיאה ביצירת מנוי' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build webhook URL
    const webhookUrl = `${supabaseUrl}/functions/v1/cardcom-webhook`;

    // Calculate number of payments for recurring
    const numberOfPayments = product.billing_period === 'yearly' ? 12 : 0; // 0 = unlimited for monthly

    // TODO: Replace with actual CardCom API call
    console.log('Creating CardCom subscription:', {
      terminal: CARDCOM_TERMINAL,
      amount: product.price_ils,
      billingPeriod: product.billing_period,
      subscriptionId: subscription.id
    });

    // CardCom Recurring Request (placeholder)
    const cardcomRequest: CardComSubscriptionRequest = {
      TerminalNumber: CARDCOM_TERMINAL || '',
      ApiName: CARDCOM_API_NAME || '',
      ApiPassword: CARDCOM_API_PASSWORD || '',
      Amount: product.price_ils,
      Currency: '1', // ILS
      RecurringPayments: {
        TotalAmount: product.billing_period === 'yearly' ? product.price_ils : 0,
        NumberOfPayments: numberOfPayments,
        FlexiblePayments: false
      },
      SuccessRedirectUrl: success_url || `${req.headers.get('origin')}/subscription-success?subscription_id=${subscription.id}`,
      FailedRedirectUrl: cancel_url || `${req.headers.get('origin')}/subscription-failed?subscription_id=${subscription.id}`,
      WebHookUrl: webhookUrl
    };

    // TODO: Uncomment and use actual CardCom API when ready
    /*
    const cardcomResponse = await fetch(CARDCOM_RECURRING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cardcomRequest)
    });

    const cardcomData = await cardcomResponse.json();
    
    if (cardcomData.ResponseCode !== 0) {
      console.error('CardCom error:', cardcomData);
      return new Response(
        JSON.stringify({ error: 'שגיאה מהשרת של CardCom', details: cardcomData.Description }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentUrl = cardcomData.Url;
    */

    // Placeholder payment URL for development
    const paymentUrl = `https://secure.cardcom.solutions/external/LowProfile.aspx?mock=true&subscription_id=${subscription.id}`;

    console.log('Subscription created successfully:', {
      subscriptionId: subscription.id,
      url: paymentUrl
    });

    return new Response(
      JSON.stringify({ 
        payment_url: paymentUrl,
        subscription_id: subscription.id
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
