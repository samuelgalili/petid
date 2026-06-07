/**
 * generate-pet-insights
 *
 * Rule-based Insight Engine (v1, no LLM). Reads pet state and produces a
 * ranked, deduped list of insights cached in `pet_insights`. Returns the
 * top insight as Hero + up to 3 supporting insights, filtered by 24h
 * cross-surface dedupe via `insight_surface_log`.
 *
 * Priority ladder (lower tier = higher priority):
 *   1 sos        — safety risk (heat warning, missing critical med, etc.)
 *   2 care_plan  — vaccine/parasite/dental due ≤72h
 *   3 data_gap   — missing weight, breed, age blocking accuracy
 *   4 milestone  — positive events (birthday, streak, score lift)
 *   5 predictive — food/medication running out, next vet visit soon
 *
 * Confidence cutoff: 0.75
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

type Tier = 1 | 2 | 3 | 4 | 5;
type Category = "sos" | "care_plan" | "data_gap" | "milestone" | "predictive";

interface Insight {
  insight_key: string;
  tier: Tier;
  category: Category;
  confidence: number;
  hero_text: string;
  hero_subtext?: string;
  cta_label?: string;
  cta_action?: string;
  icon_name?: string;
  payload?: Record<string, unknown>;
}

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

const daysBetween = (a: Date, b: Date) =>
  Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));

/**
 * Pure rule layer. No side effects, deterministic, easy to unit-test.
 */
function deriveInsights(input: {
  pet: any;
  vaccinations: any[];
  carePlan: any[];
}): Insight[] {
  const out: Insight[] = [];
  const pet = input.pet;
  const now = new Date();

  // ── Tier 1: SOS ──────────────────────────────────────────────────────
  if (pet?.is_lost) {
    out.push({
      insight_key: "lost_pet_active",
      tier: 1,
      category: "sos",
      confidence: 1,
      hero_text: "החיה מסומנת כאבודה",
      hero_subtext: "פתח דף איתור פעיל ושתף שכנים",
      cta_label: "פתח SOS",
      cta_action: "navigate:/lost-pet",
      icon_name: "TriangleAlert",
    });
  }

  // ── Tier 2: Care Plan ────────────────────────────────────────────────
  const upcomingVaccines = (input.vaccinations || [])
    .filter((v) => v.expiry_date)
    .map((v) => ({ ...v, days: daysBetween(new Date(v.expiry_date), now) }))
    .filter((v) => v.days >= 0 && v.days <= 30);

  const dueSoon = upcomingVaccines.find((v) => v.days <= 3);
  if (dueSoon) {
    out.push({
      insight_key: `vaccine_due_${dueSoon.id}`,
      tier: 2,
      category: "care_plan",
      confidence: 0.95,
      hero_text: `חיסון ${dueSoon.vaccine_name} בעוד ${dueSoon.days} ימים`,
      hero_subtext: "כדאי לתאם עם הווטרינר השבוע",
      cta_label: "תאם תור",
      cta_action: "open_sheet:vaccine",
      icon_name: "Syringe",
      payload: { vaccine_id: dueSoon.id },
    });
  } else if (upcomingVaccines.length > 0) {
    const next = upcomingVaccines.sort((a, b) => a.days - b.days)[0];
    out.push({
      insight_key: `vaccine_upcoming_${next.id}`,
      tier: 5,
      category: "predictive",
      confidence: 0.85,
      hero_text: `חיסון ${next.vaccine_name} בעוד ${next.days} ימים`,
      cta_label: "פרטים",
      cta_action: "open_sheet:vaccine",
      icon_name: "Syringe",
    });
  }

  if (pet?.next_vet_visit) {
    const d = daysBetween(new Date(pet.next_vet_visit), now);
    if (d >= 0 && d <= 3) {
      out.push({
        insight_key: "vet_visit_soon",
        tier: 2,
        category: "care_plan",
        confidence: 0.9,
        hero_text: `ביקור וטרינר בעוד ${d} ימים`,
        hero_subtext: pet.vet_clinic_name ?? undefined,
        cta_label: "פרטים",
        cta_action: "open_sheet:vet",
        icon_name: "Stethoscope",
      });
    }
  }

  // ── Tier 3: Data Gaps ────────────────────────────────────────────────
  if (pet?.weight == null) {
    out.push({
      insight_key: "missing_weight",
      tier: 3,
      category: "data_gap",
      confidence: 0.9,
      hero_text: "חסרה מדידת משקל",
      hero_subtext: "משקל מעדכן את חישוב המנה היומית והמינונים",
      cta_label: "הוסף משקל",
      cta_action: "add_record:weight",
      icon_name: "Weight",
    });
  }

  if (!pet?.breed || pet.breed === "Mixed breed") {
    out.push({
      insight_key: "missing_breed",
      tier: 3,
      category: "data_gap",
      confidence: 0.8,
      hero_text: "גזע לא מאומת",
      hero_subtext: "זיהוי גזע משפר המלצות תזונה ובריאות",
      cta_label: "זהה גזע",
      cta_action: "navigate:/identify-breed",
      icon_name: "ScanLine",
    });
  }

  if (!pet?.birth_date && pet?.age == null) {
    out.push({
      insight_key: "missing_age",
      tier: 3,
      category: "data_gap",
      confidence: 0.85,
      hero_text: "חסר תאריך לידה",
      hero_subtext: "גיל מדויק נדרש לחישובי בטיחות",
      cta_label: "הוסף",
      cta_action: "navigate:/edit-pet/" + pet.id,
      icon_name: "Cake",
    });
  }

  // ── Tier 4: Milestones ───────────────────────────────────────────────
  if (pet?.birth_date) {
    const bd = new Date(pet.birth_date);
    const thisYear = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
    const days = daysBetween(thisYear, now);
    if (days >= 0 && days <= 7) {
      out.push({
        insight_key: `birthday_${now.getFullYear()}`,
        tier: 4,
        category: "milestone",
        confidence: 1,
        hero_text: days === 0 ? `יום הולדת ל-${pet.name}!` : `יום הולדת בעוד ${days} ימים`,
        cta_label: "ספר לחברים",
        cta_action: "navigate:/feed?compose=birthday",
        icon_name: "Cake",
      });
    }
  }

  // ── Tier 5: Predictive (food consumption placeholder) ────────────────
  // TODO: wire to real food_consumption telemetry when available.

  return out.filter((i) => i.confidence >= 0.75);
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const cors = getCorsHeaders(req.headers.get("origin"));

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization" }, 401, cors);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes?.user) return json({ error: "Unauthorized" }, 401, cors);
    const userId = userRes.user.id;

    const { pet_id, surface = "dashboard" } = await req.json().catch(() => ({}));
    if (!pet_id) return json({ error: "pet_id required" }, 400, cors);

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Confirm pet ownership
    const { data: pet, error: petErr } = await admin
      .from("pets")
      .select("*")
      .eq("id", pet_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (petErr || !pet) return json({ error: "Pet not found" }, 404, cors);

    // Try cache first (valid + not dismissed/acted)
    const { data: cached } = await admin
      .from("pet_insights")
      .select("*")
      .eq("pet_id", pet_id)
      .is("dismissed_at", null)
      .is("acted_at", null)
      .gt("valid_until", new Date().toISOString())
      .order("tier", { ascending: true })
      .order("confidence", { ascending: false })
      .limit(8);

    let pool = cached ?? [];

    if (pool.length === 0) {
      // Recompute
      const [{ data: vaccinations }, { data: carePlan }] = await Promise.all([
        admin.from("pet_vaccinations").select("*").eq("pet_id", pet_id),
        admin.from("pet_care_plans").select("*").eq("pet_id", pet_id),
      ]);

      const derived = deriveInsights({
        pet,
        vaccinations: vaccinations ?? [],
        carePlan: carePlan ?? [],
      });

      if (derived.length > 0) {
        const rows = derived.map((d) => ({
          ...d,
          pet_id,
          user_id: userId,
        }));
        const { data: upserted } = await admin
          .from("pet_insights")
          .upsert(rows, { onConflict: "pet_id,insight_key" })
          .select();
        pool = upserted ?? [];
      }
    }

    // Cross-surface dedupe: drop insights already shown on another surface in last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentLog } = await admin
      .from("insight_surface_log")
      .select("insight_id, surface")
      .eq("user_id", userId)
      .gt("shown_at", since);

    const blockedIds = new Set(
      (recentLog ?? [])
        .filter((r) => r.surface !== surface)
        .map((r) => r.insight_id),
    );

    const visible = pool
      .filter((i: any) => !blockedIds.has(i.id))
      .sort((a: any, b: any) =>
        a.tier - b.tier || b.confidence - a.confidence,
      );

    const hero = visible[0] ?? null;
    const supporting = visible.slice(1, 4);

    // Log surface impression for the hero (fire-and-forget)
    if (hero) {
      admin
        .from("insight_surface_log")
        .insert({ insight_id: hero.id, user_id: userId, surface })
        .then(() => {});
    }

    return json({ hero, supporting }, 200, cors);
  } catch (err: any) {
    console.error("generate-pet-insights error:", err);
    return json({ error: err?.message ?? "unknown" }, 500, cors);
  }
});