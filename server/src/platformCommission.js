// The platform commission rate.
//
// Uniform across all sales for now (decided), and snapshotted onto every order
// line at purchase. The rate here is configuration; the snapshot is the record.
// "What commission applied to this order" must stay answerable in five years,
// and it cannot be answered by reading today's configuration.
//
// Unset is NOT zero. If no rate is configured, the line records NULL, meaning
// "no rate was configured when this was sold" - which is true and
// reconstructible. Recording 0 would be a claim that somebody set it to zero.

const RATE_ENV = "PLATFORM_COMMISSION_RATE";

/**
 * The configured rate as a fraction, or null when none is configured.
 *
 * Accepts "0.15" or "15%" - both appear in practice, and a silent
 * misinterpretation of one as the other is a factor-of-100 error in money.
 * Anything it cannot parse is treated as unconfigured rather than guessed at.
 */
export const readPlatformCommissionRate = (env = process.env) => {
  const raw = String(env[RATE_ENV] ?? "").trim();
  if (!raw) return null;

  const percent = raw.endsWith("%");
  const digits = percent ? raw.slice(0, -1).trim() : raw;
  // "%" on its own leaves an empty string, and Number("") is 0 - which would
  // configure a zero rate from a typo. An empty numeric part is not a number.
  if (!digits) return null;
  const numeric = Number(digits);
  if (!Number.isFinite(numeric) || numeric < 0) return null;

  const rate = percent ? numeric / 100 : numeric;
  // A rate above 1 is either a percentage written without the sign or a
  // mistake. Either way it is not a fraction, and charging 15x is worse than
  // charging nothing.
  if (rate > 1) return null;
  return rate;
};

/**
 * The commission on one line, rounded to the currency's minor unit.
 *
 * Rounded per line rather than once on the order total, because the line is
 * what gets reconciled with the Seller and what a refund reverses. Summing
 * rounded lines and rounding a summed total differ by agorot, and the
 * difference has to fall somewhere predictable.
 */
export const commissionForLine = (rate, lineTotal) => {
  if (rate === null || rate === undefined) return null;
  // Number(null) is 0 and Number("") is 0, so an absent total would otherwise
  // produce a commission of zero - a figure nobody computed, recorded as if
  // somebody had. A line total of 0 is a real 0 and is allowed through below.
  if (lineTotal === null || lineTotal === undefined || lineTotal === "") return null;
  const total = Number(lineTotal);
  if (!Number.isFinite(total) || total < 0) return null;
  return Math.round(total * rate * 100) / 100;
};
