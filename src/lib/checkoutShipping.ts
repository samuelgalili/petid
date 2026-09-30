import { z } from "zod";

export const SHIPPING_FIELD_NAMES = [
  "fullName",
  "email",
  "phone",
  "address",
  "city",
  "zipCode",
] as const;

export type ShippingFieldName = (typeof SHIPPING_FIELD_NAMES)[number];

export type ShippingFieldValues = Record<ShippingFieldName, string>;

export const EMPTY_SHIPPING_VALUES: ShippingFieldValues = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  zipCode: "",
};

export const shippingSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "שם מלא חייב להכיל לפחות 2 תווים")
    .max(100, "שם מלא חייב להכיל פחות מ-100 תווים"),
  email: z
    .string()
    .trim()
    .email("כתובת אימייל לא תקינה")
    .max(255, "אימייל חייב להכיל פחות מ-255 תווים"),
  phone: z.string().regex(/^[0-9]{9,15}$/, "מספר טלפון חייב להכיל 9-15 ספרות"),
  address: z
    .string()
    .trim()
    .min(5, "כתובת חייבת להכיל לפחות 5 תווים")
    .max(200, "כתובת חייבת להכיל פחות מ-200 תווים"),
  city: z
    .string()
    .trim()
    .min(2, "עיר חייבת להכיל לפחות 2 תווים")
    .max(50, "עיר חייבת להכיל פחות מ-50 תווים"),
  zipCode: z.string().regex(/^[0-9]{5,7}$/, "מיקוד חייב להכיל 5-7 ספרות"),
});

export const TERMS_REQUIRED_MESSAGE = "יש לאשר את תנאי השימוש כדי להמשיך";

type LiveShippingSource = Partial<ShippingFieldValues> | HTMLFormElement | null | undefined;

function isHtmlFormElement(value: LiveShippingSource): value is HTMLFormElement {
  return typeof HTMLFormElement !== "undefined" && value instanceof HTMLFormElement;
}

function readNamedInputValue(form: HTMLFormElement, name: ShippingFieldName): string | null {
  const el = form.elements.namedItem(name);
  if (!el) return null;
  if (typeof RadioNodeList !== "undefined" && el instanceof RadioNodeList) {
    return String(el.value ?? "");
  }
  if ("value" in el) {
    return String((el as HTMLInputElement).value ?? "");
  }
  return null;
}

/**
 * Prefer the value actually shown in the field (DOM / live object).
 * This avoids false-empty validation when browser autofill or formatting
 * filled the input without updating React state.
 */
export function collectShippingValues(
  state: ShippingFieldValues,
  live?: LiveShippingSource,
): ShippingFieldValues {
  const collected = { ...EMPTY_SHIPPING_VALUES };

  for (const name of SHIPPING_FIELD_NAMES) {
    let liveValue: string | null = null;

    if (isHtmlFormElement(live)) {
      liveValue = readNamedInputValue(live, name);
    } else if (live && typeof live === "object" && name in live) {
      const raw = live[name];
      liveValue = raw == null ? "" : String(raw);
    }

    const stateValue = state[name] ?? "";
    if (liveValue === null) {
      collected[name] = stateValue;
      continue;
    }
    // Never treat a filled field as empty: prefer the non-empty source.
    collected[name] = liveValue.trim() ? liveValue : stateValue || liveValue;
  }

  return collected;
}

export function normalizeShippingValues(values: ShippingFieldValues): ShippingFieldValues {
  return {
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    phone: values.phone.replace(/[^\d]/g, ""),
    address: values.address.trim(),
    city: values.city.trim(),
    zipCode: values.zipCode.replace(/[^\d]/g, ""),
  };
}

export type ShippingValidationResult =
  | { ok: true; values: ShippingFieldValues }
  | { ok: false; errors: Record<string, string>; values: ShippingFieldValues };

export function validateShippingStep(input: {
  fields: ShippingFieldValues;
  acceptedTerms: boolean;
  live?: LiveShippingSource;
}): ShippingValidationResult {
  const collected = collectShippingValues(input.fields, input.live);
  const values = normalizeShippingValues(collected);
  const errors: Record<string, string> = {};

  const parsed = shippingSchema.safeParse(values);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !errors[key]) {
        errors[key] = issue.message;
      }
    }
  }

  if (!input.acceptedTerms) {
    errors.acceptedTerms = TERMS_REQUIRED_MESSAGE;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, values };
  }

  return { ok: true, values };
}
