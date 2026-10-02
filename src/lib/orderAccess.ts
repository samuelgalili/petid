import type { MipoOrder } from "@/lib/mipoApi";

const ORDER_IDS_KEY = "mipo_order_ids";
const ORDER_TOKENS_KEY = "mipo_order_access_tokens";
const MAX_REMEMBERED_ORDERS = 50;

const readOrderIds = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(ORDER_IDS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
};

const readTokens = (): Record<string, string> => {
  try {
    const parsed = JSON.parse(localStorage.getItem(ORDER_TOKENS_KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
  } catch {
    return {};
  }
};

export const rememberOrderAccess = (order: Pick<MipoOrder, "id" | "order_number">, accessToken?: string) => {
  const ids = [order.id, ...readOrderIds().filter((id) => id !== order.id)].slice(0, MAX_REMEMBERED_ORDERS);
  localStorage.setItem(ORDER_IDS_KEY, JSON.stringify(ids));

  if (!accessToken) return;
  const tokens = readTokens();
  const boundedTokens = Object.fromEntries(
    [
      [order.id, accessToken],
      [order.order_number, accessToken],
      ...Object.entries(tokens).filter(([key]) => key !== order.id && key !== order.order_number),
    ].slice(0, MAX_REMEMBERED_ORDERS * 2),
  );
  localStorage.setItem(ORDER_TOKENS_KEY, JSON.stringify(boundedTokens));
};

export const getRememberedOrderIds = () => readOrderIds().slice(0, MAX_REMEMBERED_ORDERS);

export const getOrderAccessToken = (orderIdOrNumber: string | null | undefined) => {
  if (!orderIdOrNumber) return undefined;
  return readTokens()[orderIdOrNumber];
};

const LINK_TOKEN_PREFIX = "mipo_order_link_token:";
const MAX_LINK_TOKEN_LENGTH = 512;

const linkTokenKey = (orderKey: string) => `${LINK_TOKEN_PREFIX}${orderKey}`;

/**
 * The confirmation mail puts `access_token` on the tracking URL. Read it once
 * and keep it for this tab, so a remount that has already dropped the query
 * can still send the same token. The value is not written to the console.
 */
export const captureOrderLinkToken = (orderKey: string | null | undefined): string => {
  if (!orderKey || typeof window === "undefined") return "";
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("access_token")?.trim() || "";
    if (fromUrl && fromUrl.length <= MAX_LINK_TOKEN_LENGTH) {
      sessionStorage.setItem(linkTokenKey(orderKey), fromUrl);
      return fromUrl;
    }
    const stored = sessionStorage.getItem(linkTokenKey(orderKey)) || "";
    return stored.length <= MAX_LINK_TOKEN_LENGTH ? stored : "";
  } catch {
    return "";
  }
};

export const clearCapturedOrderLinkToken = (orderKey: string | null | undefined) => {
  if (!orderKey) return;
  try {
    sessionStorage.removeItem(linkTokenKey(orderKey));
  } catch {
    // Storage can be blocked. The request already used the token it captured.
  }
};
