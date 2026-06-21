// Edge Function: compute-pet-baselines
// Runs nightly via pg_cron. For every active pet, computes:
//   - avg water_ml / day (last 14 days)
//   - avg kcal / day
//   - daily-task completion %
//   - weight trend (kg / week, linear regression on logs)
//   - data confidence (0..1)
//   - anomalies list (kind, severity, detail)
// Writes one upsert per pet into public.pet_baselines.
// Also writes a row into public.pet_insights for each significant anomaly,
// closing the learning loop so the dashboard can surface them.

import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const WINDOW_DAYS = 14;

type Anomaly = { kind: string; severity: "info" | "warn" | "alert"; detail: string };

function distinctDays(dates: string[]): number {
  return new Set(dates.map((d) => d.slice(0, 10))).size;
}

// Simple least-squares slope (kg per day) over weight logs.
function weightSlopeKgPerDay(
  rows: Array<{ measured_at: string; weight_kg: number }>,
): number | null {
  if (rows.length < 2) return null;
  const t0 = new Date(rows[0].measured_at).getTime();
  const xs = rows.map((r) => (new Date(r.measured_at).getTime() - t0) / 86_400_000);
  const ys = rows.map((r) => Number(r.weight_kg));
  const n = xs.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return null;
  return num / den;
}

async function computeForPet(
  admin: ReturnType<typeof createClient>,
  pet: { id: string; user_id: string; weight: number | null; name: string },
) {
  const sinceISO = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
  const sinceDate = sinceISO.slice(0, 10);

  const [water, feeds, tasks, weights] = await Promise.all([
    admin.from("pet_water_logs").select("amount_ml, logged_at").eq("pet_id", pet.id).gte("logged_at", sinceISO),
    admin.from("pet_feeding_logs").select("kcal, logged_at").eq("pet_id", pet.id).gte("logged_at", sinceISO),
    admin.from("pet_daily_tasks").select("task_key, completed, task_date").eq("pet_id", pet.id).gte("task_date", sinceDate),
    admin.from("pet_weight_logs").select("weight_kg, measured_at").eq("pet_id", pet.id).order("measured_at", { ascending: true }),
  ]);

  // ── Water ──
  const waterRows = (water.data ?? []) as Array<{ amount_ml: number; logged_at: string }>;
  const waterByDay = new Map<string, number>();
  for (const r of waterRows) {
    const d = r.logged_at.slice(0, 10);
    waterByDay.set(d, (waterByDay.get(d) ?? 0) + Number(r.amount_ml ?? 0));
  }
  const waterDays = waterByDay.size;
  const avgWater = waterDays ? [...waterByDay.values()].reduce((s, v) => s + v, 0) / waterDays : null;

  // ── Calories ──
  const feedRows = (feeds.data ?? []) as Array<{ kcal: number | null; logged_at: string }>;
  const kcalByDay = new Map<string, number>();
  for (const r of feedRows) {
    if (r.kcal == null) continue;
    const d = r.logged_at.slice(0, 10);
    kcalByDay.set(d, (kcalByDay.get(d) ?? 0) + Number(r.kcal));
  }
  const kcalDays = kcalByDay.size;
  const avgKcal = kcalDays ? [...kcalByDay.values()].reduce((s, v) => s + v, 0) / kcalDays : null;

  // ── Tasks ──
  const taskRows = (tasks.data ?? []) as Array<{ task_key: string; completed: boolean; task_date: string }>;
  const TOTAL_TASKS = 8;
  const tasksByDay = new Map<string, number>();
  for (const r of taskRows) {
    if (!r.completed) continue;
    tasksByDay.set(r.task_date, (tasksByDay.get(r.task_date) ?? 0) + 1);
  }
  const taskDayPcts = [...tasksByDay.values()].map((n) => Math.min(100, (n / TOTAL_TASKS) * 100));
  const avgTaskPct = taskDayPcts.length
    ? taskDayPcts.reduce((s, v) => s + v, 0) / taskDayPcts.length
    : null;

  // ── Weight trend ──
  const weightRows = (weights.data ?? []) as Array<{ measured_at: string; weight_kg: number }>;
  const latestWeight = weightRows.length ? Number(weightRows[weightRows.length - 1].weight_kg) : pet.weight;
  const slopePerDay = weightSlopeKgPerDay(weightRows);
  const slopePerWeek = slopePerDay != null ? Number((slopePerDay * 7).toFixed(3)) : null;

  // ── Data density / confidence ──
  const allDates = [
    ...waterRows.map((r) => r.logged_at),
    ...feedRows.map((r) => r.logged_at),
    ...taskRows.map((r) => r.task_date),
  ];
  const dataDays = distinctDays(allDates);
  // Confidence grows with day coverage and presence of weight data.
  const dayConf = Math.min(1, dataDays / WINDOW_DAYS);
  const weightConf = weightRows.length >= 2 ? 1 : weightRows.length === 1 ? 0.4 : 0;
  const confidence = Number(((dayConf * 0.75) + (weightConf * 0.25)).toFixed(2));

  // ── Anomalies (conservative — only flag when confidence is meaningful) ──
  const anomalies: Anomaly[] = [];
  if (confidence >= 0.4) {
    if (avgTaskPct != null && avgTaskPct < 40) {
      anomalies.push({
        kind: "low_routine_adherence",
        severity: "warn",
        detail: `השלמת משימות נמוכה (${Math.round(avgTaskPct)}%) ב-${WINDOW_DAYS} ימים אחרונים`,
      });
    }
    if (latestWeight != null && pet.weight != null && slopePerWeek != null) {
      const baseW = pet.weight;
      // Significant weight loss: more than 2%/week for a non-puppy
      if (slopePerWeek < 0 && Math.abs(slopePerWeek) / baseW > 0.02) {
        anomalies.push({
          kind: "weight_loss",
          severity: "alert",
          detail: `ירידה של כ-${Math.abs(slopePerWeek).toFixed(2)} ק״ג בשבוע — מומלץ ייעוץ וטרינרי`,
        });
      } else if (slopePerWeek > 0 && slopePerWeek / baseW > 0.02) {
        anomalies.push({
          kind: "weight_gain",
          severity: "warn",
          detail: `עלייה של כ-${slopePerWeek.toFixed(2)} ק״ג בשבוע — לבדוק תזונה ופעילות`,
        });
      }
    }
    if (avgWater != null && pet.weight) {
      const targetWater = pet.weight * 50; // NRC: ~50 ml/kg
      if (avgWater < targetWater * 0.6) {
        anomalies.push({
          kind: "low_hydration",
          severity: "warn",
          detail: `צריכת מים ממוצעת (${Math.round(avgWater)} מ״ל) נמוכה מהיעד (~${Math.round(targetWater)} מ״ל)`,
        });
      }
    }
  }

  // ── Upsert baseline ──
  await admin.from("pet_baselines").upsert(
    {
      pet_id: pet.id,
      user_id: pet.user_id,
      avg_water_ml_per_day: avgWater,
      avg_kcal_per_day: avgKcal,
      avg_task_pct: avgTaskPct,
      weight_trend_kg_per_week: slopePerWeek,
      latest_weight_kg: latestWeight,
      confidence,
      data_days: dataDays,
      anomalies,
      window_days: WINDOW_DAYS,
      computed_at: new Date().toISOString(),
    },
    { onConflict: "pet_id" },
  );

  // ── Surface alert-level anomalies as pet_insights (best-effort) ──
  for (const a of anomalies) {
    if (a.severity !== "alert") continue;
    await admin.from("pet_insights").insert({
      pet_id: pet.id,
      user_id: pet.user_id,
      insight_type: a.kind,
      title: `התראה: ${pet.name}`,
      description: a.detail,
      priority: "high",
      source: "baseline_engine",
      confidence,
    }).then(() => {}, () => {}); // ignore if schema differs
  }

  return { pet_id: pet.id, anomalies: anomalies.length, confidence };
}

Deno.serve(async (req) => {
  const pre = handleCorsPreflightRequest(req);
  if (pre) return pre;
  const cors = getCorsHeaders(req.headers.get("origin"));

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "missing_env" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Allow scoping by pet_id (called from QuickLogSheet for instant refresh)
  let petIdFilter: string | null = null;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body?.pet_id && typeof body.pet_id === "string") petIdFilter = body.pet_id;
    }
  } catch { /* ignore */ }

  let q = admin.from("pets").select("id, user_id, weight, name").eq("archived", false);
  if (petIdFilter) q = q.eq("id", petIdFilter);
  const { data: pets, error } = await q;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const results: unknown[] = [];
  for (const p of (pets ?? []) as Array<{ id: string; user_id: string; weight: number | null; name: string }>) {
    try {
      results.push(await computeForPet(admin, p));
    } catch (e) {
      results.push({ pet_id: p.id, error: (e as Error).message });
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});