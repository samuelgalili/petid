// Outbound mail is either configured or it is not. Anything else — a missing
// health body, a failed request, a string instead of a boolean — is treated
// as not configured. A screen that does not know must not say a message left.

export const emailIsConfigured = (body) => {
  if (!body || typeof body !== "object") return false;
  return body.email?.configured === true;
};

// "We sent it" needs both: the sender is configured, and this attempt was
// accepted. A missing `sent` is not a yes.
export const mayClaimEmailSent = ({ configured, sent } = {}) => (
  configured === true && sent === true
);

const STORAGE_KEY = "mipo-verification-sent";

export const rememberVerificationSent = (sent) => {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, sent ? "true" : "false");
  } catch {
    // Private mode. The toast for this attempt still tells the truth.
  }
};

export const rememberedVerificationSent = () => {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    if (value === "true") return true;
    if (value === "false") return false;
  } catch {
    // Same as never having heard.
  }
  return null;
};
