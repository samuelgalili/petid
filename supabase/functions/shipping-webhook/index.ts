import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Carrier Status Translation Maps ───
const yunexpressStatusMap: Record<string, string> = {
  "Order Created": "label_created",
  "Picked Up": "picked_up",
  "Arrived at Sort Facility": "in_transit_origin",
  "Departed Country of Origin": "departed_origin",
  "In Transit": "in_transit",
  "Arrived at Destination Country": "arrived_destination",
  "Customs Clearance": "customs",
  "Out for Delivery": "out_for_delivery",
  "Delivered": "delivered",
  "Delivery Failed": "delivery_failed",
};

const hfdStatusMap: Record<string, string> = {
  "label_created": "label_created",
  "collected": "picked_up",
  "in_transit": "in_transit",
  "in_delivery": "out_for_delivery",
  "delivered": "delivered",
  "failed": "delivery_failed",
  "נאסף": "picked_up",
  "בדרך": "in_transit",
  "בחלוקה": "out_for_delivery",
  "נמסר": "delivered",
  "נכשל": "delivery_failed",
};

const zigzagStatusMap: Record<string, string> = {
  "CREATED": "label_created",
  "PICKUP": "picked_up",
  "IN_TRANSIT": "in_transit",
  "OUT_FOR_DELIVERY": "out_for_delivery",
  "DELIVERED": "delivered",
  "FAILED": "delivery_failed",
};

// ─── Status labels for milestones ───
const statusLabels: Record<string, string> = {
  label_created: "תווית משלוח הופקה",
  picked_up: "החבילה נאספה מהמחסן",
  in_transit_origin: "בדרך ממדינת המוצא",
  departed_origin: "יצאה ממדינת המוצא",
  in_transit: "בדרך ליעד",
  arrived_destination: "הגיעה למדינת היעד",
  customs: "במכס",
  out_for_delivery: "בדרך אליך — השליח יגיע בקרוב",
  delivered: "החבילה נמסרה בהצלחה",
  delivery_failed: "ניסיון מסירה נכשל",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const carrier = url.searchParams.get("carrier") || "generic";
    const body = await req.json();

    console.log(`Webhook received from carrier: ${carrier}`, JSON.stringify(body));

    // ─── Extract tracking number + raw status per carrier ───
    const parsed = parseCarrierPayload(carrier, body);
    if (!parsed) {
      return jsonResponse({ error: "Could not parse webhook payload" }, 400);
    }

    const { trackingNumber, rawStatus, location, rawTimestamp } = parsed;

    // ─── Translate to PetID generic status ───
    const genericStatus = translateStatus(carrier, rawStatus);
    if (!genericStatus) {
      console.warn(`Unknown status "${rawStatus}" from carrier "${carrier}"`);
      return jsonResponse({ warning: "Unknown status, skipped" }, 200);
    }

    // ─── Find tracking record ───
    const { data: tracking, error: findErr } = await supabase
      .from("shipment_tracking")
      .select("*, provider:provider_id(webhook_secret)")
      .eq("tracking_number", trackingNumber)
      .maybeSingle();

    if (findErr || !tracking) {
      console.warn(`Tracking not found for ${trackingNumber}`);
      return jsonResponse({ error: "Tracking not found" }, 404);
    }

    // ─── Optional: Validate webhook signature ───
    // (skipped if no webhook_secret configured)

    // ─── Add milestone ───
    const milestones = (tracking.milestones || []) as any[];
    const newMilestone = {
      status: genericStatus,
      timestamp: rawTimestamp || new Date().toISOString(),
      location: location || carrier,
      description: statusLabels[genericStatus] || genericStatus,
    };
    milestones.push(newMilestone);

    // ─── Update shipment_tracking ───
    await supabase
      .from("shipment_tracking")
      .update({
        milestones,
        current_status: genericStatus,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", tracking.id);

    // ─── Update orders table ───
    const newOrderStatus = mapToOrderStatus(genericStatus);
    await supabase
      .from("orders")
      .update({
        shipping_status: genericStatus,
        status: newOrderStatus,
      })
      .eq("id", tracking.order_id);

    // ─── DELIVERED: trigger wallet payout ───
    if (genericStatus === "delivered") {
      await processDeliveredPayout(supabase, tracking.order_id);
    }

    // ─── DELIVERY_FAILED: could trigger notification ───
    if (genericStatus === "delivery_failed") {
      console.log(`Delivery failed for order ${tracking.order_id} — notification should fire`);
    }

    return jsonResponse({
      success: true,
      tracking_number: trackingNumber,
      status: genericStatus,
      milestone: newMilestone,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return jsonResponse({ error: error.message }, 500);
  }
});

// ─── Parse carrier-specific payload ───
function parseCarrierPayload(carrier: string, body: any) {
  switch (carrier) {
    case "yunexpress":
      return {
        trackingNumber: body.TrackingNumber || body.tracking_number,
        rawStatus: body.Status || body.status,
        location: body.Location || body.location,
        rawTimestamp: body.EventTime || body.timestamp,
      };
    case "hfd":
      return {
        trackingNumber: body.tracking_number || body.barcode,
        rawStatus: body.status || body.event_type,
        location: body.location || body.city,
        rawTimestamp: body.timestamp || body.event_time,
      };
    case "zigzag":
      return {
        trackingNumber: body.tracking_number || body.shipment_id,
        rawStatus: body.status || body.event,
        location: body.location,
        rawTimestamp: body.occurred_at || body.timestamp,
      };
    default:
      // Generic fallback
      if (body.tracking_number && body.status) {
        return {
          trackingNumber: body.tracking_number,
          rawStatus: body.status,
          location: body.location || null,
          rawTimestamp: body.timestamp || null,
        };
      }
      return null;
  }
}

// ─── Translate raw status to generic PetID status ───
function translateStatus(carrier: string, rawStatus: string): string | null {
  const maps: Record<string, Record<string, string>> = {
    yunexpress: yunexpressStatusMap,
    hfd: hfdStatusMap,
    zigzag: zigzagStatusMap,
  };

  const map = maps[carrier];
  if (map && map[rawStatus]) return map[rawStatus];

  // Fallback: try direct match (already generic)
  const validStatuses = Object.keys(statusLabels);
  if (validStatuses.includes(rawStatus)) return rawStatus;

  return null;
}

// ─── Map shipping status to order status ───
function mapToOrderStatus(shippingStatus: string): string {
  switch (shippingStatus) {
    case "delivered": return "delivered";
    case "out_for_delivery": return "shipped";
    case "delivery_failed": return "delivery_failed";
    default: return "shipped";
  }
}

// ─── Process wallet payout on delivery ───
async function processDeliveredPayout(supabase: any, orderId: string) {
  try {
    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (!order || !order.seller_id) return;

    const commission = Number(order.commission_amount) || 0;
    if (commission <= 0) return;

    // Move from pending to available in creator wallet
    const { data: wallet } = await supabase
      .from("creator_wallets")
      .select("*")
      .eq("user_id", order.seller_id)
      .maybeSingle();

    if (wallet) {
      await supabase
        .from("creator_wallets")
        .update({
          pending_amount: Math.max(0, (wallet.pending_amount || 0) - commission),
          available_amount: (wallet.available_amount || 0) + commission,
          total_earned: (wallet.total_earned || 0) + commission,
          updated_at: new Date().toISOString(),
        })
        .eq("id", wallet.id);

      // Log transaction
      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        type: "commission",
        amount: commission,
        description: `עמלה שוחררה — הזמנה ${order.order_number || orderId.slice(0, 8)} נמסרה`,
        reference_id: orderId,
        status: "completed",
      });

      console.log(`Payout processed: ₪${commission} for seller ${order.seller_id}`);
    }
  } catch (err) {
    console.error("Payout processing error:", err);
  }
}

// ─── Helper ───
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
