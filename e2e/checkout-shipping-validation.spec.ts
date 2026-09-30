import { test, expect } from "@playwright/test";
import {
  EMPTY_SHIPPING_VALUES,
  TERMS_REQUIRED_MESSAGE,
  collectShippingValues,
  normalizeShippingValues,
  validateShippingStep,
} from "../src/lib/checkoutShipping";

const validFormattedAddress = {
  fullName: "  ישראל ישראלי  ",
  email: "  israel@example.com  ",
  phone: "050-123-4567",
  address: "רחוב הרצל 123, דירה 4",
  city: "תל אביב",
  zipCode: "12 345",
};

test.describe("AC-S4 shipping validation", () => {
  test("AC-S4-1: formatted filled fields are not false-empty", () => {
    const result = validateShippingStep({
      fields: validFormattedAddress,
      acceptedTerms: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.values.phone).toBe("0501234567");
      expect(result.values.zipCode).toBe("12345");
      expect(result.values.fullName).toBe("ישראל ישראלי");
      expect(result.values.email).toBe("israel@example.com");
    }
  });

  test("AC-S4-1: live DOM-like values win over empty React state", () => {
    const collected = collectShippingValues(EMPTY_SHIPPING_VALUES, validFormattedAddress);
    expect(collected.address).toBe("רחוב הרצל 123, דירה 4");
    expect(collected.phone).toBe("050-123-4567");

    const result = validateShippingStep({
      fields: EMPTY_SHIPPING_VALUES,
      acceptedTerms: true,
      live: validFormattedAddress,
    });
    expect(result.ok).toBe(true);
  });

  test("AC-S4-1: React state still counts when live source is empty", () => {
    const result = validateShippingStep({
      fields: {
        fullName: "ישראל ישראלי",
        email: "israel@example.com",
        phone: "0501234567",
        address: "רחוב הרצל 123",
        city: "חיפה",
        zipCode: "1234567",
      },
      acceptedTerms: true,
      live: EMPTY_SHIPPING_VALUES,
    });
    expect(result.ok).toBe(true);
  });

  test("AC-S4-1: empty fields still fail", () => {
    const result = validateShippingStep({
      fields: EMPTY_SHIPPING_VALUES,
      acceptedTerms: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.fullName).toBeTruthy();
      expect(result.errors.address).toBeTruthy();
    }
  });

  test("AC-S4-3: terms must be explicitly checked", () => {
    const result = validateShippingStep({
      fields: validFormattedAddress,
      acceptedTerms: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.acceptedTerms).toBe(TERMS_REQUIRED_MESSAGE);
    }
  });

  test("normalizes international and dashed phones", () => {
    const values = normalizeShippingValues({
      ...validFormattedAddress,
      phone: "+972 50-123-4567",
    });
    expect(values.phone).toBe("972501234567");
  });
});
