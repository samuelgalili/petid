import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

async function hashKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Authenticate via API key
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing X-Api-Key header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keyHash = await hashKey(apiKey);
    const { data: supplier } = await supabase
      .from("suppliers")
      .select("id, api_enabled")
      .eq("api_key_hash", keyHash)
      .eq("api_enabled", true)
      .single();

    if (!supplier) {
      return new Response(JSON.stringify({ error: "Invalid or disabled API key" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supplierId = supplier.id;
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/factory-api\/?/, "").replace(/\/$/, "");
    const method = req.method;

    // Log API call
    await supabase.from("factory_api_logs").insert({
      supplier_id: supplierId,
      endpoint: `/${path}`,
      method,
      ip_address: req.headers.get("x-forwarded-for") || "unknown",
    });

    // Route: GET /products
    if (method === "GET" && path === "products") {
      const { data, error } = await supabase
        .from("factory_product_submissions")
        .select("*")
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify({ products: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: POST /products
    if (method === "POST" && path === "products") {
      const body = await req.json();
      const { name, description, category, price, cost_price, pet_type, life_stage, min_order_qty, weight_kg, kcal_per_kg, ingredients } = body;

      if (!name || !price) {
        return new Response(JSON.stringify({ error: "name and price are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("factory_product_submissions")
        .insert({
          supplier_id: supplierId,
          name,
          description: description || null,
          category: category || "food",
          price: parseFloat(price),
          cost_price: cost_price ? parseFloat(cost_price) : null,
          pet_type: pet_type || "dog",
          life_stage: life_stage || "adult",
          min_order_qty: min_order_qty || 100,
          weight_kg: weight_kg ? parseFloat(weight_kg) : null,
          kcal_per_kg: kcal_per_kg ? parseFloat(kcal_per_kg) : null,
          ingredients: ingredients || null,
          status: "pending_review",
        })
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ product: data }), {
        status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: GET /orders
    if (method === "GET" && path === "orders") {
      const status = url.searchParams.get("status");
      let query = supabase
        .from("factory_orders")
        .select("*")
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: false });

      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ orders: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route: PATCH /orders/:id
    if (method === "PATCH" && path.startsWith("orders/")) {
      const orderId = path.replace("orders/", "");
      const body = await req.json();
      const updates: Record<string, unknown> = {};

      if (body.status) updates.status = body.status;
      if (body.tracking_number) updates.tracking_number = body.tracking_number;

      const { data, error } = await supabase
        .from("factory_orders")
        .update(updates)
        .eq("id", orderId)
        .eq("supplier_id", supplierId)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ order: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Factory API error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
