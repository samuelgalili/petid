/**
 * Decisions for the admin API key that do not need a database or a server.
 *
 * With two-factor off, the key stays the machine caller deploy smoke and the
 * local workbench already use. With two-factor on, the key is not a person
 * and cannot enter a code, so writes and step-up are refused unless a path
 * is named on ADMIN_API_KEY_ALLOWLIST.
 */

import { isEnvFlagOn } from "./adminTwoFactor.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const passwordResetDebugEnabled = (env = process.env) =>
  env.NODE_ENV !== "production" && env.PASSWORD_RESET_DEBUG === "true";

const allowlistEntries = (allowlist) => String(allowlist || "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

/**
 * An entry is an exact path (`/api/products`) or a prefix ending in `*`
 * (`/api/products/*`). A method may lead (`POST /api/products`). A prefix
 * shorter than `/api/` is ignored so `*` cannot open every route.
 */
const entryMatches = (method, pathname, entry) => {
  const methodMatch = entry.match(/^(GET|HEAD|OPTIONS|POST|PUT|PATCH|DELETE)\s+(\S+)$/i);
  const spec = methodMatch ? methodMatch[2] : entry;
  const requiredMethod = methodMatch ? methodMatch[1].toUpperCase() : null;
  if (requiredMethod && requiredMethod !== method) return false;
  if (!spec.startsWith("/")) return false;
  if (spec.endsWith("*")) {
    const prefix = spec.slice(0, -1);
    if (prefix.length < "/api/".length) return false;
    return pathname.startsWith(prefix);
  }
  return pathname === spec;
};

/**
 * True when this key-authenticated request may proceed.
 * Safe reads stay open. Anything else needs two-factor to be off, or an
 * explicit allowlist entry.
 */
export const apiKeyMayPerform = ({
  twoFactorEnabled = false,
  method = "GET",
  pathname = "/",
  allowlist = "",
} = {}) => {
  if (!twoFactorEnabled) return true;
  const verb = String(method || "GET").toUpperCase();
  if (SAFE_METHODS.has(verb)) return true;
  const path = String(pathname || "/").split("?")[0] || "/";
  return allowlistEntries(allowlist).some((entry) => entryMatches(verb, path, entry));
};

/** The key cannot present a second factor. Step-up stays closed while two-factor is on. */
export const apiKeyMaySkipStepUp = ({ twoFactorEnabled = false } = {}) => !twoFactorEnabled;

/**
 * Production bootstrap is the first-admin path, or a one-time flag.
 * Anywhere else the route stays as it was.
 */
export const bootstrapRouteOpen = ({
  nodeEnv,
  existingAdminCount = 0,
  bootstrapEnabled,
} = {}) => {
  if (nodeEnv !== "production") return true;
  if (isEnvFlagOn(bootstrapEnabled)) return true;
  const count = Number(existingAdminCount);
  return Number.isFinite(count) && count <= 0;
};

/**
 * Replacing an existing admin password is the dangerous half of bootstrap.
 * Outside production it stays available for local setup. In production it
 * needs the one-time flag, even when the table is still empty (a racing
 * second call must not overwrite the first).
 */
export const bootstrapMayResetPassword = ({
  nodeEnv,
  bootstrapEnabled,
} = {}) => nodeEnv !== "production" || isEnvFlagOn(bootstrapEnabled);
