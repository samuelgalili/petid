const indicatorError = () => Object.assign(
  new Error("Invalid CardCom indicator response"),
  { statusCode: 502 },
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

  if (operationResponse === null
    || lowProfileCode !== requestedLowProfileCode
    || returnedTerminalNumber !== String(terminalNumber)
    || operation !== 1
    || coinId !== 1
    || !Number.isInteger(chargedAmountMinor)) {
    throw indicatorError();
  }

  return {
    lowProfileCode,
    chargedAmountMinor,
    operationResponse,
    dealResponse: getCardcomNumber(indicatorPayload, ["DealResponse", "dealresponse"]),
    returnValue: getCardcomString(indicatorPayload, ["ReturnValue", "returnvalue"]),
  };
};
