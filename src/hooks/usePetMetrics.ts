import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Pet metrics hook — single source of truth for the dashboard.
 * Pulls real data from:
 *   - pet_feeding_logs   (kcal eaten today)
 *   - pet_water_logs     (ml drunk today)
 *   - pet_weight_logs    (latest + trend)
 *   - pet_vaccinations   (active vs expired)
 *   - pet_daily_tasks    (today's task completion, cross-device)
 * Plus a 7-day window for the week strip.
 * Conservative: returns `null` while loading, never invents values.
 */

export type DailyTaskKey =
  | "walk_morning"
  | "walk_evening"
  | "feed_morning"
  | "feed_evening"
  | "water"
  | "health_check"
  | "grooming"
  | "play";

export const DAILY_TASK_KEYS: DailyTaskKey[] = [
  "walk_morning",
  "feed_morning",
  "water",
  "play",
  "walk_evening",
  "feed_evening",
  "grooming",
  "health_check",
];

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const startOfDayISO = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
};

interface State {
  loading: boolean;
  kcalToday: number | null;
  waterToday: number | null;
  latestWeight: number | null;
  weightDelta: number | null; // kg, vs previous log
  vaccinesActive: number;
  vaccinesExpired: number;
  weekTaskPct: number[]; // 7 entries, Sun..Sat
  todayTasks: Record<string, boolean>;
  baseline: {
    avgWaterMl: number | null;
    avgKcal: number | null;
    avgTaskPct: number | null;
    weightTrendKgPerWeek: number | null;
    confidence: number;
    dataDays: number;
    anomalies: Array<{ kind: string; severity: string; detail: string }>;
    computedAt: string | null;
  };
}

const EMPTY: State = {
  loading: true,
  kcalToday: null,
  waterToday: null,
  latestWeight: null,
  weightDelta: null,
  vaccinesActive: 0,
  vaccinesExpired: 0,
  weekTaskPct: [0, 0, 0, 0, 0, 0, 0],
  todayTasks: {},
  baseline: {
    avgWaterMl: null,
    avgKcal: null,
    avgTaskPct: null,
    weightTrendKgPerWeek: null,
    confidence: 0,
    dataDays: 0,
    anomalies: [],
    computedAt: null,
  },
};

export const usePetMetrics = (petId: string | undefined) => {
  const [state, setState] = useState<State>(EMPTY);

  const today = useMemo(() => new Date(), []);
  const weekStart = useMemo(() => {
    const s = new Date(today);
    s.setDate(today.getDate() - today.getDay());
    s.setHours(0, 0, 0, 0);
    return s;
  }, [today]);

  const load = useCallback(async () => {
    if (!petId) return;
    const todayStartISO = startOfDayISO(today);
    const weekStartISO = weekStart.toISOString();
    const todayStr = ymd(today);

    const [feedToday, waterToday, weights, vaccines, weekTasks, baseline] =
      await Promise.all([
        supabase
          .from("pet_feeding_logs")
          .select("kcal, logged_at")
          .eq("pet_id", petId)
          .gte("logged_at", todayStartISO),
        supabase
          .from("pet_water_logs")
          .select("amount_ml, logged_at")
          .eq("pet_id", petId)
          .gte("logged_at", todayStartISO),
        supabase
          .from("pet_weight_logs")
          .select("weight_kg, measured_at")
          .eq("pet_id", petId)
          .order("measured_at", { ascending: false })
          .limit(2),
        supabase
          .from("pet_vaccinations")
          .select("expiry_date")
          .eq("pet_id", petId),
        supabase
          .from("pet_daily_tasks")
          .select("task_key, completed, task_date")
          .eq("pet_id", petId)
          .gte("task_date", ymd(weekStart)),
        supabase
          .from("pet_baselines")
          .select("*")
          .eq("pet_id", petId)
          .maybeSingle(),
      ]);

    const kcal =
      feedToday.data?.reduce(
        (sum, r: { kcal: number | null }) => sum + (Number(r.kcal) || 0),
        0
      ) ?? 0;

    const water =
      waterToday.data?.reduce(
        (sum, r: { amount_ml: number | null }) =>
          sum + (Number(r.amount_ml) || 0),
        0
      ) ?? 0;

    const wRows =
      (weights.data as Array<{ weight_kg: number }> | null) ?? [];
    const latestWeight = wRows[0]?.weight_kg ?? null;
    const weightDelta =
      wRows.length >= 2
        ? Number((wRows[0].weight_kg - wRows[1].weight_kg).toFixed(2))
        : null;

    const now = new Date();
    let active = 0;
    let expired = 0;
    (vaccines.data as Array<{ expiry_date: string | null }> | null)?.forEach(
      (v) => {
        if (!v.expiry_date) {
          active++;
          return;
        }
        if (new Date(v.expiry_date) >= now) active++;
        else expired++;
      }
    );

    // Build per-day completion %
    const total = DAILY_TASK_KEYS.length;
    const byDay = new Map<string, number>();
    (weekTasks.data as Array<{ task_key: string; completed: boolean; task_date: string }> | null)?.forEach(
      (t) => {
        if (!t.completed) return;
        byDay.set(t.task_date, (byDay.get(t.task_date) ?? 0) + 1);
      }
    );
    const weekTaskPct = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      if (d > now) return 0;
      const done = byDay.get(ymd(d)) ?? 0;
      return Math.round((Math.min(done, total) / total) * 100);
    });

    const todayTasks: Record<string, boolean> = {};
    (weekTasks.data as Array<{ task_key: string; completed: boolean; task_date: string }> | null)?.forEach(
      (t) => {
        if (t.task_date === todayStr) todayTasks[t.task_key] = t.completed;
      }
    );

    setState({
      loading: false,
      kcalToday: kcal,
      waterToday: water,
      latestWeight,
      weightDelta,
      vaccinesActive: active,
      vaccinesExpired: expired,
      weekTaskPct,
      todayTasks,
      baseline: baseline.data
        ? {
            avgWaterMl: (baseline.data as any).avg_water_ml_per_day,
            avgKcal: (baseline.data as any).avg_kcal_per_day,
            avgTaskPct: (baseline.data as any).avg_task_pct,
            weightTrendKgPerWeek: (baseline.data as any).weight_trend_kg_per_week,
            confidence: Number((baseline.data as any).confidence ?? 0),
            dataDays: Number((baseline.data as any).data_days ?? 0),
            anomalies: ((baseline.data as any).anomalies ?? []) as Array<{ kind: string; severity: string; detail: string }>,
            computedAt: (baseline.data as any).computed_at,
          }
        : EMPTY.baseline,
    });
  }, [petId, today, weekStart]);

  useEffect(() => {
    void load();
  }, [load]);

  // Allow other parts of the app (e.g. QuickLogSheet) to force a refresh.
  useEffect(() => {
    const handler = () => { void load(); };
    window.addEventListener("pet-metrics-refresh", handler);
    return () => window.removeEventListener("pet-metrics-refresh", handler);
  }, [load]);

  /** Toggle a daily task (optimistic + DB upsert). */
  const toggleTask = useCallback(
    async (key: DailyTaskKey): Promise<boolean> => {
      if (!petId) return false;
      const todayStr = ymd(new Date());
      const current = !!state.todayTasks[key];
      const next = !current;

      // Optimistic
      setState((s) => ({
        ...s,
        todayTasks: { ...s.todayTasks, [key]: next },
      }));

      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return next;

      await supabase
        .from("pet_daily_tasks")
        .upsert(
          {
            pet_id: petId,
            user_id: uid,
            task_date: todayStr,
            task_key: key,
            completed: next,
            completed_at: next ? new Date().toISOString() : null,
          },
          { onConflict: "pet_id,task_date,task_key" }
        );

      // Refresh weekTaskPct (cheap)
      void load();
      return next && !current;
    },
    [petId, state.todayTasks, load]
  );

  const completedToday = DAILY_TASK_KEYS.filter(
    (k) => state.todayTasks[k]
  ).length;
  const taskPctToday = Math.round(
    (completedToday / DAILY_TASK_KEYS.length) * 100
  );

  return {
    ...state,
    completedToday,
    totalTasks: DAILY_TASK_KEYS.length,
    taskPctToday,
    toggleTask,
    refresh: load,
  };
};
