import { test, expect } from "@playwright/test";

/**
 * Exercises the companion's behaviour rules against the real module, loaded
 * through the app's own module graph rather than a copy of the logic.
 *
 * The arbitration in characterBehavior.ts is pure, so it can be driven with a
 * fixed clock: no waiting on real timers and no flakiness from them.
 */

type Behaviour = typeof import("../src/lib/characterBehavior");

const load = async (page: import("@playwright/test").Page) => {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
};

const run = <T>(
  page: import("@playwright/test").Page,
  fn: (mod: Behaviour) => T,
): Promise<T> => page.evaluate(
  async (source) => {
    const mod = await import("/src/lib/characterBehavior.ts");
    // eslint-disable-next-line no-eval
    return (0, eval)(`(${source})`)(mod);
  },
  fn.toString(),
) as Promise<T>;

test.describe("Companion behaviour", () => {
  test.beforeEach(async ({ page }) => load(page));

  test("neutral is a real mood and maps to a generated expression", async ({ page }) => {
    const result = await run(page, (m) => ({
      moods: Object.keys(m.MOOD_COMPOSITION),
      neutralExpression: m.MOOD_EXPRESSION.neutral,
      allMapped: Object.values(m.MOOD_EXPRESSION).every(Boolean),
    }));
    expect(result.moods).toEqual(["neutral", "happy", "excited", "curious", "concerned"]);
    // The bug this replaced: neutral asked for an expression that is never generated.
    expect(result.neutralExpression).toBeTruthy();
    expect(result.allMapped).toBe(true);
  });

  test("each event resolves to its specified mood", async ({ page }) => {
    const moods = await run(page, (m) => ({
      order_delivered: m.CHARACTER_REACTIONS.order_delivered.mood,
      vaccination_upcoming: m.CHARACTER_REACTIONS.vaccination_upcoming.mood,
      chat_reply_received: m.CHARACTER_REACTIONS.chat_reply_received.mood,
      health_score_improved: m.CHARACTER_REACTIONS.health_score_improved.mood,
      health_score_declined: m.CHARACTER_REACTIONS.health_score_declined.mood,
    }));
    expect(moods).toEqual({
      order_delivered: "excited",
      vaccination_upcoming: "concerned",
      chat_reply_received: "curious",
      health_score_improved: "happy",
      health_score_declined: "concerned",
    });
  });

  test("a repeated event inside the cooldown is ignored", async ({ page }) => {
    const result = await run(page, (m) => {
      const first = m.decideReaction("order_delivered", { now: 1_000, lastShownAt: null });
      const replay = m.decideReaction("order_delivered", { now: 2_000, lastShownAt: 1_000 });
      const later = m.decideReaction("order_delivered", {
        now: 1_000 + m.EVENT_COOLDOWN_MS + 1, lastShownAt: 1_000,
      });
      return { first: first.action, replay, later: later.action };
    });
    expect(result.first).toBe("start");
    expect(result.replay).toEqual({ action: "ignore", because: "cooldown" });
    expect(result.later).toBe("start");
  });

  test("a higher-priority event interrupts, a lower one does not", async ({ page }) => {
    const result = await run(page, (m) => {
      const active = { reaction: m.CHARACTER_REACTIONS.order_delivered, startedAt: 1_000 };
      return {
        // concerned outranks a parcel arriving
        interrupts: m.decideReaction("health_score_declined", { active, now: 1_200 }).action,
        // the parcel does not outrank an active concern
        loses: m.decideReaction("order_delivered", {
          active: { reaction: m.CHARACTER_REACTIONS.health_score_declined, startedAt: 1_000 },
          now: 1_200,
        }),
        // an equal peer waits its turn rather than cutting in
        peerWaits: m.decideReaction("chat_reply_received", {
          active: { reaction: m.CHARACTER_REACTIONS.health_score_improved, startedAt: 1_000 },
          now: 1_200,
        }),
      };
    });
    expect(result.interrupts).toBe("start");
    expect(result.loses).toEqual({ action: "ignore", because: "outranked" });
    expect(result.peerWaits).toEqual({ action: "ignore", because: "outranked" });
  });

  test("an event that has finished no longer blocks the next one", async ({ page }) => {
    const action = await run(page, (m) => {
      const active = { reaction: m.CHARACTER_REACTIONS.health_score_declined, startedAt: 1_000 };
      const after = 1_000 + m.CHARACTER_REACTIONS.health_score_declined.duration + 1;
      return m.decideReaction("order_delivered", { active, now: after }).action;
    });
    expect(action).toBe("start");
  });

  test("the base mood is neutral, attention outranks a self-reported mood", async ({ page }) => {
    const result = await run(page, (m) => {
      const labels = { "שמחה": "happy" as const };
      return {
        idle: m.resolveBaseMood({ hasAttention: false }),
        fromMood: m.resolveBaseMood({ hasAttention: false, moodLabel: "שמחה", moodLabels: labels }),
        attentionWins: m.resolveBaseMood({ hasAttention: true, moodLabel: "שמחה", moodLabels: labels }),
        unknownLabel: m.resolveBaseMood({ hasAttention: false, moodLabel: "???", moodLabels: labels }),
      };
    });
    expect(result.idle).toBe("neutral");
    expect(result.fromMood).toBe("happy");
    expect(result.attentionWins).toBe("concerned");
    expect(result.unknownLabel).toBe("neutral");
  });

  test("unknown event names are rejected rather than played", async ({ page }) => {
    const result = await run(page, (m) => ({
      known: m.isCharacterEvent("order_delivered"),
      unknown: m.isCharacterEvent("order_refunded"),
      notAString: m.isCharacterEvent(42),
      prototypeKey: m.isCharacterEvent("toString"),
    }));
    expect(result).toEqual({ known: true, unknown: false, notAString: false, prototypeKey: false });
  });

  test("every reaction is short enough to read as a reaction, not a mood change", async ({ page }) => {
    const durations = await run(page, (m) =>
      Object.values(m.CHARACTER_REACTIONS).map((r) => r.duration));
    for (const duration of durations) {
      expect(duration).toBeGreaterThanOrEqual(1000);
      expect(duration).toBeLessThanOrEqual(3000);
    }
  });
});
