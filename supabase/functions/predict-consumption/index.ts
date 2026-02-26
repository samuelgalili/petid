import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Predictive Consumption Engine
 * NRC 2006 MER formula: 110 * (bodyWeight ^ 0.75) kcal/day
 * 
 * For each pet with a current food product:
 * 1. Calculate daily intake in grams
 * 2. Estimate days remaining
 * 3. If <= 3 days → mark reorder_triggered, Sarah sends notification
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all pets with weight and current food
    const { data: pets, error: petsErr } = await supabase
      .from("pets")
      .select("id, user_id, name, weight, current_food")
      .not("weight", "is", null)
      .not("current_food", "is", null);

    if (petsErr) throw petsErr;
    if (!pets || pets.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pets with weight + food data found", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    let reorderAlerts = 0;

    for (const pet of pets) {
      const weightKg = pet.weight;
      if (!weightKg || weightKg <= 0) continue;

      // NRC 2006 MER formula
      const merKcal = 110 * Math.pow(weightKg, 0.75);

      // Try to find matching product by name
      const { data: products } = await supabase
        .from("business_products")
        .select("id, name, kcal_per_kg, category")
        .or(`name.ilike.%${pet.current_food}%`)
        .limit(1);

      const product = products?.[0];
      const kcalPerKg = product?.kcal_per_kg || 3500; // Default for dry dog food

      // Daily intake in grams: (MER / kcal_per_kg) * 1000
      const dailyIntakeGrams = (merKcal / kcalPerKg) * 1000;

      // Get feeding guideline if available
      let bagWeightKg = 12; // Default 12kg bag
      if (product?.id) {
        const { data: guidelines } = await supabase
          .from("product_feeding_guidelines")
          .select("*")
          .eq("product_id", product.id)
          .gte("weight_max_kg", weightKg)
          .lte("weight_min_kg", weightKg)
          .limit(1);

        // Use guideline daily intake if more specific
        if (guidelines?.[0]) {
          const avg = (guidelines[0].grams_per_day_min + guidelines[0].grams_per_day_max) / 2;
          if (avg > 0) {
            // Keep MER-based calc but could use guideline
          }
        }
      }

      // Check if there's an existing prediction to get bag info
      const { data: existing } = await supabase
        .from("food_consumption_predictions")
        .select("bag_weight_kg")
        .eq("pet_id", pet.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (existing?.[0]?.bag_weight_kg) {
        bagWeightKg = existing[0].bag_weight_kg;
      }

      const daysRemaining = Math.round((bagWeightKg * 1000) / dailyIntakeGrams);
      const estimatedEmptyDate = new Date();
      estimatedEmptyDate.setDate(estimatedEmptyDate.getDate() + daysRemaining);

      const shouldReorder = daysRemaining <= 3;

      // Upsert prediction
      const { error: upsertErr } = await supabase
        .from("food_consumption_predictions")
        .upsert(
          {
            pet_id: pet.id,
            user_id: pet.user_id,
            product_id: product?.id || null,
            product_name: pet.current_food,
            bag_weight_kg: bagWeightKg,
            daily_intake_grams: Math.round(dailyIntakeGrams),
            days_remaining: daysRemaining,
            estimated_empty_date: estimatedEmptyDate.toISOString().split("T")[0],
            mer_kcal: Math.round(merKcal),
            pet_weight_kg: weightKg,
            kcal_per_kg: kcalPerKg,
            reorder_triggered: shouldReorder,
            notification_sent: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "pet_id" }
        );

      if (upsertErr) {
        console.error(`Error upserting prediction for pet ${pet.id}:`, upsertErr);
        continue;
      }

      // Sarah's reorder alert
      if (shouldReorder) {
        reorderAlerts++;
        // Create admin alert
        await supabase.from("admin_data_alerts").insert({
          alert_type: "food_depletion",
          category: "inventory",
          severity: daysRemaining <= 1 ? "critical" : "warning",
          title: `⚠️ ${pet.name} — מזון עומד להיגמר`,
          description: `נותרו ${daysRemaining} ימים למזון "${pet.current_food}" (${bagWeightKg}kg). צריכה יומית: ${Math.round(dailyIntakeGrams)}g. המלצה: הזמנה מחדש.`,
          metadata: {
            pet_id: pet.id,
            user_id: pet.user_id,
            days_remaining: daysRemaining,
            product_name: pet.current_food,
            triggered_by: "sarah",
          },
        });
      }

      processed++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        reorderAlerts,
        message: `Processed ${processed} pets. ${reorderAlerts} reorder alerts triggered.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Predictive consumption error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
