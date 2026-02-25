import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action, order_id, tracking_number } = await req.json();

    switch (action) {
      case "create_shipment":
        return await createShipment(supabase, order_id);
      case "generate_labels":
        return await generateLabels(supabase, order_id);
      case "sync_tracking":
        return await syncTracking(supabase, order_id);
      case "get_tracking":
        return await getTracking(supabase, order_id);
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Shipping function error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ─── Create Shipment ───
async function createShipment(supabase: any, orderId: string) {
  // Fetch order
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    throw new Error("Order not found");
  }

  const destination = order.destination_country || "IL";

  // Select carrier based on destination
  const providerType = destination === "IL" ? "local" : "international";
  const { data: providers } = await supabase
    .from("shipping_providers")
    .select("*")
    .eq("is_active", true)
    .or(`provider_type.eq.${providerType},provider_type.eq.both`)
    .limit(1);

  const provider = providers?.[0];

  // Generate mock tracking number
  const trackingNumber = generateTrackingNumber(provider?.slug || "petid");

  // Create tracking record
  const { data: tracking, error: trackErr } = await supabase
    .from("shipment_tracking")
    .insert({
      order_id: orderId,
      provider_id: provider?.id || null,
      tracking_number: trackingNumber,
      carrier_name: provider?.name || "PetID Direct",
      origin_country: "CN",
      destination_country: destination,
      current_status: "label_created",
      estimated_delivery: new Date(Date.now() + (destination === "IL" ? 14 : 21) * 86400000).toISOString().split("T")[0],
      milestones: [
        {
          status: "label_created",
          timestamp: new Date().toISOString(),
          location: "System",
          description: "Shipping label created",
        },
      ],
    })
    .select()
    .single();

  if (trackErr) throw trackErr;

  // Update order with tracking info
  await supabase
    .from("orders")
    .update({
      shipping_status: "label_created",
      tracking_number: trackingNumber,
      shipping_provider_id: provider?.id || null,
    })
    .eq("id", orderId);

  // If provider has API, try to create shipment via their API
  if (provider?.api_base_url && provider.is_active) {
    try {
      await callCarrierAPI(provider, "create", {
        tracking_number: trackingNumber,
        destination_country: destination,
        order,
      });
    } catch (apiErr) {
      console.warn(`Carrier API call failed for ${provider.slug}:`, apiErr);
      // Continue anyway — label was created locally
    }
  }

  return jsonResponse({ success: true, tracking });
}

// ─── Generate Labels ───
async function generateLabels(supabase: any, orderId: string) {
  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
  const { data: tracking } = await supabase.from("shipment_tracking").select("*, provider:provider_id(*)").eq("order_id", orderId).single();

  if (!order || !tracking) throw new Error("Order or tracking not found");

  // Generate Carrier Label (HTML-based for now)
  const carrierLabelData = {
    type: "carrier",
    tracking_number: tracking.tracking_number,
    carrier: tracking.carrier_name,
    from: { country: tracking.origin_country, address: "PetID Warehouse, Shenzhen, CN" },
    to: { country: tracking.destination_country, address: order.shipping_address || "Israel" },
    weight: "0.5kg",
    dimensions: "30x20x10cm",
    generated_at: new Date().toISOString(),
  };

  // Generate PetID Warehouse Label
  const warehouseLabelData = {
    type: "warehouse",
    order_id: order.order_number || order.id.slice(0, 8),
    tracking_number: tracking.tracking_number,
    product_specs: order.special_instructions || "Standard pet product",
    customer_name: order.customer_name || "Customer",
    destination: tracking.destination_country,
    creator_name: "PetID Creator",
    priority: order.medical_urgency ? "URGENT" : "STANDARD",
    generated_at: new Date().toISOString(),
  };

  // Store labels
  const labels = [
    { order_id: orderId, tracking_id: tracking.id, label_type: "carrier", file_data: carrierLabelData },
    { order_id: orderId, tracking_id: tracking.id, label_type: "warehouse", file_data: warehouseLabelData },
  ];

  const { data: savedLabels, error } = await supabase.from("shipping_labels").insert(labels).select();
  if (error) throw error;

  return jsonResponse({ success: true, labels: savedLabels });
}

// ─── Sync Tracking ───
async function syncTracking(supabase: any, orderId: string) {
  const { data: tracking } = await supabase
    .from("shipment_tracking")
    .select("*, provider:provider_id(*)")
    .eq("order_id", orderId)
    .single();

  if (!tracking) throw new Error("Tracking not found");

  // If provider has API, fetch real tracking
  if (tracking.provider?.api_base_url && tracking.provider.is_active) {
    try {
      const result = await callCarrierAPI(tracking.provider, "track", {
        tracking_number: tracking.tracking_number,
      });
      if (result?.milestones) {
        await supabase
          .from("shipment_tracking")
          .update({
            milestones: result.milestones,
            current_status: result.current_status || tracking.current_status,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", tracking.id);
        return jsonResponse({ success: true, milestones: result.milestones });
      }
    } catch (err) {
      console.warn("Carrier tracking sync failed:", err);
    }
  }

  // Return existing milestones
  return jsonResponse({ success: true, milestones: tracking.milestones, source: "cache" });
}

// ─── Get Tracking ───
async function getTracking(supabase: any, orderId: string) {
  const { data: tracking } = await supabase
    .from("shipment_tracking")
    .select("*, provider:provider_id(name, slug, tracking_url_template)")
    .eq("order_id", orderId)
    .single();

  if (!tracking) {
    return jsonResponse({ success: true, tracking: null });
  }

  // Build tracking URL
  let trackingUrl = null;
  if (tracking.provider?.tracking_url_template && tracking.tracking_number) {
    trackingUrl = tracking.provider.tracking_url_template.replace(
      "{{tracking_number}}",
      tracking.tracking_number
    );
  }

  return jsonResponse({
    success: true,
    tracking: { ...tracking, tracking_url: trackingUrl },
  });
}

// ─── Carrier API Abstraction ───
async function callCarrierAPI(provider: any, action: string, payload: any) {
  const apiUrl = provider.api_base_url;
  if (!apiUrl) return null;

  // Each carrier has different API patterns
  switch (provider.slug) {
    case "yunexpress": {
      const endpoint = action === "create" ? "/Waybill/CreateOrder" : "/Tracking/GetTrackInfo";
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa((provider.config?.api_key || "") + ":" + (provider.config?.api_secret || ""))}`,
        },
        body: JSON.stringify(payload),
      });
      return await response.json();
    }
    case "hfd": {
      const endpoint = action === "create" ? "/api/shipments" : "/api/tracking";
      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": provider.config?.api_key || "",
        },
        body: JSON.stringify(payload),
      });
      return await response.json();
    }
    default:
      console.log(`No API handler for carrier: ${provider.slug}`);
      return null;
  }
}

// ─── Helpers ───
function generateTrackingNumber(prefix: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = prefix.toUpperCase().slice(0, 3);
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
