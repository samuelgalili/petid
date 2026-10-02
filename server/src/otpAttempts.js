// Wrong guesses of a 6-digit code belong to the address, not to the code that
// was just mailed. Issuing another code used to set attempts back to 0, so
// five requests were twenty-five guesses. The count now stays until the code
// is actually used, or until this window passes with no further wrong guess.

export const OTP_ATTEMPT_LIMIT = 5;

const DEFAULT_OTP_ATTEMPT_WINDOW_HOURS = 24;
const MAX_OTP_ATTEMPT_WINDOW_HOURS = 168;

export const otpAttemptWindowMs = (envValue = process.env.OTP_ATTEMPT_WINDOW_HOURS) => {
  const parsed = Number(envValue);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > MAX_OTP_ATTEMPT_WINDOW_HOURS) {
    return DEFAULT_OTP_ATTEMPT_WINDOW_HOURS * 60 * 60 * 1000;
  }
  return parsed * 60 * 60 * 1000;
};

export const OTP_ATTEMPT_WINDOW_MS = otpAttemptWindowMs();

const attemptCount = (value) => {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 1) return 0;
  return count;
};

const insideWindow = (updatedAt, now, windowMs) => {
  const updated = new Date(updatedAt).getTime();
  if (!Number.isFinite(updated)) return false;
  return now - updated < windowMs;
};

// `row` is the current password_reset_otps / email_verification_otps row, or
// missing when this address has never had a code. `locked` means do not mail
// a replacement. `attempts` is what the new row must store.
export const decideOtpIssue = (
  row,
  now = Date.now(),
  windowMs = OTP_ATTEMPT_WINDOW_MS,
  limit = OTP_ATTEMPT_LIMIT,
) => {
  if (!row || row.used === true || !insideWindow(row.updated_at ?? row.updatedAt, now, windowMs)) {
    return { locked: false, attempts: 0 };
  }
  const attempts = attemptCount(row.attempts);
  if (attempts >= limit) return { locked: true, attempts };
  return { locked: false, attempts };
};
