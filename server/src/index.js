import http from "node:http";
import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { chmod, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import {
  analyzeProductIngredients,
  enrichProductAi,
  importProductsFromUrl,
  productDuplicateCheck,
  scrapeProduct,
  scanProductList,
  searchProductImage,
  smartScrapeProduct,
} from "./productIntel.js";
import { fallbackBreeds } from "./referenceData.js";
import {
  getCardcomString,
  isSuccessfulCardcomCharge,
  parseCardcomReturnValue,
  parseVerifiedCardcomIndicator,
} from "./cardcom.js";
import {
  FixedWindowRateLimiter,
  contentTypeForSafeExtension,
  createOpaqueToken,
  decodeAndValidateDataUrl,
  hashOpaqueToken,
  verifyOpaqueToken,
} from "./security.js";
import { checkDatabaseHealth } from "./health.js";
import {
  fetchImageBuffer,
  ImagePipelineError,
  normalizeWithBackgroundRemoval,
} from "./imagePipeline.js";
import { createGeminiBackgroundRemover } from "./backgroundRemoval.js";
import { hashPassword, verifyPassword } from "./passwords.js";
import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLES,
  getAdminPermissions,
  hasAdminPermission,
} from "./adminPermissions.js";
import {
  archiveSocialPost,
  createSocialComment,
  createSocialPost,
  deleteSocialComment,
  getSocialPost,
  listSocialComments,
  listSocialFeed,
  toggleSocialReaction,
  toggleSocialSave,
  voteSocialPoll,
} from "./social.js";
import {
  generateCharacterCandidates,
  generateCharacterExpressions,
} from "./petCharacter.js";

const port = Number(process.env.PORT || 3000);
const databaseUrl = process.env.DATABASE_URL;
const adminApiKey = process.env.ADMIN_API_KEY;
const defaultBusinessId = process.env.DEFAULT_BUSINESS_ID || "cf941cc4-e1d1-4d7c-8122-a5df81a1e53c";
const uploadDir = process.env.UPLOAD_DIR || "/app/uploads";
const privateUploadDir = process.env.PRIVATE_UPLOAD_DIR || "/app/private-uploads";
const petCharacterUploadDir = path.join(privateUploadDir, "pet-characters");
const maxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES || 5 * 1024 * 1024);
const maxSocialUploadBytes = Number(process.env.MAX_SOCIAL_UPLOAD_BYTES || 25 * 1024 * 1024);
const maxDocumentUploadBytes = Number(process.env.MAX_DOCUMENT_UPLOAD_BYTES || 10 * 1024 * 1024);
const adminCookieName = "mipo_admin_session";
const userCookieName = "mipo_user_session";
const passwordResetOtpMinutes = Number(process.env.PASSWORD_RESET_OTP_MINUTES || 10);
const passwordResetOtpTtlMs = Math.max(1, passwordResetOtpMinutes) * 60 * 1000;
const passwordResetDebug = process.env.PASSWORD_RESET_DEBUG === "true";
const resendApiKey = process.env.RESEND_API_KEY;
const passwordResetFromEmail = process.env.PASSWORD_RESET_FROM_EMAIL || "MIPO <onboarding@resend.dev>";
const configuredAdminSessionHours = Number(process.env.ADMIN_SESSION_HOURS || 8);
const adminSessionHours = Number.isFinite(configuredAdminSessionHours) && configuredAdminSessionHours > 0
  ? configuredAdminSessionHours
  : 8;
const adminSessionMs = adminSessionHours * 60 * 60 * 1000;
const configuredUserSessionDays = Number(process.env.USER_SESSION_DAYS || 30);
const userSessionDays = Number.isFinite(configuredUserSessionDays) && configuredUserSessionDays > 0
  ? configuredUserSessionDays
  : 30;
const userSessionMs = userSessionDays * 24 * 60 * 60 * 1000;
const transientUserSessionMs = 24 * 60 * 60 * 1000;
const cardcomTerminal = process.env.CARDCOM_TERMINAL_NUMBER;
const cardcomUsername = process.env.CARDCOM_USERNAME || process.env.CARDCOM_API_NAME;
const cardcomApiPassword = process.env.CARDCOM_API_PASSWORD;
const cardcomWebhookSecret = process.env.CARDCOM_WEBHOOK_SECRET;
const cardcomConfiguration = [cardcomTerminal, cardcomUsername, cardcomApiPassword, cardcomWebhookSecret];
const cardcomConfigured = cardcomConfiguration.every(Boolean);
const cardcomPartiallyConfigured = cardcomConfiguration.some(Boolean) && !cardcomConfigured;
const configuredPublicAppUrl = String(
  process.env.PUBLIC_APP_URL || process.env.APP_URL || process.env.VITE_APP_URL || "",
).trim() || null;
const cardcomLowProfileUrl = "https://secure.cardcom.solutions/Interface/LowProfile.aspx";
const cardcomIndicatorUrl = "https://secure.cardcom.solutions/Interface/BillGoldGetLowProfileIndicator.aspx";
const geminiApiKey = process.env.GEMINI_API_KEY || "";
const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const vertexAiApiKey = process.env.VERTEX_AI_API_KEY || "";
const vertexAiProject = process.env.GOOGLE_CLOUD_PROJECT || "";
const vertexAiLocation = process.env.GOOGLE_CLOUD_LOCATION || "global";
const petCharacterImageModel = process.env.PET_CHARACTER_IMAGE_MODEL
  || process.env.VERTEX_AI_IMAGE_MODEL
  || "gemini-2.5-flash-image";
const petCharacterVisionModel = process.env.PET_CHARACTER_VISION_MODEL
  || process.env.VERTEX_AI_VISION_MODEL
  || "gemini-2.5-flash";
const petCharacterAiConfigured = Boolean(geminiApiKey || vertexAiApiKey || vertexAiProject);
const maxAiAttachmentBytes = Number(process.env.MAX_AI_ATTACHMENT_BYTES || 15 * 1024 * 1024);
const isProduction = process.env.NODE_ENV === "production";

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

if (isProduction) {
  const missingRequiredConfiguration = [
    ["ADMIN_API_KEY", adminApiKey],
    ["RESEND_API_KEY", resendApiKey],
    ["GEMINI_API_KEY", geminiApiKey],
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missingRequiredConfiguration.length > 0) {
    throw new Error(`Missing required production configuration: ${missingRequiredConfiguration.join(", ")}`);
  }
  if (passwordResetDebug) {
    throw new Error("PASSWORD_RESET_DEBUG must be disabled in production");
  }
  if (cardcomPartiallyConfigured) {
    throw new Error("CardCom configuration must include terminal, username, API password, and webhook secret");
  }
  if (!configuredPublicAppUrl) {
    throw new Error("PUBLIC_APP_URL is required in production");
  }
  let parsedPublicAppUrl;
  try {
    parsedPublicAppUrl = new URL(configuredPublicAppUrl);
  } catch {
    throw new Error("PUBLIC_APP_URL must be a valid absolute URL");
  }
  if (parsedPublicAppUrl.protocol !== "https:") {
    throw new Error("PUBLIC_APP_URL must use HTTPS in production");
  }
  if (parsedPublicAppUrl.username || parsedPublicAppUrl.password || parsedPublicAppUrl.search || parsedPublicAppUrl.hash) {
    throw new Error("PUBLIC_APP_URL must not contain credentials, query parameters, or a fragment");
  }
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DB_SSL === "false"
    ? false
    : { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" },
  max: Number(process.env.DB_POOL_MAX || 8),
  connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 5000),
});

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

const readBody = async (request, maxBytes = 1024 * 1024) => {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > maxBytes) {
      const error = new Error("Request body too large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("Invalid JSON");
    error.statusCode = 400;
    throw error;
  }
};

const readRawBody = async (request, maxBytes = 1024 * 1024) => {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > maxBytes) {
      const error = new Error("Request body too large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  return chunks.length > 0 ? Buffer.concat(chunks).toString("utf8") : "";
};

const fetchWithTimeout = async (url, init = {}, timeoutMs = 60000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const sendJson = (response, statusCode, body, headers = {}) => {
  response.writeHead(statusCode, { ...jsonHeaders, ...headers });
  response.end(JSON.stringify(body));
};

const sendError = (response, statusCode, message, details) => {
  sendJson(response, statusCode, { error: message, details });
};

const parseCookies = (cookieHeader) => Object.fromEntries(
  cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) return [part, ""];
      return [
        decodeURIComponent(part.slice(0, separatorIndex)),
        decodeURIComponent(part.slice(separatorIndex + 1)),
      ];
    }),
);

const secretsEqual = (actual, expected) => {
  if (!actual || !expected) return false;
  const actualBuffer = Buffer.from(String(actual));
  const expectedBuffer = Buffer.from(String(expected));
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const hashSessionToken = (token) => createHash("sha256").update(String(token)).digest("hex");

const serializeAdmin = (row) => ({
  id: row.id,
  email: row.email,
  display_name: row.display_name || null,
  role: row.role,
  permissions: getAdminPermissions(row.role),
  must_change_password: Boolean(row.must_change_password),
  created_at: row.created_at || null,
  last_login_at: row.last_login_at || null,
});

const adminUserSelect = `
  id,
  email,
  display_name,
  role,
  is_active,
  must_change_password,
  created_at,
  updated_at,
  last_login_at
`;

const getRequestIp = (request) => {
  const forwardedFor = request.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.socket?.remoteAddress || null;
};

const rateLimiter = new FixedWindowRateLimiter();

const enforceRateLimit = (request, response, scope, options, identity = "") => {
  const identifier = identity ? String(identity).trim().toLowerCase() : getRequestIp(request) || "unknown";
  const result = rateLimiter.check(`${scope}:${identifier}`, options);
  if (result.allowed) return true;

  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  sendJson(response, 429, { error: "Too many requests" }, { "retry-after": String(retryAfter) });
  return false;
};

const rateLimits = {
  adminLogin: { limit: 8, windowMs: 15 * 60 * 1000 },
  userLogin: { limit: 20, windowMs: 15 * 60 * 1000 },
  signup: { limit: 8, windowMs: 60 * 60 * 1000 },
  passwordResetRequest: { limit: 5, windowMs: 60 * 60 * 1000 },
  passwordResetConfirm: { limit: 10, windowMs: 15 * 60 * 1000 },
  orderCreate: { limit: 20, windowMs: 10 * 60 * 1000 },
  paymentCreate: { limit: 20, windowMs: 10 * 60 * 1000 },
  reportCreate: { limit: 10, windowMs: 60 * 60 * 1000 },
  aiChat: { limit: 30, windowMs: 60 * 60 * 1000 },
  petCharacterGeneration: { limit: 3, windowMs: 24 * 60 * 60 * 1000 },
  petCharacterPack: { limit: 5, windowMs: 24 * 60 * 60 * 1000 },
  mediaUpload: { limit: 30, windowMs: 60 * 60 * 1000 },
  socialUpload: { limit: 12, windowMs: 60 * 60 * 1000 },
  socialWrite: { limit: 60, windowMs: 60 * 60 * 1000 },
  documentUpload: { limit: 20, windowMs: 60 * 60 * 1000 },
  couponValidate: { limit: 30, windowMs: 10 * 60 * 1000 },
  publicPetScan: { limit: 60, windowMs: 60 * 60 * 1000 },
};

const getPublicBaseUrl = (request) => {
  if (configuredPublicAppUrl) return configuredPublicAppUrl.replace(/\/+$/, "");

  const proto = request.headers["x-forwarded-proto"] || "http";
  const host = request.headers["x-forwarded-host"] || request.headers.host || "localhost";
  return `${proto}://${host}`.replace(/\/+$/, "");
};

const absoluteAppUrl = (request, urlOrPath) => {
  if (!urlOrPath) return null;
  const value = String(urlOrPath);
  if (/^https?:\/\//i.test(value)) return value;
  return new URL(value.replace(/^\/+/, ""), `${getPublicBaseUrl(request)}/`).toString();
};

const safeAppRedirectUrl = (request, candidate, fallbackPath) => {
  const base = new URL(`${getPublicBaseUrl(request)}/`);
  try {
    const resolved = new URL(String(candidate || fallbackPath), base);
    return resolved.origin === base.origin ? resolved.toString() : new URL(fallbackPath, base).toString();
  } catch {
    return new URL(fallbackPath, base).toString();
  }
};

const buildAdminCookie = (request, token) => {
  const isHttps = request.headers["x-forwarded-proto"] === "https";
  return [
    `${adminCookieName}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${Math.floor(adminSessionMs / 1000)}`,
    isHttps ? "Secure" : "",
  ].filter(Boolean).join("; ");
};

const buildClearAdminCookie = (request) => {
  const isHttps = request.headers["x-forwarded-proto"] === "https";
  return [
    `${adminCookieName}=`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    "Max-Age=0",
    isHttps ? "Secure" : "",
  ].filter(Boolean).join("; ");
};

const createAdminSession = async (request, adminUserId, db = pool) => {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + adminSessionMs).toISOString();

  await db.query(
    `
      insert into public.admin_sessions (
        admin_user_id,
        session_token_hash,
        expires_at,
        user_agent,
        ip_address
      )
      values ($1, $2, $3, $4, $5)
    `,
    [
      adminUserId,
      tokenHash,
      expiresAt,
      request.headers["user-agent"] || null,
      getRequestIp(request),
    ],
  );

  return token;
};

const getAdminFromSession = async (request) => {
  const sessionToken = parseCookies(request.headers.cookie || "")[adminCookieName];
  if (!sessionToken) return null;

  const tokenHash = hashSessionToken(sessionToken);
  const result = await pool.query(
    `
      select
        au.id,
        au.email,
        au.display_name,
        au.role,
        au.is_active,
        au.must_change_password,
        au.created_at,
        au.updated_at,
        au.last_login_at
      from public.admin_sessions admin_session
      join public.admin_users au on au.id = admin_session.admin_user_id
      where admin_session.session_token_hash = $1
        and admin_session.expires_at > now()
        and au.is_active = true
      limit 1
    `,
    [tokenHash],
  );

  if (result.rowCount === 0) return null;

  await pool.query(
    "update public.admin_sessions set last_seen_at = now() where session_token_hash = $1",
    [tokenHash],
  );

  return serializeAdmin(result.rows[0]);
};

const requireAdmin = async (request, response) => {
  if (adminApiKey && secretsEqual(request.headers["x-admin-api-key"], adminApiKey)) {
    request.admin = {
      id: "api-key",
      email: "api-key",
      role: ADMIN_ROLES.ADMIN,
      permissions: getAdminPermissions(ADMIN_ROLES.ADMIN),
      must_change_password: false,
    };
    return true;
  }

  const admin = await getAdminFromSession(request);
  if (admin) {
    request.admin = admin;
    return true;
  }

  sendError(response, 401, "Unauthorized");
  return false;
};

const requireAdminPermission = async (request, response, permission) => {
  if (!(await requireAdmin(request, response))) return false;
  if (request.admin.must_change_password) {
    sendError(response, 403, "Admin password change required");
    return false;
  }
  if (!hasAdminPermission(request.admin.role, permission)) {
    sendError(response, 403, "Forbidden");
    return false;
  }
  return true;
};

const recordAdminAudit = async (admin, {
  actionType,
  entityType = "product",
  entityId = null,
  oldValues = null,
  newValues = null,
  metadata = null,
}) => {
  try {
    await pool.query(
      `
        insert into public.admin_audit_log (
          action_type,
          entity_type,
          entity_id,
          old_values,
          new_values,
          metadata,
          actor_admin_user_id,
          actor_email,
          actor_role
        )
        values ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8, $9)
      `,
      [
        actionType,
        entityType,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        metadata ? JSON.stringify(metadata) : null,
        admin.id === "api-key" ? null : admin.id,
        admin.email,
        admin.role,
      ],
    );
  } catch (error) {
    console.error("Admin audit log write failed:", error.message);
  }
};

const bootstrapAdmin = async (body) => {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const displayName = String(body.display_name || body.displayName || "Admin").trim() || "Admin";

  if (!email || !email.includes("@")) {
    const error = new Error("A valid admin email is required");
    error.statusCode = 400;
    throw error;
  }

  if (password.length < 12) {
    const error = new Error("Admin password must be at least 12 characters");
    error.statusCode = 400;
    throw error;
  }
  if (password.length > 256) {
    const error = new Error("Password is too long");
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(
    `
      insert into public.admin_users (
        email,
        password_hash,
        display_name,
        role,
        is_active
      )
      values ($1, $2, $3, 'admin', true)
      on conflict (email) do update set
        password_hash = excluded.password_hash,
        display_name = excluded.display_name,
        is_active = true,
        updated_at = now()
      returning ${adminUserSelect}
    `,
    [email, hashPassword(password), displayName],
  );

  return serializeAdmin(result.rows[0]);
};

const loginAdmin = async (request, body) => {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");

  if (password.length > 256) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const result = await pool.query(
    `
      select ${adminUserSelect}, password_hash
      from public.admin_users
      where lower(email) = $1
      limit 1
    `,
    [email],
  );

  const row = result.rows[0];
  if (!row || !row.is_active || !verifyPassword(password, row.password_hash)) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    const token = await createAdminSession(request, row.id, client);
    const updated = await client.query(
      `update public.admin_users set last_login_at = now(), updated_at = now() where id = $1 returning ${adminUserSelect}`,
      [row.id],
    );
    await client.query("commit");

    return {
      admin: serializeAdmin(updated.rows[0]),
      token,
    };
  } catch (error) {
    await client.query("rollback").catch((rollbackError) => {
      console.error("Admin login rollback failed", rollbackError);
    });
    throw error;
  } finally {
    client.release();
  }
};

const changeAdminPassword = async (adminId, body) => {
  const password = String(body.password || body.new_password || body.newPassword || "");
  if (password.length < 12) {
    const error = new Error("Admin password must be at least 12 characters");
    error.statusCode = 400;
    throw error;
  }
  if (password.length > 256) {
    const error = new Error("Password is too long");
    error.statusCode = 400;
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await client.query(
      `
        update public.admin_users
        set password_hash = $2, must_change_password = false, updated_at = now()
        where id = $1 and is_active = true
        returning ${adminUserSelect}
      `,
      [adminId, hashPassword(password)],
    );
    if (result.rowCount === 0) {
      const error = new Error("Admin user not found");
      error.statusCode = 404;
      throw error;
    }
    await client.query("delete from public.admin_sessions where admin_user_id = $1", [adminId]);
    await client.query("commit");
    return serializeAdmin(result.rows[0]);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
};

const logoutAdmin = async (request) => {
  const sessionToken = parseCookies(request.headers.cookie || "")[adminCookieName];
  if (!sessionToken) return;

  await pool.query(
    "delete from public.admin_sessions where session_token_hash = $1",
    [hashSessionToken(sessionToken)],
  );
};

const splitFullName = (fullName) => {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || null,
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
};

const normalizeDateOnly = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const normalizeTextArray = (value) => {
  if (value === null) return null;
  if (!Array.isArray(value)) return null;
  const list = value.map((item) => String(item || "").trim()).filter(Boolean);
  return list.length > 0 ? list : null;
};

const serializeProfile = (row) => row ? ({
  id: row.id,
  email: row.email,
  full_name: row.full_name || null,
  first_name: row.first_name || null,
  last_name: row.last_name || null,
  bio: row.bio || null,
  phone: row.phone || null,
  whatsapp_number: row.whatsapp_number || null,
  avatar_url: row.avatar_url || null,
  birthdate: row.birthdate || null,
  street: row.street || null,
  city: row.city || null,
  id_number_last4: row.id_number_last4 || null,
  id_verified: row.id_verified || false,
  marketing_consent: row.marketing_consent || false,
  marketing_consent_date: row.marketing_consent_date || null,
  marketing_unsubscribed_at: row.marketing_unsubscribed_at || null,
  ai_consent_given: row.ai_consent_given === true,
  ai_consent_date: row.ai_consent_date || null,
  quiet_mode_until: row.quiet_mode_until || null,
  last_active_at: row.last_active_at || null,
  profile_visibility: row.profile_visibility === "public" ? "public" : "private",
  show_activity_status: row.show_activity_status === null || row.show_activity_status === undefined
    ? false
    : row.show_activity_status,
  created_at: row.created_at || null,
  updated_at: row.updated_at || null,
}) : null;

const serializeUser = (row, profile = null) => {
  const fullName = row.full_name || profile?.full_name || null;
  return {
    id: row.id,
    email: row.email,
    full_name: fullName,
    phone: row.phone || profile?.phone || profile?.whatsapp_number || null,
    birthdate: row.birthdate || profile?.birthdate || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
    last_login_at: row.last_login_at || null,
    user_metadata: {
      full_name: fullName,
      name: fullName,
      birthdate: row.birthdate || profile?.birthdate || null,
      phone: row.phone || profile?.phone || profile?.whatsapp_number || null,
    },
    app_metadata: {},
  };
};

const userSelect = `
  id,
  email,
  full_name,
  phone,
  birthdate,
  is_active,
  created_at,
  updated_at,
  last_login_at
`;

const getProfileByUserId = async (userId, db = pool) => {
  const result = await db.query("select * from public.profiles where id = $1 limit 1", [userId]);
  return result.rows[0] ? serializeProfile(result.rows[0]) : null;
};

const buildUserCookie = (request, token, { persistent = false } = {}) => {
  const isHttps = request.headers["x-forwarded-proto"] === "https";
  return [
    `${userCookieName}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    persistent ? `Max-Age=${Math.floor(userSessionMs / 1000)}` : "",
    isHttps ? "Secure" : "",
  ].filter(Boolean).join("; ");
};

const buildClearUserCookie = (request) => {
  const isHttps = request.headers["x-forwarded-proto"] === "https";
  return [
    `${userCookieName}=`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    "Max-Age=0",
    isHttps ? "Secure" : "",
  ].filter(Boolean).join("; ");
};

const createUserSession = async (request, userId, db = pool, { persistent = false } = {}) => {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + (persistent ? userSessionMs : transientUserSessionMs)).toISOString();

  await db.query(
    `
      insert into public.user_sessions (
        user_id,
        session_token_hash,
        expires_at,
        user_agent,
        ip_address
      )
      values ($1, $2, $3, $4, $5)
    `,
    [
      userId,
      tokenHash,
      expiresAt,
      request.headers["user-agent"] || null,
      getRequestIp(request),
    ],
  );

  return token;
};

const getUserFromSession = async (request) => {
  const sessionToken = parseCookies(request.headers.cookie || "")[userCookieName];
  if (!sessionToken) return null;

  const tokenHash = hashSessionToken(sessionToken);
  const result = await pool.query(
    `
      select
        au.id,
        au.email,
        au.full_name,
        au.phone,
        au.birthdate,
        au.is_active,
        au.created_at,
        au.updated_at,
        au.last_login_at,
        p.id as profile_id,
        p.email as profile_email,
        p.full_name as profile_full_name,
        p.first_name as profile_first_name,
        p.last_name as profile_last_name,
        p.bio as profile_bio,
        p.phone as profile_phone,
        p.whatsapp_number as profile_whatsapp_number,
        p.avatar_url as profile_avatar_url,
        p.birthdate as profile_birthdate,
        p.street as profile_street,
        p.city as profile_city,
        p.id_number_last4 as profile_id_number_last4,
        p.marketing_consent as profile_marketing_consent,
        p.marketing_consent_date as profile_marketing_consent_date,
        p.marketing_unsubscribed_at as profile_marketing_unsubscribed_at,
        p.ai_consent_given as profile_ai_consent_given,
        p.ai_consent_date as profile_ai_consent_date,
        p.quiet_mode_until as profile_quiet_mode_until,
        p.last_active_at as profile_last_active_at,
        p.profile_visibility as profile_visibility,
        p.show_activity_status as profile_show_activity_status,
        p.created_at as profile_created_at,
        p.updated_at as profile_updated_at
      from public.user_sessions user_session
      join public.app_users au on au.id = user_session.user_id
      left join public.profiles p on p.id = au.id
      where user_session.session_token_hash = $1
        and user_session.expires_at > now()
        and au.is_active = true
      limit 1
    `,
    [tokenHash],
  );

  if (result.rowCount === 0) return null;

  await pool.query(
    "update public.user_sessions set last_seen_at = now() where session_token_hash = $1",
    [tokenHash],
  );

  const row = result.rows[0];
  const profile = serializeProfile(row.profile_id ? {
    id: row.profile_id,
    email: row.profile_email || row.email,
    full_name: row.profile_full_name,
    first_name: row.profile_first_name,
    last_name: row.profile_last_name,
    bio: row.profile_bio,
    phone: row.profile_phone,
    whatsapp_number: row.profile_whatsapp_number,
    avatar_url: row.profile_avatar_url,
    birthdate: row.profile_birthdate,
    street: row.profile_street,
    city: row.profile_city,
    id_number_last4: row.profile_id_number_last4,
    marketing_consent: row.profile_marketing_consent,
    marketing_consent_date: row.profile_marketing_consent_date,
    marketing_unsubscribed_at: row.profile_marketing_unsubscribed_at,
    ai_consent_given: row.profile_ai_consent_given,
    ai_consent_date: row.profile_ai_consent_date,
    quiet_mode_until: row.profile_quiet_mode_until,
    last_active_at: row.profile_last_active_at,
    profile_visibility: row.profile_visibility,
    show_activity_status: row.profile_show_activity_status,
    created_at: row.profile_created_at,
    updated_at: row.profile_updated_at,
  } : null);

  return {
    user: serializeUser(row, profile),
    profile,
  };
};

const requireUser = async (request, response) => {
  const auth = await getUserFromSession(request);
  if (auth?.user) {
    request.user = auth.user;
    request.profile = auth.profile;
    return auth;
  }

  sendError(response, 401, "Unauthorized");
  return null;
};

const signupUser = async (request, body) => {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const fullName = String(body.full_name || body.fullName || "").trim();
  const phone = String(body.phone || "").trim() || null;
  const birthdate = normalizeDateOnly(body.birthdate || body.birthDate);

  if (!email || !email.includes("@")) {
    const error = new Error("A valid email is required");
    error.statusCode = 400;
    throw error;
  }
  if (password.length < 8) {
    const error = new Error("Password must be at least 8 characters");
    error.statusCode = 400;
    throw error;
  }
  if (password.length > 256) {
    const error = new Error("Password is too long");
    error.statusCode = 400;
    throw error;
  }
  if (fullName.length < 2) {
    const error = new Error("Full name is required");
    error.statusCode = 400;
    throw error;
  }

  const { firstName, lastName } = splitFullName(fullName);
  const client = await pool.connect();
  try {
    await client.query("begin");
    const userResult = await client.query(
      `
        insert into public.app_users (
          email,
          password_hash,
          full_name,
          phone,
          birthdate,
          is_active
        )
        values ($1, $2, $3, $4, $5, true)
        returning ${userSelect}
      `,
      [email, hashPassword(password), fullName, phone, birthdate],
    );

    const profileResult = await client.query(
      `
        insert into public.profiles (
          id,
          email,
          full_name,
          first_name,
          last_name,
          phone,
          whatsapp_number,
          birthdate
        )
        values ($1, $2, $3, $4, $5, $6, $6, $7)
        returning *
      `,
      [userResult.rows[0].id, email, fullName, firstName, lastName, phone, birthdate],
    );

    const token = await createUserSession(request, userResult.rows[0].id, client);
    await client.query("commit");

    const profile = serializeProfile(profileResult.rows[0]);
    return {
      user: serializeUser(userResult.rows[0], profile),
      profile,
      token,
    };
  } catch (error) {
    await client.query("rollback");
    if (error.code === "23505") {
      error.message = "Email already exists";
      error.statusCode = 409;
    }
    throw error;
  } finally {
    client.release();
  }
};

const loginUser = async (request, body) => {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const rememberMe = body.remember_me === true || body.rememberMe === true;

  if (password.length > 256) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const result = await pool.query(
    `
      select ${userSelect}, password_hash
      from public.app_users
      where lower(email) = $1
      limit 1
    `,
    [email],
  );

  const row = result.rows[0];
  if (!row || !row.is_active || !verifyPassword(password, row.password_hash)) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    const token = await createUserSession(request, row.id, client, { persistent: rememberMe });
    const updated = await client.query(
      `update public.app_users set last_login_at = now(), updated_at = now() where id = $1 returning ${userSelect}`,
      [row.id],
    );
    const profile = await getProfileByUserId(row.id, client);
    await client.query("commit");

    return {
      user: serializeUser(updated.rows[0], profile),
      profile,
      token,
      rememberMe,
    };
  } catch (error) {
    await client.query("rollback").catch((rollbackError) => {
      console.error("User login rollback failed", rollbackError);
    });
    throw error;
  } finally {
    client.release();
  }
};

const generateOtp = () => String(randomInt(100000, 1000000));

const hashPasswordResetOtp = (email, otp) => createHmac("sha256", adminApiKey || databaseUrl)
  .update(`${normalizeEmail(email)}:${String(otp || "")}`)
  .digest("hex");

const sendPasswordResetEmail = async (request, email, otp) => {
  if (!resendApiKey) return { sent: false, reason: "not_configured" };

  const resetUrl = new URL("/reset-password", `${getPublicBaseUrl(request)}/`);
  resetUrl.searchParams.set("email", email);
  resetUrl.searchParams.set("otp", otp);

  let response;
  try {
    response = await fetchWithTimeout("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${resendApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: passwordResetFromEmail,
        to: [email],
        subject: "קוד איפוס הסיסמה שלך - MIPO",
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #f8f8fb;">
            <div style="background: #ffffff; border-radius: 20px; padding: 32px; text-align: center;">
              <h1 style="margin: 0 0 12px; color: #111827;">MIPO</h1>
              <p style="margin: 0 0 24px; color: #4b5563;">קוד איפוס הסיסמה שלך תקף ל-${Math.max(1, passwordResetOtpMinutes)} דקות.</p>
              <div style="font-size: 34px; letter-spacing: 8px; font-weight: 700; color: #6C63FF; margin: 24px 0;">${otp}</div>
              <a href="${resetUrl.toString()}" style="display: inline-block; background: #6C63FF; color: #ffffff; text-decoration: none; padding: 12px 22px; border-radius: 999px; font-weight: 700;">הגדרת סיסמה חדשה</a>
              <p style="margin: 24px 0 0; color: #6b7280; font-size: 13px;">אם לא ביקשת לאפס את הסיסמה, אפשר להתעלם מההודעה.</p>
            </div>
          </div>
        `,
      }),
    }, 15_000);
  } catch (error) {
    console.error("Password reset email request failed:", error.message);
    return { sent: false, reason: "send_failed" };
  }

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    console.error("Password reset email failed:", response.status, details.slice(0, 300));
    return { sent: false, reason: "send_failed" };
  }

  return { sent: true, reason: "sent" };
};

const requestPasswordReset = async (request, body) => {
  const email = normalizeEmail(body.email);
  if (!email || !email.includes("@")) {
    const error = new Error("A valid email is required");
    error.statusCode = 400;
    throw error;
  }

  const userResult = await pool.query(
    "select id from public.app_users where lower(email) = $1 and is_active = true limit 1",
    [email],
  );

  let emailDelivery = resendApiKey ? "sent" : "not_configured";
  let debugOtp;

  if (userResult.rowCount > 0) {
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + passwordResetOtpTtlMs).toISOString();

    await pool.query(
      `
        insert into public.password_reset_otps (
          email,
          otp_hash,
          expires_at,
          used,
          attempts,
          created_at,
          updated_at
        )
        values ($1, $2, $3, false, 0, now(), now())
        on conflict (email) do update set
          otp_hash = excluded.otp_hash,
          expires_at = excluded.expires_at,
          used = false,
          attempts = 0,
          updated_at = now()
      `,
      [email, hashPasswordResetOtp(email, otp), expiresAt],
    );

    await pool.query(
      "update public.app_users set password_reset_last_requested_at = now(), updated_at = now() where id = $1",
      [userResult.rows[0].id],
    );

    const delivery = await sendPasswordResetEmail(request, email, otp);
    emailDelivery = delivery.reason;
    if (passwordResetDebug) debugOtp = otp;
  }

  return {
    ok: true,
    email_delivery: isProduction ? "sent" : emailDelivery,
    ...(debugOtp ? { debug_otp: debugOtp } : {}),
  };
};

const confirmPasswordReset = async (body) => {
  const email = normalizeEmail(body.email);
  const otp = String(body.otp || "").trim();
  const password = String(body.newPassword || body.new_password || body.password || "");

  if (!email || !email.includes("@")) {
    const error = new Error("A valid email is required");
    error.statusCode = 400;
    throw error;
  }
  if (!/^\d{6}$/.test(otp)) {
    const error = new Error("A valid 6-digit code is required");
    error.statusCode = 400;
    throw error;
  }
  if (password.length < 8) {
    const error = new Error("Password must be at least 8 characters");
    error.statusCode = 400;
    throw error;
  }
  if (password.length > 256) {
    const error = new Error("Password is too long");
    error.statusCode = 400;
    throw error;
  }

  const client = await pool.connect();
  let committed = false;
  try {
    await client.query("begin");

    const otpResult = await client.query(
      "select * from public.password_reset_otps where email = $1 for update",
      [email],
    );
    const row = otpResult.rows[0];
    if (!row || row.used || new Date(row.expires_at).getTime() < Date.now()) {
      const error = new Error("Invalid or expired reset code");
      error.statusCode = 400;
      throw error;
    }
    if (row.attempts >= 5) {
      const error = new Error("Too many invalid reset attempts");
      error.statusCode = 429;
      throw error;
    }

    const expectedHash = hashPasswordResetOtp(email, otp);
    if (!secretsEqual(expectedHash, row.otp_hash)) {
      await client.query(
        "update public.password_reset_otps set attempts = attempts + 1, updated_at = now() where email = $1",
        [email],
      );
      await client.query("commit");
      committed = true;
      const error = new Error("Invalid or expired reset code");
      error.statusCode = 400;
      throw error;
    }

    const userResult = await client.query(
      `
        update public.app_users
        set
          password_hash = $2,
          password_reset_required = false,
          updated_at = now()
        where lower(email) = $1 and is_active = true
        returning id
      `,
      [email, hashPassword(password)],
    );
    if (userResult.rowCount === 0) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    await client.query("delete from public.user_sessions where user_id = $1", [userResult.rows[0].id]);
    await client.query(
      "update public.password_reset_otps set used = true, updated_at = now() where email = $1",
      [email],
    );
    await client.query("commit");
    committed = true;
    return { ok: true };
  } catch (error) {
    if (!committed) await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
};

const logoutUser = async (request) => {
  const sessionToken = parseCookies(request.headers.cookie || "")[userCookieName];
  if (!sessionToken) return;

  await pool.query(
    "delete from public.user_sessions where session_token_hash = $1",
    [hashSessionToken(sessionToken)],
  );
};

const updateMyProfile = async (userId, body) => {
  const fullName = Object.prototype.hasOwnProperty.call(body, "full_name")
    ? String(body.full_name || "").trim()
    : Object.prototype.hasOwnProperty.call(body, "fullName")
      ? String(body.fullName || "").trim()
      : undefined;
  const phone = Object.prototype.hasOwnProperty.call(body, "phone") ? String(body.phone || "").trim() || null : undefined;
  const whatsappNumber = Object.prototype.hasOwnProperty.call(body, "whatsapp_number")
    ? String(body.whatsapp_number || "").trim() || null
    : Object.prototype.hasOwnProperty.call(body, "whatsappNumber")
      ? String(body.whatsappNumber || "").trim() || null
      : undefined;
  const bio = Object.prototype.hasOwnProperty.call(body, "bio") ? String(body.bio || "").slice(0, 150) : undefined;
  const avatarUrl = Object.prototype.hasOwnProperty.call(body, "avatar_url") ? String(body.avatar_url || "").trim() || null : undefined;
  const birthdate = Object.prototype.hasOwnProperty.call(body, "birthdate") ? normalizeDateOnly(body.birthdate) : undefined;
  const street = Object.prototype.hasOwnProperty.call(body, "street") ? String(body.street || "").trim() || null : undefined;
  const city = Object.prototype.hasOwnProperty.call(body, "city") ? String(body.city || "").trim() || null : undefined;
  const firstName = Object.prototype.hasOwnProperty.call(body, "first_name") ? String(body.first_name || "").trim() || null : undefined;
  const lastName = Object.prototype.hasOwnProperty.call(body, "last_name") ? String(body.last_name || "").trim() || null : undefined;
  const quietModeUntil = Object.prototype.hasOwnProperty.call(body, "quiet_mode_until")
    ? body.quiet_mode_until ? new Date(String(body.quiet_mode_until)).toISOString() : null
    : undefined;
  const lastActiveAt = Object.prototype.hasOwnProperty.call(body, "last_active_at")
    ? body.last_active_at ? new Date(String(body.last_active_at)).toISOString() : null
    : undefined;
  const showActivityStatus = Object.prototype.hasOwnProperty.call(body, "show_activity_status")
    ? Boolean(body.show_activity_status)
    : undefined;
  const profileVisibility = Object.prototype.hasOwnProperty.call(body, "profile_visibility")
    ? body.profile_visibility === "public" ? "public" : "private"
    : undefined;
  const aiConsentGiven = Object.prototype.hasOwnProperty.call(body, "ai_consent_given")
    ? body.ai_consent_given === true
    : undefined;
  const idNumberLast4 = Object.prototype.hasOwnProperty.call(body, "id_number_last4")
    ? String(body.id_number_last4 || "").replace(/\D/g, "").slice(-4) || null
    : undefined;

  if (fullName !== undefined && fullName.length < 2) {
    const error = new Error("Full name must be at least 2 characters");
    error.statusCode = 400;
    throw error;
  }

  const profileAssignments = [];
  const profileValues = [userId];
  const appAssignments = [];
  const appValues = [userId];

  const pushProfile = (column, value) => {
    profileValues.push(value);
    profileAssignments.push(`${column} = $${profileValues.length}`);
  };
  const pushApp = (column, value) => {
    appValues.push(value);
    appAssignments.push(`${column} = $${appValues.length}`);
  };

  if (fullName !== undefined) {
    const { firstName, lastName } = splitFullName(fullName);
    pushProfile("full_name", fullName);
    pushProfile("first_name", firstName);
    pushProfile("last_name", lastName);
    pushApp("full_name", fullName);
  }
  if (fullName === undefined && firstName !== undefined) pushProfile("first_name", firstName);
  if (fullName === undefined && lastName !== undefined) pushProfile("last_name", lastName);
  if (phone !== undefined) {
    pushProfile("phone", phone);
    pushApp("phone", phone);
  }
  if (whatsappNumber !== undefined) pushProfile("whatsapp_number", whatsappNumber);
  if (bio !== undefined) pushProfile("bio", bio);
  if (avatarUrl !== undefined) pushProfile("avatar_url", avatarUrl);
  if (street !== undefined) pushProfile("street", street);
  if (city !== undefined) pushProfile("city", city);
  if (idNumberLast4 !== undefined) pushProfile("id_number_last4", idNumberLast4);
  if (quietModeUntil !== undefined) pushProfile("quiet_mode_until", quietModeUntil);
  if (lastActiveAt !== undefined) pushProfile("last_active_at", lastActiveAt);
  if (showActivityStatus !== undefined) pushProfile("show_activity_status", showActivityStatus);
  if (profileVisibility !== undefined) pushProfile("profile_visibility", profileVisibility);
  if (aiConsentGiven !== undefined) {
    pushProfile("ai_consent_given", aiConsentGiven);
    pushProfile("ai_consent_date", aiConsentGiven ? new Date().toISOString() : null);
  }
  if (birthdate !== undefined) {
    pushProfile("birthdate", birthdate);
    pushApp("birthdate", birthdate);
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    if (appAssignments.length > 0) {
      await client.query(
        `update public.app_users set ${appAssignments.join(", ")}, updated_at = now() where id = $1`,
        appValues,
      );
    }
    if (profileAssignments.length > 0) {
      await client.query(
        `update public.profiles set ${profileAssignments.join(", ")}, updated_at = now() where id = $1`,
        profileValues,
      );
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  const userResult = await pool.query(`select ${userSelect} from public.app_users where id = $1`, [userId]);
  const profile = await getProfileByUserId(userId);
  return {
    user: serializeUser(userResult.rows[0], profile),
    profile,
  };
};

const updateMyMarketingConsent = async (userId, body) => {
  const enabled = Boolean(body.marketing_consent ?? body.enabled);
  const action = enabled ? "opt_in" : "opt_out";

  const result = await pool.query(
    `
      update public.profiles
      set
        marketing_consent = $2,
        marketing_consent_date = case when $2 then now() else null end,
        marketing_unsubscribed_at = case when $2 then null else now() end,
        updated_at = now()
      where id = $1
      returning *
    `,
    [userId, enabled],
  );

  try {
    await pool.query(
      `
        insert into public.marketing_opt_out_log (user_id, action, source)
        values ($1, $2, $3)
      `,
      [userId, action, body.source ? String(body.source).slice(0, 100) : "settings"],
    );
  } catch (error) {
    if (error.code !== "42P01") throw error;
  }

  return serializeProfile(result.rows[0]);
};

const getProfileActivityStatus = async (userId) => {
  if (!uuidPattern.test(String(userId || ""))) return null;

  const result = await pool.query(
    `
      select last_active_at, show_activity_status
      from public.profiles
      where id = $1
      limit 1
    `,
    [userId],
  );

  if (result.rowCount === 0) return null;
  const row = result.rows[0];
  const showStatus = row.show_activity_status === null || row.show_activity_status === undefined
    ? false
    : row.show_activity_status;

  return {
    last_active_at: showStatus ? row.last_active_at || null : null,
    show_activity_status: showStatus,
  };
};

const calculatePetAge = (birthDate) => {
  if (!birthDate) return { age_years: null, age_months: null };
  const birth = new Date(String(birthDate));
  if (Number.isNaN(birth.getTime())) return { age_years: null, age_months: null };
  const totalMonths = Math.max(0, Math.floor((Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)));
  return {
    age_years: Math.floor(totalMonths / 12),
    age_months: totalMonths % 12,
  };
};

const serializePet = (row) => {
  const age = calculatePetAge(row.birth_date);
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    type: row.type,
    pet_type: row.type,
    breed: row.breed || null,
    secondary_breed: row.secondary_breed || null,
    is_mixed: row.is_mixed || false,
    breed_confidence: row.breed_confidence,
    avatar_url: row.avatar_url || null,
    weight: row.weight === null || row.weight === undefined ? null : Number(row.weight),
    birth_date: row.birth_date || null,
    age_years: age.age_years,
    age_months: age.age_months,
    gender: row.gender || null,
    color: row.color || null,
    is_neutered: row.is_neutered,
    medical_conditions: row.medical_conditions || null,
    health_notes: row.health_notes || null,
    personality_tags: row.personality_tags || null,
    favorite_activities: row.favorite_activities || row.activities || null,
    activities: row.activities || row.favorite_activities || null,
    theme_color: row.theme_color || null,
    has_insurance: row.has_insurance,
    insurance_company: row.insurance_company || null,
    insurance_expiry_date: row.insurance_expiry_date || null,
    current_food: row.current_food || null,
    last_vet_visit: row.last_vet_visit || null,
    next_vet_visit: row.next_vet_visit || null,
    vet_clinic: row.vet_clinic || null,
    vet_clinic_name: row.vet_clinic_name || row.vet_clinic || null,
    vet_clinic_phone: row.vet_clinic_phone || null,
    vet_clinic_address: row.vet_clinic_address || null,
    microchip_number: row.microchip_number || null,
    is_dangerous_breed: row.is_dangerous_breed || false,
    license_conditions: row.license_conditions || null,
    license_expiry_date: row.license_expiry_date || null,
    is_lost: row.is_lost || false,
    lost_since: row.lost_since || null,
    lost_reward_text: row.lost_reward_text || null,
    lost_temperament: row.lost_temperament || null,
    lost_medication_note: row.lost_medication_note || null,
    lost_allergy_note: row.lost_allergy_note || null,
    lost_show_phone: row.lost_show_phone || false,
    lost_contact_phone: row.lost_contact_phone || null,
    archived: row.archived || false,
    archived_at: row.archived_at || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
};

const normalizePetPayload = (body, { partial = false } = {}) => {
  const payload = {};
  const has = (field) => Object.prototype.hasOwnProperty.call(body, field);

  if (has("name") || !partial) {
    const name = String(body.name || "").trim();
    if (!name) {
      const error = new Error("Pet name is required");
      error.statusCode = 400;
      throw error;
    }
    payload.name = name;
  }

  if (has("type") || has("pet_type") || !partial) {
    const type = String(body.type || body.pet_type || "").trim();
    if (!["dog", "cat", "other"].includes(type)) {
      const error = new Error("A valid pet type is required");
      error.statusCode = 400;
      throw error;
    }
    payload.type = type;
  }

  const simpleTextFields = [
    "breed",
    "secondary_breed",
    "avatar_url",
    "gender",
    "color",
    "health_notes",
    "theme_color",
    "insurance_company",
    "current_food",
    "vet_clinic",
    "vet_clinic_name",
    "vet_clinic_phone",
    "vet_clinic_address",
    "microchip_number",
    "license_conditions",
    "lost_reward_text",
    "lost_temperament",
    "lost_medication_note",
    "lost_allergy_note",
    "lost_contact_phone",
  ];
  for (const field of simpleTextFields) {
    if (has(field)) payload[field] = body[field] === null ? null : String(body[field] || "").trim() || null;
  }

  if (has("birth_date") || has("birthDate")) payload.birth_date = normalizeDateOnly(body.birth_date || body.birthDate);
  if (has("last_vet_visit") || has("lastVetVisit")) payload.last_vet_visit = normalizeDateOnly(body.last_vet_visit || body.lastVetVisit);
  if (has("next_vet_visit") || has("nextVetVisit")) payload.next_vet_visit = normalizeDateOnly(body.next_vet_visit || body.nextVetVisit);
  if (has("insurance_expiry_date") || has("insuranceExpiryDate")) payload.insurance_expiry_date = normalizeDateOnly(body.insurance_expiry_date || body.insuranceExpiryDate);
  if (has("license_expiry_date") || has("licenseExpiryDate")) payload.license_expiry_date = normalizeDateOnly(body.license_expiry_date || body.licenseExpiryDate);
  if (has("lost_since") || has("lostSince")) {
    payload.lost_since = body.lost_since || body.lostSince ? new Date(String(body.lost_since || body.lostSince)).toISOString() : null;
  }
  if (has("weight")) payload.weight = toNumber(body.weight);
  if (has("is_neutered")) payload.is_neutered = body.is_neutered === null ? null : Boolean(body.is_neutered);
  if (has("has_insurance")) payload.has_insurance = body.has_insurance === null ? null : Boolean(body.has_insurance);
  if (has("is_dangerous_breed")) payload.is_dangerous_breed = Boolean(body.is_dangerous_breed);
  if (has("is_lost")) payload.is_lost = Boolean(body.is_lost);
  if (has("lost_show_phone")) payload.lost_show_phone = Boolean(body.lost_show_phone);
  if (has("is_mixed")) payload.is_mixed = Boolean(body.is_mixed);
  if (has("breed_confidence")) {
    const confidence = Number(body.breed_confidence);
    payload.breed_confidence = Number.isFinite(confidence) ? Math.round(confidence) : null;
  }
  if (has("medical_conditions")) payload.medical_conditions = normalizeTextArray(body.medical_conditions);
  if (has("personality_tags")) payload.personality_tags = normalizeTextArray(body.personality_tags);
  if (has("favorite_activities") || has("activities")) {
    const activities = normalizeTextArray(body.favorite_activities || body.activities);
    payload.favorite_activities = activities;
    payload.activities = activities;
  }
  if (has("archived")) {
    payload.archived = Boolean(body.archived);
    payload.archived_at = payload.archived ? new Date().toISOString() : null;
  }
  if (has("archived_at")) payload.archived_at = body.archived_at ? new Date(String(body.archived_at)).toISOString() : null;

  return payload;
};

const insertUserPet = async (userId, body) => {
  const payload = normalizePetPayload(body);
  const result = await pool.query(
    `
      insert into public.pets (
        user_id,
        name,
        type,
        breed,
        secondary_breed,
        is_mixed,
        breed_confidence,
        avatar_url,
        weight,
        birth_date,
        gender,
        is_neutered,
        medical_conditions,
        health_notes,
        personality_tags,
        favorite_activities,
        activities,
        theme_color,
        archived,
        archived_at
      )
      values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      )
      returning *
    `,
    [
      userId,
      payload.name,
      payload.type,
      payload.breed || null,
      payload.secondary_breed || null,
      payload.is_mixed || false,
      payload.breed_confidence || null,
      payload.avatar_url || null,
      payload.weight || null,
      payload.birth_date || null,
      payload.gender || null,
      Object.prototype.hasOwnProperty.call(payload, "is_neutered") ? payload.is_neutered : null,
      payload.medical_conditions || null,
      payload.health_notes || null,
      payload.personality_tags || null,
      payload.favorite_activities || null,
      payload.activities || null,
      payload.theme_color || null,
      payload.archived || false,
      payload.archived_at || null,
    ],
  );

  return serializePet(result.rows[0]);
};

const listUserPets = async (userId, archived = "false") => {
  const values = [userId];
  const where = ["user_id = $1"];
  if (archived !== "all") {
    values.push(archived === "true");
    where.push(`archived = $${values.length}`);
  }

  const result = await pool.query(
    `
      select *
      from public.pets
      where ${where.join(" and ")}
      order by archived_at desc nulls last, created_at desc
    `,
    values,
  );
  return result.rows.map(serializePet);
};

const getUserPet = async (userId, petId) => {
  if (!uuidPattern.test(petId)) return null;
  const result = await pool.query(
    "select * from public.pets where id = $1 and user_id = $2 limit 1",
    [petId, userId],
  );
  return result.rows[0] ? serializePet(result.rows[0]) : null;
};

const getPublicPet = async (petId) => {
  if (!uuidPattern.test(String(petId || ""))) return null;
  const result = await pool.query(
    `
      select
        p.*,
        pr.full_name as owner_full_name,
        pr.phone as owner_phone,
        pr.city as owner_city,
        pr.profile_visibility,
        pr.show_location
      from public.pets p
      left join public.profiles pr on pr.id = p.user_id
      where p.id = $1 and p.archived = false
      limit 1
    `,
    [petId],
  );

  const row = result.rows[0];
  if (!row) return null;
  const isLost = Boolean(row.is_lost);
  const profileIsPublic = row.profile_visibility === "public";
  const showPhone = isLost && Boolean(row.lost_show_phone);
  const owner = {
    full_name: isLost || profileIsPublic ? row.owner_full_name || null : null,
    phone: showPhone ? row.lost_contact_phone || row.owner_phone || null : null,
    city: (isLost || profileIsPublic) && row.show_location === true ? row.owner_city || null : null,
  };

  return {
    pet: {
      id: row.id,
      name: row.name,
      type: row.type,
      pet_type: row.type,
      breed: row.breed || null,
      secondary_breed: row.secondary_breed || null,
      is_mixed: Boolean(row.is_mixed),
      avatar_url: row.avatar_url || null,
      gender: row.gender || null,
      color: row.color || null,
      personality_tags: row.personality_tags || null,
      theme_color: row.theme_color || null,
      is_lost: isLost,
      lost_since: isLost ? row.lost_since || null : null,
      lost_reward_text: isLost ? row.lost_reward_text || null : null,
      lost_temperament: isLost ? row.lost_temperament || null : null,
      lost_medication_note: isLost ? row.lost_medication_note || null : null,
      lost_allergy_note: isLost ? row.lost_allergy_note || null : null,
      lost_show_phone: showPhone,
      lost_contact_phone: showPhone ? row.lost_contact_phone || row.owner_phone || null : null,
    },
    owner: Object.values(owner).some(Boolean) ? owner : null,
  };
};

const logPublicPetQrScan = async (petId) => {
  if (!uuidPattern.test(String(petId || ""))) return false;

  try {
    await pool.query(
      `
        insert into public.qr_scan_logs (pet_id, latitude, longitude, ip_address, user_agent)
        values ($1, null, null, null, null)
      `,
      [petId],
    );
    return true;
  } catch (error) {
    console.warn("Failed to log QR scan", error.message);
    return false;
  }
};

const updateUserPet = async (userId, petId, body) => {
  if (!uuidPattern.test(petId)) return null;
  const payload = normalizePetPayload(body, { partial: true });
  const entries = Object.entries(payload);
  if (entries.length === 0) return getUserPet(userId, petId);

  const values = [petId, userId];
  const assignments = entries.map(([column, value]) => {
    values.push(value);
    return `${column} = $${values.length}`;
  });

  const result = await pool.query(
    `
      update public.pets
      set ${assignments.join(", ")}, updated_at = now()
      where id = $1 and user_id = $2
      returning *
    `,
    values,
  );

  return result.rows[0] ? serializePet(result.rows[0]) : null;
};

const normalizeStorageKeyList = (value) => (
  Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean)
    : []
);

const deletePetCharacterFiles = async (storageKeys) => {
  await Promise.all(normalizeStorageKeyList(storageKeys).map(async (storageKey) => {
    const safeKey = safeStorageKey(storageKey);
    if (!safeKey) return;
    try {
      await unlink(path.join(petCharacterUploadDir, safeKey));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }));
};

const listPetCharacterFileKeys = async (userId, petId = null) => {
  const values = [userId];
  const where = ["character.user_id = $1"];
  if (petId) {
    values.push(petId);
    where.push(`character.pet_id = $${values.length}`);
  }
  const result = await pool.query(
    `
      select character.source_storage_keys, asset.storage_key
      from public.pet_characters character
      left join public.pet_character_assets asset on asset.character_id = character.id
      where ${where.join(" and ")}
    `,
    values,
  );
  return [...new Set(result.rows.flatMap((row) => [
    ...normalizeStorageKeyList(row.source_storage_keys),
    row.storage_key,
  ]).filter(Boolean))];
};

const deleteUserPet = async (userId, petId) => {
  if (!uuidPattern.test(petId)) return false;
  const characterFiles = await listPetCharacterFileKeys(userId, petId);
  const result = await pool.query(
    "delete from public.pets where id = $1 and user_id = $2",
    [petId, userId],
  );
  if (result.rowCount > 0) await deletePetCharacterFiles(characterFiles);
  return result.rowCount > 0;
};

const characterAssetUrl = (petId, assetKey, version) => (
  `/api/me/pets/${petId}/character/assets/${encodeURIComponent(assetKey)}?v=${version}`
);

const serializePetCharacter = (character, assets = []) => {
  if (!character) return null;
  const candidates = [];
  const expressions = {};
  for (const asset of assets) {
    const url = characterAssetUrl(character.pet_id, asset.asset_key, character.generation_version);
    if (asset.asset_type === "candidate") {
      candidates.push({ key: asset.asset_key, url });
    } else {
      expressions[asset.asset_key] = url;
    }
  }
  candidates.sort((a, b) => a.key.localeCompare(b.key));
  const selectedCandidate = candidates.find((candidate) => candidate.key === character.selected_candidate_key) || null;
  if (selectedCandidate && !expressions.neutral) expressions.neutral = selectedCandidate.url;

  return {
    id: character.id,
    pet_id: character.pet_id,
    status: character.status,
    style_key: character.style_key,
    selected_candidate_key: character.selected_candidate_key || null,
    candidates,
    expressions,
    error_code: character.error_code || null,
    generation_version: Number(character.generation_version) || 1,
    created_at: character.created_at,
    updated_at: character.updated_at,
  };
};

const getPetCharacter = async (userId, petId) => {
  const characterResult = await pool.query(
    "select * from public.pet_characters where user_id = $1 and pet_id = $2 limit 1",
    [userId, petId],
  );
  const character = characterResult.rows[0];
  if (!character) return null;
  const assets = await pool.query(
    "select asset_key, asset_type from public.pet_character_assets where character_id = $1 order by asset_type, asset_key",
    [character.id],
  );
  return serializePetCharacter(character, assets.rows);
};

const generatedImageExtension = (contentType) => {
  if (contentType === "image/jpeg") return ".jpg";
  if (contentType === "image/webp") return ".webp";
  return ".png";
};

const storePetCharacterImage = async ({ buffer, contentType }) => {
  await mkdir(petCharacterUploadDir, { recursive: true, mode: 0o700 });
  await chmod(petCharacterUploadDir, 0o700);
  const storageKey = `${Date.now()}-${randomUUID()}${generatedImageExtension(contentType)}`;
  await writeFile(path.join(petCharacterUploadDir, storageKey), buffer, { flag: "wx", mode: 0o600 });
  return { storageKey, contentType, fileSize: buffer.length };
};

const characterErrorCode = (error) => {
  if (error?.code === "INVALID_REFERENCE_PHOTOS") return "invalid_reference_photos";
  if (error?.code === "NO_GENERATED_IMAGE") return "generation_blocked";
  if (error?.code === "INCONSISTENT_CHARACTER_PACK") return "generation_inconsistent";
  if (/429|resource exhausted|quota/i.test(String(error?.message || ""))) return "temporarily_unavailable";
  return "generation_failed";
};

const markPetCharacterFailed = async (characterId, error) => {
  console.error("Pet character generation failed", {
    characterId,
    code: characterErrorCode(error),
    message: String(error?.message || "Unknown generation error").slice(0, 300),
  });
  await pool.query(
    `
      update public.pet_characters
      set status = 'failed', error_code = $2, source_storage_keys = '[]'::jsonb, updated_at = now()
      where id = $1
    `,
    [characterId, characterErrorCode(error)],
  ).catch(() => {});
};

const processPetCharacterCandidates = async (characterId) => {
  const result = await pool.query(
    `
      select character.*, pet.name as pet_name, pet.type as pet_type
      from public.pet_characters character
      join public.pets pet on pet.id = character.pet_id
      where character.id = $1 and character.status = 'generating_candidates'
      limit 1
    `,
    [characterId],
  );
  const character = result.rows[0];
  if (!character) return;
  const sourceKeys = normalizeStorageKeyList(character.source_storage_keys);
  const newFiles = [];

  try {
    const references = await Promise.all(sourceKeys.map(async (storageKey) => {
      const safeKey = safeStorageKey(storageKey);
      if (!safeKey) throw Object.assign(new Error("Invalid character source"), { code: "INVALID_REFERENCE_PHOTOS" });
      const contentType = contentTypeForSafeExtension(path.extname(safeKey));
      if (!contentType?.startsWith("image/")) {
        throw Object.assign(new Error("Unsupported character source"), { code: "INVALID_REFERENCE_PHOTOS" });
      }
      return { buffer: await readFile(path.join(petCharacterUploadDir, safeKey)), contentType };
    }));

    const generated = await generateCharacterCandidates({
      geminiApiKey: geminiApiKey || undefined,
      vertexApiKey: vertexAiApiKey || undefined,
      project: vertexAiProject || undefined,
      location: vertexAiLocation,
      imageModel: petCharacterImageModel,
      visionModel: petCharacterVisionModel,
      references,
      petName: character.pet_name,
      petType: character.pet_type,
    });

    for (const candidate of generated.candidates) {
      const stored = await storePetCharacterImage(candidate);
      newFiles.push({ ...stored, assetKey: candidate.key, assetType: "candidate" });
    }

    const client = await pool.connect();
    try {
      await client.query("begin");
      for (const asset of newFiles) {
        await client.query(
          `
            insert into public.pet_character_assets (
              character_id, asset_key, asset_type, storage_key, content_type, file_size
            ) values ($1, $2, $3, $4, $5, $6)
          `,
          [characterId, asset.assetKey, asset.assetType, asset.storageKey, asset.contentType, asset.fileSize],
        );
      }
      await client.query(
        `
          update public.pet_characters
          set
            status = 'awaiting_selection',
            visual_identity = $2::jsonb,
            source_storage_keys = '[]'::jsonb,
            model = $3,
            error_code = null,
            updated_at = now()
          where id = $1
        `,
        [characterId, JSON.stringify(generated.visualIdentity), petCharacterImageModel],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
    await deletePetCharacterFiles(sourceKeys);
  } catch (error) {
    await deletePetCharacterFiles([...sourceKeys, ...newFiles.map((file) => file.storageKey)]).catch(() => {});
    await markPetCharacterFailed(characterId, error);
  }
};

const processPetCharacterExpressions = async (characterId) => {
  const result = await pool.query(
    `
      select
        character.*,
        pet.name as pet_name,
        asset.storage_key as candidate_storage_key,
        asset.content_type as candidate_content_type
      from public.pet_characters character
      join public.pets pet on pet.id = character.pet_id
      join public.pet_character_assets asset
        on asset.character_id = character.id
        and asset.asset_key = character.selected_candidate_key
        and asset.asset_type = 'candidate'
      where character.id = $1 and character.status = 'generating_pack'
      limit 1
    `,
    [characterId],
  );
  const character = result.rows[0];
  if (!character) return;
  const newFiles = [];

  try {
    const safeKey = safeStorageKey(character.candidate_storage_key);
    if (!safeKey) throw new Error("Selected character candidate is unavailable");
    const canonical = {
      buffer: await readFile(path.join(petCharacterUploadDir, safeKey)),
      contentType: character.candidate_content_type,
    };
    const generated = await generateCharacterExpressions({
      geminiApiKey: geminiApiKey || undefined,
      vertexApiKey: vertexAiApiKey || undefined,
      project: vertexAiProject || undefined,
      location: vertexAiLocation,
      imageModel: petCharacterImageModel,
      visionModel: petCharacterVisionModel,
      canonical,
      visualIdentity: character.visual_identity || {},
      petName: character.pet_name,
    });

    for (const expression of generated) {
      const stored = await storePetCharacterImage(expression);
      newFiles.push({ ...stored, assetKey: expression.key, assetType: "expression" });
    }

    const client = await pool.connect();
    try {
      await client.query("begin");
      for (const asset of newFiles) {
        await client.query(
          `
            insert into public.pet_character_assets (
              character_id, asset_key, asset_type, storage_key, content_type, file_size
            ) values ($1, $2, $3, $4, $5, $6)
          `,
          [characterId, asset.assetKey, asset.assetType, asset.storageKey, asset.contentType, asset.fileSize],
        );
      }
      await client.query(
        "update public.pet_characters set status = 'ready', error_code = null, updated_at = now() where id = $1",
        [characterId],
      );
      await client.query("commit");
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    await deletePetCharacterFiles(newFiles.map((file) => file.storageKey)).catch(() => {});
    await markPetCharacterFailed(characterId, error);
  }
};

const petCharacterJobsInFlight = new Set();
let petCharacterJobQueue = Promise.resolve();

const schedulePetCharacterJob = (characterId, stage) => {
  const jobKey = `${characterId}:${stage}`;
  if (petCharacterJobsInFlight.has(jobKey)) return;
  petCharacterJobsInFlight.add(jobKey);
  petCharacterJobQueue = petCharacterJobQueue
    .catch(() => {})
    .then(async () => {
      try {
        if (stage === "candidates") await processPetCharacterCandidates(characterId);
        else await processPetCharacterExpressions(characterId);
      } finally {
        petCharacterJobsInFlight.delete(jobKey);
      }
    });
};

const startPetCharacterGeneration = async (userId, petId, body) => {
  if (!petCharacterAiConfigured) {
    const error = new Error("Pet character generation is not configured");
    error.statusCode = 503;
    throw error;
  }
  if (body.consent !== true) {
    const error = new Error("Photo processing consent is required");
    error.statusCode = 400;
    throw error;
  }
  const pet = await getUserPet(userId, petId);
  if (!pet) return null;
  const photos = Array.isArray(body.photos) ? body.photos : [];
  if (photos.length < 1 || photos.length > 3) {
    const error = new Error("Upload between one and three pet photos");
    error.statusCode = 400;
    throw error;
  }

  const currentResult = await pool.query(
    "select * from public.pet_characters where user_id = $1 and pet_id = $2 limit 1",
    [userId, petId],
  );
  const current = currentResult.rows[0];
  if (["generating_candidates", "generating_pack"].includes(current?.status)) {
    const error = new Error("Pet character generation is already in progress");
    error.statusCode = 409;
    throw error;
  }

  const oldFiles = current ? await listPetCharacterFileKeys(userId, petId) : [];
  const uploaded = [];
  try {
    for (const photo of photos) {
      const stored = await uploadDataUrlFile({ data_url: photo?.data_url }, {
        maxBytes: maxUploadBytes,
        requireImage: true,
        allowedContentTypes: new Set(["image/jpeg", "image/png", "image/webp"]),
        directory: petCharacterUploadDir,
        publicUrl: false,
      });
      uploaded.push(stored.storage_key);
    }
  } catch (error) {
    await deletePetCharacterFiles(uploaded).catch(() => {});
    throw error;
  }

  const client = await pool.connect();
  let character;
  try {
    await client.query("begin");
    if (current) {
      await client.query("delete from public.pet_character_assets where character_id = $1", [current.id]);
      const updated = await client.query(
        `
          update public.pet_characters
          set
            status = 'generating_candidates',
            selected_candidate_key = null,
            source_storage_keys = $2::jsonb,
            visual_identity = '{}'::jsonb,
            model = $3,
            generation_version = generation_version + 1,
            error_code = null,
            consented_at = now(),
            updated_at = now()
          where id = $1
          returning *
        `,
        [current.id, JSON.stringify(uploaded), petCharacterImageModel],
      );
      character = updated.rows[0];
    } else {
      const inserted = await client.query(
        `
          insert into public.pet_characters (
            user_id, pet_id, status, source_storage_keys, model
          ) values ($1, $2, 'generating_candidates', $3::jsonb, $4)
          returning *
        `,
        [userId, petId, JSON.stringify(uploaded), petCharacterImageModel],
      );
      character = inserted.rows[0];
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    await deletePetCharacterFiles(uploaded).catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  await deletePetCharacterFiles(oldFiles).catch(() => {});
  schedulePetCharacterJob(character.id, "candidates");
  return serializePetCharacter(character, []);
};

const selectPetCharacterCandidate = async (userId, petId, candidateKey) => {
  const key = String(candidateKey || "").trim();
  const result = await pool.query(
    `
      select character.*, asset.id as candidate_asset_id
      from public.pet_characters character
      left join public.pet_character_assets asset
        on asset.character_id = character.id
        and asset.asset_key = $3
        and asset.asset_type = 'candidate'
      where character.user_id = $1 and character.pet_id = $2
      limit 1
    `,
    [userId, petId, key],
  );
  const character = result.rows[0];
  if (!character || !character.candidate_asset_id) return null;
  if (["generating_candidates", "generating_pack"].includes(character.status)) {
    const error = new Error("Pet character generation is already in progress");
    error.statusCode = 409;
    throw error;
  }

  const oldExpressions = await pool.query(
    "select storage_key from public.pet_character_assets where character_id = $1 and asset_type = 'expression'",
    [character.id],
  );
  const client = await pool.connect();
  let updated;
  try {
    await client.query("begin");
    await client.query(
      "delete from public.pet_character_assets where character_id = $1 and asset_type = 'expression'",
      [character.id],
    );
    updated = await client.query(
      `
        update public.pet_characters
        set status = 'generating_pack', selected_candidate_key = $2, error_code = null, updated_at = now()
        where id = $1
        returning *
      `,
      [character.id, key],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
  await deletePetCharacterFiles(oldExpressions.rows.map((row) => row.storage_key)).catch(() => {});
  schedulePetCharacterJob(character.id, "expressions");
  const assets = await pool.query(
    "select asset_key, asset_type from public.pet_character_assets where character_id = $1 order by asset_type, asset_key",
    [character.id],
  );
  return serializePetCharacter(updated.rows[0], assets.rows);
};

const deletePetCharacter = async (userId, petId) => {
  const files = await listPetCharacterFileKeys(userId, petId);
  const result = await pool.query(
    "delete from public.pet_characters where user_id = $1 and pet_id = $2",
    [userId, petId],
  );
  if (result.rowCount > 0) await deletePetCharacterFiles(files);
  return result.rowCount > 0;
};

const serializeNotification = (row) => ({
  id: row.id,
  user_id: row.user_id,
  type: row.type,
  category: row.category || null,
  title: row.title,
  message: row.message,
  data: row.data || {},
  action_url: row.action_url || null,
  is_read: row.is_read,
  created_at: row.created_at || null,
  updated_at: row.updated_at || null,
});

const listUserNotifications = async (userId, { unread = false, limit = 100 } = {}) => {
  const values = [userId];
  const where = ["user_id = $1"];
  if (unread) where.push("is_read = false");
  values.push(Math.min(200, Math.max(1, Number(limit) || 100)));

  const result = await pool.query(
    `
      select *
      from public.notifications
      where ${where.join(" and ")}
      order by created_at desc
      limit $${values.length}
    `,
    values,
  );

  return result.rows.map(serializeNotification);
};

const countUnreadNotifications = async (userId) => {
  const result = await pool.query(
    "select count(*)::integer as count from public.notifications where user_id = $1 and is_read = false",
    [userId],
  );
  return result.rows[0]?.count || 0;
};

const createUserNotification = async (userId, body) => {
  const title = String(body.title || "").trim();
  const message = String(body.message || "").trim();
  if (!title || !message) {
    const error = new Error("Notification title and message are required");
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(
    `
      insert into public.notifications (
        user_id,
        type,
        category,
        title,
        message,
        data,
        action_url
      )
      values ($1, $2, $3, $4, $5, $6::jsonb, $7)
      returning *
    `,
    [
      userId,
      String(body.type || "general").trim() || "general",
      body.category ? String(body.category).trim() : null,
      title,
      message,
      JSON.stringify(body.data && typeof body.data === "object" && !Array.isArray(body.data) ? body.data : {}),
      body.action_url ? String(body.action_url).trim() : null,
    ],
  );

  return serializeNotification(result.rows[0]);
};

const markUserNotificationRead = async (userId, notificationId, isRead = true) => {
  if (!uuidPattern.test(notificationId)) return null;
  const result = await pool.query(
    `
      update public.notifications
      set is_read = $3, updated_at = now()
      where id = $1 and user_id = $2
      returning *
    `,
    [notificationId, userId, Boolean(isRead)],
  );
  return result.rows[0] ? serializeNotification(result.rows[0]) : null;
};

const markAllUserNotificationsRead = async (userId) => {
  const result = await pool.query(
    `
      update public.notifications
      set is_read = true, updated_at = now()
      where user_id = $1 and is_read = false
      returning id
    `,
    [userId],
  );
  return result.rowCount;
};

const serializeDocument = (row) => ({
  id: row.id,
  user_id: row.user_id,
  pet_id: row.pet_id,
  document_type: row.document_type,
  title: row.title,
  description: row.description || null,
  file_url: `/api/me/documents/${row.id}/file`,
  file_name: row.file_name,
  file_size: row.file_size,
  content_type: row.content_type || null,
  uploaded_at: row.uploaded_at || null,
  updated_at: row.updated_at || null,
});

const sanitizeDownloadFileName = (value, extension = "") => {
  const rawName = path.basename(String(value || "document"));
  const rawStem = rawName.slice(0, rawName.length - path.extname(rawName).length) || "document";
  const stem = rawStem
    .replace(/[^A-Za-z0-9 ._()-]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "document";
  const safeExtension = /^\.[a-z0-9]{1,8}$/.test(extension) ? extension : "";
  return `${stem}${safeExtension}`;
};

const ensureUserPet = async (userId, petId) => {
  if (!uuidPattern.test(String(petId || ""))) {
    const error = new Error("A valid pet id is required");
    error.statusCode = 400;
    throw error;
  }

  const pet = await getUserPet(userId, petId);
  if (!pet) {
    const error = new Error("Pet not found");
    error.statusCode = 404;
    throw error;
  }
  return pet;
};

const listUserDocuments = async (userId, { petId = null, documentType = null, limit = 200 } = {}) => {
  const values = [userId];
  const where = ["user_id = $1"];
  if (petId && uuidPattern.test(petId)) {
    values.push(petId);
    where.push(`pet_id = $${values.length}`);
  }
  if (documentType && documentType !== "all") {
    values.push(documentType);
    where.push(`document_type = $${values.length}`);
  }
  values.push(Math.min(500, Math.max(1, Number(limit) || 200)));

  const result = await pool.query(
    `
      select *
      from public.pet_documents
      where ${where.join(" and ")}
      order by uploaded_at desc
      limit $${values.length}
    `,
    values,
  );

  return result.rows.map(serializeDocument);
};

const createUserDocument = async (userId, body) => {
  await ensureUserPet(userId, body.pet_id);

  const title = String(body.title || "").trim();
  if (!title) {
    const error = new Error("Document title is required");
    error.statusCode = 400;
    throw error;
  }

  if (!body.data_url) {
    const error = new Error("Document file is required");
    error.statusCode = 400;
    throw error;
  }
  const documentId = randomUUID();
  const upload = await uploadDocumentFile(body);

  let result;
  try {
    result = await pool.query(
      `
        insert into public.pet_documents (
          id,
          user_id,
          pet_id,
          document_type,
          title,
          description,
          file_url,
          file_name,
          file_size,
          content_type,
          storage_key
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        returning *
      `,
      [
        documentId,
        userId,
        body.pet_id,
        String(body.document_type || "other").trim() || "other",
        title,
        body.description ? String(body.description).trim() : null,
        `/api/me/documents/${documentId}/file`,
        sanitizeDownloadFileName(body.file_name || title, upload.extension),
        upload.size,
        upload.content_type,
        upload.storage_key,
      ],
    );
  } catch (error) {
    await unlink(path.join(privateUploadDir, upload.storage_key)).catch(() => {});
    throw error;
  }

  return serializeDocument(result.rows[0]);
};

const deleteUploadedFileFromUrl = async (fileUrl) => {
  const value = normalizeUploadPath(fileUrl);
  if (!value) return;
  if (!value.startsWith("/uploads/")) return;
  const fileName = path.basename(value);
  if (!fileName || fileName === "." || fileName === "..") return;
  try {
    await unlink(path.join(uploadDir, fileName));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
};

const deleteStoredDocument = async (document) => {
  if (document?.storage_key) {
    try {
      await unlink(path.join(privateUploadDir, path.basename(document.storage_key)));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    return;
  }
  await deleteUploadedFileFromUrl(document?.file_url);
};

const deleteUserDocument = async (userId, documentId) => {
  if (!uuidPattern.test(documentId)) return false;
  const documentResult = await pool.query(
    "select file_url, storage_key from public.pet_documents where id = $1 and user_id = $2 limit 1",
    [documentId, userId],
  );
  if (!documentResult.rows[0]) return false;
  await deleteStoredDocument(documentResult.rows[0]);
  const result = await pool.query(
    "delete from public.pet_documents where id = $1 and user_id = $2",
    [documentId, userId],
  );
  return result.rowCount > 0;
};

const serializeVetVisit = (row) => ({
  id: row.id,
  user_id: row.user_id,
  pet_id: row.pet_id,
  visit_type: row.visit_type || null,
  visit_date: row.visit_date || null,
  next_visit_date: row.next_visit_date || null,
  clinic_name: row.clinic_name || null,
  vet_name: row.vet_name || null,
  reason: row.reason || null,
  diagnosis: row.diagnosis || null,
  treatment: row.treatment || null,
  notes: row.notes || null,
  vaccines: row.vaccines || [],
  is_recovery_mode: row.is_recovery_mode || false,
  recovery_until: row.recovery_until || null,
  raw_summary: row.raw_summary || null,
  cost: row.cost === null || row.cost === undefined ? null : Number(row.cost),
  created_at: row.created_at || null,
  updated_at: row.updated_at || null,
});

const listUserVetVisits = async (userId, petId) => {
  await ensureUserPet(userId, petId);
  const result = await pool.query(
    `
      select *
      from public.pet_vet_visits
      where user_id = $1 and pet_id = $2
      order by visit_date desc nulls last, created_at desc
    `,
    [userId, petId],
  );
  return result.rows.map(serializeVetVisit);
};

const createUserVetVisit = async (userId, petId, body) => {
  await ensureUserPet(userId, petId);
  const visitDate = normalizeDateOnly(body.visit_date || body.visitDate) || new Date().toISOString().slice(0, 10);
  const nextVisitDate = normalizeDateOnly(body.next_visit_date || body.nextVisitDate);
  const clinicName = body.clinic_name ? String(body.clinic_name).trim() : null;
  const vaccines = Array.isArray(body.vaccines)
    ? body.vaccines.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const result = await pool.query(
    `
      insert into public.pet_vet_visits (
        user_id,
        pet_id,
        visit_type,
        visit_date,
        next_visit_date,
        clinic_name,
        vet_name,
        reason,
        diagnosis,
        treatment,
        notes,
        vaccines,
        is_recovery_mode,
        recovery_until,
        raw_summary,
        cost
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, $15, $16)
      returning *
    `,
    [
      userId,
      petId,
      body.visit_type ? String(body.visit_type).trim() : vaccines.length > 0 ? "vaccination" : "checkup",
      visitDate,
      nextVisitDate,
      clinicName,
      body.vet_name ? String(body.vet_name).trim() : null,
      body.reason ? String(body.reason).trim() : null,
      body.diagnosis ? String(body.diagnosis).trim() : null,
      body.treatment ? String(body.treatment).trim() : null,
      body.notes ? String(body.notes).trim() : null,
      JSON.stringify(vaccines),
      Boolean(body.is_recovery_mode || body.isRecoveryMode),
      normalizeDateOnly(body.recovery_until || body.recoveryUntil),
      body.raw_summary ? String(body.raw_summary).trim() : null,
      toNumber(body.cost),
    ],
  );

  const petUpdates = ["last_vet_visit = greatest(coalesce(last_vet_visit, $3::date), $3::date)"];
  const petValues = [petId, userId, visitDate];
  if (nextVisitDate) {
    petValues.push(nextVisitDate);
    petUpdates.push(`next_vet_visit = $${petValues.length}`);
  }
  if (clinicName) {
    petValues.push(clinicName);
    petUpdates.push(`vet_clinic_name = coalesce(vet_clinic_name, $${petValues.length})`);
  }
  await pool.query(
    `update public.pets set ${petUpdates.join(", ")}, updated_at = now() where id = $1 and user_id = $2`,
    petValues,
  );

  return serializeVetVisit(result.rows[0]);
};

const serializeVaccination = (row) => ({
  id: row.id,
  user_id: row.user_id,
  pet_id: row.pet_id,
  vaccine_name: row.vaccine_name,
  administered_at: row.administered_at || null,
  expires_at: row.expires_at || null,
  veterinarian: row.veterinarian || null,
  batch_number: row.batch_number || null,
  notes: row.notes || null,
  created_at: row.created_at || null,
  updated_at: row.updated_at || null,
});

const listUserVaccinations = async (userId, petId) => {
  await ensureUserPet(userId, petId);
  const result = await pool.query(
    `
      select *
      from public.pet_vaccinations
      where user_id = $1 and pet_id = $2
      order by expires_at asc nulls last, administered_at desc nulls last, created_at desc
    `,
    [userId, petId],
  );
  return result.rows.map(serializeVaccination);
};

const createUserVaccination = async (userId, petId, body) => {
  await ensureUserPet(userId, petId);
  const vaccineName = String(body.vaccine_name || body.vaccineName || "").trim();
  if (!vaccineName) {
    const error = new Error("Vaccine name is required");
    error.statusCode = 400;
    throw error;
  }

  const administeredAt = normalizeDateOnly(body.administered_at || body.administeredAt);
  const expiresAt = normalizeDateOnly(body.expires_at || body.expiresAt);
  const result = await pool.query(
    `
      insert into public.pet_vaccinations (
        user_id,
        pet_id,
        vaccine_name,
        administered_at,
        expires_at,
        veterinarian,
        batch_number,
        notes
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8)
      returning *
    `,
    [
      userId,
      petId,
      vaccineName,
      administeredAt,
      expiresAt,
      body.veterinarian ? String(body.veterinarian).trim() : null,
      body.batch_number ? String(body.batch_number).trim() : null,
      body.notes ? String(body.notes).trim() : null,
    ],
  );
  const updates = [];
  const values = [petId, userId];
  if (administeredAt) {
    values.push(administeredAt);
    updates.push(`last_vet_visit = greatest(coalesce(last_vet_visit, $${values.length}::date), $${values.length}::date)`);
  }
  if (expiresAt) {
    values.push(expiresAt);
    updates.push(`next_vet_visit = $${values.length}`);
  }
  if (updates.length > 0) {
    await pool.query(
      `update public.pets set ${updates.join(", ")}, updated_at = now() where id = $1 and user_id = $2`,
      values,
    );
  }
  return serializeVaccination(result.rows[0]);
};

const getUserPetHealthSummary = async (userId, petId) => {
  const [pet, profile, vetVisits, vaccinations, documents] = await Promise.all([
    getUserPet(userId, petId),
    getProfileByUserId(userId),
    listUserVetVisits(userId, petId),
    listUserVaccinations(userId, petId),
    listUserDocuments(userId, { petId, limit: 100 }),
  ]);

  if (!pet) return null;

  const visitsWithDates = vetVisits.filter((visit) => visit.visit_date);
  const lastVetVisit = visitsWithDates[0]?.visit_date || pet.last_vet_visit || null;
  const futureDates = [
    pet.next_vet_visit,
    ...vetVisits.map((visit) => visit.next_visit_date),
    ...vaccinations.map((vaccination) => vaccination.expires_at),
  ].filter(Boolean)
    .filter((date) => new Date(date) >= new Date())
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const activeRecovery = vetVisits.find((visit) => (
    visit.is_recovery_mode && visit.recovery_until && new Date(visit.recovery_until) >= new Date()
  )) || null;

  return {
    pet: {
      ...pet,
      last_vet_visit: lastVetVisit,
      next_vet_visit: futureDates[0] || pet.next_vet_visit || null,
      vet_clinic_name: pet.vet_clinic_name || pet.vet_clinic || vetVisits.find((visit) => visit.clinic_name)?.clinic_name || null,
    },
    profile,
    vet_visits: vetVisits,
    vaccinations,
    documents,
    active_recovery: activeRecovery,
  };
};

const parseGeminiJson = (text) => {
  const raw = String(text || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced?.[1] || raw.match(/\{[\s\S]*\}/)?.[0];
    if (!candidate) return null;
    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }
};

const callGeminiPetJson = async (parts, { temperature = 0.25 } = {}) => {
  if (!geminiApiKey) {
    const error = new Error("GEMINI_API_KEY is not configured");
    error.statusCode = 503;
    throw error;
  }

  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature,
          responseMimeType: "application/json",
        },
      }),
    },
    65000,
  );

  if (!response.ok) {
    const error = new Error(`Gemini request failed (${response.status})`);
    error.statusCode = 502;
    throw error;
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";
  const parsed = parseGeminiJson(text);
  if (!parsed) {
    const error = new Error("Gemini returned an empty response");
    error.statusCode = 502;
    throw error;
  }
  return parsed;
};

const safeText = (value, maxLength = 1200) => String(value || "")
  .replace(/\r\n/g, "\n")
  .replace(/[ \t]+/g, " ")
  .replace(/\n{4,}/g, "\n\n\n")
  .trim()
  .slice(0, maxLength);

const normalizeAiMessages = (messages) => (Array.isArray(messages) ? messages : [])
  .map((message) => ({
    role: message?.role === "assistant" ? "assistant" : "user",
    content: safeText(message?.content, 4000),
  }))
  .filter((message) => message.content)
  .slice(-50);

const parseAiTagMetadata = (raw) => {
  const metadata = {};
  String(raw || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) return;
      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
      if (key) metadata[key] = value;
    });
  return metadata;
};

const extractAiAttachmentReferences = (messages) => {
  const references = [];
  const pattern = /\[(DOCUMENT_UPLOADED|VISUAL_UPLOADED):([^\]]+)\]/g;

  for (const message of messages) {
    let match = pattern.exec(message.content);
    while (match) {
      const metadata = parseAiTagMetadata(match[2]);
      if (metadata.url) {
        references.push({
          kind: match[1] === "DOCUMENT_UPLOADED" ? "document" : "visual",
          url: metadata.url,
          petName: metadata.pet || null,
          petId: metadata.petId || null,
          type: metadata.type || null,
        });
      }
      match = pattern.exec(message.content);
    }
  }

  return references.slice(-3);
};

const normalizeUploadPath = (fileUrl) => {
  const value = String(fileUrl || "").trim();
  if (!value) return null;
  try {
    return new URL(value, "http://localhost").pathname;
  } catch {
    return value;
  }
};

const loadAiAttachmentPart = async (reference, userId) => {
  const uploadPath = normalizeUploadPath(reference.url);
  if (!uploadPath) {
    return {
      text: `Attachment ${reference.kind} could not be analyzed because it is not a local MIPO upload.`,
    };
  }

  let fileName;
  let mimeType;
  let loadBuffer;

  const documentMatch = uploadPath.match(/^\/api\/me\/documents\/([0-9a-fA-F-]{36})\/file$/);
  if (documentMatch) {
    const result = await pool.query(
      "select * from public.pet_documents where id = $1 and user_id = $2 limit 1",
      [documentMatch[1], userId],
    );
    const document = result.rows[0];
    if (!document) {
      return { text: "This document is unavailable or does not belong to the signed-in user." };
    }
    loadBuffer = async () => {
      const stored = await readDocumentFile(document);
      fileName = stored.storageKey;
      return stored.buffer;
    };
  } else if (uploadPath.startsWith("/uploads/")) {
    const storageKey = safeStorageKey(uploadPath.slice("/uploads/".length));
    if (!storageKey) return { text: "This attachment has an invalid storage path." };

    const [ownedUpload, legacyDocument] = await Promise.all([
      pool.query(
        "select content_type from public.user_uploads where storage_key = $1 and user_id = $2 limit 1",
        [storageKey, userId],
      ),
      pool.query(
        `
          select *
          from public.pet_documents
          where user_id = $2
            and (file_url = $1 or right(file_url, length($1)) = $1)
          limit 1
        `,
        [`/uploads/${storageKey}`, userId],
      ),
    ]);
    if (ownedUpload.rowCount === 0 && legacyDocument.rowCount === 0) {
      return { text: "This attachment is unavailable or does not belong to the signed-in user." };
    }
    fileName = storageKey;
    mimeType = ownedUpload.rows[0]?.content_type || legacyDocument.rows[0]?.content_type || null;
    loadBuffer = () => readFile(path.join(uploadDir, storageKey));
  } else {
    return {
      text: `Attachment ${reference.kind} could not be analyzed because it is not a local MIPO upload.`,
    };
  }

  try {
    const buffer = await loadBuffer();
    if (buffer.length > maxAiAttachmentBytes) {
      return {
        text: `Attachment ${fileName} is too large for AI analysis. Ask the user to upload a smaller image or PDF.`,
      };
    }

    mimeType = contentTypeForSafeExtension(path.extname(fileName)) || mimeType;
    const supported = typeof mimeType === "string" && (
      mimeType.startsWith("image/")
      || mimeType.startsWith("video/")
      || mimeType === "application/pdf"
      || mimeType === "text/plain"
    );
    if (!supported) {
      return {
        text: `Attachment ${fileName} has unsupported type ${mimeType}.`,
      };
    }

    return {
      inlineData: {
        mimeType,
        data: buffer.toString("base64"),
      },
    };
  } catch {
    return {
      text: `Attachment ${fileName} could not be read from storage. Tell the user the upload was saved, but analysis is unavailable.`,
    };
  }
};

const compactPetForAi = (pet) => pet ? {
  id: pet.id,
  name: pet.name,
  type: pet.type,
  breed: pet.breed,
} : null;

const compactSelectedPetForAi = (pet) => pet ? {
  ...compactPetForAi(pet),
  age_years: pet.age_years,
  age_months: pet.age_months,
  gender: pet.gender,
  weight: pet.weight,
  medical_conditions: pet.medical_conditions,
  current_food: pet.current_food,
  last_vet_visit: pet.last_vet_visit,
  next_vet_visit: pet.next_vet_visit,
  has_insurance: pet.has_insurance,
} : null;

const compactHealthSummaryForAi = (summary) => summary ? {
  recent_vet_visits: (summary.vet_visits || []).slice(0, 5).map((visit) => ({
    visit_type: visit.visit_type,
    visit_date: visit.visit_date,
    next_visit_date: visit.next_visit_date,
    clinic_name: visit.clinic_name,
    reason: visit.reason,
    diagnosis: visit.diagnosis,
    treatment: visit.treatment,
    vaccines: visit.vaccines,
    notes: safeText(visit.notes || visit.raw_summary, 500),
  })),
  vaccinations: (summary.vaccinations || []).slice(0, 8).map((vaccination) => ({
    vaccine_name: vaccination.vaccine_name,
    administered_at: vaccination.administered_at,
    expires_at: vaccination.expires_at,
  })),
  documents: (summary.documents || []).slice(0, 8).map((document) => ({
    title: document.title,
    document_type: document.document_type,
    uploaded_at: document.uploaded_at,
    content_type: document.content_type,
  })),
  active_recovery: summary.active_recovery ? {
    recovery_until: summary.active_recovery.recovery_until,
    reason: summary.active_recovery.reason,
    treatment: summary.active_recovery.treatment,
  } : null,
} : null;

const normalizeAiProducts = (products) => (Array.isArray(products) ? products : [])
  .map((product) => ({
    id: String(product?.id || "").trim(),
    name: String(product?.name || "").trim(),
    price: product?.price === null || product?.price === undefined ? null : Number(product.price),
    sale_price: product?.sale_price === null || product?.sale_price === undefined ? null : Number(product.sale_price),
    image_url: product?.image_url || null,
    category: product?.category || null,
  }))
  .filter((product) => product.id && product.name)
  .slice(0, 6);

const buildPetAiPrompt = ({
  auth,
  messages,
  pets,
  selectedPet,
  selectedPetSummary,
  attachmentReferences,
}) => {
  const conversation = messages
    .map((message) => `${message.role === "assistant" ? "Assistant" : "User"}: ${message.content}`)
    .join("\n");

  const profile = auth.profile || {};
  const userName = profile.first_name || profile.full_name || auth.user.full_name || "User";

  return `You are MIPO AI, a practical pet-care assistant for an Israeli pet app.
Reply in the user's language. Hebrew is the default when unclear.

Safety:
- You are not a veterinarian. For urgent symptoms, poisoning, breathing trouble, seizures, heavy bleeding, collapse, inability to urinate, severe pain, or rapidly worsening condition, tell the user to contact an emergency veterinarian immediately.
- For medical images/documents, summarize and triage. Do not diagnose with certainty.
- Do not invent facts that are not visible in the document, image, or profile.
- If OCR/vision is uncertain, explicitly say what is uncertain.
- If the user asks about shopping, training, grooming, boarding, documents, parks, adoption, or appointments, you may include an action tag.

Available UI action tags inside content when useful:
[ACTION:SHOW_CALENDAR]
[ACTION:UPLOAD_DOCUMENT]
[ACTION:UPLOAD_PHOTO]
[ACTION:SHOW_DOCUMENT_TYPES]
[ACTION:SHOW_STORE_CATEGORIES]
[ACTION:SHOW_GROOMING_SERVICES]
[ACTION:SHOW_APPOINTMENT_PICKER]
[ACTION:SHOW_TRAINING_CATEGORIES]
[ACTION:SHOW_TRAINING_OPTIONS:Option one|Option two]
[ACTION:SHOW_PARK_OPTIONS]
[ACTION:SHOW_BOARDING_TYPES]
[ACTION:SHOW_ADOPTION_TRAITS]
[ACTION:SHOW_ADOPTION_REQUIREMENTS]

Return JSON only with this shape:
{
  "content": "assistant message text, optionally with UI tags",
  "suggestions": ["short quick reply 1", "short quick reply 2"],
  "products": [],
  "botSource": "gemini"
}

User context:
${JSON.stringify({
    user: { name: userName },
    pets: pets.map(compactPetForAi),
    selected_pet: compactSelectedPetForAi(selectedPet),
    selected_pet_health: compactHealthSummaryForAi(selectedPetSummary),
    attachments: attachmentReferences.map((attachment) => ({
      kind: attachment.kind,
      petName: attachment.petName,
      type: attachment.type,
    })),
  }, null, 2)}

Conversation:
${conversation}`;
};

const createAiChatReply = async (auth, body) => {
  const messages = normalizeAiMessages(body.messages);
  if (messages.length === 0) {
    const error = new Error("At least one chat message is required");
    error.statusCode = 400;
    throw error;
  }

  const userContext = body.userContext || {};
  const pets = await listUserPets(auth.user.id, "false");
  const selectedPetId = String(userContext.selectedPetId || "").trim();
  const selectedPetName = String(userContext.selectedPetName || "").trim().toLowerCase();
  const selectedPet = pets.find((pet) => pet.id === selectedPetId)
    || (selectedPetName ? pets.find((pet) => pet.name.toLowerCase() === selectedPetName) : null)
    || null;
  const selectedPetSummary = selectedPet
    ? await getUserPetHealthSummary(auth.user.id, selectedPet.id).catch(() => null)
    : null;

  const attachmentReferences = extractAiAttachmentReferences(messages);
  const attachmentParts = [];
  for (const reference of attachmentReferences) {
    const attachmentMetadata = {
      kind: reference.kind,
      petName: reference.petName,
      type: reference.type,
    };
    attachmentParts.push({
      text: `Analyze attached ${reference.kind} for ${reference.petName || selectedPet?.name || "the selected pet"}. Metadata: ${JSON.stringify(attachmentMetadata)}`,
    });
    attachmentParts.push(await loadAiAttachmentPart(reference, auth.user.id));
  }

  const prompt = buildPetAiPrompt({
    auth,
    messages,
    pets,
    selectedPet,
    selectedPetSummary,
    attachmentReferences,
  });

  const result = await callGeminiPetJson([
    { text: prompt },
    ...attachmentParts,
  ]);

  const content = safeText(result.content || result.message, 12000);
  if (!content) {
    const error = new Error("Gemini returned no chat content");
    error.statusCode = 502;
    throw error;
  }

  return {
    role: "assistant",
    content,
    timestamp: new Date().toISOString(),
    suggestions: Array.isArray(result.suggestions)
      ? result.suggestions.map((suggestion) => safeText(suggestion, 80)).filter(Boolean).slice(0, 4)
      : [],
    products: normalizeAiProducts(result.products),
    botSource: result.botSource || "gemini",
  };
};

const toNumber = (value) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const idNumberLast4 = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
};

const serializeInsuranceClaim = (row) => ({
  id: row.id,
  user_id: row.user_id,
  pet_id: row.pet_id || null,
  pet_name: row.pet_name || null,
  pet_microchip: row.pet_microchip || null,
  owner_name: row.owner_name || null,
  owner_id_number: idNumberLast4(row.owner_id_number),
  clinic_name: row.clinic_name || null,
  visit_date: row.visit_date || null,
  diagnosis: row.diagnosis || null,
  treatment: row.treatment || null,
  total_amount: row.total_amount === null || row.total_amount === undefined ? null : Number(row.total_amount),
  paid_amount: row.paid_amount === null || row.paid_amount === undefined ? null : Number(row.paid_amount),
  status: row.status || "pending",
  status_note: row.status_note || null,
  submitted_at: row.submitted_at || null,
  updated_at: row.updated_at || null,
});

const listUserInsuranceClaims = async (userId, { petId = null, limit = 100 } = {}) => {
  const values = [userId];
  const where = ["user_id = $1"];

  if (petId && uuidPattern.test(petId)) {
    values.push(petId);
    where.push(`pet_id = $${values.length}`);
  }

  values.push(Math.min(200, Math.max(1, Number(limit) || 100)));

  const result = await pool.query(
    `
      select *
      from public.insurance_claims
      where ${where.join(" and ")}
      order by submitted_at desc
      limit $${values.length}
    `,
    values,
  );

  return result.rows.map(serializeInsuranceClaim);
};

const createUserInsuranceClaim = async (userId, body) => {
  const petId = body.pet_id ? String(body.pet_id) : null;
  if (petId) await ensureUserPet(userId, petId);

  const result = await pool.query(
    `
      insert into public.insurance_claims (
        user_id,
        pet_id,
        pet_name,
        pet_microchip,
        owner_name,
        owner_id_number,
        clinic_name,
        visit_date,
        diagnosis,
        treatment,
        total_amount,
        paid_amount,
        status,
        status_note
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      returning *
    `,
    [
      userId,
      petId,
      body.pet_name ? String(body.pet_name).trim() : null,
      body.pet_microchip ? String(body.pet_microchip).trim() : null,
      body.owner_name ? String(body.owner_name).trim() : null,
      idNumberLast4(body.owner_id_number),
      body.clinic_name ? String(body.clinic_name).trim() : null,
      normalizeDateOnly(body.visit_date),
      body.diagnosis ? String(body.diagnosis).trim() : null,
      body.treatment ? String(body.treatment).trim() : null,
      toNumber(body.total_amount),
      toNumber(body.paid_amount),
      "pending",
      body.status_note ? String(body.status_note).trim() : null,
    ],
  );

  return serializeInsuranceClaim(result.rows[0]);
};

const serializeServiceBooking = (row) => ({
  id: row.id,
  user_id: row.user_id,
  pet_id: row.pet_id || null,
  service_type: row.service_type,
  service_id: row.service_id || null,
  service_name: row.service_name,
  provider_name: row.provider_name || null,
  requested_date: row.requested_date || null,
  start_date: row.start_date || null,
  end_date: row.end_date || null,
  total_price: row.total_price === null || row.total_price === undefined ? null : Number(row.total_price),
  status: row.status || "pending",
  notes: row.notes || null,
  metadata: row.metadata || {},
  created_at: row.created_at || null,
  updated_at: row.updated_at || null,
});

const listUserServiceBookings = async (userId, { petId = null, serviceType = null, limit = 100 } = {}) => {
  const values = [userId];
  const where = ["user_id = $1"];

  if (petId && uuidPattern.test(petId)) {
    values.push(petId);
    where.push(`pet_id = $${values.length}`);
  }
  if (serviceType) {
    values.push(String(serviceType).trim());
    where.push(`service_type = $${values.length}`);
  }

  values.push(Math.min(200, Math.max(1, Number(limit) || 100)));
  const result = await pool.query(
    `
      select *
      from public.pet_service_bookings
      where ${where.join(" and ")}
      order by created_at desc
      limit $${values.length}
    `,
    values,
  );

  return result.rows.map(serializeServiceBooking);
};

const createUserServiceBooking = async (userId, body) => {
  const petId = body.pet_id ? String(body.pet_id) : null;
  if (petId) await ensureUserPet(userId, petId);

  const serviceType = String(body.service_type || "").trim();
  const serviceName = String(body.service_name || "").trim();
  if (!serviceType || !serviceName) {
    const error = new Error("Service type and service name are required");
    error.statusCode = 400;
    throw error;
  }

  const metadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
    ? body.metadata
    : {};

  const result = await pool.query(
    `
      insert into public.pet_service_bookings (
        user_id,
        pet_id,
        service_type,
        service_id,
        service_name,
        provider_name,
        requested_date,
        start_date,
        end_date,
        total_price,
        status,
        notes,
        metadata
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, $12::jsonb)
      returning *
    `,
    [
      userId,
      petId,
      serviceType,
      body.service_id ? String(body.service_id).trim() : null,
      serviceName,
      body.provider_name ? String(body.provider_name).trim() : null,
      normalizeDateOnly(body.requested_date),
      normalizeDateOnly(body.start_date),
      normalizeDateOnly(body.end_date),
      toNumber(body.total_price),
      body.notes ? String(body.notes).trim() : null,
      JSON.stringify(metadata),
    ],
  );

  return serializeServiceBooking(result.rows[0]);
};

const normalizePetType = (value) => {
  if (value === "both") return "all";
  if (["dog", "cat", "other", "all"].includes(value)) return value;
  return null;
};

const numberFields = new Set([
  "price",
  "original_price",
  "sale_price",
  "price_per_weight",
  "suggested_price",
  "safety_score",
  "cost_price",
  "restock_interval_days",
  "kcal_per_kg",
]);

const arrayFields = new Set([
  "images",
  "flavors",
  "special_diet",
  "breed_tags",
  "medical_tags",
]);

const jsonFields = new Set([
  "benefits",
  "feeding_guide",
  "product_attributes",
]);

const booleanFields = new Set([
  "in_stock",
  "is_featured",
  "needs_image_review",
  "needs_price_review",
  "is_flagged",
  "auto_restock",
  "api_sync_enabled",
]);

const businessProductFields = {
  name: "name",
  description: "description",
  price: "price",
  original_price: "original_price",
  sale_price: "sale_price",
  image_url: "image_url",
  images: "images",
  category: "category",
  image_source_url: "image_source_url",
  image_adopted_at: "image_adopted_at",
  in_stock: "in_stock",
  is_featured: "is_featured",
  sku: "sku",
  pet_type: "pet_type",
  flavors: "flavors",
  brand: "brand",
  weight_unit: "weight_unit",
  price_per_weight: "price_per_weight",
  source_url: "source_url",
  ingredients: "ingredients",
  benefits: "benefits",
  feeding_guide: "feeding_guide",
  product_attributes: "product_attributes",
  life_stage: "life_stage",
  dog_size: "dog_size",
  special_diet: "special_diet",
  needs_image_review: "needs_image_review",
  needs_price_review: "needs_price_review",
  suggested_price: "suggested_price",
  price_suggestion_reason: "price_suggestion_reason",
  is_flagged: "is_flagged",
  flagged_reason: "flagged_reason",
  flagged_at: "flagged_at",
  safety_score: "safety_score",
  cost_price: "cost_price",
  supplier_id: "supplier_id",
  auto_restock: "auto_restock",
  restock_interval_days: "restock_interval_days",
  api_sync_enabled: "api_sync_enabled",
  breed_tags: "breed_tags",
  medical_tags: "medical_tags",
  kcal_per_kg: "kcal_per_kg",
};

const scrapedProductFields = {
  name: "product_name",
  description: "long_description",
  price: "final_price",
  original_price: "regular_price",
  sale_price: "sale_price",
  image_url: "main_image_url",
  category: "sub_category",
  in_stock: "stock_status",
  sku: "sku",
  pet_type: "pet_type",
  flavors: "flavors",
  brand: "brand",
  source_url: "product_url",
  ingredients: "ingredients",
  is_flagged: "is_flagged",
  flagged_reason: "flagged_reason",
  flagged_at: "flagged_at",
};

const normalizeFieldValue = (field, value, target = "business") => {
  if (value === undefined) return undefined;

  if (field === "name") {
    const name = typeof value === "string" ? value.trim() : "";
    if (!name) throw new Error("Product name is required");
    return name;
  }

  if (field === "price") {
    const price = toNumber(value);
    if (!price || price <= 0) throw new Error("A valid product price is required");
    return price;
  }

  if (numberFields.has(field)) {
    return toNumber(value);
  }

  if (field === "pet_type") {
    return normalizePetType(value);
  }

  if (field === "in_stock" && target === "scraped") {
    return value ? "in_stock" : "out_of_stock";
  }

  if (booleanFields.has(field)) {
    return value === null ? null : Boolean(value);
  }

  if (arrayFields.has(field)) {
    if (value === null) return null;
    return Array.isArray(value) ? value : [];
  }

  if (jsonFields.has(field)) {
    if (value === null) return null;
    if (field === "product_attributes") {
      return JSON.stringify(value && typeof value === "object" && !Array.isArray(value) ? value : {});
    }
    return JSON.stringify(Array.isArray(value) ? value : []);
  }

  return value ?? null;
};

const normalizeProductPayload = (body) => {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const price = toNumber(body.price);

  if (!name) throw new Error("Product name is required");
  if (!price || price <= 0) throw new Error("A valid product price is required");

  return {
    name,
    description: body.description ?? null,
    price,
    original_price: toNumber(body.original_price),
    sale_price: toNumber(body.sale_price),
    image_url: body.image_url || "/placeholder.svg",
    images: Array.isArray(body.images) ? body.images : [],
    category: body.category ?? null,
    in_stock: body.in_stock ?? true,
    is_featured: body.is_featured ?? false,
    sku: body.sku ?? null,
    pet_type: normalizePetType(body.pet_type),
    flavors: Array.isArray(body.flavors) ? body.flavors : [],
    brand: body.brand ?? null,
    weight_unit: body.weight_unit ?? null,
    price_per_weight: toNumber(body.price_per_weight),
    source_url: body.source_url ?? null,
    ingredients: body.ingredients ?? null,
    benefits: Array.isArray(body.benefits) ? body.benefits : [],
    feeding_guide: Array.isArray(body.feeding_guide) ? body.feeding_guide : [],
    product_attributes: body.product_attributes && typeof body.product_attributes === "object" ? body.product_attributes : {},
    life_stage: body.life_stage ?? null,
    dog_size: body.dog_size ?? null,
    special_diet: Array.isArray(body.special_diet) ? body.special_diet : [],
    breed_tags: Array.isArray(body.breed_tags) ? body.breed_tags : [],
    medical_tags: Array.isArray(body.medical_tags) ? body.medical_tags : [],
    auto_restock: body.auto_restock ?? false,
    restock_interval_days: toNumber(body.restock_interval_days),
    api_sync_enabled: body.api_sync_enabled ?? false,
    cost_price: toNumber(body.cost_price),
    supplier_id: body.supplier_id ?? null,
    safety_score: toNumber(body.safety_score),
    kcal_per_kg: toNumber(body.kcal_per_kg),
  };
};

const buildUpdateStatement = ({ table, fields, id, body, target }) => {
  const values = [id];
  const assignments = [];

  for (const [apiField, column] of Object.entries(fields)) {
    if (!Object.prototype.hasOwnProperty.call(body, apiField)) continue;

    const value = normalizeFieldValue(apiField, body[apiField], target);
    if (value === undefined) continue;

    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return null;

  return {
    sql: `
      update public.${table}
      set ${assignments.join(", ")}, updated_at = now()
      where id = $1
      returning *
    `,
    values,
  };
};

const buildBulkUpdateStatement = ({ table, fields, ids, body, target }) => {
  const values = [ids];
  const assignments = [];

  for (const [apiField, column] of Object.entries(fields)) {
    if (!Object.prototype.hasOwnProperty.call(body, apiField)) continue;

    const value = normalizeFieldValue(apiField, body[apiField], target);
    if (value === undefined) continue;

    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }

  if (assignments.length === 0) return null;

  return {
    sql: `
      update public.${table}
      set ${assignments.join(", ")}, updated_at = now()
      where id = any($1::uuid[])
      returning id
    `,
    values,
  };
};

const mapBusinessProduct = (row) => ({
  ...row,
  source: "manual",
});

const mapScrapedProduct = (row) => ({
  id: row.id,
  name: row.product_name || "",
  description: row.long_description || row.short_description || "",
  price: row.final_price || row.regular_price || 0,
  original_price: row.regular_price !== row.final_price ? row.regular_price : null,
  sale_price: row.sale_price,
  image_url: row.main_image_url || "/placeholder.svg",
  images: row.main_image_url ? [row.main_image_url] : [],
  category: row.sub_category || row.main_category,
  in_stock: row.stock_status === "in_stock" || row.stock_status === null,
  is_featured: false,
  business_id: null,
  created_at: row.created_at || row.scraped_at,
  updated_at: row.updated_at || row.scraped_at,
  is_flagged: row.is_flagged || false,
  flagged_reason: row.flagged_reason,
  sku: row.sku,
  pet_type: normalizePetType(row.pet_type),
  flavors: row.flavors || [],
  brand: row.brand,
  ingredients: row.ingredients,
  source_url: row.product_url,
  source: "scraped",
});

const listProducts = async () => {
  const [businessProducts, scrapedProducts] = await Promise.all([
    pool.query("select * from public.business_products order by created_at desc"),
    pool.query("select * from public.scraped_products order by scraped_at desc nulls last, created_at desc"),
  ]);

  return [
    ...businessProducts.rows.map(mapBusinessProduct),
    ...scrapedProducts.rows.map(mapScrapedProduct),
  ];
};

const listBreeds = async (petType) => {
  const normalizedPetType = ["dog", "cat"].includes(petType) ? petType : "dog";

  try {
    const result = await pool.query(
      `
        select
          id::text,
          breed_name,
          breed_name_he,
          pet_type,
          life_expectancy_years,
          description_he,
          affection_family,
          kids_friendly,
          dog_friendly,
          shedding_level,
          grooming_freq,
          drooling_level,
          stranger_openness,
          playfulness,
          watchdog_nature,
          trainability,
          energy_level,
          barking_level,
          mental_needs,
          size_category,
          weight_range_kg,
          image_url
        from public.breed_information
        where pet_type = $1
          and coalesce(is_active, true) = true
        order by coalesce(breed_name_he, breed_name) asc
      `,
      [normalizedPetType],
    );

    if (result.rows.length > 0) return result.rows;
  } catch (error) {
    if (error.code !== "42P01" && error.code !== "42703") throw error;
  }

  return fallbackBreeds
    .filter((breed) => breed.pet_type === normalizedPetType)
    .sort((a, b) => (a.breed_name_he || a.breed_name).localeCompare(b.breed_name_he || b.breed_name, "he"));
};

const ensureDefaultBusinessProfile = async () => {
  await pool.query(
    `
      insert into public.business_profiles (
        id,
        business_name,
        business_type,
        description,
        email,
        website,
        city,
        is_verified,
        is_featured
      )
      values (
        $1,
        'Mipo Shop',
        'shop',
        'Default Mipo shop business profile for product catalog management.',
        'shop@mipo.pet',
        'https://mipo.pet',
        'Israel',
        true,
        true
      )
      on conflict (id) do nothing
    `,
    [defaultBusinessId],
  );
  return defaultBusinessId;
};

// Images reach the catalogue four ways - scraping, a spreadsheet, a database
// import, or somebody pasting a URL they found - and until now all four stored
// the supplier's own address. That is not our image: it can change, it can be
// resized, it can 404, and the supplier can see our traffic. Adoption downloads
// the bytes once, normalizes them onto the shared canvas and stores them here,
// after which the product points at us.
//
// Already-ours URLs pass straight through, so re-saving a product does not
// re-download and re-encode an image we normalized yesterday.
// Strips the buying trail from a public product row.
const withoutSupplierOrigin = (product) => {
  const { image_source_url: _origin, image_adopted_at: _adoptedAt, ...rest } = product;
  return rest;
};

const isAdminRequest = async (request) => {
  if (adminApiKey && secretsEqual(request.headers["x-admin-api-key"], adminApiKey)) return true;
  return Boolean(await getAdminFromSession(request));
};

const isOwnedImageUrl = (value) => {
  const url = String(value || "").trim();
  return url.startsWith("/uploads/") || url === "/placeholder.svg" || url.startsWith("data:image/webp");
};

const backgroundRemovalEnabled = process.env.PRODUCT_IMAGE_REMOVE_BACKGROUND === "true";

// Injected rather than imported so this file never picks a provider. Left null
// until a remover is wired in; the pipeline then simply skips the stage.
let productBackgroundRemover = backgroundRemovalEnabled
  ? createGeminiBackgroundRemover({ apiKey: geminiApiKey })
  : null;

export const setProductBackgroundRemover = (remover) => {
  productBackgroundRemover = typeof remover === "function" ? remover : null;
};

const adoptProductImage = async (imageUrl, { label = "product" } = {}) => {
  const value = String(imageUrl || "").trim();
  if (!value || isOwnedImageUrl(value)) return { url: value || null, adopted: false };

  let sourceBuffer;
  try {
    sourceBuffer = value.startsWith("data:")
      ? decodeAndValidateDataUrl(value, { maxBytes: maxUploadBytes, requireImage: true }).buffer
      : await fetchImageBuffer(value);
  } catch (error) {
    // A bad image must not block the product. The row keeps whatever it had and
    // the admin can see it was never adopted.
    console.warn("product_image_not_adopted", {
      label,
      reason: error instanceof ImagePipelineError ? error.code : "decode_failed",
    });
    return { url: value, adopted: false, reason: error?.code || "decode_failed" };
  }

  try {
    const normalized = await normalizeWithBackgroundRemoval(sourceBuffer, {
      remover: backgroundRemovalEnabled ? productBackgroundRemover : null,
      onWarning: (warning) => console.warn("product_image_warning", { label, ...warning }),
    });

    const fileName = `${Date.now()}-${randomUUID()}${normalized.extension}`;
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, fileName), normalized.buffer, { flag: "wx", mode: 0o644 });

    return {
      url: `/uploads/${fileName}`,
      adopted: true,
      width: normalized.width,
      height: normalized.height,
      bytes: normalized.bytes,
      background_removed: normalized.background_removed,
      original_url: value.startsWith("data:") ? null : value,
    };
  } catch (error) {
    console.warn("product_image_not_adopted", { label, reason: error?.code || "normalize_failed" });
    return { url: value, adopted: false, reason: error?.code || "normalize_failed" };
  }
};

// Every image on a product, not just the primary one.
const adoptProductImages = async (body, label) => {
  const primary = await adoptProductImage(body.image_url, { label });
  const gallery = Array.isArray(body.images) && body.images.length > 0
    ? await Promise.all(body.images.map((image) => adoptProductImage(image, { label })))
    : [];

  return {
    image_url: primary.url,
    images: gallery.map((entry) => entry.url).filter(Boolean),
    adopted: [primary, ...gallery].filter((entry) => entry.adopted).length,
    // Kept so the catalogue can be rebuilt if our storage is ever lost.
    image_source_url: primary.original_url || null,
    image_adopted_at: primary.adopted ? new Date().toISOString() : null,
  };
};

const createProduct = async (body) => {
  const payload = normalizeProductPayload(body);
  const businessId = body.business_id || await ensureDefaultBusinessProfile();

  // Scraped, imported from a spreadsheet, or pasted by hand - the bytes become
  // ours here, before the row is written.
  const owned = await adoptProductImages(payload, payload.name);
  payload.image_url = owned.image_url || "/placeholder.svg";
  payload.images = owned.images;
  payload.image_source_url = owned.image_source_url;
  payload.image_adopted_at = owned.image_adopted_at;

  const result = await pool.query(
    `
      insert into public.business_products (
        business_id, name, description, price, original_price, sale_price,
        image_url, images, category, in_stock, is_featured, sku, pet_type,
        flavors, brand, weight_unit, price_per_weight, source_url, ingredients,
        benefits, feeding_guide, product_attributes, life_stage, dog_size, special_diet,
        breed_tags, medical_tags, auto_restock, restock_interval_days, api_sync_enabled,
        cost_price, supplier_id, safety_score, kcal_per_kg,
        image_source_url, image_adopted_at
      )
      values (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25,
        $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36
      )
      returning *
    `,
    [
      businessId,
      payload.name,
      payload.description,
      payload.price,
      payload.original_price,
      payload.sale_price,
      payload.image_url,
      payload.images,
      payload.category,
      payload.in_stock,
      payload.is_featured,
      payload.sku,
      payload.pet_type,
      payload.flavors,
      payload.brand,
      payload.weight_unit,
      payload.price_per_weight,
      payload.source_url,
      payload.ingredients,
      JSON.stringify(payload.benefits),
      JSON.stringify(payload.feeding_guide),
      JSON.stringify(payload.product_attributes),
      payload.life_stage,
      payload.dog_size,
      payload.special_diet,
      payload.breed_tags,
      payload.medical_tags,
      payload.auto_restock,
      payload.restock_interval_days,
      payload.api_sync_enabled,
      payload.cost_price,
      payload.supplier_id,
      payload.safety_score,
      payload.kcal_per_kg,
      payload.image_source_url,
      payload.image_adopted_at,
    ],
  );

  return mapBusinessProduct(result.rows[0]);
};

const fetchProductById = async (id, source) => {
  if (source === "scraped") {
    const result = await pool.query("select * from public.scraped_products where id = $1", [id]);
    return result.rows[0] ? mapScrapedProduct(result.rows[0]) : null;
  }

  const result = await pool.query("select * from public.business_products where id = $1", [id]);
  return result.rows[0] ? mapBusinessProduct(result.rows[0]) : null;
};

const updateBusinessProduct = async (id, body) => {
  // An edit can introduce a new supplier URL just as an import can, so the same
  // rule applies: if it is not already ours, adopt it before it is stored.
  if (Object.hasOwn(body, "image_url") || Object.hasOwn(body, "images")) {
    const owned = await adoptProductImages(body, body.name || id);
    if (Object.hasOwn(body, "image_url")) body.image_url = owned.image_url;
    if (Object.hasOwn(body, "images")) body.images = owned.images;
    if (owned.image_source_url) {
      body.image_source_url = owned.image_source_url;
      body.image_adopted_at = owned.image_adopted_at;
    }
  }

  const statement = buildUpdateStatement({
    table: "business_products",
    fields: businessProductFields,
    id,
    body,
    target: "business",
  });

  if (!statement) return fetchProductById(id, "manual");

  const result = await pool.query(statement.sql, statement.values);
  return result.rows[0] ? mapBusinessProduct(result.rows[0]) : null;
};

const updateScrapedProduct = async (id, body) => {
  const statement = buildUpdateStatement({
    table: "scraped_products",
    fields: scrapedProductFields,
    id,
    body,
    target: "scraped",
  });

  if (!statement) return fetchProductById(id, "scraped");

  const result = await pool.query(statement.sql, statement.values);
  return result.rows[0] ? mapScrapedProduct(result.rows[0]) : null;
};

const updateProduct = async (id, body) => {
  if (body.source === "scraped") return updateScrapedProduct(id, body);
  if (body.source === "manual") return updateBusinessProduct(id, body);

  const businessProduct = await updateBusinessProduct(id, body);
  if (businessProduct) return businessProduct;

  return updateScrapedProduct(id, body);
};

const bulkUpdateProducts = async (ids, updates) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("Product ids are required");
  }

  const businessStatement = buildBulkUpdateStatement({
    table: "business_products",
    fields: businessProductFields,
    ids,
    body: updates,
    target: "business",
  });
  const scrapedStatement = buildBulkUpdateStatement({
    table: "scraped_products",
    fields: scrapedProductFields,
    ids,
    body: updates,
    target: "scraped",
  });

  const [businessResult, scrapedResult] = await Promise.all([
    businessStatement ? pool.query(businessStatement.sql, businessStatement.values) : Promise.resolve({ rowCount: 0 }),
    scrapedStatement ? pool.query(scrapedStatement.sql, scrapedStatement.values) : Promise.resolve({ rowCount: 0 }),
  ]);

  return {
    updated: businessResult.rowCount + scrapedResult.rowCount,
    manual: businessResult.rowCount,
    scraped: scrapedResult.rowCount,
  };
};

const deleteProduct = async (id, source) => {
  if (source === "manual") {
    const result = await pool.query("delete from public.business_products where id = $1", [id]);
    return result.rowCount > 0;
  }

  if (source === "scraped") {
    const result = await pool.query("delete from public.scraped_products where id = $1", [id]);
    return result.rowCount > 0;
  }

  const [businessResult, scrapedResult] = await Promise.all([
    pool.query("delete from public.business_products where id = $1", [id]),
    pool.query("delete from public.scraped_products where id = $1", [id]),
  ]);
  return businessResult.rowCount + scrapedResult.rowCount > 0;
};

const bulkDeleteProducts = async (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("Product ids are required");
  }

  const [businessResult, scrapedResult] = await Promise.all([
    pool.query("delete from public.business_products where id = any($1::uuid[])", [ids]),
    pool.query("delete from public.scraped_products where id = any($1::uuid[])", [ids]),
  ]);

  return {
    deleted: businessResult.rowCount + scrapedResult.rowCount,
    manual: businessResult.rowCount,
    scraped: scrapedResult.rowCount,
  };
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const orderStatuses = new Set(["pending", "processing", "shipped", "delivered", "cancelled"]);
const paymentStatuses = new Set([
  "pending",
  "paid",
  "failed",
  "awaiting_cod",
  "refunded",
  "libra_credit",
  ...(isProduction ? [] : ["dev_approved"]),
]);
const couponDiscountTypes = new Set(["percentage", "percent", "fixed", "amount", "free_shipping"]);

const toMoney = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : fallback;
};

const toPositiveInteger = (value, fallback = 1) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const generateOrderNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `MIPO-${date}-${suffix}`;
};

const normalizeCouponDiscountType = (type) => {
  if (type === "percent") return "percentage";
  if (type === "amount") return "fixed";
  return type;
};

const mapCoupon = (row) => ({
  id: row.id,
  code: row.code,
  discount_type: normalizeCouponDiscountType(row.discount_type),
  discount_value: toMoney(row.discount_value),
  min_order_amount: toMoney(row.min_order_amount),
  max_uses: row.max_uses,
  used_count: row.used_count || 0,
  valid_from: row.valid_from,
  valid_until: row.valid_until,
  is_active: row.is_active,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const findValidCoupon = async (client, code, subtotal) => {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode) return null;

  const result = await client.query(
    `
      select *
      from public.coupons
      where upper(code) = $1
        and is_active = true
      limit 1
      for update
    `,
    [normalizedCode],
  );

  const coupon = result.rows[0];
  if (!coupon) return null;

  const now = Date.now();
  if (coupon.valid_from && new Date(coupon.valid_from).getTime() > now) return null;
  if (coupon.valid_until && new Date(coupon.valid_until).getTime() < now) return null;
  if (coupon.min_order_amount && subtotal < Number(coupon.min_order_amount)) return null;
  if (coupon.max_uses && Number(coupon.used_count || 0) >= Number(coupon.max_uses)) return null;

  return coupon;
};

const validateCoupon = async (body) => {
  const subtotal = toMoney(body.subtotal);
  const coupon = await findValidCoupon(pool, body.code, subtotal);
  if (!coupon) {
    const error = new Error("Coupon not found or not valid");
    error.statusCode = 404;
    throw error;
  }

  return mapCoupon(coupon);
};

const normalizeCouponBody = (body, { partial = false } = {}) => {
  const normalized = {};

  if (!partial || body.code !== undefined) {
    const code = String(body.code || "").trim().toUpperCase();
    if (!code) {
      const error = new Error("Coupon code is required");
      error.statusCode = 400;
      throw error;
    }
    normalized.code = code;
  }

  if (!partial || body.discount_type !== undefined) {
    const discountType = normalizeCouponDiscountType(String(body.discount_type || "percentage"));
    if (!couponDiscountTypes.has(discountType)) {
      const error = new Error("Invalid coupon discount type");
      error.statusCode = 400;
      throw error;
    }
    normalized.discount_type = discountType;
  }

  if (!partial || body.discount_value !== undefined) {
    const discountValue = toMoney(body.discount_value);
    if (discountValue < 0) {
      const error = new Error("Coupon discount value must be positive");
      error.statusCode = 400;
      throw error;
    }
    if (normalized.discount_type === "percentage" && discountValue > 100) {
      const error = new Error("Percentage discount cannot exceed 100");
      error.statusCode = 400;
      throw error;
    }
    normalized.discount_value = discountValue;
  }

  if (!partial || body.min_order_amount !== undefined) {
    normalized.min_order_amount = body.min_order_amount === null || body.min_order_amount === ""
      ? 0
      : toMoney(body.min_order_amount);
  }

  if (!partial || body.max_uses !== undefined) {
    if (body.max_uses === null || body.max_uses === "") {
      normalized.max_uses = null;
    } else {
      const parsed = Number(body.max_uses);
      normalized.max_uses = Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    }
  }

  for (const field of ["valid_from", "valid_until"]) {
    if (!partial || body[field] !== undefined) {
      normalized[field] = body[field] ? new Date(body[field]).toISOString() : null;
    }
  }

  if (!partial || body.is_active !== undefined) {
    normalized.is_active = body.is_active !== false;
  }

  return normalized;
};

const listAdminCoupons = async () => {
  const result = await pool.query("select * from public.coupons order by created_at desc");
  return result.rows.map(mapCoupon);
};

const createAdminCoupon = async (body) => {
  const coupon = normalizeCouponBody(body);
  try {
    const result = await pool.query(
      `
        insert into public.coupons (
          code,
          discount_type,
          discount_value,
          min_order_amount,
          max_uses,
          valid_from,
          valid_until,
          is_active
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8)
        returning *
      `,
      [
        coupon.code,
        coupon.discount_type,
        coupon.discount_value,
        coupon.min_order_amount,
        coupon.max_uses,
        coupon.valid_from,
        coupon.valid_until,
        coupon.is_active,
      ],
    );
    return mapCoupon(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      error.statusCode = 409;
      error.message = "Coupon code already exists";
    }
    throw error;
  }
};

const updateAdminCoupon = async (id, body) => {
  const coupon = normalizeCouponBody(body, { partial: true });
  if (coupon.discount_value !== undefined || coupon.discount_type !== undefined) {
    const current = await pool.query("select discount_type, discount_value from public.coupons where id = $1 limit 1", [id]);
    const effectiveType = normalizeCouponDiscountType(coupon.discount_type || current.rows[0]?.discount_type);
    const effectiveValue = coupon.discount_value ?? toMoney(current.rows[0]?.discount_value);
    if (effectiveType === "percentage" && effectiveValue > 100) {
      const error = new Error("Percentage discount cannot exceed 100");
      error.statusCode = 400;
      throw error;
    }
  }
  const assignments = [];
  const values = [id];

  for (const [field, value] of Object.entries(coupon)) {
    values.push(value);
    assignments.push(`${field} = $${values.length}`);
  }

  if (assignments.length === 0) {
    const result = await pool.query("select * from public.coupons where id = $1 limit 1", [id]);
    return result.rows[0] ? mapCoupon(result.rows[0]) : null;
  }

  const result = await pool.query(
    `
      update public.coupons
      set ${assignments.join(", ")}, updated_at = now()
      where id = $1
      returning *
    `,
    values,
  );
  return result.rows[0] ? mapCoupon(result.rows[0]) : null;
};

const deleteAdminCoupon = async (id) => {
  const result = await pool.query("delete from public.coupons where id = $1 returning id", [id]);
  return result.rowCount > 0;
};

const normalizeRequestedOrderItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error("Order items are required");
    error.statusCode = 400;
    throw error;
  }
  if (items.length > 100) {
    const error = new Error("An order cannot contain more than 100 items");
    error.statusCode = 400;
    throw error;
  }

  return items.map((item) => {
    const quantity = toPositiveInteger(item.quantity);
    if (quantity > 99) {
      const error = new Error("Item quantity cannot exceed 99");
      error.statusCode = 400;
      throw error;
    }

    const productId = String(item.product_id || item.id || "").trim();
    if (!uuidPattern.test(productId)) {
      const error = new Error("Each order item requires a valid product_id");
      error.statusCode = 400;
      throw error;
    }

    const requestedSource = String(item.product_source || item.source || "").trim().toLowerCase();
    const productSource = requestedSource === "business" ? "manual" : requestedSource || null;
    if (productSource && !["manual", "scraped"].includes(productSource)) {
      const error = new Error("Invalid product source");
      error.statusCode = 400;
      throw error;
    }

    return {
      product_id: productId,
      requested_source: productSource,
      quantity,
      variant: item.variant ? String(item.variant).trim().slice(0, 120) : null,
      size: item.size ? String(item.size).trim().slice(0, 120) : null,
    };
  });
};

const resolveCatalogOrderItem = async (client, requestedItem) => {
  const findManual = () => client.query(
    `
      select id, name, image_url, price, sale_price, in_stock
      from public.business_products
      where id = $1
      for share
    `,
    [requestedItem.product_id],
  );
  const findScraped = () => client.query(
    `
      select id, product_name, main_image_url, final_price, regular_price, sale_price, stock_status
      from public.scraped_products
      where id = $1
      for share
    `,
    [requestedItem.product_id],
  );

  let source = requestedItem.requested_source;
  let row = null;
  if (source === "manual") row = (await findManual()).rows[0] || null;
  if (source === "scraped") row = (await findScraped()).rows[0] || null;
  if (!source) {
    const manual = (await findManual()).rows[0] || null;
    const scraped = (await findScraped()).rows[0] || null;
    if (manual && scraped) {
      const error = new Error("Product source is required for an ambiguous product id");
      error.statusCode = 409;
      throw error;
    }
    row = manual || scraped;
    source = manual ? "manual" : scraped ? "scraped" : null;
  }

  if (!row || !source) {
    const error = new Error("Product not found");
    error.statusCode = 400;
    throw error;
  }

  const inStock = source === "manual"
    ? row.in_stock === true
    : ["in_stock", "limited"].includes(row.stock_status);
  if (!inStock) {
    const error = new Error("Product is out of stock");
    error.statusCode = 409;
    throw error;
  }

  const price = source === "manual"
    ? toMoney(Number(row.sale_price) > 0 ? row.sale_price : row.price)
    : toMoney(Number(row.final_price) > 0
      ? row.final_price
      : Number(row.sale_price) > 0
        ? row.sale_price
        : row.regular_price);
  if (price <= 0) {
    const error = new Error("Product does not have a valid catalog price");
    error.statusCode = 409;
    throw error;
  }

  return {
    product_id: row.id,
    product_source: source,
    product_name: source === "manual" ? row.name : row.product_name,
    product_image: (source === "manual" ? row.image_url : row.main_image_url) || "/placeholder.svg",
    quantity: requestedItem.quantity,
    price,
    variant: requestedItem.variant,
    size: requestedItem.size,
  };
};

const resolveCatalogOrderItems = async (client, items) => {
  const requestedItems = normalizeRequestedOrderItems(items);
  const resolved = [];
  for (const item of requestedItems) resolved.push(await resolveCatalogOrderItem(client, item));
  return resolved;
};

const normalizeShippingAddress = (shippingAddress) => {
  const address = shippingAddress && typeof shippingAddress === "object" ? shippingAddress : {};
  const normalized = {
    fullName: String(address.fullName || address.full_name || "").trim(),
    email: normalizeEmail(address.email),
    phone: String(address.phone || "").trim(),
    address: String(address.address || address.street || "").trim(),
    city: String(address.city || "").trim(),
    zipCode: String(address.zipCode || address.zip_code || address.postal_code || "").trim(),
  };

  const isValid = normalized.fullName.length >= 2
    && normalized.fullName.length <= 100
    && normalized.email.length <= 255
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)
    && /^[0-9]{9,15}$/.test(normalized.phone)
    && normalized.address.length >= 5
    && normalized.address.length <= 200
    && normalized.city.length >= 2
    && normalized.city.length <= 50
    && /^[0-9]{5,7}$/.test(normalized.zipCode);
  if (!isValid) {
    const error = new Error("Invalid shipping details");
    error.statusCode = 400;
    throw error;
  }

  return normalized;
};

const calculateOrderAmounts = async (client, body, orderItems, shippingAddress) => {
  const subtotal = toMoney(orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const requestedCouponCode = body.coupon_code || body.coupon?.code;
  const coupon = requestedCouponCode
    ? await findValidCoupon(client, requestedCouponCode, subtotal)
    : null;
  if (requestedCouponCode && !coupon) {
    const error = new Error("Coupon not found or no longer valid");
    error.statusCode = 409;
    throw error;
  }

  const couponType = coupon ? normalizeCouponDiscountType(coupon.discount_type) : null;
  const couponValue = coupon ? toMoney(coupon.discount_value) : 0;
  const discountAmount = coupon && couponType !== "free_shipping"
    ? couponType === "percentage"
      ? Math.min(subtotal, toMoney((subtotal * couponValue) / 100))
      : Math.min(subtotal, couponValue)
    : 0;

  const baseShipping = subtotal >= 199 ? 0 : 25;
  const shipping = couponType === "free_shipping" ? 0 : baseShipping;
  const cashOnDeliveryFee = body.payment_method === "cash-on-delivery" ? 5 : 0;
  const tax = 0;
  const total = toMoney(Math.max(0, subtotal - discountAmount) + shipping + cashOnDeliveryFee + tax);

  return {
    subtotal,
    shipping,
    tax,
    discountAmount,
    cashOnDeliveryFee,
    total,
    coupon,
    customerEmail: shippingAddress.email,
  };
};

const mapOrderItem = (row) => ({
  id: row.id,
  order_id: row.order_id,
  product_id: row.product_id,
  product_source: row.product_source,
  product_name: row.product_name,
  product_image: row.product_image || "/placeholder.svg",
  quantity: row.quantity,
  price: toMoney(row.price),
  variant: row.variant,
  size: row.size,
  created_at: row.created_at,
});

const mapOrder = (row, items = []) => ({
  id: row.id,
  order_number: row.order_number,
  customer_id: row.customer_id,
  user_id: row.user_id,
  customer_name: row.customer_name,
  customer_email: row.customer_email,
  customer_phone: row.customer_phone,
  status: row.status,
  payment_status: row.payment_status,
  payment_method: row.payment_method,
  payment_installments: row.payment_installments,
  subtotal: toMoney(row.subtotal),
  shipping: toMoney(row.shipping),
  tax: toMoney(row.tax),
  discount_amount: toMoney(row.discount_amount),
  cash_on_delivery_fee: toMoney(row.cash_on_delivery_fee),
  total: toMoney(row.total),
  coupon_id: row.coupon_id,
  shipping_address: row.shipping_address || {},
  order_type: row.order_type || "regular",
  pet_name: row.pet_name,
  special_instructions: row.special_instructions,
  medical_urgency: row.medical_urgency || "none",
  shipping_status: row.shipping_status || "label_created",
  tracking_number: row.tracking_number,
  order_date: row.order_date,
  created_at: row.created_at,
  updated_at: row.updated_at,
  items,
  order_items: items,
});

const attachOrderItems = async (orders) => {
  if (orders.length === 0) return [];
  const ids = orders.map((order) => order.id);
  const itemsResult = await pool.query(
    "select * from public.order_items where order_id = any($1::uuid[]) order by created_at asc",
    [ids],
  );
  const itemsByOrder = new Map();
  for (const item of itemsResult.rows.map(mapOrderItem)) {
    const group = itemsByOrder.get(item.order_id) || [];
    group.push(item);
    itemsByOrder.set(item.order_id, group);
  }
  return orders.map((order) => mapOrder(order, itemsByOrder.get(order.id) || []));
};

const createOrder = async (body, currentUser = null) => {
  const shippingAddress = normalizeShippingAddress(body.shipping_address || body.shippingData);
  const paymentMethod = String(body.payment_method || "credit-card");
  if (!["credit-card", "apple-pay", "google-pay", "bit", "paybox", "paypal", "cash-on-delivery"].includes(paymentMethod)) {
    const error = new Error("Unsupported payment method");
    error.statusCode = 400;
    throw error;
  }
  const paymentStatus = paymentMethod === "cash-on-delivery" ? "awaiting_cod" : "pending";
  const paymentInstallments = toPositiveInteger(body.installments || body.payment_installments);
  if (paymentInstallments > 12) {
    const error = new Error("Payment installments cannot exceed 12");
    error.statusCode = 400;
    throw error;
  }
  const requestedOrderType = String(body.order_type || (body.want_recurring_order ? "auto-restock" : "regular"));
  if (!["regular", "auto-restock"].includes(requestedOrderType)) {
    const error = new Error("Unsupported order type");
    error.statusCode = 400;
    throw error;
  }
  const medicalUrgency = String(body.medical_urgency || "none");
  if (!["none", "medium", "high"].includes(medicalUrgency)) {
    const error = new Error("Invalid medical urgency");
    error.statusCode = 400;
    throw error;
  }
  const accessToken = currentUser ? null : createOpaqueToken();
  const client = await pool.connect();

  try {
    await client.query("begin");

    const orderItems = await resolveCatalogOrderItems(client, body.items);
    const amounts = await calculateOrderAmounts(client, body, orderItems, shippingAddress);
    const expectedTotal = Number(body.expected_total);
    if (!Object.prototype.hasOwnProperty.call(body, "expected_total")
      || !Number.isFinite(expectedTotal)
      || expectedTotal < 0) {
      const error = new Error("A valid expected_total is required");
      error.statusCode = 400;
      throw error;
    }
    if (Math.round(expectedTotal * 100) !== Math.round(amounts.total * 100)) {
      const error = new Error("The order total changed; refresh the cart and confirm the updated price");
      error.statusCode = 409;
      throw error;
    }
    const customerResult = await client.query(
      `
        insert into public.shop_customers (email, full_name, phone, last_order_at)
        values ($1, $2, $3, now())
        on conflict (email) do update set
          full_name = excluded.full_name,
          phone = excluded.phone,
          last_order_at = now(),
          updated_at = now()
        returning id
      `,
      [amounts.customerEmail, shippingAddress.fullName, shippingAddress.phone],
    );

    const orderNumber = generateOrderNumber();
    const orderResult = await client.query(
      `
        insert into public.orders (
          order_number,
          customer_id,
          user_id,
          customer_name,
          customer_email,
          customer_phone,
          status,
          payment_status,
          payment_method,
          payment_installments,
          subtotal,
          shipping,
          tax,
          discount_amount,
          cash_on_delivery_fee,
          total,
          coupon_id,
          shipping_address,
          order_type,
          pet_name,
          special_instructions,
          medical_urgency,
          access_token_hash
        )
        values (
          $1, $2, $3, $4, $5, $6,
          'pending', $7, $8, $9,
          $10, $11, $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22
        )
        returning *
      `,
      [
        orderNumber,
        customerResult.rows[0].id,
        currentUser?.id || null,
        shippingAddress.fullName,
        amounts.customerEmail,
        shippingAddress.phone,
        paymentStatus,
        paymentMethod,
        paymentInstallments,
        amounts.subtotal,
        amounts.shipping,
        amounts.tax,
        amounts.discountAmount,
        amounts.cashOnDeliveryFee,
        amounts.total,
        amounts.coupon?.id || null,
        JSON.stringify(shippingAddress),
        requestedOrderType,
        safeText(body.pet_name, 100) || null,
        safeText(body.special_instructions, 2000) || null,
        medicalUrgency,
        accessToken ? hashOpaqueToken(accessToken) : null,
      ],
    );

    const order = orderResult.rows[0];
    const itemValues = [];
    const placeholders = orderItems.map((item, index) => {
      const base = index * 9;
      itemValues.push(
        order.id,
        item.product_id,
        item.product_source,
        item.product_name,
        item.product_image,
        item.quantity,
        item.price,
        item.variant,
        item.size,
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9})`;
    });

    const itemsResult = await client.query(
      `
        insert into public.order_items (
          order_id,
          product_id,
          product_source,
          product_name,
          product_image,
          quantity,
          price,
          variant,
          size
        )
        values ${placeholders.join(", ")}
        returning *
      `,
      itemValues,
    );

    if (amounts.coupon?.id) {
      await client.query("update public.coupons set used_count = used_count + 1, updated_at = now() where id = $1", [amounts.coupon.id]);
    }

    await client.query("commit");
    return {
      order: mapOrder(order, itemsResult.rows.map(mapOrderItem)),
      accessToken,
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
};

const listOrders = async ({ ids = [], email = null, limit = 200 } = {}) => {
  const values = [];
  const where = [];

  if (ids.length > 0) {
    values.push(ids);
    where.push(`id = any($${values.length}::uuid[])`);
  }

  if (email) {
    values.push(normalizeEmail(email));
    where.push(`lower(customer_email) = $${values.length}`);
  }

  values.push(limit);
  const sql = `
    select *
    from public.orders
    ${where.length > 0 ? `where ${where.join(" or ")}` : ""}
    order by order_date desc
    limit $${values.length}
  `;

  const result = await pool.query(sql, values);
  return attachOrderItems(result.rows);
};

const listUserOrders = async (userId, limit = 100) => {
  const values = [userId, Math.min(200, Math.max(1, Number(limit) || 100))];
  const result = await pool.query(
    `
      select *
      from public.orders
      where user_id = $1
      order by order_date desc nulls last, created_at desc
      limit $2
    `,
    values,
  );
  return attachOrderItems(result.rows);
};

const exportMyData = async (userId, email) => {
  const pets = await listUserPets(userId, "all");
  const petIds = pets.map((pet) => pet.id);

  const [
    profile,
    documents,
    claims,
    bookings,
    notifications,
    orders,
    vetVisitsResult,
    vaccinationsResult,
    petCharactersResult,
  ] = await Promise.all([
    getProfileByUserId(userId),
    listUserDocuments(userId, { limit: 500 }),
    listUserInsuranceClaims(userId, { limit: 200 }),
    listUserServiceBookings(userId, { limit: 200 }),
    listUserNotifications(userId, { limit: 500 }),
    listUserOrders(userId, 200),
    petIds.length > 0
      ? pool.query(
        "select * from public.pet_vet_visits where user_id = $1 and pet_id = any($2::uuid[]) order by created_at desc",
        [userId, petIds],
      )
      : Promise.resolve({ rows: [] }),
    petIds.length > 0
      ? pool.query(
        "select * from public.pet_vaccinations where user_id = $1 and pet_id = any($2::uuid[]) order by created_at desc",
        [userId, petIds],
      )
      : Promise.resolve({ rows: [] }),
    pool.query(
      `
        select
          id, pet_id, status, style_key, selected_candidate_key,
          model, generation_version, error_code, consented_at, created_at, updated_at
        from public.pet_characters
        where user_id = $1
        order by created_at desc
      `,
      [userId],
    ),
  ]);

  return {
    exported_at: new Date().toISOString(),
    profile,
    pets,
    documents,
    insurance_claims: claims,
    service_bookings: bookings,
    notifications,
    orders,
    vet_visits: vetVisitsResult.rows.map(serializeVetVisit),
    vaccinations: vaccinationsResult.rows.map(serializeVaccination),
    pet_characters: petCharactersResult.rows,
  };
};

const deleteMyAccount = async (userId, email) => {
  const [dataExport, documentFiles, userUploads, petCharacterFiles] = await Promise.all([
    exportMyData(userId, email),
    pool.query("select file_url, storage_key from public.pet_documents where user_id = $1", [userId]),
    pool.query("select storage_key from public.user_uploads where user_id = $1", [userId]),
    listPetCharacterFileKeys(userId),
  ]);
  const normalizedEmail = normalizeEmail(email);

  await Promise.all([
    ...documentFiles.rows.map((document) => deleteStoredDocument(document)),
    ...userUploads.rows.map(async (upload) => {
      try {
        await unlink(path.join(uploadDir, path.basename(upload.storage_key)));
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }),
    deletePetCharacterFiles(petCharacterFiles),
  ]);

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(
      `
        update public.orders
        set
          user_id = null,
          customer_name = 'Deleted user',
          customer_email = null,
          customer_phone = null,
          shipping_address = '{}'::jsonb,
          updated_at = now()
        where user_id = $1
          or lower(customer_email) = $2
      `,
      [userId, normalizedEmail],
    );
    await client.query("delete from public.shop_customers where lower(email) = $1", [normalizedEmail]);
    await client.query("delete from public.app_users where id = $1", [userId]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }

  return { deleted: true, export: dataExport };
};

const queryOptionalRows = async (sql, values = []) => {
  try {
    const result = await pool.query(sql, values);
    return result.rows;
  } catch (error) {
    if (["42P01", "42703"].includes(error.code)) return [];
    throw error;
  }
};

const listAdminAnalytics = async (daysInput) => {
  const days = Math.min(365, Math.max(1, Number(daysInput) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const prevSince = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000).toISOString();

  const [
    orders,
    pets,
    profiles,
    products,
    petDocuments,
    chatFeedback,
    dogBreeds,
    catBreeds,
  ] = await Promise.all([
    queryOptionalRows(
      `
        select id, total, status, coalesce(order_date, created_at) as created_at, user_id
        from public.orders
        where coalesce(order_date, created_at) >= $1
        order by coalesce(order_date, created_at) desc
        limit 1000
      `,
      [prevSince],
    ),
    queryOptionalRows(
      `
        select
          id,
          type,
          breed,
          birth_date,
          medical_conditions,
          is_lost,
          is_neutered,
          last_vet_visit,
          created_at,
          user_id
        from public.pets
        order by created_at desc
        limit 5000
      `,
    ),
    queryOptionalRows(
      `
        select id, city, created_at
        from public.profiles
        order by created_at desc
        limit 5000
      `,
    ),
    listProducts().catch((error) => {
      if (["42P01", "42703"].includes(error.code)) return [];
      throw error;
    }),
    queryOptionalRows(
      `
        select id, false as needs_review, uploaded_at as created_at
        from public.pet_documents
        where uploaded_at >= $1
        order by uploaded_at desc
        limit 1000
      `,
      [since],
    ),
    queryOptionalRows(
      `
        select id, user_id, message_content, rating, created_at
        from public.chat_message_feedback
        where created_at >= $1
        order by created_at desc
        limit 500
      `,
      [since],
    ),
    listBreeds("dog"),
    listBreeds("cat"),
  ]);

  return {
    orders: orders.map((order) => ({
      ...order,
      total: toMoney(order.total),
    })),
    pets,
    profiles,
    products,
    pet_documents: petDocuments,
    chat_feedback: chatFeedback,
    breeds: [...dogBreeds, ...catBreeds],
  };
};

const getOrder = async (id) => {
  const result = uuidPattern.test(id)
    ? await pool.query("select * from public.orders where id = $1 limit 1", [id])
    : await pool.query("select * from public.orders where order_number = $1 limit 1", [id]);
  if (result.rowCount === 0) return null;
  const [order] = await attachOrderItems(result.rows);
  Object.defineProperty(order, "accessTokenHash", {
    value: result.rows[0].access_token_hash || null,
    enumerable: false,
  });
  Object.defineProperties(order, {
    paymentTransactionId: {
      value: result.rows[0].payment_transaction_id || null,
      enumerable: false,
    },
    paymentUrl: {
      value: result.rows[0].payment_url || null,
      enumerable: false,
    },
  });
  return order;
};

const canAccessOrder = async (request, order, accessToken) => {
  const auth = await getUserFromSession(request).catch(() => null);
  if (auth?.user?.id && order.user_id === auth.user.id) return true;
  return verifyOpaqueToken(accessToken, order.accessTokenHash);
};

const updateOrder = async (id, body) => {
  const assignments = [];
  const values = [id];

  if (body.status !== undefined) {
    if (!orderStatuses.has(body.status)) {
      const error = new Error("Invalid order status");
      error.statusCode = 400;
      throw error;
    }
    values.push(body.status);
    assignments.push(`status = $${values.length}`);
  }

  if (body.payment_status !== undefined) {
    if (!paymentStatuses.has(body.payment_status)) {
      const error = new Error("Invalid payment status");
      error.statusCode = 400;
      throw error;
    }
    values.push(body.payment_status);
    assignments.push(`payment_status = $${values.length}`);
  }

  for (const field of ["shipping_status", "tracking_number", "special_instructions"]) {
    if (body[field] !== undefined) {
      values.push(body[field] || null);
      assignments.push(`${field} = $${values.length}`);
    }
  }

  if (assignments.length === 0) return getOrder(id);

  const result = await pool.query(
    `
      update public.orders
      set ${assignments.join(", ")}, updated_at = now()
      where id = $1
      returning *
    `,
    values,
  );

  if (result.rowCount === 0) return null;
  const [order] = await attachOrderItems(result.rows);
  return order;
};

const bulkUpdateOrders = async (ids, updates) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    const error = new Error("Order ids are required");
    error.statusCode = 400;
    throw error;
  }

  if (!updates?.status || !orderStatuses.has(updates.status)) {
    const error = new Error("Valid order status is required");
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(
    `
      update public.orders
      set status = $2, updated_at = now()
      where id = any($1::uuid[])
      returning id
    `,
    [ids, updates.status],
  );

  return { updated: result.rowCount };
};

const verifyCardcomSignature = (rawBody, signature) => {
  if (!cardcomWebhookSecret) return false;
  if (!rawBody || !signature) return false;

  const expected = createHmac("sha256", cardcomWebhookSecret)
    .update(rawBody)
    .digest("base64");

  return secretsEqual(signature, expected);
};

const formatCardcomMoney = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00";
};

const buildCardcomInvoiceLines = (order) => {
  const lines = {};
  let index = 1;

  for (const item of order.order_items || order.items || []) {
    const quantity = toPositiveInteger(item.quantity);
    const price = toMoney(item.price);
    const description = [
      item.product_name,
      item.variant ? `- ${item.variant}` : "",
      item.size ? `(${item.size})` : "",
    ].filter(Boolean).join(" ");

    lines[`InvoiceLines${index}.Description`] = description || "מוצר";
    lines[`InvoiceLines${index}.Quantity`] = String(quantity);
    lines[`InvoiceLines${index}.Price`] = formatCardcomMoney(price);
    index += 1;
  }

  if (toMoney(order.shipping) > 0) {
    lines[`InvoiceLines${index}.Description`] = "משלוח";
    lines[`InvoiceLines${index}.Quantity`] = "1";
    lines[`InvoiceLines${index}.Price`] = formatCardcomMoney(order.shipping);
    index += 1;
  }

  if (toMoney(order.discount_amount) > 0) {
    lines[`InvoiceLines${index}.Description`] = "קופון";
    lines[`InvoiceLines${index}.Quantity`] = "1";
    lines[`InvoiceLines${index}.Price`] = formatCardcomMoney(-toMoney(order.discount_amount));
    index += 1;
  }

  const sum = Object.keys(lines)
    .filter((key) => key.endsWith(".Quantity"))
    .reduce((total, quantityKey) => {
      const prefix = quantityKey.replace(".Quantity", "");
      return total + Number(lines[quantityKey] || 1) * Number(lines[`${prefix}.Price`] || 0);
    }, 0);

  return {
    lines,
    lineCount: index - 1,
    sum: toMoney(sum),
  };
};

const fetchCardcomLowProfileIndicator = async (lowProfileCode) => {
  if (!cardcomTerminal || !cardcomUsername) {
    const error = new Error("CardCom credentials are missing");
    error.statusCode = 503;
    throw error;
  }

  const params = new URLSearchParams({
    TerminalNumber: cardcomTerminal,
    UserName: cardcomUsername,
    LowProfileCode: lowProfileCode,
  });

  let indicatorResponse;
  try {
    indicatorResponse = await fetchWithTimeout(
      `${cardcomIndicatorUrl}?${params.toString()}`,
      { method: "GET" },
      15_000,
    );
  } catch {
    const error = new Error("Payment provider is unavailable");
    error.statusCode = 502;
    throw error;
  }
  const indicatorText = await indicatorResponse.text();
  if (!indicatorResponse.ok) {
    const error = new Error(`CardCom indicator request failed (${indicatorResponse.status})`);
    error.statusCode = 502;
    error.details = indicatorText;
    throw error;
  }

  return Object.fromEntries(new URLSearchParams(indicatorText).entries());
};

const createShopPayment = async (request, body) => {
  const orderId = String(body.order_id || body.orderId || "").trim();
  if (!uuidPattern.test(orderId)) {
    const error = new Error("A valid order_id is required");
    error.statusCode = 400;
    throw error;
  }

  const order = await getOrder(orderId);
  if (!order) {
    const error = new Error("Order not found");
    error.statusCode = 404;
    throw error;
  }
  const accessToken = body.access_token || request.headers["x-order-access-token"];
  if (!(await canAccessOrder(request, order, accessToken))) {
    const error = new Error("Order not found");
    error.statusCode = 404;
    throw error;
  }

  if (toMoney(order.total) <= 0) {
    const error = new Error("Invalid payment amount");
    error.statusCode = 400;
    throw error;
  }

  const successUrl = safeAppRedirectUrl(request, body.success_url, "/payment-success");
  const cancelUrl = safeAppRedirectUrl(request, body.cancel_url, "/payment-failed");
  const successRedirect = `${successUrl}${successUrl.includes("?") ? "&" : "?"}order_id=${encodeURIComponent(order.id)}`;
  const errorRedirect = `${cancelUrl}${cancelUrl.includes("?") ? "&" : "?"}order_id=${encodeURIComponent(order.id)}`;

  if (order.payment_method === "cash-on-delivery") {
    await pool.query(
      "update public.orders set payment_status = 'awaiting_cod', updated_at = now() where id = $1",
      [order.id],
    );
    return {
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      payment_method: "cash-on-delivery",
      redirect_url: successRedirect,
    };
  }

  if (order.payment_status === "paid") {
    return {
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      already_paid: true,
      redirect_url: successRedirect,
    };
  }

  if (!cardcomConfigured) {
    if (isProduction) {
      const error = new Error("Payment provider is not configured");
      error.statusCode = 503;
      throw error;
    }
    await pool.query(
      "update public.orders set payment_status = 'dev_approved', updated_at = now() where id = $1",
      [order.id],
    );
    return {
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      dev_mode: true,
      redirect_url: `${successRedirect}&dev_mode=1`,
    };
  }

  if (order.payment_status === "pending" && order.paymentTransactionId) {
    if (order.paymentUrl) {
      return {
        success: true,
        order_id: order.id,
        order_number: order.order_number,
        payment_url: order.paymentUrl,
        low_profile_code: order.paymentTransactionId,
        reused: true,
      };
    }
    const error = new Error("A payment session is already pending for this order");
    error.statusCode = 409;
    throw error;
  }

  const reservationToken = `creating:${randomUUID()}`;
  const reservation = await pool.query(
    `
      update public.orders
      set payment_status = 'creating',
          payment_transaction_id = $2,
          payment_url = null,
          updated_at = now()
      where id = $1
        and (
          (payment_status = 'pending' and payment_transaction_id is null)
          or payment_status = 'failed'
          or (payment_status = 'creating' and updated_at < now() - interval '5 minutes')
        )
      returning id
    `,
    [order.id, reservationToken],
  );
  if (reservation.rowCount === 0) {
    const error = new Error("A payment session is already being created for this order");
    error.statusCode = 409;
    throw error;
  }

  const releaseReservation = async () => {
    await pool.query(
      `
        update public.orders
        set payment_status = 'failed',
            payment_transaction_id = null,
            payment_url = null,
            updated_at = now()
        where id = $1
          and payment_status = 'creating'
          and payment_transaction_id = $2
      `,
      [order.id, reservationToken],
    );
  };

  const { lines, lineCount, sum } = buildCardcomInvoiceLines(order);
  if (sum <= 0) {
    await releaseReservation();
    const error = new Error("Invalid CardCom invoice amount");
    error.statusCode = 400;
    throw error;
  }

  const webhookUrl = new URL(absoluteAppUrl(request, "/api/payments/cardcom/webhook"));
  webhookUrl.searchParams.set("token", cardcomWebhookSecret);
  const customerName = String(order.shipping_address?.fullName || order.customer_name || "Customer").trim();
  const customerEmail = String(order.shipping_address?.email || order.customer_email || "").trim();
  const customerAddress = String(order.shipping_address?.address || order.shipping_address?.street || "").trim() || customerName;
  const customerCity = String(order.shipping_address?.city || "").trim() || "Unknown";
  const customerPhone = String(order.shipping_address?.phone || order.customer_phone || "").trim();
  const itemsDescription = (order.order_items || order.items || [])
    .map((item) => `${item.product_name} x${item.quantity}`)
    .join(", ")
    .slice(0, 50) || order.order_number;

  const formData = new URLSearchParams();
  formData.append("TerminalNumber", cardcomTerminal);
  formData.append("UserName", cardcomUsername);
  formData.append("ApiPassword", cardcomApiPassword);
  formData.append("APILevel", "10");
  formData.append("codepage", "65001");
  formData.append("Operation", "1");
  formData.append("SumToBill", formatCardcomMoney(sum));
  formData.append("CoinId", "1");
  formData.append("Language", "he");
  formData.append("SuccessRedirectUrl", successRedirect);
  formData.append("ErrorRedirectUrl", errorRedirect);
  formData.append("InvoiceHeadOperation", "1");
  formData.append("InvoiceHead.CustName", customerName);
  formData.append("InvoiceHead.CustAddresLine1", customerAddress);
  formData.append("InvoiceHead.CustCity", customerCity);
  formData.append("InvoiceHead.CoinID", "1");
  formData.append("InvoiceHead.Language", "he");
  formData.append("InvoiceHead.SendByEmail", customerEmail ? "true" : "false");
  if (customerEmail) formData.append("InvoiceHead.Email", customerEmail);
  if (customerPhone) formData.append("InvoiceHead.CustMobilePH", customerPhone);
  formData.append("WebHookUrl", webhookUrl.toString());
  formData.append("IndicatorUrl", webhookUrl.toString());
  formData.append("ReturnValue", JSON.stringify({
    order_id: order.id,
    order_number: order.order_number,
    attempt_token: reservationToken,
  }));
  formData.append("MaxNumOfPayments", String(order.payment_installments || 1));
  formData.append("ProductName", itemsDescription);
  formData.append("HideSumField", "true");
  formData.append("SumInStar498", "false");

  for (const [key, value] of Object.entries(lines)) {
    formData.append(key, value);
  }

  let cardcomResponse;
  try {
    cardcomResponse = await fetchWithTimeout(cardcomLowProfileUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    }, 30_000);
  } catch {
    await releaseReservation();
    const error = new Error("Payment provider is unavailable");
    error.statusCode = 502;
    throw error;
  }
  if (!cardcomResponse.ok) {
    await releaseReservation();
    const error = new Error("Payment provider rejected the request");
    error.statusCode = 502;
    throw error;
  }
  const responseText = await cardcomResponse.text();
  const cardcomParams = new URLSearchParams(responseText);
  const responseCode = Number(cardcomParams.get("ResponseCode") || cardcomParams.get("OperationResponse") || "-1");
  const lowProfileId = cardcomParams.get("LowProfileCode") || cardcomParams.get("LowProfileId") || "";
  const paymentUrl = cardcomParams.get("Url") || cardcomParams.get("url") || cardcomParams.get("LowProfileUrl") || "";
  const description = cardcomParams.get("Description") || cardcomParams.get("ErrorDescription") || "";
  const isSuccess = responseCode === 0 && lowProfileId.length > 0;

  let parsedPaymentUrl = null;
  try {
    parsedPaymentUrl = new URL(paymentUrl);
  } catch {
    // Handled as a failed provider response below.
  }
  const hasTrustedPaymentUrl = parsedPaymentUrl?.protocol === "https:"
    && (parsedPaymentUrl.hostname === "cardcom.solutions" || parsedPaymentUrl.hostname.endsWith(".cardcom.solutions"));

  if (!isSuccess || !hasTrustedPaymentUrl) {
    await releaseReservation();
    const error = new Error(description || "CardCom returned an invalid payment session");
    error.statusCode = isSuccess ? 502 : 400;
    throw error;
  }

  const savedSession = await pool.query(
    `
      update public.orders
      set payment_status = 'pending',
          payment_transaction_id = $2,
          payment_url = $3,
          updated_at = now()
      where id = $1
        and payment_status = 'creating'
        and payment_transaction_id = $4
      returning id
    `,
    [order.id, lowProfileId, paymentUrl, reservationToken],
  );
  if (savedSession.rowCount === 0) {
    const currentOrder = await getOrder(order.id);
    if (currentOrder?.payment_status === "paid") {
      return {
        success: true,
        order_id: order.id,
        order_number: order.order_number,
        already_paid: true,
        redirect_url: successRedirect,
      };
    }
    const error = new Error("Payment session state changed; retry the order lookup");
    error.statusCode = 409;
    throw error;
  }

  await pool.query(
    `
      insert into public.cardcom_events (
        order_id,
        low_profile_code,
        operation_response,
        is_success,
        payload_json
      )
      values ($1, $2, $3, true, $4::jsonb)
    `,
    [
      order.id,
      lowProfileId || null,
      Number.isFinite(responseCode) ? responseCode : null,
      JSON.stringify({
        stage: "create_payment",
        response_code: responseCode,
        description,
        invoice_line_count: lineCount,
        sum_to_bill: formatCardcomMoney(sum),
      }),
    ],
  );

  return {
    success: true,
    order_id: order.id,
    order_number: order.order_number,
    payment_url: paymentUrl,
    low_profile_code: lowProfileId || null,
  };
};

const parseCardcomWebhookPayload = (rawBody, queryPayload) => {
  if (!rawBody) return queryPayload;

  try {
    return {
      ...queryPayload,
      ...JSON.parse(rawBody),
    };
  } catch {
    return {
      ...queryPayload,
      ...Object.fromEntries(new URLSearchParams(rawBody).entries()),
    };
  }
};

const handleCardcomWebhook = async (request, url) => {
  if (!cardcomConfigured) {
    const error = new Error("Payment provider is not configured");
    error.statusCode = 503;
    throw error;
  }
  const rawBody = request.method === "GET" ? "" : await readRawBody(request);
  const signature = request.headers["x-cardcom-signature"];
  const queryToken = url.searchParams.get("token");
  const authenticated = secretsEqual(queryToken, cardcomWebhookSecret)
    || (rawBody && verifyCardcomSignature(rawBody, signature));
  if (!authenticated) {
    const error = new Error("Invalid CardCom signature");
    error.statusCode = 401;
    throw error;
  }

  const queryPayload = Object.fromEntries(url.searchParams.entries());
  delete queryPayload.token;
  const payload = parseCardcomWebhookPayload(rawBody, queryPayload);
  const lowProfileCode = getCardcomString(payload, [
    "LowProfileCode",
    "lowprofilecode",
    "LowProfileId",
    "LowProfileDealId",
  ]);

  if (!lowProfileCode) {
    const error = new Error("Missing LowProfileCode");
    error.statusCode = 400;
    throw error;
  }

  const indicatorPayload = await fetchCardcomLowProfileIndicator(lowProfileCode);
  const {
    operation,
    chargedAmountMinor,
    operationResponse,
    dealResponse,
    tokenResponse,
    returnValue,
  } = parseVerifiedCardcomIndicator(indicatorPayload, {
    requestedLowProfileCode: lowProfileCode,
    terminalNumber: cardcomTerminal,
  });
  const { orderId: parsedOrderId, attemptToken } = parseCardcomReturnValue(returnValue);
  const transactionId = getCardcomString(indicatorPayload, [
    "TranzactionId",
    "TransactionId",
    "InternalDealNumber",
    "DealNumber",
    "LowProfileDealId",
  ]) || getCardcomString(payload, [
    "TranzactionId",
    "TransactionId",
    "InternalDealNumber",
    "LowProfileDealId",
  ]) || lowProfileCode;

  if (!parsedOrderId || !uuidPattern.test(parsedOrderId)) {
    const error = new Error("Invalid CardCom order reference");
    error.statusCode = 400;
    throw error;
  }

  const validAttemptToken = /^creating:[0-9a-fA-F-]{36}$/.test(String(attemptToken || ""))
    ? attemptToken
    : null;
  const acceptedPaymentIdentifiers = validAttemptToken
    ? [lowProfileCode, validAttemptToken]
    : [lowProfileCode];
  const orderResult = await pool.query(
    `
      select id, order_number, payment_status, payment_transaction_id, total
      from public.orders
      where id = $1
        and payment_transaction_id = any($2::text[])
      limit 1
    `,
    [parsedOrderId, acceptedPaymentIdentifiers],
  );

  const order = orderResult.rows[0] || null;
  if (!order) {
    const error = new Error("Order not found");
    error.statusCode = 404;
    throw error;
  }

  const expectedAmountMinor = Math.round(toMoney(order.total) * 100);
  if (chargedAmountMinor !== expectedAmountMinor) {
    await pool.query(
      `
        insert into public.cardcom_events (
          order_id, low_profile_code, operation_response, deal_response, is_success, payload_json
        )
        values ($1, $2, $3, $4, false, $5::jsonb)
      `,
      [
        order.id,
        lowProfileCode,
        operationResponse,
        dealResponse,
        JSON.stringify({ stage: "rejected_indicator", reason: "amount_mismatch" }),
      ],
    );
    const error = new Error("CardCom payment amount does not match the order");
    error.statusCode = 409;
    throw error;
  }
  const isSuccess = isSuccessfulCardcomCharge({ operationResponse, dealResponse });

  await pool.query(
    `
      insert into public.cardcom_events (
        order_id,
        low_profile_code,
        transaction_id,
        operation_response,
        deal_response,
        is_success,
        payload_json
      )
      values ($1, $2, $3, $4, $5, $6, $7::jsonb)
    `,
    [
      order?.id || null,
      lowProfileCode,
      transactionId,
      operationResponse,
      dealResponse,
      isSuccess,
      JSON.stringify({
        stage: "verified_indicator",
        method: request.method,
        operation,
        token_response: tokenResponse,
      }),
    ],
  );

  if (isSuccess) {
    if (order.payment_status !== "paid") {
      await pool.query(
        `
          update public.orders
          set payment_status = 'paid',
              payment_transaction_id = $2,
              status = 'processing',
              updated_at = now()
          where id = $1
            and payment_transaction_id = any($3::text[])
            and payment_status <> 'paid'
        `,
        [order.id, lowProfileCode, acceptedPaymentIdentifiers],
      );
    }
  } else if (order.payment_status !== "paid") {
    await pool.query(
      `
        update public.orders
        set payment_status = 'failed',
            payment_transaction_id = null,
            payment_url = null,
            updated_at = now()
        where id = $1
          and payment_transaction_id = any($2::text[])
          and payment_status <> 'paid'
      `,
      [order.id, acceptedPaymentIdentifiers],
    );
  }

  const paymentStatus = order.payment_status === "paid" || isSuccess ? "paid" : "failed";
  return {
    received: true,
    order_id: order.id,
    payment_status: paymentStatus,
  };
};

const createReport = async (body, reporterId = null) => {
  const id = randomUUID();
  await pool.query(
    `
      insert into public.content_reports (
        id, content_type, content_id, reason, description, reporter_id
      )
      values ($1, $2, $3, $4, $5, $6)
    `,
    [
      id,
      body.content_type || "product",
      body.content_id || null,
      body.reason || "other",
      body.description || null,
      reporterId,
    ],
  );
  return { id };
};

const runProductIntelFunction = async (functionName, body) => {
  if (functionName === "import-products-from-url" || functionName === "scrape-products") {
    return importProductsFromUrl(body);
  }
  if (functionName === "scrape-product") {
    return scrapeProduct(body);
  }
  if (functionName === "scan-product-list") {
    return scanProductList(body);
  }
  if (functionName === "smart-scrape-product") {
    return smartScrapeProduct(body);
  }
  if (functionName === "enrich-product-ai") {
    return enrichProductAi(body);
  }
  if (functionName === "search-product-image") {
    return searchProductImage(body);
  }
  if (functionName === "analyze-product-ingredients") {
    return analyzeProductIngredients(body);
  }
  if (functionName === "product-duplicate-check") {
    return productDuplicateCheck(pool, body);
  }

  const error = new Error("Product intelligence function not found");
  error.statusCode = 404;
  throw error;
};

const uploadDataUrlFile = async (body, {
  maxBytes = maxUploadBytes,
  requireImage = false,
  allowedContentTypes = null,
  directory = uploadDir,
  publicUrl = true,
} = {}) => {
  const { buffer, contentType, extension } = decodeAndValidateDataUrl(body.data_url, {
    maxBytes,
    requireImage,
    allowedContentTypes,
  });
  const fileName = `${Date.now()}-${randomUUID()}${extension}`;

  await mkdir(directory, publicUrl ? { recursive: true } : { recursive: true, mode: 0o700 });
  if (!publicUrl) await chmod(directory, 0o700);
  await writeFile(path.join(directory, fileName), buffer, {
    flag: "wx",
    mode: publicUrl ? 0o644 : 0o600,
  });

  return {
    url: publicUrl ? `/uploads/${fileName}` : null,
    file_name: fileName,
    storage_key: fileName,
    extension,
    content_type: contentType,
    size: buffer.length,
  };
};

// A directly uploaded product image gets exactly the same treatment as an
// imported one - same canvas, same format, same quality - so the catalogue does
// not depend on how a given image happened to arrive.
const uploadImage = async (body) => {
  const { buffer } = decodeAndValidateDataUrl(body.data_url, {
    maxBytes: maxUploadBytes,
    requireImage: true,
  });

  const normalized = await normalizeWithBackgroundRemoval(buffer, {
    remover: backgroundRemovalEnabled ? productBackgroundRemover : null,
    onWarning: (warning) => console.warn("product_image_warning", { label: "upload", ...warning }),
  });

  const fileName = `${Date.now()}-${randomUUID()}${normalized.extension}`;
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), normalized.buffer, { flag: "wx", mode: 0o644 });

  return {
    url: `/uploads/${fileName}`,
    file_name: fileName,
    storage_key: fileName,
    extension: normalized.extension,
    content_type: normalized.content_type,
    size: normalized.bytes,
    width: normalized.width,
    height: normalized.height,
    background_removed: normalized.background_removed,
  };
};

const userMediaContentTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

const uploadUserMedia = async (userId, body, maxBytes = maxUploadBytes) => {
  const upload = await uploadDataUrlFile(body, {
    maxBytes,
    allowedContentTypes: userMediaContentTypes,
  });
  try {
    const result = await pool.query(
      `
        insert into public.user_uploads (user_id, storage_key, content_type, file_size)
        values ($1, $2, $3, $4)
        returning id
      `,
      [userId, upload.storage_key, upload.content_type, upload.size],
    );
    return { ...upload, id: result.rows[0].id };
  } catch (error) {
    await unlink(path.join(uploadDir, upload.storage_key)).catch(() => {});
    throw error;
  }
};

const documentContentTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const uploadDocumentFile = async (body) => uploadDataUrlFile(body, {
  maxBytes: maxDocumentUploadBytes,
  allowedContentTypes: documentContentTypes,
  directory: privateUploadDir,
  publicUrl: false,
});

const safeStorageKey = (value) => {
  let decoded;
  try {
    decoded = decodeURIComponent(String(value || ""));
  } catch {
    return null;
  }
  if (!decoded || decoded.startsWith(".") || path.basename(decoded) !== decoded) return null;
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,200}$/.test(decoded) ? decoded : null;
};

const sendStoredFile = (response, buffer, {
  contentType,
  fileName,
  isPrivate = false,
  sandbox = false,
} = {}) => {
  const disposition = contentType.startsWith("image/")
    || contentType.startsWith("video/")
    || contentType === "application/pdf"
    || contentType === "text/plain"
    ? "inline"
    : "attachment";
  const headers = {
    "content-type": contentType,
    "content-length": String(buffer.length),
    "cache-control": isPrivate ? "private, no-store" : "public, max-age=31536000, immutable",
    "content-disposition": `${disposition}; filename="${sanitizeDownloadFileName(fileName, path.extname(fileName || ""))}"`,
    "x-content-type-options": "nosniff",
    "cross-origin-resource-policy": "same-origin",
  };
  if (sandbox) headers["content-security-policy"] = "default-src 'none'; sandbox";
  response.writeHead(200, headers);
  response.end(buffer);
};

const readDocumentFile = async (document) => {
  const storageKey = safeStorageKey(document.storage_key);
  if (storageKey) {
    return {
      buffer: await readFile(path.join(privateUploadDir, storageKey)),
      storageKey,
    };
  }

  const legacyPath = normalizeUploadPath(document.file_url);
  const legacyKey = legacyPath?.startsWith("/uploads/")
    ? safeStorageKey(legacyPath.slice("/uploads/".length))
    : null;
  if (!legacyKey) throw Object.assign(new Error("Document file not found"), { statusCode: 404 });
  return {
    buffer: await readFile(path.join(uploadDir, legacyKey)),
    storageKey: legacyKey,
  };
};

const servePrivateDocument = async (userId, documentId, response) => {
  const result = await pool.query(
    "select * from public.pet_documents where id = $1 and user_id = $2 limit 1",
    [documentId, userId],
  );
  const document = result.rows[0];
  if (!document) return false;

  let stored;
  try {
    stored = await readDocumentFile(document);
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
  const safeContentType = contentTypeForSafeExtension(path.extname(stored.storageKey));
  if (!safeContentType) return false;
  sendStoredFile(response, stored.buffer, {
    contentType: safeContentType,
    fileName: document.file_name || stored.storageKey,
    isPrivate: true,
    sandbox: true,
  });
  return true;
};

const servePetCharacterAsset = async (userId, petId, assetKey, response) => {
  const safeAssetKey = String(assetKey || "").trim();
  if (!/^[a-z0-9-]{1,40}$/.test(safeAssetKey)) return false;
  const result = await pool.query(
    `
      select asset.storage_key, asset.content_type
      from public.pet_character_assets asset
      join public.pet_characters character on character.id = asset.character_id
      where character.user_id = $1
        and character.pet_id = $2
        and asset.asset_key = $3
      limit 1
    `,
    [userId, petId, safeAssetKey],
  );
  const asset = result.rows[0];
  const storageKey = safeStorageKey(asset?.storage_key);
  const safeContentType = storageKey ? contentTypeForSafeExtension(path.extname(storageKey)) : null;
  if (!storageKey || !safeContentType?.startsWith("image/") || safeContentType !== asset.content_type) return false;

  let buffer;
  try {
    buffer = await readFile(path.join(petCharacterUploadDir, storageKey));
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
  sendStoredFile(response, buffer, {
    contentType: safeContentType,
    fileName: `${safeAssetKey}${path.extname(storageKey)}`,
    isPrivate: true,
    sandbox: true,
  });
  return true;
};

const servePublicUpload = async (request, response, pathname) => {
  const storageKey = safeStorageKey(pathname.slice("/uploads/".length));
  const contentType = storageKey ? contentTypeForSafeExtension(path.extname(storageKey)) : null;
  if (!storageKey || !contentType) return false;

  const documentResult = await pool.query(
    `
      select id, user_id
      from public.pet_documents
      where file_url = $1 or right(file_url, length($1)) = $1
      limit 1
    `,
    [`/uploads/${storageKey}`],
  );
  if (documentResult.rows[0]) {
    const auth = await requireUser(request, response);
    if (!auth) return true;
    if (auth.user.id !== documentResult.rows[0].user_id) return false;
  }

  let buffer;
  try {
    buffer = await readFile(path.join(uploadDir, storageKey));
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
  sendStoredFile(response, buffer, {
    contentType,
    fileName: storageKey,
    isPrivate: Boolean(documentResult.rows[0]),
    sandbox: Boolean(documentResult.rows[0]),
  });
  return true;
};

const handleRequest = async (request, response) => {
  const url = new URL(request.url || "/", "http://localhost");

  try {
    if (request.method === "GET" && url.pathname.startsWith("/uploads/")) {
      if (!(await servePublicUpload(request, response, url.pathname))) {
        sendError(response, 404, "File not found");
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/health") {
      if (!(await checkDatabaseHealth(pool))) {
        sendJson(response, 503, { ok: false, service: "mipo-api", error: "Database unavailable" });
        return;
      }
      sendJson(response, 200, { ok: true, service: "mipo-api" });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/db/health") {
      if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.FULL_ACCESS))) return;
      await pool.query("select 1");
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/admin/bootstrap") {
      if (!adminApiKey) {
        sendError(response, 503, "Admin API key is not configured");
        return;
      }

      if (!secretsEqual(request.headers["x-admin-api-key"], adminApiKey)) {
        sendError(response, 401, "Unauthorized");
        return;
      }

      sendJson(response, 201, { admin: await bootstrapAdmin(await readBody(request)) });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/admin/login") {
      if (!enforceRateLimit(request, response, "admin-login-ip", rateLimits.adminLogin)) return;
      const body = await readBody(request);
      if (!enforceRateLimit(request, response, "admin-login-email", rateLimits.adminLogin, normalizeEmail(body.email))) return;
      const result = await loginAdmin(request, body);
      sendJson(response, 200, { admin: result.admin }, { "set-cookie": buildAdminCookie(request, result.token) });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/admin/logout") {
      await logoutAdmin(request);
      sendJson(response, 200, { ok: true }, { "set-cookie": buildClearAdminCookie(request) });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/admin/me") {
      const admin = await getAdminFromSession(request);
      if (!admin) {
        sendError(response, 401, "Unauthorized");
        return;
      }

      sendJson(response, 200, { admin });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/admin/password") {
      if (!(await requireAdmin(request, response))) return;
      if (request.admin.id === "api-key") {
        sendError(response, 403, "A signed-in admin session is required");
        return;
      }
      const admin = await changeAdminPassword(request.admin.id, await readBody(request));
      await recordAdminAudit(request.admin, {
        actionType: "admin.password_changed",
        entityType: "admin_user",
        entityId: request.admin.id,
        metadata: { sessions_revoked: true },
      });
      sendJson(response, 200, { admin }, { "set-cookie": buildClearAdminCookie(request) });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/signup") {
      if (!enforceRateLimit(request, response, "signup-ip", rateLimits.signup)) return;
      const body = await readBody(request);
      if (!enforceRateLimit(request, response, "signup-email", rateLimits.signup, normalizeEmail(body.email))) return;
      const result = await signupUser(request, body);
      sendJson(response, 201, { user: result.user, profile: result.profile }, { "set-cookie": buildUserCookie(request, result.token) });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/login") {
      if (!enforceRateLimit(request, response, "user-login-ip", rateLimits.userLogin)) return;
      const body = await readBody(request);
      if (!enforceRateLimit(request, response, "user-login-email", rateLimits.userLogin, normalizeEmail(body.email))) return;
      const result = await loginUser(request, body);
      sendJson(response, 200, { user: result.user, profile: result.profile }, {
        "set-cookie": buildUserCookie(request, result.token, { persistent: result.rememberMe }),
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/password-reset/request") {
      if (!enforceRateLimit(request, response, "password-reset-request-ip", rateLimits.passwordResetRequest)) return;
      const body = await readBody(request);
      if (!enforceRateLimit(request, response, "password-reset-request-email", rateLimits.passwordResetRequest, normalizeEmail(body.email))) return;
      sendJson(response, 200, await requestPasswordReset(request, body));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/password-reset/confirm") {
      if (!enforceRateLimit(request, response, "password-reset-confirm-ip", rateLimits.passwordResetConfirm)) return;
      const body = await readBody(request);
      if (!enforceRateLimit(request, response, "password-reset-confirm-email", rateLimits.passwordResetConfirm, normalizeEmail(body.email))) return;
      sendJson(response, 200, await confirmPasswordReset(body));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
      await logoutUser(request);
      sendJson(response, 200, { ok: true }, { "set-cookie": buildClearUserCookie(request) });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/auth/me") {
      const auth = await getUserFromSession(request);
      if (!auth) {
        sendError(response, 401, "Unauthorized");
        return;
      }

      sendJson(response, 200, auth);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/ai/chat") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      if (auth.profile?.ai_consent_given !== true) {
        sendError(response, 403, "AI consent is required");
        return;
      }
      if (!enforceRateLimit(request, response, "ai-chat", rateLimits.aiChat, auth.user.id)) return;
      sendJson(response, 200, { message: await createAiChatReply(auth, await readBody(request, 512 * 1024)) });
      return;
    }

    const publicPetMatch = url.pathname.match(/^\/api\/public\/pets\/([0-9a-fA-F-]{36})$/);
    if (publicPetMatch && request.method === "GET") {
      const publicPet = await getPublicPet(publicPetMatch[1]);
      if (!publicPet) {
        sendError(response, 404, "Pet not found");
        return;
      }
      sendJson(response, 200, publicPet);
      return;
    }

    const publicPetScanMatch = url.pathname.match(/^\/api\/public\/pets\/([0-9a-fA-F-]{36})\/qr-scan$/);
    if (publicPetScanMatch && request.method === "POST") {
      if (!enforceRateLimit(request, response, "public-pet-scan", rateLimits.publicPetScan)) return;
      await readBody(request, 32 * 1024);
      sendJson(response, 201, {
        logged: await logPublicPetQrScan(publicPetScanMatch[1]),
      });
      return;
    }

    if (request.method === "PATCH" && url.pathname === "/api/me/profile") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      sendJson(response, 200, await updateMyProfile(auth.user.id, await readBody(request)));
      return;
    }

    if (request.method === "PATCH" && url.pathname === "/api/me/marketing-consent") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      sendJson(response, 200, { profile: await updateMyMarketingConsent(auth.user.id, await readBody(request)) });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/me/export") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      sendJson(response, 200, { export: await exportMyData(auth.user.id, auth.user.email) });
      return;
    }

    if (request.method === "DELETE" && url.pathname === "/api/me/account") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      const result = await deleteMyAccount(auth.user.id, auth.user.email);
      sendJson(response, 200, result, { "set-cookie": buildClearUserCookie(request) });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/me/notifications") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      sendJson(response, 200, {
        notifications: await listUserNotifications(auth.user.id, {
          unread: url.searchParams.get("unread") === "true",
          limit: url.searchParams.get("limit") || 100,
        }),
        unread_count: await countUnreadNotifications(auth.user.id),
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/me/notifications") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      sendJson(response, 201, { notification: await createUserNotification(auth.user.id, await readBody(request)) });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/me/notifications/unread-count") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      sendJson(response, 200, { unread_count: await countUnreadNotifications(auth.user.id) });
      return;
    }

    if (request.method === "PATCH" && url.pathname === "/api/me/notifications/read-all") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      sendJson(response, 200, { updated: await markAllUserNotificationsRead(auth.user.id) });
      return;
    }

    const myNotificationMatch = url.pathname.match(/^\/api\/me\/notifications\/([0-9a-fA-F-]{36})$/);
    if (myNotificationMatch && request.method === "PATCH") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      const body = await readBody(request);
      const notification = await markUserNotificationRead(
        auth.user.id,
        myNotificationMatch[1],
        Object.prototype.hasOwnProperty.call(body, "is_read") ? body.is_read : true,
      );
      if (!notification) {
        sendError(response, 404, "Notification not found");
        return;
      }
      sendJson(response, 200, { notification });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/me/documents") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      sendJson(response, 200, {
        documents: await listUserDocuments(auth.user.id, {
          petId: url.searchParams.get("pet_id") || null,
          documentType: url.searchParams.get("document_type") || null,
          limit: url.searchParams.get("limit") || 200,
        }),
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/me/documents") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      if (!enforceRateLimit(request, response, "document-upload", rateLimits.documentUpload, auth.user.id)) return;
      sendJson(response, 201, { document: await createUserDocument(auth.user.id, await readBody(request, Math.ceil(maxDocumentUploadBytes * 1.5) + 1024 * 1024)) });
      return;
    }

    const myDocumentFileMatch = url.pathname.match(/^\/api\/me\/documents\/([0-9a-fA-F-]{36})\/file$/);
    if (myDocumentFileMatch && request.method === "GET") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      if (!(await servePrivateDocument(auth.user.id, myDocumentFileMatch[1], response))) {
        sendError(response, 404, "Document not found");
      }
      return;
    }

    const myDocumentMatch = url.pathname.match(/^\/api\/me\/documents\/([0-9a-fA-F-]{36})$/);
    if (myDocumentMatch && request.method === "DELETE") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      const deleted = await deleteUserDocument(auth.user.id, myDocumentMatch[1]);
      sendJson(response, deleted ? 200 : 404, { deleted });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/me/insurance-claims") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      sendJson(response, 200, {
        claims: await listUserInsuranceClaims(auth.user.id, {
          petId: url.searchParams.get("pet_id") || null,
          limit: url.searchParams.get("limit") || 100,
        }),
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/me/insurance-claims") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      sendJson(response, 201, { claim: await createUserInsuranceClaim(auth.user.id, await readBody(request)) });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/me/service-bookings") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      sendJson(response, 200, {
        bookings: await listUserServiceBookings(auth.user.id, {
          petId: url.searchParams.get("pet_id") || null,
          serviceType: url.searchParams.get("service_type") || null,
          limit: url.searchParams.get("limit") || 100,
        }),
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/me/service-bookings") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      sendJson(response, 201, { booking: await createUserServiceBooking(auth.user.id, await readBody(request)) });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/me/pets") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      const archived = url.searchParams.get("archived") || "false";
      sendJson(response, 200, { pets: await listUserPets(auth.user.id, archived) });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/me/pets") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      sendJson(response, 201, { pet: await insertUserPet(auth.user.id, await readBody(request)) });
      return;
    }

    const myPetCharacterAssetMatch = url.pathname.match(
      /^\/api\/me\/pets\/([0-9a-fA-F-]{36})\/character\/assets\/([a-z0-9-]+)$/,
    );
    if (myPetCharacterAssetMatch && request.method === "GET") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      if (!(await servePetCharacterAsset(
        auth.user.id,
        myPetCharacterAssetMatch[1],
        myPetCharacterAssetMatch[2],
        response,
      ))) {
        sendError(response, 404, "Character image not found");
      }
      return;
    }

    const myPetCharacterSelectMatch = url.pathname.match(
      /^\/api\/me\/pets\/([0-9a-fA-F-]{36})\/character\/select$/,
    );
    if (myPetCharacterSelectMatch && request.method === "POST") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      if (!enforceRateLimit(
        request,
        response,
        "pet-character-pack",
        rateLimits.petCharacterPack,
        auth.user.id,
      )) return;
      const body = await readBody(request, 32 * 1024);
      const character = await selectPetCharacterCandidate(
        auth.user.id,
        myPetCharacterSelectMatch[1],
        body.candidate_key,
      );
      if (!character) {
        sendError(response, 404, "Character candidate not found");
        return;
      }
      sendJson(response, 202, { available: petCharacterAiConfigured, character });
      return;
    }

    const myPetCharacterMatch = url.pathname.match(
      /^\/api\/me\/pets\/([0-9a-fA-F-]{36})\/character$/,
    );
    if (myPetCharacterMatch && request.method === "GET") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      const pet = await getUserPet(auth.user.id, myPetCharacterMatch[1]);
      if (!pet) {
        sendError(response, 404, "Pet not found");
        return;
      }
      sendJson(response, 200, {
        available: petCharacterAiConfigured,
        character: await getPetCharacter(auth.user.id, myPetCharacterMatch[1]),
      });
      return;
    }

    if (myPetCharacterMatch && request.method === "POST") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      if (!enforceRateLimit(
        request,
        response,
        "pet-character-generation",
        rateLimits.petCharacterGeneration,
        auth.user.id,
      )) return;
      const bodyLimit = Math.ceil(maxUploadBytes * 4) + 1024 * 1024;
      const character = await startPetCharacterGeneration(
        auth.user.id,
        myPetCharacterMatch[1],
        await readBody(request, bodyLimit),
      );
      if (!character) {
        sendError(response, 404, "Pet not found");
        return;
      }
      sendJson(response, 202, { available: petCharacterAiConfigured, character });
      return;
    }

    if (myPetCharacterMatch && request.method === "DELETE") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      const deleted = await deletePetCharacter(auth.user.id, myPetCharacterMatch[1]);
      sendJson(response, deleted ? 200 : 404, { deleted });
      return;
    }

    const myPetMatch = url.pathname.match(/^\/api\/me\/pets\/([0-9a-fA-F-]{36})$/);
    if (myPetMatch && request.method === "GET") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      const pet = await getUserPet(auth.user.id, myPetMatch[1]);
      if (!pet) {
        sendError(response, 404, "Pet not found");
        return;
      }
      sendJson(response, 200, { pet });
      return;
    }

    if (myPetMatch && request.method === "PATCH") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      const pet = await updateUserPet(auth.user.id, myPetMatch[1], await readBody(request));
      if (!pet) {
        sendError(response, 404, "Pet not found");
        return;
      }
      sendJson(response, 200, { pet });
      return;
    }

    if (myPetMatch && request.method === "DELETE") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      const deleted = await deleteUserPet(auth.user.id, myPetMatch[1]);
      sendJson(response, deleted ? 200 : 404, { deleted });
      return;
    }

    const myPetHealthSummaryMatch = url.pathname.match(/^\/api\/me\/pets\/([0-9a-fA-F-]{36})\/health-summary$/);
    if (myPetHealthSummaryMatch && request.method === "GET") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      const summary = await getUserPetHealthSummary(auth.user.id, myPetHealthSummaryMatch[1]);
      if (!summary) {
        sendError(response, 404, "Pet not found");
        return;
      }
      sendJson(response, 200, summary);
      return;
    }

    const myVetVisitsMatch = url.pathname.match(/^\/api\/me\/pets\/([0-9a-fA-F-]{36})\/vet-visits$/);
    if (myVetVisitsMatch && request.method === "GET") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      sendJson(response, 200, { vet_visits: await listUserVetVisits(auth.user.id, myVetVisitsMatch[1]) });
      return;
    }

    if (myVetVisitsMatch && request.method === "POST") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      sendJson(response, 201, { vet_visit: await createUserVetVisit(auth.user.id, myVetVisitsMatch[1], await readBody(request)) });
      return;
    }

    const myVaccinationsMatch = url.pathname.match(/^\/api\/me\/pets\/([0-9a-fA-F-]{36})\/vaccinations$/);
    if (myVaccinationsMatch && request.method === "GET") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      sendJson(response, 200, { vaccinations: await listUserVaccinations(auth.user.id, myVaccinationsMatch[1]) });
      return;
    }

    if (myVaccinationsMatch && request.method === "POST") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      sendJson(response, 201, { vaccination: await createUserVaccination(auth.user.id, myVaccinationsMatch[1], await readBody(request)) });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/me/uploads") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      if (!enforceRateLimit(request, response, "media-upload", rateLimits.mediaUpload, auth.user.id)) return;
      sendJson(response, 201, { upload: await uploadUserMedia(auth.user.id, await readBody(request, Math.ceil(maxUploadBytes * 1.5) + 1024 * 1024)) });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/me/social/uploads") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      if (!enforceRateLimit(request, response, "social-upload", rateLimits.socialUpload, auth.user.id)) return;
      const bodyLimit = Math.ceil(maxSocialUploadBytes * 1.5) + 1024 * 1024;
      sendJson(response, 201, {
        upload: await uploadUserMedia(auth.user.id, await readBody(request, bodyLimit), maxSocialUploadBytes),
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/feed") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      sendJson(response, 200, {
        posts: await listSocialFeed(pool, auth.user.id, {
          limit: url.searchParams.get("limit"),
          before: url.searchParams.get("before"),
          saved: url.searchParams.get("saved") === "true",
        }),
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/feed/posts") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      if (!enforceRateLimit(request, response, "social-write", rateLimits.socialWrite, auth.user.id)) return;
      sendJson(response, 201, { post: await createSocialPost(pool, auth.user.id, await readBody(request)) });
      return;
    }

    const socialReactionMatch = url.pathname.match(/^\/api\/feed\/posts\/([0-9a-fA-F-]{36})\/reaction$/);
    if (socialReactionMatch && request.method === "POST") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      if (!enforceRateLimit(request, response, "social-write", rateLimits.socialWrite, auth.user.id)) return;
      const result = await toggleSocialReaction(pool, auth.user.id, socialReactionMatch[1]);
      sendJson(response, 200, { liked: result.active, count: result.count });
      return;
    }

    const socialSaveMatch = url.pathname.match(/^\/api\/feed\/posts\/([0-9a-fA-F-]{36})\/save$/);
    if (socialSaveMatch && request.method === "POST") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      if (!enforceRateLimit(request, response, "social-write", rateLimits.socialWrite, auth.user.id)) return;
      const result = await toggleSocialSave(pool, auth.user.id, socialSaveMatch[1]);
      sendJson(response, 200, { saved: result.active });
      return;
    }

    const socialCommentsMatch = url.pathname.match(/^\/api\/feed\/posts\/([0-9a-fA-F-]{36})\/comments$/);
    if (socialCommentsMatch && request.method === "GET") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      sendJson(response, 200, {
        comments: await listSocialComments(pool, auth.user.id, socialCommentsMatch[1], {
          limit: url.searchParams.get("limit"),
        }),
      });
      return;
    }

    if (socialCommentsMatch && request.method === "POST") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      if (!enforceRateLimit(request, response, "social-write", rateLimits.socialWrite, auth.user.id)) return;
      sendJson(response, 201, {
        comment: await createSocialComment(pool, auth.user.id, socialCommentsMatch[1], await readBody(request)),
      });
      return;
    }

    const socialPollMatch = url.pathname.match(/^\/api\/feed\/posts\/([0-9a-fA-F-]{36})\/poll$/);
    if (socialPollMatch && request.method === "POST") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      if (!enforceRateLimit(request, response, "social-write", rateLimits.socialWrite, auth.user.id)) return;
      const body = await readBody(request);
      sendJson(response, 200, { post: await voteSocialPoll(pool, auth.user.id, socialPollMatch[1], body.option_index) });
      return;
    }

    const socialCommentMatch = url.pathname.match(/^\/api\/feed\/comments\/([0-9a-fA-F-]{36})$/);
    if (socialCommentMatch && request.method === "DELETE") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      const deleted = await deleteSocialComment(pool, auth.user.id, socialCommentMatch[1]);
      sendJson(response, deleted ? 200 : 404, { deleted });
      return;
    }

    const socialPostMatch = url.pathname.match(/^\/api\/feed\/posts\/([0-9a-fA-F-]{36})$/);
    if (socialPostMatch && request.method === "GET") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      const post = await getSocialPost(pool, auth.user.id, socialPostMatch[1]);
      if (!post) {
        sendError(response, 404, "Post not found");
        return;
      }
      sendJson(response, 200, { post });
      return;
    }

    if (socialPostMatch && request.method === "DELETE") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      const deleted = await archiveSocialPost(pool, auth.user.id, socialPostMatch[1]);
      sendJson(response, deleted ? 200 : 404, { deleted });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/me/orders") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 100)));
      sendJson(response, 200, { orders: await listUserOrders(auth.user.id, limit) });
      return;
    }

    const profileActivityMatch = url.pathname.match(/^\/api\/profiles\/([0-9a-fA-F-]{36})\/activity$/);
    if (profileActivityMatch && request.method === "GET") {
      if (!(await requireUser(request, response))) return;
      const activity = await getProfileActivityStatus(profileActivityMatch[1]);
      if (!activity) {
        sendError(response, 404, "Profile not found");
        return;
      }
      sendJson(response, 200, { activity });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/admin/analytics") {
      if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.FULL_ACCESS))) return;
      sendJson(response, 200, await listAdminAnalytics(url.searchParams.get("days")));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/admin/orders") {
      if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.FULL_ACCESS))) return;
      const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") || 200)));
      sendJson(response, 200, { orders: await listOrders({ limit }) });
      return;
    }

    if (request.method === "PATCH" && url.pathname === "/api/admin/orders/bulk") {
      if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.FULL_ACCESS))) return;
      const body = await readBody(request);
      sendJson(response, 200, await bulkUpdateOrders(body.ids, body.updates || {}));
      return;
    }

    const adminOrderMatch = url.pathname.match(/^\/api\/admin\/orders\/([0-9a-fA-F-]{36})$/);
    if (adminOrderMatch && request.method === "PATCH") {
      if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.FULL_ACCESS))) return;
      const order = await updateOrder(adminOrderMatch[1], await readBody(request));
      if (!order) {
        sendError(response, 404, "Order not found");
        return;
      }
      sendJson(response, 200, { order });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/admin/coupons") {
      if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.FULL_ACCESS))) return;
      sendJson(response, 200, { coupons: await listAdminCoupons() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/admin/coupons") {
      if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.FULL_ACCESS))) return;
      sendJson(response, 201, { coupon: await createAdminCoupon(await readBody(request)) });
      return;
    }

    const adminCouponMatch = url.pathname.match(/^\/api\/admin\/coupons\/([0-9a-fA-F-]{36})$/);
    if (adminCouponMatch && request.method === "PATCH") {
      if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.FULL_ACCESS))) return;
      const coupon = await updateAdminCoupon(adminCouponMatch[1], await readBody(request));
      if (!coupon) {
        sendError(response, 404, "Coupon not found");
        return;
      }
      sendJson(response, 200, { coupon });
      return;
    }

    if (adminCouponMatch && request.method === "DELETE") {
      if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.FULL_ACCESS))) return;
      sendJson(response, 200, { deleted: await deleteAdminCoupon(adminCouponMatch[1]) });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/payments/shop") {
      if (!enforceRateLimit(request, response, "payment-create", rateLimits.paymentCreate)) return;
      sendJson(response, 200, await createShopPayment(request, await readBody(request)));
      return;
    }

    if ((request.method === "POST" || request.method === "GET") && url.pathname === "/api/payments/cardcom/webhook") {
      sendJson(response, 200, await handleCardcomWebhook(request, url));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/coupons/validate") {
      if (!enforceRateLimit(request, response, "coupon-validate", rateLimits.couponValidate)) return;
      sendJson(response, 200, { coupon: await validateCoupon(await readBody(request)) });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/orders") {
      if (!enforceRateLimit(request, response, "order-create", rateLimits.orderCreate)) return;
      const body = await readBody(request);
      const auth = await getUserFromSession(request).catch(() => null);
      const result = await createOrder(body, auth?.user || null);
      sendJson(response, 201, {
        order: result.order,
        ...(result.accessToken ? { access_token: result.accessToken } : {}),
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/orders") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 100)));
      sendJson(response, 200, { orders: await listUserOrders(auth.user.id, limit) });
      return;
    }

    const orderMatch = url.pathname.match(/^\/api\/orders\/([^/]+)$/);
    if (orderMatch && request.method === "GET") {
      let orderReference;
      try {
        orderReference = decodeURIComponent(orderMatch[1]);
      } catch {
        sendError(response, 404, "Order not found");
        return;
      }
      const order = await getOrder(orderReference);
      const accessToken = url.searchParams.get("access_token") || request.headers["x-order-access-token"];
      if (!order || !(await canAccessOrder(request, order, accessToken))) {
        sendError(response, 404, "Order not found");
        return;
      }
      sendJson(response, 200, { order });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/breeds") {
      sendJson(response, 200, { breeds: await listBreeds(url.searchParams.get("pet_type")) });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/products") {
      const products = await listProducts();
      // Which supplier an image came from is buying information, not product
      // information. Admin screens keep it; the shop never sees it.
      const asAdmin = await isAdminRequest(request);
      sendJson(response, 200, { products: asAdmin ? products : products.map(withoutSupplierOrigin) });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/products") {
      if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.PRODUCTS_CREATE))) return;
      const product = await createProduct(await readBody(request));
      await recordAdminAudit(request.admin, {
        actionType: "product.created",
        entityId: product.id,
        newValues: product,
      });
      sendJson(response, 201, { product });
      return;
    }

    if (request.method === "PATCH" && url.pathname === "/api/products/bulk") {
      if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.PRODUCTS_UPDATE))) return;
      const body = await readBody(request);
      const result = await bulkUpdateProducts(body.ids, body.updates || {});
      await recordAdminAudit(request.admin, {
        actionType: "product.updated",
        newValues: body.updates || {},
        metadata: { bulk: true, product_ids: body.ids, ...result },
      });
      sendJson(response, 200, result);
      return;
    }

    if (request.method === "DELETE" && url.pathname === "/api/products/bulk") {
      if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.PRODUCTS_DELETE))) return;
      const body = await readBody(request);
      const result = await bulkDeleteProducts(body.ids);
      await recordAdminAudit(request.admin, {
        actionType: "product.deleted",
        metadata: { bulk: true, product_ids: body.ids, ...result },
      });
      sendJson(response, 200, result);
      return;
    }

    const productMatch = url.pathname.match(/^\/api\/products\/([0-9a-fA-F-]{36})$/);
    if (productMatch && request.method === "PATCH") {
      if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.PRODUCTS_UPDATE))) return;
      const body = await readBody(request);
      const oldProduct = await fetchProductById(productMatch[1], body.source);
      const product = await updateProduct(productMatch[1], body);
      if (!product) {
        sendError(response, 404, "Product not found");
        return;
      }
      await recordAdminAudit(request.admin, {
        actionType: "product.updated",
        entityId: product.id,
        oldValues: oldProduct,
        newValues: product,
      });
      sendJson(response, 200, { product });
      return;
    }

    if (productMatch && request.method === "DELETE") {
      if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.PRODUCTS_DELETE))) return;
      const oldProduct = await fetchProductById(productMatch[1], url.searchParams.get("source"));
      const deleted = await deleteProduct(productMatch[1], url.searchParams.get("source"));
      if (deleted) {
        await recordAdminAudit(request.admin, {
          actionType: "product.deleted",
          entityId: productMatch[1],
          oldValues: oldProduct,
        });
      }
      sendJson(response, deleted ? 200 : 404, { deleted });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/uploads") {
      if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.PRODUCT_ASSETS_UPLOAD))) return;
      const upload = await uploadImage(await readBody(request, Math.ceil(maxUploadBytes * 1.5) + 1024 * 1024));
      await recordAdminAudit(request.admin, {
        actionType: "product.asset_uploaded",
        entityType: "product_asset",
        entityId: upload.storage_key || null,
        metadata: { content_type: upload.content_type, size: upload.size },
      });
      sendJson(response, 201, { upload });
      return;
    }

    const productIntelMatch = url.pathname.match(/^\/api\/product-intel\/([a-z0-9-]+)$/);
    if (productIntelMatch && request.method === "POST") {
      if (!(await requireAdminPermission(request, response, ADMIN_PERMISSIONS.PRODUCT_TOOLS_USE))) return;
      const result = await runProductIntelFunction(productIntelMatch[1], await readBody(request, 2 * 1024 * 1024));
      await recordAdminAudit(request.admin, {
        actionType: "product.tool_used",
        metadata: { function_name: productIntelMatch[1] },
      });
      sendJson(response, 200, result);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/reports") {
      if (!enforceRateLimit(request, response, "report-create", rateLimits.reportCreate)) return;
      const auth = await getUserFromSession(request).catch(() => null);
      sendJson(response, 201, { report: await createReport(await readBody(request), auth?.user?.id || null) });
      return;
    }

    sendError(response, 404, "Not found");
  } catch (error) {
    if (!error.statusCode || error.statusCode >= 500) console.error(error);
    sendError(response, error.statusCode || 500, error.statusCode ? error.message : "Internal server error");
  }
};

const server = http.createServer(handleRequest);

const resumePetCharacterJobs = async () => {
  if (!petCharacterAiConfigured) return;
  const result = await pool.query(
    `
      select id, status
      from public.pet_characters
      where status in ('generating_candidates', 'generating_pack')
      order by updated_at asc
    `,
  );
  for (const character of result.rows) {
    schedulePetCharacterJob(
      character.id,
      character.status === "generating_candidates" ? "candidates" : "expressions",
    );
  }
};

server.listen(port, () => {
  console.log(`mipo-api listening on ${port}`);
  resumePetCharacterJobs().catch((error) => {
    console.error("Failed to resume pet character generation", error);
  });
});
