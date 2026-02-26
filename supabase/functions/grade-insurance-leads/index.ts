import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Autonomous Lead Grading for Libra Insurance
 * 
 * Scoring criteria (0-100):
 * - Verified chip number: +30
 * - Medical history completeness (documents scanned): +30
 * - Breed info available: +10
 * - Age provided: +10
 * - Health declarations answered: +10 each (max 20)
 * 
 * Tiers:
 * - Elite (90+): Instant API push to Libra partner
 * - Premium (70-89): Priority review
 * - Standard (< 70): Manual review required
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all pending leads
    const { data: leads, error: leadsErr } = await supabase
      .from("insurance_leads")
      .select("*")
      .eq("status", "pending")
      .is("quality_score", null)
      .order("created_at", { ascending: false });

    if (leadsErr) throw leadsErr;
    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ message: "No unscored leads", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;
    let elitePushed = 0;

    for (const lead of leads) {
      let score = 0;

      // 1. Check chip verification (30 points)
      let hasChip = false;
      if (lead.pet_id) {
        const { data: pet } = await supabase
          .from("pets")
          .select("microchip_number")
          .eq("id", lead.pet_id)
          .single();
        if (pet?.microchip_number) {
          hasChip = true;
          score += 30;
        }
      }

      // 2. Medical completeness (30 points)
      let medicalCompleteness = 0;
      if (lead.pet_id) {
        const { count } = await supabase
          .from("pet_documents")
          .select("id", { count: "exact", head: true })
          .eq("pet_id", lead.pet_id);
        const docCount = count || 0;
        // 6+ documents = full score, proportional below
        medicalCompleteness = Math.min(100, Math.round((docCount / 6) * 100));
        score += Math.round((medicalCompleteness / 100) * 30);
      }

      // 3. Breed info (10 points)
      if (lead.breed && lead.breed.trim().length > 0) score += 10;

      // 4. Age provided (10 points)
      if (lead.age_years && lead.age_years > 0) score += 10;

      // 5. Health declarations (10 each, max 20)
      if (lead.health_answer_1) score += 10;
      if (lead.health_answer_2) score += 10;

      // Determine tier
      let tier = "standard";
      if (score >= 90) tier = "elite";
      else if (score >= 70) tier = "premium";

      // Update lead
      const updateData: Record<string, unknown> = {
        quality_score: score,
        quality_tier: tier,
        has_verified_chip: hasChip,
        medical_completeness: medicalCompleteness,
        updated_at: new Date().toISOString(),
      };

      // Elite auto-push
      if (tier === "elite") {
        updateData.auto_pushed_at = new Date().toISOString();
        updateData.status = "forwarded";
        updateData.admin_notes = `[AUTO] Elite lead (score: ${score}) — auto-pushed to Libra partner`;
        elitePushed++;

        // Create admin alert for visibility
        await supabase.from("admin_data_alerts").insert({
          alert_type: "elite_lead",
          category: "leads",
          severity: "info",
          title: `⭐ ליד Elite: ${lead.pet_name}`,
          description: `ציון ${score}/100. שבב מאומת: ${hasChip ? "✅" : "❌"}. שלמות רפואית: ${medicalCompleteness}%. הועבר אוטומטית ל-Libra.`,
          metadata: {
            lead_id: lead.id,
            pet_name: lead.pet_name,
            score,
            tier,
            triggered_by: "lead-grading-bot",
          },
        });
      }

      await supabase
        .from("insurance_leads")
        .update(updateData)
        .eq("id", lead.id);

      processed++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        elitePushed,
        message: `Graded ${processed} leads. ${elitePushed} Elite leads auto-pushed.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Lead grading error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
