// Client-side behaviour reporting.
//
// The server records what it can vouch for — orders, registrations, sign-ins.
// Everything else happens in the browser and leaves no trace unless it is sent:
// which products were looked at, what was searched for, what went into a cart
// and never came out. None of it can be reconstructed after the fact, so it is
// captured as it happens.
//
// Reporting must never be visible to the person using the app. Events are
// batched, sent in the background, and every failure is swallowed. A dropped
// event is an acceptable loss; a checkout blocked behind an analytics request
// is not.

const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
const SESSION_STORAGE_KEY = "mipo_session_id";

const FLUSH_DELAY_MS = 2000;
const MAX_BATCH = 20;
// Roughly two full batches. Past this the visitor is offline or the endpoint is
// down, and holding more only risks memory for data nobody will read.
const MAX_QUEUE = 40;

export type ClientEventType =
  | "product.viewed"
  | "product.list_viewed"
  | "search.performed"
  | "search.no_results"
  | "cart.item_added"
  | "cart.item_removed"
  | "cart.viewed"
  | "checkout.started"
  | "checkout.abandoned"
  | "category.viewed"
  | "page.viewed";

interface TrackedEvent {
  event_type: ClientEventType;
  entity_type?: string;
  entity_id?: string;
  payload?: Record<string, unknown>;
  occurred_at?: string;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const createId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

// The id survives reloads and return visits, which is the whole point: it is
// what lets a purchase be connected to the browsing that led to it days
// earlier. It identifies a browser, never a person — the server decides who
// that browser belongs to once they sign in.
export const getSessionId = (): string => {
  if (typeof window === "undefined") return "";

  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;

    const created = createId();
    window.localStorage.setItem(SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    // Private browsing, or storage disabled. Reporting degrades rather than
    // throwing into whatever called it.
    return "";
  }
};

let queue: TrackedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersAttached = false;

const postEvents = (events: TrackedEvent[], useBeacon: boolean): void => {
  if (events.length === 0) return;

  const body = JSON.stringify({ session_id: getSessionId(), events });
  const url = `${API_BASE_URL}/events`;

  // On the way out of the page a normal fetch is cancelled mid-flight, so the
  // last events of a visit — often the most interesting ones — would be lost.
  if (useBeacon && typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    try {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      return;
    } catch {
      // Fall through to fetch.
    }
  }

  void fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    // Reporting is best effort by design.
  });
};

const flush = (useBeacon = false): void => {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  while (queue.length > 0) {
    postEvents(queue.splice(0, MAX_BATCH), useBeacon);
  }
};

const attachLifecycleListeners = (): void => {
  if (listenersAttached || typeof document === "undefined") return;
  listenersAttached = true;

  // pagehide covers navigation and tab close; visibilitychange covers the
  // mobile case of switching apps, where pagehide may never fire.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
  window.addEventListener("pagehide", () => flush(true));
};

export const trackEvent = (
  eventType: ClientEventType,
  options: Omit<TrackedEvent, "event_type"> = {},
): void => {
  if (typeof window === "undefined") return;

  attachLifecycleListeners();

  // A malformed id would be dropped server-side anyway; omitting it here keeps
  // the event itself, which still carries the type and payload.
  const entityId = options.entity_id && uuidPattern.test(options.entity_id)
    ? options.entity_id
    : undefined;

  queue.push({
    event_type: eventType,
    entity_type: options.entity_type,
    entity_id: entityId,
    payload: options.payload,
    occurred_at: new Date().toISOString(),
  });

  if (queue.length > MAX_QUEUE) {
    queue = queue.slice(-MAX_QUEUE);
  }

  if (queue.length >= MAX_BATCH) {
    flush();
    return;
  }

  if (!flushTimer) {
    flushTimer = setTimeout(() => flush(), FLUSH_DELAY_MS);
  }
};

// Exposed for the rare caller that needs the queue drained now, such as a
// deliberate sign-out.
export const flushEvents = (): void => flush(true);
