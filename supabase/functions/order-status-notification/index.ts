import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrderStatusRequest {
  order_id: string;
  new_status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  tracking_number?: string;
  message?: string;
}

const statusMessages: Record<string, { title: string; message: string }> = {
  pending: {
    title: "הזמנה התקבלה",
    message: "ההזמנה שלך התקבלה ומחכה לאישור"
  },
  processing: {
    title: "ההזמנה בהכנה",
    message: "ההזמנה שלך נמצאת בהכנה ותישלח בקרוב"
  },
  shipped: {
    title: "ההזמנה נשלחה! 📦",
    message: "ההזמנה שלך יצאה לדרך ותגיע בקרוב"
  },
  delivered: {
    title: "ההזמנה נמסרה! ✅",
    message: "ההזמנה שלך נמסרה בהצלחה. תודה שקנית אצלנו!"
  },
  cancelled: {
    title: "ההזמנה בוטלה",
    message: "ההזמנה שלך בוטלה. אם יש שאלות, צור קשר עם התמיכה"
  }
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { order_id, new_status, tracking_number, message }: OrderStatusRequest = await req.json();

    console.log(`Updating order ${order_id} to status: ${new_status}`);

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      console.error("Order not found:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update order status
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: new_status, updated_at: new Date().toISOString() })
      .eq("id", order_id);

    if (updateError) {
      console.error("Failed to update order:", updateError);
      throw updateError;
    }

    // Create notification for user
    const statusInfo = statusMessages[new_status];
    let notificationMessage = message || statusInfo.message;
    
    if (new_status === "shipped" && tracking_number) {
      notificationMessage += ` מספר מעקב: ${tracking_number}`;
    }

    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: order.user_id,
        title: statusInfo.title,
        message: notificationMessage,
        type: "order_status",
        is_read: false
      });

    if (notificationError) {
      console.error("Failed to create notification:", notificationError);
    }

    console.log(`Order ${order_id} updated to ${new_status}, notification sent to user ${order.user_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        order_id,
        new_status,
        notification_sent: !notificationError 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in order-status-notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});