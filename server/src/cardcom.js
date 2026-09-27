import { createHmac, timingSafeEqual } from "node:crypto";

const indicatorError = () => Object.assign(
  new Error("Invalid CardCom indicator response"),
  { statusCode: 502 },
);

const chargeOperations = new Set([1, 2]);
const orderIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const secretsEqual = (actual, expected) => {
  if (!actual || !expected) return false;
  const actualBuffer = Buffer.from(String(actual));
  const expectedBuffer = Buffer.from(String(expected));
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
};

const sameCardcomId = (left, right) => (
  String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase()
);

export const getCardcomString = (source, keys) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value === null || value === undefined) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return null;
};

export const getCardcomNumber = (source, keys) => {
  const raw = getCardcomString(source, keys);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

export const parseCardcomReturnValue = (rawReturnValue) => {
  if (!rawReturnValue) return { orderId: null, orderNumber: null, attemptToken: null };

  const tryParse = (value) => {
    try {
      const parsed = JSON.parse(value);
      return {
        orderId: parsed?.order_id ? String(parsed.order_id) : null,
        orderNumber: parsed?.order_number ? String(parsed.order_number) : null,
        attemptToken: parsed?.attempt_token ? String(parsed.attempt_token) : null,
      };
    } catch {
      return null;
    }
  };

  const direct = tryParse(rawReturnValue);
  if (direct) return direct;

  try {
    return tryParse(decodeURIComponent(rawReturnValue))
      || { orderId: null, orderNumber: null, attemptToken: null };
  } catch {
    return { orderId: null, orderNumber: null, attemptToken: null };
  }
};

export const cardcomAttemptToken = (attemptToken) => (
  /^creating:[0-9a-fA-F-]{36}$/.test(String(attemptToken || "")) ? String(attemptToken) : null
);

// Cardcom calls IndicatorUrl with the secret in the query string. A body
// signature is accepted as well, for a POST delivery that actually carries one.
// Either proof must be checked before the indicator is fetched: a bad token
// is not a reason to ask Cardcom about a low-profile code.
export const cardcomWebhookAuthorized = ({
  queryToken,
  webhookSecret,
  rawBody,
  signature,
}) => {
  if (secretsEqual(queryToken, webhookSecret)) return true;
  if (!rawBody || !signature || !webhookSecret) return false;
  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("base64");
  return secretsEqual(signature, expected);
};

// GetLowProfileIndicator is the only payload allowed to decide a payment.
// IndicatorUrl's query string is a nudge to go and ask; it is not the proof.
//
// A captured charge (OperationResponse 0 and DealResponse 0) has to name the
// terminal, the low-profile code, ILS, and the amount in agorot
// (ExtShvaParams.Sum36). Those last two exist only once a card was actually
// sent to the credit company.
//
// A decline is still a real notification. Cardcom omits DealResponse when no
// card was debited (5116 is one of those), and omits CoinId and Sum36 when
// there is nothing to total. Requiring the capture fields on a decline made
// every such callback throw "Invalid CardCom indicator response" (HTTP 502),
// so Cardcom retried and emailed. A decline is recorded and acknowledged.
// It is never treated as paid.
export const parseVerifiedCardcomIndicator = (indicatorPayload, {
  requestedLowProfileCode,
  terminalNumber,
}) => {
  const lowProfileCode = getCardcomString(indicatorPayload, [
    "LowProfileCode",
    "lowprofilecode",
    "LowProfileId",
  ]);
  const returnedTerminalNumber = getCardcomString(indicatorPayload, ["TerminalNumber", "terminalnumber"]);
  const operation = getCardcomNumber(indicatorPayload, ["Operation", "operation"]);
  const coinId = getCardcomNumber(indicatorPayload, ["CoinId", "CoinID", "coinid"]);
  const chargedAmountMinor = getCardcomNumber(indicatorPayload, [
    "ExtShvaParams.Sum36",
    "extshvaparams.sum36",
    "Sum36",
    "sum36",
  ]);
  const operationResponse = getCardcomNumber(indicatorPayload, ["OperationResponse", "operationresponse"]);
  // Cardcom's name-value API spells this both ways. DealResponse is the
  // documented field; DealRespone (no second s) is what their samples send
  // alongside it. Prefer the documented name when both are present.
  const dealResponse = getCardcomNumber(indicatorPayload, [
    "DealResponse",
    "dealresponse",
    "DealRespone",
    "dealrespone",
  ]);
  const expectedTerminal = String(terminalNumber ?? "").trim();
  const captured = operationResponse === 0 && dealResponse === 0;
  const declined = operationResponse !== null && operationResponse !== 0;

  if (operationResponse === null
    || !lowProfileCode
    || !sameCardcomId(lowProfileCode, requestedLowProfileCode)
    || returnedTerminalNumber !== expectedTerminal
    // Operations 1 (charge) and 2 (charge plus token) are the only ones that
    // take money. Token-only and suspended deals are not shop charges.
    || !chargeOperations.has(operation)
    || (!captured && !declined)
    || (captured && (coinId !== 1 || !Number.isInteger(chargedAmountMinor)))) {
    throw indicatorError();
  }

  return {
    lowProfileCode,
    operation,
    chargedAmountMinor,
    operationResponse,
    dealResponse,
    tokenResponse: getCardcomNumber(indicatorPayload, ["TokenResponse", "tokenresponse"]),
    returnValue: getCardcomString(indicatorPayload, ["ReturnValue", "returnvalue"]),
  };
};

export const isSuccessfulCardcomCharge = ({ operationResponse, dealResponse }) => (
  operationResponse === 0 && dealResponse === 0
);

export const readVerifiedCardcomNotification = ({
  terminalNumber,
  requestedLowProfileCode,
  indicatorPayload,
}) => {
  if (!requestedLowProfileCode) {
    throw Object.assign(new Error("Missing LowProfileCode"), { statusCode: 400 });
  }
  const parsed = parseVerifiedCardcomIndicator(indicatorPayload, {
    requestedLowProfileCode,
    terminalNumber,
  });
  const reference = parseCardcomReturnValue(parsed.returnValue);
  if (!reference.orderId || !orderIdPattern.test(reference.orderId)) {
    throw Object.assign(new Error("Invalid CardCom order reference"), { statusCode: 400 });
  }
  return {
    parsed,
    reference,
    isSuccess: isSuccessfulCardcomCharge(parsed),
  };
};

// `bound` means this notification's low-profile code or attempt token is still
// the order's current payment_transaction_id. A decline may only fail that
// attempt. A verified capture may mark the order paid even when the stored
// attempt id was cleared, because the money already moved and the order id
// came back from Cardcom's indicator, not from the caller.
export const planCardcomNotification = ({ bound, paymentStatus, isSuccess }) => {
  if (isSuccess) {
    if (paymentStatus === "paid" || paymentStatus === "refunded") {
      return { mutate: "none", paymentStatus, emit: null };
    }
    return { mutate: "pay", paymentStatus: "paid", emit: "paid" };
  }
  if (!bound || paymentStatus === "paid" || paymentStatus === "refunded") {
    return { mutate: "none", paymentStatus, emit: null };
  }
  return { mutate: "fail", paymentStatus: "failed", emit: "failed" };
};

export const settleCardcomNotification = ({ opened, order, bound }) => {
  if (!order) {
    throw Object.assign(new Error("Order not found"), { statusCode: 404 });
  }
  if (opened.isSuccess && opened.parsed.chargedAmountMinor !== order.expectedAmountMinor) {
    throw Object.assign(
      new Error("CardCom payment amount does not match the order"),
      { statusCode: 409 },
    );
  }
  return planCardcomNotification({
    bound: Boolean(bound),
    paymentStatus: order.paymentStatus,
    isSuccess: opened.isSuccess,
  });
};
