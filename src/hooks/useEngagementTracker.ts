import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Tracks user engagement per section for Dynamic UI Personalization.
 * Upserts time_spent_seconds and interaction_count to user_engagement_logs.
 */
export const useEngagementTracker = (section: string) => {
  const { user } = useAuth();
  const startTime = useRef(Date.now());
  const interactionCount = useRef(0);

  const trackInteraction = useCallback(() => {
    interactionCount.current += 1;
  }, []);

  useEffect(() => {
    if (!user?.id || !section) return;
    startTime.current = Date.now();
    interactionCount.current = 0;

    return () => {
      const elapsed = Math.round((Date.now() - startTime.current) / 1000);
      if (elapsed < 2) return; // skip trivial visits

      // Direct upsert
      supabase
        .from("user_engagement_logs")
        .upsert(
          {
            user_id: user.id,
            section,
            time_spent_seconds: elapsed,
            interaction_count: interactionCount.current,
            last_visited_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,section" }
        )
        .then(() => {});
    };
  }, [user?.id, section]);

  return { trackInteraction };
};

/**
 * Returns the user's section priority order based on engagement data.
 * Sections with more time spent appear first.
 */
export const usePersonalizedSections = () => {
  const { user } = useAuth();

  const getSectionOrder = useCallback(async (): Promise<string[]> => {
    if (!user?.id) return [];

    const { data } = await supabase
      .from("user_engagement_logs")
      .select("section, time_spent_seconds, interaction_count")
      .eq("user_id", user.id)
      .order("time_spent_seconds", { ascending: false });

    return (data || []).map((d) => d.section);
  }, [user?.id]);

  return { getSectionOrder };
};
