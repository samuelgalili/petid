import assert from "node:assert/strict";
import test from "node:test";
import { createHmac } from "node:crypto";
import {
  cardcomAttemptToken,
  cardcomWebhookAuthorized,
  isSuccessfulCardcomCharge,
  parseCardcomReturnValue,
  parseVerifiedCardcomIndicator,
  readVerifiedCardcomNotification,
  settleCardcomNotification,
} from "../src/cardcom.js";

const orderId = "11111111-1111-4111-8111-111111111111";
const attemptToken = "creating:22222222-2222-4222-8222-222222222222";
const indicator = {
  TerminalNumber: "12345",
  LowProfileCode: "low-profile-1",
  Operation: "1",
  OperationResponse: "0",
  DealResponse: "0",
  CoinId: "1",
  "ExtShvaParams.Sum36": "10900",
  ReturnValue: JSON.stringify({
    order_id: orderId,
    order_number: "MIPO-1001",
    attempt_token: attemptToken,
  }),
};

test("CardCom indicator parsing binds provider identity and minor-unit amount", () => {
  const parsed = parseVerifiedCardcomIndicator(indicator, {
    requestedLowProfileCode: "low-profile-1",
    terminalNumber: "12345",
  });
  assert.equal(parsed.operation, 1);
  assert.equal(parsed.chargedAmountMinor, 10900);
  assert.equal(parsed.operationResponse, 0);
  assert.equal(parsed.dealResponse, 0);
  assert.deepEqual(parseCardcomReturnValue(parsed.returnValue), {
    orderId,
    orderNumber: "MIPO-1001",
    attemptToken,
  });
});

test("CardCom indicator parsing accepts a charge plus token operation", () => {
  const parsed = parseVerifiedCardcomIndicator({
    ...indicator,
    TerminalNumber: undefined,
    LowProfileCode: undefined,
    terminalnumber: "12345",
    lowprofilecode: "low-profile-1",
    Operation: "2",
    TokenResponse: "0",
  }, {
    requestedLowProfileCode: "low-profile-1",
    terminalNumber: "12345",
  });

  assert.equal(parsed.operation, 2);
  assert.equal(parsed.operationResponse, 0);
  assert.equal(parsed.dealResponse, 0);
  assert.equal(parsed.tokenResponse, 0);
  assert.equal(isSuccessfulCardcomCharge(parsed), true);
});

test("CardCom charge plus token failures are not treated as paid", () => {
  const parsed = parseVerifiedCardcomIndicator({
    ...indicator,
    Operation: "2",
    OperationResponse: "2006",
    DealResponse: "2006",
    TokenResponse: "2006",
  }, {
    requestedLowProfileCode: "low-profile-1",
    terminalNumber: "12345",
  });

  assert.equal(parsed.operation, 2);
  assert.equal(parsed.operationResponse, 2006);
  assert.equal(parsed.dealResponse, 2006);
  assert.equal(parsed.tokenResponse, 2006);
  assert.equal(isSuccessfulCardcomCharge(parsed), false);
});

test("CardCom indicator parsing accepts URL-encoded return values", () => {
  assert.equal(
    parseCardcomReturnValue(encodeURIComponent(indicator.ReturnValue)).attemptToken,
    attemptToken,
  );
});

test("CardCom indicator parsing rejects mismatched provider bindings", () => {
  const invalidIndicators = [
    { ...indicator, LowProfileCode: "different" },
    { ...indicator, TerminalNumber: "99999" },
    { ...indicator, Operation: "3" },
    { ...indicator, CoinId: "2" },
    { ...indicator, "ExtShvaParams.Sum36": "109.50" },
  ];

  for (const value of invalidIndicators) {
    assert.throws(
      () => parseVerifiedCardcomIndicator(value, {
        requestedLowProfileCode: "low-profile-1",
        terminalNumber: "12345",
      }),
      /Invalid CardCom indicator response/,
    );
  }
});

// The four IndicatorUrl calls Cardcom retried against production, with the
// webhook secret replaced. Cardcom's mail showed these query strings getting
// 502 {"error":"Invalid CardCom indicator response"}. The callback itself is
// not proof of payment. GetLowProfileIndicator is. For a decline that proof
// has the same shape as the callback: no CoinId and no ExtShvaParams.Sum36,
// and the 5116 call also omits DealResponse. For a capture, the indicator
// adds the currency and the amount in agorot.
const webhookSecret = "test-webhook-secret";
const terminalNumber = "168184";
const capturedAmountMinor = 15900;

const returnValue = (orderId, orderNumber, attempt) => JSON.stringify({
  order_id: orderId,
  order_number: orderNumber,
  attempt_token: attempt,
});

const alertUrl = (query) => {
  const params = new URLSearchParams({ token: webhookSecret, terminalnumber: terminalNumber });
  for (const [key, value] of Object.entries(query)) params.set(key, value);
  return `https://mipo.pet/api/payments/cardcom/webhook?${params.toString()}`;
};

const productionAlerts = [
  {
    name: "2006 NOTOK MIPO-20260811-CA060E",
    kind: "declined",
    query: {
      lowprofilecode: "8bf427aa-cdf1-45b2-b636-4553b6616c78",
      Operation: "2",
      DealRespone: "2006",
      DealResponse: "2006",
      TokenResponse: "2006",
      SuspendedDealResponseCode: "2006",
      InvoiceResponseCode: "2006",
      OperationResponse: "2006",
      OperationResponseText: "NOTOK",
      ReturnValue: returnValue(
        "8fff9d22-3a5c-47cb-a277-d88bd982e6ee",
        "MIPO-20260811-CA060E",
        "creating:cd5e02e3-2d25-427f-8d43-b5d0a4d2bfdc",
      ),
    },
  },
  {
    name: "success MIPO-20260818-8B5E6A",
    kind: "captured",
    query: {
      lowprofilecode: "0f4ceb24-a993-49b7-97b9-0f736a91180b",
      Operation: "2",
      DealRespone: "0",
      DealResponse: "0",
      TokenResponse: "0",
      InvoiceResponseCode: "0",
      OperationResponse: "0",
      OperationResponseText: "OK",
      ReturnValue: returnValue(
        "c5c296ba-4a2a-49bf-92b1-39932c797836",
        "MIPO-20260818-8B5E6A",
        "creating:0f7d0182-4114-4920-a6c7-261f12128273",
      ),
    },
  },
  {
    name: "2006 NOTOK MIPO-20260830-B7B4A1",
    kind: "declined",
    query: {
      lowprofilecode: "18477bb5-e0eb-42d5-b725-f8f01643d96d",
      Operation: "2",
      DealRespone: "2006",
      DealResponse: "2006",
      TokenResponse: "2006",
      SuspendedDealResponseCode: "2006",
      InvoiceResponseCode: "2006",
      OperationResponse: "2006",
      OperationResponseText: "NOTOK",
      ReturnValue: returnValue(
        "1ebfd4fa-d803-46a1-841f-67cb6f3c2118",
        "MIPO-20260830-B7B4A1",
        "creating:3ed170cf-fe17-4a3f-afe4-780cc767c7bf",
      ),
    },
  },
  {
    name: "5116 NOTOK missing fields MIPO-20260915-7273B1",
    kind: "declined",
    query: {
      lowprofilecode: "705ea714-dd94-4553-a1fc-02a7fb82dd0c",
      Operation: "2",
      OperationResponse: "5116",
      OperationResponseText: "NOTOK",
      ReturnValue: returnValue(
        "5d53011c-c35e-4554-ae55-5e12685ff499",
        "MIPO-20260915-7273B1",
        "creating:da7553c7-4b59-432c-af8c-4dec463b2252",
      ),
    },
  },
];

const callbackParams = (url) => Object.fromEntries(new URL(url).searchParams.entries());

const verifiedIndicator = (params, { captured = false } = {}) => {
  const indicator = { ...params, ResponseCode: "0", Description: "Low Profile Code Found" };
  delete indicator.token;
  if (captured) {
    indicator.CoinId = "1";
    indicator["ExtShvaParams.Sum36"] = String(capturedAmountMinor);
  }
  return indicator;
};

const decideAlert = (alert, {
  token = webhookSecret,
  order,
  bound,
  indicator,
}) => {
  const url = alertUrl({ ...alert.query, token });
  const params = callbackParams(url);
  if (!cardcomWebhookAuthorized({ queryToken: params.token, webhookSecret })) {
    const error = new Error("Invalid CardCom signature");
    error.statusCode = 401;
    throw error;
  }
  const opened = readVerifiedCardcomNotification({
    terminalNumber,
    requestedLowProfileCode: params.lowprofilecode,
    indicatorPayload: indicator || verifiedIndicator(params, { captured: alert.kind === "captured" }),
  });
  const plan = settleCardcomNotification({ opened, order, bound });
  return { opened, plan, params };
};

test("production Cardcom callbacks are acknowledged from the verified indicator", () => {
  for (const alert of productionAlerts) {
    const order = {
      paymentStatus: "pending",
      expectedAmountMinor: capturedAmountMinor,
    };
    const { opened, plan, params } = decideAlert(alert, { order, bound: true });
    assert.equal(opened.reference.orderNumber, alert.query.ReturnValue && JSON.parse(alert.query.ReturnValue).order_number);
    assert.equal(cardcomAttemptToken(opened.reference.attemptToken), JSON.parse(alert.query.ReturnValue).attempt_token);
    assert.equal(opened.parsed.lowProfileCode, params.lowprofilecode);
    assert.equal(opened.isSuccess, alert.kind === "captured");
    if (alert.kind === "captured") {
      assert.equal(plan.mutate, "pay");
      assert.equal(plan.emit, "paid");
      assert.equal(plan.paymentStatus, "paid");
      assert.equal(opened.parsed.chargedAmountMinor, capturedAmountMinor);
    } else {
      assert.equal(plan.mutate, "fail");
      assert.equal(plan.emit, "failed");
      assert.equal(plan.paymentStatus, "failed");
      assert.equal(opened.parsed.chargedAmountMinor, null);
    }
  }
});

test("the raw success callback is not enough to mark an order paid", () => {
  const alert = productionAlerts[1];
  const params = callbackParams(alertUrl(alert.query));
  delete params.token;
  assert.equal(params.OperationResponse, "0");
  assert.equal(params.CoinId, undefined);
  assert.equal(params["ExtShvaParams.Sum36"], undefined);
  assert.throws(
    () => parseVerifiedCardcomIndicator(params, {
      requestedLowProfileCode: params.lowprofilecode,
      terminalNumber,
    }),
    (error) => error.statusCode === 502 && /Invalid CardCom indicator response/.test(error.message),
  );
});

test("declined callbacks without a captured amount are failures, not 502s", () => {
  for (const alert of productionAlerts.filter((item) => item.kind === "declined")) {
    const params = callbackParams(alertUrl(alert.query));
    delete params.token;
    const parsed = parseVerifiedCardcomIndicator(params, {
      requestedLowProfileCode: params.lowprofilecode,
      terminalNumber,
    });
    assert.equal(isSuccessfulCardcomCharge(parsed), false);
    assert.equal(parsed.operationResponse, Number(alert.query.OperationResponse));
    if (alert.query.DealResponse === undefined) {
      assert.equal(parsed.dealResponse, null);
    } else {
      assert.equal(parsed.dealResponse, Number(alert.query.DealResponse));
    }
  }
});

test("a Cardcom callback cannot overrule the verified indicator", () => {
  const success = productionAlerts[1];
  const declined = productionAlerts[0];
  const order = { paymentStatus: "pending", expectedAmountMinor: capturedAmountMinor };
  const successParams = callbackParams(alertUrl(success.query));
  const declinedParams = callbackParams(alertUrl(declined.query));

  // Same low-profile deal the callback names. The outcome fields are the
  // other notification's. Only the indicator is allowed to decide.
  const querySaysPaid = decideAlert(success, {
    order,
    bound: true,
    indicator: verifiedIndicator({
      ...declinedParams,
      lowprofilecode: successParams.lowprofilecode,
      ReturnValue: successParams.ReturnValue,
    }, { captured: false }),
  });
  assert.equal(querySaysPaid.opened.isSuccess, false);
  assert.equal(querySaysPaid.plan.mutate, "fail");

  const querySaysDeclined = decideAlert(declined, {
    order,
    bound: true,
    indicator: verifiedIndicator({
      ...successParams,
      lowprofilecode: declinedParams.lowprofilecode,
      ReturnValue: declinedParams.ReturnValue,
    }, { captured: true }),
  });
  assert.equal(querySaysDeclined.opened.isSuccess, true);
  assert.equal(querySaysDeclined.plan.mutate, "pay");
});

test("replays of a captured payment and of a decline do not apply twice", () => {
  const success = productionAlerts[1];
  const decline = productionAlerts[3];
  const order = { paymentStatus: "pending", expectedAmountMinor: capturedAmountMinor };

  const firstPay = decideAlert(success, { order, bound: true });
  assert.equal(firstPay.plan.mutate, "pay");
  const replayPay = decideAlert(success, {
    order: { paymentStatus: "paid", expectedAmountMinor: capturedAmountMinor },
    bound: true,
  });
  assert.deepEqual(replayPay.plan, { mutate: "none", paymentStatus: "paid", emit: null });

  const recovered = decideAlert(success, {
    order: { paymentStatus: "failed", expectedAmountMinor: capturedAmountMinor },
    bound: false,
  });
  assert.equal(recovered.plan.mutate, "pay");
  assert.equal(recovered.plan.emit, "paid");

  const firstFail = decideAlert(decline, { order, bound: true });
  assert.equal(firstFail.plan.mutate, "fail");
  const replayFail = decideAlert(decline, {
    order: { paymentStatus: "failed", expectedAmountMinor: capturedAmountMinor },
    bound: false,
  });
  assert.deepEqual(replayFail.plan, { mutate: "none", paymentStatus: "failed", emit: null });

  const newerAttempt = decideAlert(decline, {
    order: { paymentStatus: "pending", expectedAmountMinor: capturedAmountMinor },
    bound: false,
  });
  assert.equal(newerAttempt.plan.mutate, "none");
  assert.equal(newerAttempt.plan.paymentStatus, "pending");
});

test("a bad Cardcom webhook token is rejected before the indicator is trusted", () => {
  const success = productionAlerts[1];
  assert.throws(
    () => decideAlert(success, {
      token: "wrong-token",
      order: { paymentStatus: "pending", expectedAmountMinor: capturedAmountMinor },
      bound: true,
    }),
    (error) => error.statusCode === 401 && error.message === "Invalid CardCom signature",
  );
  assert.equal(cardcomWebhookAuthorized({
    queryToken: "",
    webhookSecret,
  }), false);
  assert.equal(cardcomWebhookAuthorized({
    queryToken: webhookSecret,
    webhookSecret: `${webhookSecret}-extra`,
  }), false);

  const rawBody = "OperationResponse=0";
  const signature = createHmac("sha256", webhookSecret).update(rawBody).digest("base64");
  assert.equal(cardcomWebhookAuthorized({
    queryToken: "wrong-token",
    webhookSecret,
    rawBody,
    signature,
  }), true);
  assert.equal(cardcomWebhookAuthorized({
    queryToken: "wrong-token",
    webhookSecret,
    rawBody,
    signature: `${signature}x`,
  }), false);
});

test("a verified capture whose amount is not the order total is not paid", () => {
  const success = productionAlerts[1];
  assert.throws(
    () => decideAlert(success, {
      order: { paymentStatus: "pending", expectedAmountMinor: capturedAmountMinor + 1 },
      bound: true,
    }),
    (error) => error.statusCode === 409,
  );
});

test("a decline for another terminal is not an acknowledgement", () => {
  const decline = productionAlerts[2];
  const params = callbackParams(alertUrl(decline.query));
  delete params.token;
  assert.throws(
    () => parseVerifiedCardcomIndicator(params, {
      requestedLowProfileCode: params.lowprofilecode,
      terminalNumber: "999999",
    }),
    /Invalid CardCom indicator response/,
  );
  assert.throws(
    () => parseVerifiedCardcomIndicator({
      ...params,
      lowprofilecode: params.lowprofilecode.toUpperCase(),
    }, {
      requestedLowProfileCode: "not-the-code",
      terminalNumber,
    }),
    /Invalid CardCom indicator response/,
  );
  const parsed = parseVerifiedCardcomIndicator({
    ...params,
    lowprofilecode: params.lowprofilecode.toUpperCase(),
  }, {
    requestedLowProfileCode: params.lowprofilecode,
    terminalNumber,
  });
  assert.equal(parsed.operationResponse, 2006);
});
