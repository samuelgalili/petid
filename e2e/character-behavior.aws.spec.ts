import { test, expect } from "@playwright/test";
import {
  CHARACTER_REACTIONS,
  EVENT_COOLDOWN_MS,
  MOOD_COMPOSITION,
  MOOD_EXPRESSION,
  decideReaction,
  isCharacterEvent,
  resolveBaseMood,
} from "../src/lib/characterBehavior";

/**
 * Exercises the companion's behaviour rules against the real module.
 *
 * The module is imported here rather than inside a page. It used to be loaded
 * with a dynamic import of "/src/lib/characterBehavior.ts", which only ever
 * resolved against the dev server: locally the suite runs on vite, which
 * serves the sources, while CI runs on the production preview, where that path
 * does not exist and every test in this file failed on a missing module. The
 * arbitration is pure — no DOM, no timers, only a type-only import — so
 * importing it directly tests the same code and runs the same way everywhere.
 */

test.describe("Companion behaviour", () => {
  test("neutral is a real mood and maps to a generated expression", () => {
    expect(Object.keys(MOOD_COMPOSITION)).toEqual([
      "neutral", "happy", "excited", "curious", "concerned",
    ]);
    // The bug this replaced: neutral asked for an expression that is never generated.
    expect(MOOD_EXPRESSION.neutral).toBeTruthy();
    expect(Object.values(MOOD_EXPRESSION).every(Boolean)).toBe(true);
  });

  test("each event resolves to its specified mood", () => {
    expect({
      order_delivered: CHARACTER_REACTIONS.order_delivered.mood,
      vaccination_upcoming: CHARACTER_REACTIONS.vaccination_upcoming.mood,
      chat_reply_received: CHARACTER_REACTIONS.chat_reply_received.mood,
      health_score_improved: CHARACTER_REACTIONS.health_score_improved.mood,
      health_score_declined: CHARACTER_REACTIONS.health_score_declined.mood,
    }).toEqual({
      order_delivered: "excited",
      vaccination_upcoming: "concerned",
      chat_reply_received: "curious",
      health_score_improved: "happy",
      health_score_declined: "concerned",
    });
  });

  test("a repeated event inside the cooldown is ignored", () => {
    const first = decideReaction("order_delivered", { now: 1_000, lastShownAt: null });
    const replay = decideReaction("order_delivered", { now: 2_000, lastShownAt: 1_000 });
    const later = decideReaction("order_delivered", {
      now: 1_000 + EVENT_COOLDOWN_MS + 1, lastShownAt: 1_000,
    });

    expect(first.action).toBe("start");
    expect(replay).toEqual({ action: "ignore", because: "cooldown" });
    expect(later.action).toBe("start");
  });

  test("a higher-priority event interrupts, a lower one does not", () => {
    // concerned outranks a parcel arriving
    expect(decideReaction("health_score_declined", {
      active: { reaction: CHARACTER_REACTIONS.order_delivered, startedAt: 1_000 },
      now: 1_200,
    }).action).toBe("start");

    // the parcel does not outrank an active concern
    expect(decideReaction("order_delivered", {
      active: { reaction: CHARACTER_REACTIONS.health_score_declined, startedAt: 1_000 },
      now: 1_200,
    })).toEqual({ action: "ignore", because: "outranked" });

    // an equal peer waits its turn rather than cutting in
    expect(decideReaction("chat_reply_received", {
      active: { reaction: CHARACTER_REACTIONS.health_score_improved, startedAt: 1_000 },
      now: 1_200,
    })).toEqual({ action: "ignore", because: "outranked" });
  });

  test("an event that has finished no longer blocks the next one", () => {
    const active = { reaction: CHARACTER_REACTIONS.health_score_declined, startedAt: 1_000 };
    const after = 1_000 + CHARACTER_REACTIONS.health_score_declined.duration + 1;

    expect(decideReaction("order_delivered", { active, now: after }).action).toBe("start");
  });

  test("the base mood is neutral, attention outranks a self-reported mood", () => {
    const moodLabels = { "שמחה": "happy" as const };

    expect(resolveBaseMood({ hasAttention: false })).toBe("neutral");
    expect(resolveBaseMood({ hasAttention: false, moodLabel: "שמחה", moodLabels })).toBe("happy");
    expect(resolveBaseMood({ hasAttention: true, moodLabel: "שמחה", moodLabels })).toBe("concerned");
    expect(resolveBaseMood({ hasAttention: false, moodLabel: "???", moodLabels })).toBe("neutral");
  });

  test("unknown event names are rejected rather than played", () => {
    expect(isCharacterEvent("order_delivered")).toBe(true);
    expect(isCharacterEvent("order_refunded")).toBe(false);
    expect(isCharacterEvent(42)).toBe(false);
    expect(isCharacterEvent("toString")).toBe(false);
  });

  test("every reaction is short enough to read as a reaction, not a mood change", () => {
    for (const reaction of Object.values(CHARACTER_REACTIONS)) {
      expect(reaction.duration).toBeGreaterThanOrEqual(1000);
      expect(reaction.duration).toBeLessThanOrEqual(3000);
    }
  });
});
