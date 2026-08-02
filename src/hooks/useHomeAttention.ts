import { useEffect, useMemo, useState } from "react";
import type { PetProfile } from "@/contexts/PetPreferenceContext";
import { getMyPetHealthSummary, type MipoPetHealthSummary } from "@/lib/mipoApi";

export type AttentionItem = {
  /** Must match an OrbitSlot id */
  slot: "health" | "documents" | "shop" | "chat";
  /** One short sentence for the insight line */
  message: string;
  /** Label for the inline action at the end of the line */
  actionLabel: string;
  actionPath: string;
  /** Higher wins when several items compete */
  priority: number;
};

const MS_PER_DAY = 86_400_000;

const daysUntil = (value: string) => {
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / MS_PER_DAY);
};

const expiryMessage = (petName: string, subject: string, days: number) => {
  if (days < 0) return `${subject} של ${petName} פג תוקף`;
  if (days === 0) return `${subject} של ${petName} פג היום`;
  return `${subject} של ${petName} פג בעוד ${days} ימים`;
};

/**
 * Single source of truth for the home screen's attention state (design 4a).
 * Returns every open item plus `primary` — the one the insight line shows.
 *
 * Real AWS sources currently wired:
 *   health    ← next vaccination / treatment due date
 *   documents ← pet insurance / license expiry
 *
 * The remaining TODO(api) blocks stay unwired until their real sources exist.
 */
export const useHomeAttention = (activePet: PetProfile | null): {
  items: AttentionItem[];
  primary: AttentionItem | null;
  has: (slot: AttentionItem["slot"]) => boolean;
} => {
  const [summary, setSummary] = useState<MipoPetHealthSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSummary(null);

    if (!activePet) return () => {
      cancelled = true;
    };

    const load = () => {
      getMyPetHealthSummary(activePet.id)
        .then((result) => {
          if (!cancelled) setSummary(result);
        })
        .catch(() => {
          if (!cancelled) setSummary(null);
        });
    };

    load();
    window.addEventListener("mipo:health-changed", load);
    window.addEventListener("mipo:pets-changed", load);
    return () => {
      cancelled = true;
      window.removeEventListener("mipo:health-changed", load);
      window.removeEventListener("mipo:pets-changed", load);
    };
  }, [activePet]);

  return useMemo(() => {
    const items: AttentionItem[] = [];
    if (!activePet || !summary) return { items, primary: null, has: () => false };

    // --- health: real pet health-summary dates ------------------------------
    const healthCandidates = [
      ...summary.vaccinations.map((vaccination) => ({
        date: vaccination.expires_at,
        subject: `החיסון ${vaccination.vaccine_name}`,
      })),
      ...summary.vet_visits.map((visit) => ({
        date: visit.next_visit_date,
        subject: visit.vaccines?.length ? "החיסון הבא" : "הטיפול הבא",
      })),
      {
        date: summary.pet.next_vet_visit,
        subject: "הטיפול הבא",
      },
    ]
      .filter((candidate): candidate is { date: string; subject: string } => Boolean(candidate.date))
      .map((candidate) => ({ ...candidate, days: daysUntil(candidate.date) }))
      .filter((candidate): candidate is { date: string; subject: string; days: number } => candidate.days !== null && candidate.days <= 30)
      .sort((a, b) => {
        if (a.days <= 0 && b.days > 0) return -1;
        if (a.days > 0 && b.days <= 0) return 1;
        return a.days <= 0 ? b.days - a.days : a.days - b.days;
      });
    const nextHealth = healthCandidates[0];
    if (nextHealth) {
      items.push({
        slot: "health",
        message: nextHealth.days <= 0
          ? `${nextHealth.subject} של ${activePet.name} עבר את המועד`
          : `${nextHealth.subject} של ${activePet.name} בעוד ${nextHealth.days} ימים`,
        actionLabel: "קביעת תור",
        actionPath: "/pet-profile",
        priority: nextHealth.days <= 0 ? 100 : 80,
      });
    }

    // --- documents: real pet insurance / license expiry dates --------------
    const documentCandidates = [
      { date: summary.pet.insurance_expiry_date, subject: "הביטוח" },
      { date: summary.pet.license_expiry_date, subject: "הרישיון" },
    ]
      .filter((candidate): candidate is { date: string; subject: string } => Boolean(candidate.date))
      .map((candidate) => ({ ...candidate, days: daysUntil(candidate.date) }))
      .filter((candidate): candidate is { date: string; subject: string; days: number } => candidate.days !== null && candidate.days <= 45)
      .sort((a, b) => a.days - b.days);
    const nextDocument = documentCandidates[0];
    if (nextDocument) {
      items.push({
        slot: "documents",
        message: expiryMessage(activePet.name, nextDocument.subject, nextDocument.days),
        actionLabel: "לכספת",
        actionPath: "/documents",
        priority: 60,
      });
    }

    // --- shop ---------------------------------------------------------------
    // TODO(api): wire a real reorder prediction / low-stock source here.

    // --- chat ---------------------------------------------------------------
    // TODO(api): wire a real unread Mipo-answer source here.

    items.sort((a, b) => b.priority - a.priority);
    return {
      items,
      primary: items[0] ?? null,
      has: (slot) => items.some((item) => item.slot === slot),
    };
  }, [activePet, summary]);
};
