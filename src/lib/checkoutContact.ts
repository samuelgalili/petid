import { z } from "zod";

/**
 * Checkout contact rules shared by the shipping step.
 *
 * Phone and zip are checked as digits, but people (and browser autofill)
 * type "050-123-4567" and "12 345". Those used to look filled and still fail
 * the digits-only pattern. Normalization happens before the schema, and a
 * filled DOM value wins over empty React state so autofill is not ignored.
 */

export const digitsOnly = (value: string) => value.replace(/\D/g, "");

export type CheckoutShippingInput = {
  fullName: string;
  email: string;
  phone: string;
  phoneSecondary: string;
  address: string;
  building: string;
  entranceType: "house" | "building";
  floor: string;
  apartment: string;
  lobbyCode: string;
  city: string;
  zipCode: string;
  notes: string;
  leaveAtDoor: boolean;
};

const TEXT_FIELDS = [
  "fullName",
  "email",
  "phone",
  "phoneSecondary",
  "address",
  "building",
  "floor",
  "apartment",
  "lobbyCode",
  "city",
  "zipCode",
  "notes",
] as const;

type TextField = (typeof TEXT_FIELDS)[number];

const shippingSchema = z.object({
  fullName: z.string().trim().min(2, "שם מלא חייב להכיל לפחות 2 תווים").max(100, "שם מלא חייב להכיל פחות מ-100 תווים"),
  email: z.string().trim().email("כתובת אימייל לא תקינה").max(255, "אימייל חייב להכיל פחות מ-255 תווים"),
  phone: z.string().trim().regex(/^[0-9]{9,15}$/, "מספר טלפון חייב להכיל 9-15 ספרות"),
  phoneSecondary: z.string().trim().regex(/^([0-9]{9,15})?$/, "מספר טלפון חייב להכיל 9-15 ספרות"),
  address: z.string().trim().min(2, "רחוב חייב להכיל לפחות 2 תווים").max(200, "שם הרחוב ארוך מדי"),
  building: z.string().trim().min(1, "מספר בית או בניין הוא שדה חובה").max(20, "מספר בית ארוך מדי"),
  entranceType: z.enum(["house", "building"]),
  floor: z.string().trim().max(10, "קומה ארוכה מדי"),
  apartment: z.string().trim().max(20, "מספר דירה ארוך מדי"),
  lobbyCode: z.string().trim().max(30, "קוד כניסה ארוך מדי"),
  city: z.string().trim().min(2, "עיר חייבת להכיל לפחות 2 תווים").max(50, "עיר חייבת להכיל פחות מ-50 תווים"),
  zipCode: z.string().trim().regex(/^[0-9]{5,7}$/, "מיקוד חייב להכיל 5-7 ספרות"),
  notes: z.string().trim().max(500, "ההערות ארוכות מדי"),
  leaveAtDoor: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.entranceType === "building") {
    if (!data.apartment) {
      ctx.addIssue({ code: "custom", path: ["apartment"], message: "מספר דירה הוא שדה חובה בבניין" });
    }
    if (!data.lobbyCode) {
      ctx.addIssue({ code: "custom", path: ["lobbyCode"], message: "קוד כניסה ללובי הוא שדה חובה בבניין" });
    }
  }
  if (!data.leaveAtDoor) {
    ctx.addIssue({ code: "custom", path: ["leaveAtDoor"], message: "יש לאשר את התנאי כדי להמשיך" });
  }
});

type LiveSource = Partial<Record<TextField, string>> | HTMLFormElement | null | undefined;

function isForm(value: LiveSource): value is HTMLFormElement {
  return typeof HTMLFormElement !== "undefined" && value instanceof HTMLFormElement;
}

function readNamedValue(form: HTMLFormElement, name: TextField): string | null {
  const el = form.elements.namedItem(name);
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return el.value;
  }
  return null;
}

/** Prefer the characters actually in the field over stale React state. */
export function collectShippingFields(
  state: CheckoutShippingInput,
  live?: LiveSource,
): CheckoutShippingInput {
  const next: CheckoutShippingInput = { ...state };
  for (const name of TEXT_FIELDS) {
    let liveValue: string | null = null;
    if (isForm(live)) {
      liveValue = readNamedValue(live, name);
    } else if (live && typeof live === "object" && name in live) {
      const raw = live[name];
      liveValue = raw == null ? "" : String(raw);
    }
    if (liveValue !== null && liveValue.trim()) {
      next[name] = liveValue;
    }
  }
  return next;
}

export function normalizeShippingFields(input: CheckoutShippingInput): CheckoutShippingInput {
  return {
    ...input,
    fullName: input.fullName.trim(),
    email: input.email.trim(),
    phone: digitsOnly(input.phone),
    phoneSecondary: digitsOnly(input.phoneSecondary),
    address: input.address.trim(),
    building: input.building.trim(),
    floor: input.floor.trim(),
    apartment: input.apartment.trim(),
    lobbyCode: input.lobbyCode.trim(),
    city: input.city.trim(),
    zipCode: digitsOnly(input.zipCode),
    notes: input.notes.trim(),
  };
}

export type CheckoutShippingResult =
  | { ok: true; values: CheckoutShippingInput }
  | { ok: false; errors: Record<string, string>; values: CheckoutShippingInput };

export function validateCheckoutShipping(
  state: CheckoutShippingInput,
  live?: LiveSource,
): CheckoutShippingResult {
  const values = normalizeShippingFields(collectShippingFields(state, live));
  const parsed = shippingSchema.safeParse(values);
  if (parsed.success) {
    return { ok: true, values };
  }
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors, values };
}
