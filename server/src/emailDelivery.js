/**
 * Whether Resend can deliver mail to a customer, and how to log a refusal
 * without writing the key or an address into the log.
 *
 * The testing sender is a real Resend address. It is also useless here:
 * Resend delivers onboarding@resend.dev only to the inbox that owns the
 * Resend account and refuses everyone else. A production process that has
 * RESEND_API_KEY and this FROM address stays up, accepts the signup, and
 * then reports that the verification mail was not sent.
 */

export const RESEND_TESTING_SENDER = "onboarding@resend.dev";

export const resolveFromEmail = (raw) => {
  const trimmed = String(raw || "").trim();
  return trimmed || `MIPO <${RESEND_TESTING_SENDER}>`;
};

export const describeEmailDelivery = ({ apiKey, fromEmail } = {}) => {
  const from = resolveFromEmail(fromEmail);
  const hasKey = Boolean(String(apiKey || "").trim());
  if (!hasKey) {
    return {
      state: "unknown",
      detail: "לא הוגדר מפתח שליחה",
      configured: false,
      missing: ["RESEND_API_KEY"],
    };
  }
  if (from.includes(RESEND_TESTING_SENDER)) {
    return {
      state: "down",
      detail: "כתובת השולח היא כתובת הבדיקה של Resend — מגיעה רק לבעל החשבון",
      configured: false,
      missing: ["PASSWORD_RESET_FROM_EMAIL"],
    };
  }
  return {
    state: "ok",
    detail: `נשלח מ-${from}`,
    configured: true,
    missing: [],
  };
};

/** Strip provider text that can carry a key or an address. Keep the reason. */
export const redactEmailLog = (value) => String(value || "")
  .replace(/re_[A-Za-z0-9_]+/g, "[redacted]")
  .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, 300);

export const summarizeProviderFailure = (status, body) => {
  let name = "";
  let message = String(body || "");
  try {
    const parsed = JSON.parse(body);
    name = String(parsed?.name || parsed?.error || "");
    message = String(parsed?.message || parsed?.error || body || "");
  } catch {
    // Not JSON. The raw body is still redacted before it is logged.
  }
  return {
    status: Number(status) || 0,
    name: redactEmailLog(name).slice(0, 80),
    message: redactEmailLog(message),
  };
};

/**
 * Which setting a refusal points at, by name only.
 * 401 is a bad or revoked key. 403 and 422 are the FROM address: either the
 * testing sender, or a domain Resend has not verified.
 */
export const configNamesForProviderStatus = (status, fromEmail) => {
  const names = [];
  if (status === 401) names.push("RESEND_API_KEY");
  // 403/422 are Resend refusing the FROM address. The testing sender is the
  // same refusal even when the status is something else in the 4xx range.
  const testingSender = String(fromEmail || "").includes(RESEND_TESTING_SENDER);
  if (status === 403 || status === 422 || (testingSender && status >= 400 && status < 500 && status !== 401)) {
    names.push("PASSWORD_RESET_FROM_EMAIL");
  }
  return names;
};

export const emailFailureLogLine = (kind, summary, configNames = []) => {
  const name = summary.name ? ` name=${summary.name}` : "";
  const config = configNames.length ? ` config=${configNames.join(",")}` : "";
  return `[mipo] ${kind} email was not sent: status=${summary.status}${name} message=${summary.message || "none"}${config}`;
};
