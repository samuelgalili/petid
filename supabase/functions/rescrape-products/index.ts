import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Auth required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get all products with source_url
    const { data: products } = await supabase
      .from("business_products")
      .select("id, source_url")
      .not("source_url", "is", null);

    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ success: true, updated: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results: any[] = [];

    for (const product of products) {
      try {
        // Call the import function internally via fetch
        const importRes = await fetch(`${supabaseUrl}/functions/v1/import-products-from-url`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "apikey": Deno.env.get("SUPABASE_ANON_KEY")!,
          },
          body: JSON.stringify({ url: product.source_url, maxProducts: 1, maxPages: 1, sameDomainOnly: true }),
        });

        const importData = await importRes.json();
        if (!importData?.success || !importData?.data?.products?.length) {
          results.push({ id: product.id, status: "skip", reason: "no data" });
          continue;
        }

        const scraped = importData.data.products[0];

        // Update the product with all extracted data
        const updateData: Record<string, any> = {
          brand: scraped.brand || null,
          ingredients: scraped.ingredients || null,
          benefits: scraped.benefits || [],
          feeding_guide: scraped.feedingGuide || [],
          product_attributes: scraped.productAttributes || {},
          life_stage: scraped.lifeStage || null,
          dog_size: scraped.dogSize || null,
          special_diet: scraped.specialDiet || [],
          category: scraped.category || null,
          pet_type: scraped.petType || "all",
        };

        // Only update price if we got a valid one
        if (scraped.basePrice && scraped.basePrice > 0) {
          updateData.price = scraped.salePrice || scraped.basePrice;
          if (scraped.basePrice && scraped.salePrice && scraped.salePrice < scraped.basePrice) {
            updateData.original_price = scraped.basePrice;
          }
          updateData.sale_price = scraped.salePrice || null;
        }

        // Update images if we got better ones
        if (scraped.images?.length > 0) {
          updateData.image_url = scraped.images[0];
          updateData.images = scraped.images;
        }

        const { error: updateError } = await supabase
          .from("business_products")
          .update(updateData)
          .eq("id", product.id);

        if (updateError) {
          results.push({ id: product.id, status: "error", reason: updateError.message });
        } else {
          results.push({ id: product.id, status: "updated", brand: updateData.brand, category: updateData.category });
        }

        console.log(`Updated product ${product.id}: brand=${updateData.brand}, category=${updateData.category}`);
      } catch (err: any) {
        results.push({ id: product.id, status: "error", reason: err.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, updated: results.filter(r => r.status === "updated").length, total: products.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
