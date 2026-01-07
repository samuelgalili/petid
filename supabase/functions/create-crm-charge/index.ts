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
const CARDCOM_API_URL = 'https://secure.cardcom.solutions/api/v11/LowProfile/Create';

// WhatsApp Configuration
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

// Format phone number for WhatsApp
function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '972' + cleaned.substring(1);
  }
  if (!cleaned.startsWith('972') && cleaned.length === 9) {
    cleaned = '972' + cleaned;
  }
  return cleaned;
}

interface CRMChargeRequest {
  customer_id: string;
  customer_phone?: string;
  customer_name?: string;
  amount: number;
  description: string;
  charge_type: string;
  payment_method: string;
  notes?: string;
  due_date?: string;
  products?: Array<{ id: string; name: string; quantity: number; price: number }>;
  send_whatsapp?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'נדרשת התחברות' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is admin
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'שגיאת אימות' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: CRMChargeRequest = await req.json();
    const { 
      customer_id, 
      customer_phone, 
      customer_name,
      amount, 
      description, 
      charge_type, 
      payment_method,
      notes,
      due_date,
      products,
      send_whatsapp 
    } = requestData;

    if (!customer_id || !amount || !description) {
      return new Response(
        JSON.stringify({ error: 'חסרים פרטים נדרשים' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating CRM charge:', { customer_id, amount, description, send_whatsapp });

    // Create the charge record
    const { data: charge, error: chargeError } = await supabaseAdmin
      .from('customer_charges')
      .insert({
        customer_id,
        amount,
        description,
        charge_type,
        payment_method,
        notes: notes || null,
        due_date: due_date || null,
        status: 'pending'
      })
      .select()
      .single();

    if (chargeError) {
      console.error('Charge creation error:', chargeError);
      return new Response(
        JSON.stringify({ error: 'שגיאה ביצירת חיוב' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build webhook URL
    const webhookUrl = `${supabaseUrl}/functions/v1/cardcom-webhook`;
    const origin = req.headers.get('origin') || 'https://petid.co.il';

    // Create CardCom payment link
    const cardcomRequest = {
      TerminalNumber: CARDCOM_TERMINAL || '',
      ApiName: CARDCOM_API_NAME || '',
      ApiPassword: CARDCOM_API_PASSWORD || '',
      Amount: amount,
      Currency: '1', // ILS
      SuccessRedirectUrl: `${origin}/payment-success?charge_id=${charge.id}`,
      FailedRedirectUrl: `${origin}/payment-failed?charge_id=${charge.id}`,
      WebHookUrl: webhookUrl,
      ReturnValue: JSON.stringify({ charge_id: charge.id, customer_id }),
      Document: {
        Type: '1' // Invoice
      },
      ProductName: description
    };

    console.log('Calling CardCom API...');
    
    const cardcomResponse = await fetch(CARDCOM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cardcomRequest)
    });

    const cardcomData = await cardcomResponse.json();
    console.log('CardCom response:', cardcomData);

    if (cardcomData.ResponseCode !== 0) {
      console.error('CardCom error:', cardcomData);
      // Update charge status to failed
      await supabaseAdmin
        .from('customer_charges')
        .update({ status: 'failed' })
        .eq('id', charge.id);
      
      return new Response(
        JSON.stringify({ error: 'שגיאה ביצירת לינק תשלום', details: cardcomData.Description }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentUrl = cardcomData.Url;
    console.log('Payment URL created:', paymentUrl);

    // If WhatsApp requested, send the link
    let whatsappSent = false;
    if (send_whatsapp && customer_phone) {
      if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
        console.error('WhatsApp credentials not configured');
      } else {
        const formattedPhone = formatPhoneNumber(customer_phone);
        const messageText = `שלום ${customer_name || ''},\n\n` +
          `נוצר חיוב חדש עבורך:\n` +
          `📋 ${description}\n` +
          `💰 סכום: ₪${amount.toLocaleString()}\n\n` +
          `לתשלום לחץ על הקישור:\n${paymentUrl}\n\n` +
          `תודה, PetID 🐾`;

        try {
          const whatsappResponse = await fetch(
            `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: formattedPhone,
                type: "text",
                text: {
                  preview_url: true,
                  body: messageText,
                },
              }),
            }
          );

          const whatsappResult = await whatsappResponse.json();
          console.log("WhatsApp API response:", whatsappResult);

          if (whatsappResponse.ok) {
            whatsappSent = true;
            console.log('WhatsApp message sent successfully');
          } else {
            console.error('WhatsApp send failed:', whatsappResult);
          }
        } catch (waError) {
          console.error('WhatsApp error:', waError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        charge_id: charge.id,
        payment_url: paymentUrl,
        whatsapp_sent: whatsappSent
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
