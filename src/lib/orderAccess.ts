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
