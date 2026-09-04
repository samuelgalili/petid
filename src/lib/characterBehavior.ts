import type { MipoPetCharacterExpression } from "@/lib/mipoApi";

/**
 * The companion's behaviour rules, kept as pure data and pure functions so the
 * arbitration can be reasoned about and tested without a browser.
 *
 * Two sources drive what the character shows:
 *
 *   BASE MOOD   what the pet's situation says right now (mood check-in, an
 *               outstanding attention item, or nothing at all)
 *   EVENT       something that just happened, shown briefly and then released
 *
 * An event never changes the base mood. It wins for its duration, then the
 * character falls back to whatever the base mood was all along.
 */

export type CharacterMood =
  | "neutral"
  | "happy"
  | "excited"
  | "curious"
  | "concerned";

export type CharacterEvent =
  | "order_delivered"
  | "vaccination_upcoming"
  | "chat_reply_received"
  | "health_score_improved"
  | "health_score_declined";

export interface CharacterReaction {
  event: CharacterEvent;
  mood: CharacterMood;
  /** Milliseconds the reaction holds before the character returns to its mood. */
  duration: number;
  /** Higher wins when two events land close together. */
  priority: number;
}

/**
 * Which generated image each mood shows.
 *
 * The image pack holds six expressions and none of them is called "neutral".
 * Adding a seventh would be a seventh image generated per pet, and character
 * art is by far the largest AI cost in the product — so neutral maps onto
 * "proud", which the generator prompts as an upright posture with a gentle
 * smile and calm eyes. That is a resting face. The stillness of the resting
 * state comes from the idle animation, not from a separate picture.
 *
 * Before this mapping existed the home screen asked for `expressions.neutral`,
 * got undefined, and silently fell back to the uploaded photo — so the
 * generated character was invisible whenever no mood and no attention item was
 * active, which is most of the time.
 */
export const MOOD_EXPRESSION: Record<CharacterMood, MipoPetCharacterExpression> = {
  neutral: "proud",
  happy: "happy",
  excited: "celebrate",
  curious: "curious",
  concerned: "attentive",
};

/**
 * The composable description of each mood. Nothing renders from this yet — the
 * current character is a generated raster, not a rigged figure — but it is the
 * contract an illustrated or layered character would implement, and it keeps
 * the vocabulary in one place instead of scattered through components.
 */
export interface MoodComposition {
  eyes: string;
  mouth: string;
  eyebrows: string;
  head: string;
  body: string;
}

export const MOOD_COMPOSITION: Record<CharacterMood, MoodComposition> = {
  neutral: { eyes: "soft", mouth: "rest", eyebrows: "relaxed", head: "neutral", body: "calm" },
  happy: { eyes: "brighter", mouth: "subtle_smile", eyebrows: "relaxed", head: "neutral", body: "relaxed_positive" },
  excited: { eyes: "bright", mouth: "open_smile", eyebrows: "raised", head: "lifted", body: "forward_positive" },
  curious: { eyes: "focused", mouth: "closed_soft", eyebrows: "one_raised", head: "tilt", body: "attentive" },
  concerned: { eyes: "focused", mouth: "neutral_soft", eyebrows: "slightly_raised", head: "subtle_tilt", body: "attentive" },
};

/**
 * Priorities are about what the person needs to notice, not about how pleasant
 * the news is. A declining health score or a vaccination coming up should not
 * be buried under a parcel arriving.
 */
export const CHARACTER_REACTIONS: Record<CharacterEvent, CharacterReaction> = {
  health_score_declined: { event: "health_score_declined", mood: "concerned", duration: 2600, priority: 30 },
  vaccination_upcoming: { event: "vaccination_upcoming", mood: "concerned", duration: 2600, priority: 30 },
  chat_reply_received: { event: "chat_reply_received", mood: "curious", duration: 2200, priority: 20 },
  health_score_improved: { event: "health_score_improved", mood: "happy", duration: 2400, priority: 20 },
  order_delivered: { event: "order_delivered", mood: "excited", duration: 1800, priority: 10 },
};

export const isCharacterEvent = (value: unknown): value is CharacterEvent =>
  typeof value === "string"
  && Object.prototype.hasOwnProperty.call(CHARACTER_REACTIONS, value);

/** How long the same event is ignored after it has been shown once. */
export const EVENT_COOLDOWN_MS = 60_000;

export interface ActiveReaction {
  reaction: CharacterReaction;
  /** When it started, so the remaining time can be worked out. */
  startedAt: number;
}

/**
 * Decides what a newly arrived event should do to whatever is on screen.
 *
 * - "start"  nothing is playing, or the new event outranks what is
 * - "ignore" it is on cooldown, or it loses to a higher-priority reaction
 *
 * Equal priority does not interrupt: a reaction that is already playing gets to
 * finish rather than being cut off by a peer, which is what stops two events
 * arriving together from stacking or flickering.
 */
export const decideReaction = (
  event: CharacterEvent,
  {
    active,
    lastShownAt,
    now = Date.now(),
    cooldownMs = EVENT_COOLDOWN_MS,
  }: {
    active?: ActiveReaction | null;
    lastShownAt?: number | null;
    now?: number;
    cooldownMs?: number;
  } = {},
): { action: "start"; reaction: CharacterReaction } | { action: "ignore"; because: "cooldown" | "outranked" } => {
  const next = CHARACTER_REACTIONS[event];

  // A webhook retry, a refetch or a remount should not replay the same moment.
  if (typeof lastShownAt === "number" && now - lastShownAt < cooldownMs) {
    return { action: "ignore", because: "cooldown" };
  }

  if (active && now - active.startedAt < active.reaction.duration) {
    if (next.priority <= active.reaction.priority) {
      return { action: "ignore", because: "outranked" };
    }
  }

  return { action: "start", reaction: next };
};

/**
 * The mood shown when no event is playing. Attention beats a self-reported
 * mood: something the app is worried about outranks how the day is going.
 */
export const resolveBaseMood = ({
  hasAttention,
  moodLabel,
  moodLabels,
}: {
  hasAttention: boolean;
  moodLabel?: string | null;
  moodLabels?: Record<string, CharacterMood>;
}): CharacterMood => {
  if (hasAttention) return "concerned";
  if (moodLabel && moodLabels && moodLabels[moodLabel]) return moodLabels[moodLabel];
  return "neutral";
};
