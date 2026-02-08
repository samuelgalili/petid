import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sourceId, syncAll } = await req.json();

    // If syncAll, get all unsynced processed sources
    let sources: any[] = [];
    if (syncAll) {
      const { data } = await supabase
        .from("admin_data_sources")
        .select("*")
        .eq("is_processed", true)
        .eq("is_active", true)
        .in("sync_status", ["pending", "failed"])
        .order("created_at", { ascending: true });
      sources = data || [];
    } else if (sourceId) {
      const { data } = await supabase
        .from("admin_data_sources")
        .select("*")
        .eq("id", sourceId)
        .single();
      if (data) sources = [data];
    }

    if (sources.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No sources to sync", synced: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Syncing ${sources.length} sources`);
    const results: any[] = [];

    for (const source of sources) {
      const logEntry: any = {
        source_id: source.id,
        sync_type: syncAll ? "auto" : "manual",
        target_table: getTargetTable(source.data_type),
        status: "running",
        started_at: new Date().toISOString(),
      };

      // Create sync log entry
      const { data: logData } = await supabase
        .from("admin_data_sync_log")
        .insert(logEntry)
        .select()
        .single();

      try {
        const extracted = source.extracted_data || {};
        const result = await syncSourceToKnowledge(supabase, source.data_type, extracted, source.id);

        // Update sync log
        await supabase
          .from("admin_data_sync_log")
          .update({
            status: "completed",
            records_created: result.created,
            records_updated: result.updated,
            records_failed: result.failed,
            completed_at: new Date().toISOString(),
            error_details: result.errors.length > 0 ? { errors: result.errors } : null,
          })
          .eq("id", logData?.id);

        // Update source sync status
        await supabase
          .from("admin_data_sources")
          .update({
            sync_status: result.failed > 0 ? "partial" : "synced",
            last_synced_at: new Date().toISOString(),
            quality_score: calculateQualityScore(extracted),
          })
          .eq("id", source.id);

        // Create alert for new data
        await supabase.from("admin_data_alerts").insert({
          alert_type: "new_data",
          severity: "info",
          category: source.data_type,
          title: `נתונים חדשים סונכרנו: ${source.title}`,
          description: `נוספו ${result.created} רשומות, עודכנו ${result.updated}`,
          metadata: { source_id: source.id, ...result },
        });

        // Create alert for errors
        if (result.failed > 0) {
          await supabase.from("admin_data_alerts").insert({
            alert_type: "sync_error",
            severity: "warning",
            category: source.data_type,
            title: `שגיאות סנכרון: ${source.title}`,
            description: `${result.failed} רשומות נכשלו בסנכרון`,
            metadata: { source_id: source.id, errors: result.errors },
          });
        }

        results.push({ sourceId: source.id, ...result });
        console.log(`Synced source ${source.id}: ${result.created} created, ${result.updated} updated, ${result.failed} failed`);
      } catch (err) {
        console.error(`Error syncing source ${source.id}:`, err);
        await supabase
          .from("admin_data_sync_log")
          .update({
            status: "failed",
            error_details: { error: err.message },
            completed_at: new Date().toISOString(),
          })
          .eq("id", logData?.id);

        await supabase
          .from("admin_data_sources")
          .update({ sync_status: "failed" })
          .eq("id", source.id);

        await supabase.from("admin_data_alerts").insert({
          alert_type: "sync_error",
          severity: "error",
          category: source.data_type,
          title: `כשל סנכרון: ${source.title}`,
          description: err.message,
          metadata: { source_id: source.id },
        });

        results.push({ sourceId: source.id, error: err.message });
      }
    }

    // Run data quality check after sync
    await runDataQualityCheck(supabase);

    return new Response(
      JSON.stringify({ success: true, synced: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getTargetTable(dataType: string): string {
  const map: Record<string, string> = {
    breeds: "breed_information",
    articles: "admin_data_sources",
    research: "admin_data_sources",
    insurance: "admin_data_sources",
    dog_parks: "admin_data_sources",
  };
  return map[dataType] || "admin_data_sources";
}

async function syncSourceToKnowledge(
  supabase: any,
  dataType: string,
  extractedData: any,
  sourceId: string
) {
  let created = 0, updated = 0, failed = 0;
  const errors: string[] = [];

  if (dataType === "breeds" && extractedData.breeds) {
    for (const breed of extractedData.breeds) {
      try {
        // Check if breed exists
        const { data: existing } = await supabase
          .from("breed_information")
          .select("id")
          .eq("breed_name", breed.name)
          .maybeSingle();

        const breedData = {
          breed_name: breed.name,
          breed_name_he: breed.name_he || null,
          pet_type: breed.type || "dog",
          origin_country: breed.origin || null,
          size_category: breed.size || null,
          temperament: breed.temperament || null,
          temperament_he: breed.temperament_he || null,
          life_expectancy_years: breed.lifespan || null,
          health_issues: breed.health_issues || null,
          health_issues_he: breed.health_issues_he || null,
          description: breed.description || null,
          description_he: breed.description_he || null,
          grooming_needs: breed.care_notes || null,
          source_references: [sourceId],
          updated_at: new Date().toISOString(),
        };

        if (existing) {
          await supabase
            .from("breed_information")
            .update(breedData)
            .eq("id", existing.id);
          updated++;
        } else {
          await supabase.from("breed_information").insert(breedData);
          created++;
        }
      } catch (err) {
        failed++;
        errors.push(`Breed ${breed.name}: ${err.message}`);
      }
    }
  }

  // For articles/research - data stays in admin_data_sources (already stored)
  // Just mark as synced
  if (["articles", "research", "insurance", "dog_parks"].includes(dataType)) {
    if (extractedData.full_content || extractedData.title) {
      created = 1;
    }
  }

  return { created, updated, failed, errors };
}

function calculateQualityScore(data: any): number {
  if (!data || Object.keys(data).length === 0) return 0;
  let score = 0;
  const checks = [
    { key: "title", weight: 15 },
    { key: "title_he", weight: 10 },
    { key: "summary", weight: 15 },
    { key: "summary_he", weight: 10 },
    { key: "full_content", weight: 20 },
    { key: "key_findings", weight: 10 },
    { key: "authors", weight: 5 },
    { key: "source_url", weight: 5 },
    { key: "topics", weight: 5 },
    { key: "relevance_to_pets", weight: 5 },
  ];
  for (const check of checks) {
    const val = data[check.key];
    if (val && (typeof val === "string" ? val.length > 0 : Array.isArray(val) ? val.length > 0 : true)) {
      score += check.weight;
    }
  }
  return Math.min(score / 10, 10); // Scale to 0-10
}

async function runDataQualityCheck(supabase: any) {
  try {
    // Check for breeds without Hebrew names
    const { data: missingHe } = await supabase
      .from("breed_information")
      .select("id, breed_name")
      .is("breed_name_he", null)
      .eq("is_active", true);

    if (missingHe && missingHe.length > 0) {
      await supabase.from("admin_data_alerts").upsert(
        {
          alert_type: "missing_data",
          severity: "warning",
          category: "breeds",
          title: `${missingHe.length} גזעים ללא שם בעברית`,
          description: `הגזעים הבאים חסרים תרגום לעברית: ${missingHe.slice(0, 5).map((b: any) => b.breed_name).join(", ")}`,
          metadata: { breed_ids: missingHe.map((b: any) => b.id), count: missingHe.length },
          is_read: false,
          is_resolved: false,
        },
        { onConflict: "id", ignoreDuplicates: false }
      );
    }

    // Check for stale data sources (>30 days without update)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: staleSources } = await supabase
      .from("admin_data_sources")
      .select("id, title, data_type, updated_at")
      .lt("updated_at", thirtyDaysAgo)
      .eq("is_active", true);

    if (staleSources && staleSources.length > 0) {
      await supabase.from("admin_data_alerts").insert({
        alert_type: "stale_content",
        severity: "info",
        category: "research",
        title: `${staleSources.length} מקורות לא עודכנו מעל 30 יום`,
        description: "מומלץ לבדוק אם המידע עדיין רלוונטי",
        metadata: { source_ids: staleSources.map((s: any) => s.id) },
      });
    }

    // Check for unprocessed sources
    const { data: unprocessed } = await supabase
      .from("admin_data_sources")
      .select("id, title, data_type")
      .eq("is_processed", false)
      .eq("is_active", true);

    if (unprocessed && unprocessed.length > 0) {
      await supabase.from("admin_data_alerts").insert({
        alert_type: "quality_low",
        severity: "warning",
        category: "research",
        title: `${unprocessed.length} מקורות לא עובדו`,
        description: "מקורות אלו נשמרו אך העיבוד האוטומטי לא הצליח",
        metadata: { source_ids: unprocessed.map((s: any) => s.id) },
      });
    }

    console.log("Data quality check completed");
  } catch (err) {
    console.error("Quality check error:", err);
  }
}
