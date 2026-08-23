import assert from "node:assert/strict";
import test from "node:test";
import {
  isSuccessfulCardcomCharge,
  parseCardcomReturnValue,
  parseVerifiedCardcomIndicator,
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
