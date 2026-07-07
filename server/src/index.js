import http from "node:http";
import { createHash, createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
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

const port = Number(process.env.PORT || 3000);
const databaseUrl = process.env.DATABASE_URL;
const adminApiKey = process.env.ADMIN_API_KEY;
const defaultBusinessId = process.env.DEFAULT_BUSINESS_ID || "cf941cc4-e1d1-4d7c-8122-a5df81a1e53c";
const uploadDir = process.env.UPLOAD_DIR || "/app/uploads";
const maxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES || 5 * 1024 * 1024);
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
const cardcomTerminal = process.env.CARDCOM_TERMINAL_NUMBER;
const cardcomUsername = process.env.CARDCOM_USERNAME || process.env.CARDCOM_API_NAME;
const cardcomApiPassword = process.env.CARDCOM_API_PASSWORD;
const cardcomWebhookSecret = process.env.CARDCOM_WEBHOOK_SECRET;
const cardcomLowProfileUrl = "https://secure.cardcom.solutions/Interface/LowProfile.aspx";
const cardcomIndicatorUrl = "https://secure.cardcom.solutions/Interface/BillGoldGetLowProfileIndicator.aspx";

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
  max: Number(process.env.DB_POOL_MAX || 8),
});

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
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
  return raw ? JSON.parse(raw) : {};
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

const hashPassword = (password) => {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(String(password), salt, 64).toString("base64url");
  return `scrypt$${salt}$${hash}`;
};

const verifyPassword = (password, passwordHash) => {
  const [algorithm, salt, hash] = String(passwordHash || "").split("$");
  if (algorithm !== "scrypt" || !salt || !hash) return false;

  const actualHash = Buffer.from(hash, "base64url");
  const expectedHash = scryptSync(String(password), salt, actualHash.length);
  if (actualHash.length !== expectedHash.length) return false;
  return timingSafeEqual(actualHash, expectedHash);
};

const hashSessionToken = (token) => createHash("sha256").update(String(token)).digest("hex");

const serializeAdmin = (row) => ({
  id: row.id,
  email: row.email,
  display_name: row.display_name || null,
  role: row.role,
  created_at: row.created_at || null,
  last_login_at: row.last_login_at || null,
});

const adminUserSelect = `
  id,
  email,
  display_name,
  role,
  is_active,
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

const getPublicBaseUrl = (request) => {
  const configuredUrl = process.env.PUBLIC_APP_URL || process.env.APP_URL || process.env.VITE_APP_URL;
  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");

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

const createAdminSession = async (request, adminUserId) => {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + adminSessionMs).toISOString();

  await pool.query(
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
    request.admin = { id: "api-key", email: "api-key", role: "admin" };
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

  const token = await createAdminSession(request, row.id);
  const updated = await pool.query(
    `update public.admin_users set last_login_at = now(), updated_at = now() where id = $1 returning ${adminUserSelect}`,
    [row.id],
  );

  return {
    admin: serializeAdmin(updated.rows[0]),
    token,
  };
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

const getProfileByUserId = async (userId) => {
  const result = await pool.query("select * from public.profiles where id = $1 limit 1", [userId]);
  return result.rows[0] ? serializeProfile(result.rows[0]) : null;
};

const buildUserCookie = (request, token) => {
  const isHttps = request.headers["x-forwarded-proto"] === "https";
  return [
    `${userCookieName}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${Math.floor(userSessionMs / 1000)}`,
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

const createUserSession = async (request, userId, db = pool) => {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + userSessionMs).toISOString();

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

  const token = await createUserSession(request, row.id);
  const updated = await pool.query(
    `update public.app_users set last_login_at = now(), updated_at = now() where id = $1 returning ${userSelect}`,
    [row.id],
  );
  const profile = await getProfileByUserId(row.id);

  return {
    user: serializeUser(updated.rows[0], profile),
    profile,
    token,
  };
};

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const hashPasswordResetOtp = (email, otp) => createHmac("sha256", adminApiKey || databaseUrl)
  .update(`${normalizeEmail(email)}:${String(otp || "")}`)
  .digest("hex");

const sendPasswordResetEmail = async (request, email, otp) => {
  if (!resendApiKey) return { sent: false, reason: "not_configured" };

  const resetUrl = new URL("/reset-password", `${getPublicBaseUrl(request)}/`);
  resetUrl.searchParams.set("email", email);
  resetUrl.searchParams.set("otp", otp);

  const response = await fetch("https://api.resend.com/emails", {
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
  });

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
    email_delivery: emailDelivery,
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
  ];
  for (const field of simpleTextFields) {
    if (has(field)) payload[field] = body[field] === null ? null : String(body[field] || "").trim() || null;
  }

  if (has("birth_date") || has("birthDate")) payload.birth_date = normalizeDateOnly(body.birth_date || body.birthDate);
  if (has("last_vet_visit") || has("lastVetVisit")) payload.last_vet_visit = normalizeDateOnly(body.last_vet_visit || body.lastVetVisit);
  if (has("next_vet_visit") || has("nextVetVisit")) payload.next_vet_visit = normalizeDateOnly(body.next_vet_visit || body.nextVetVisit);
  if (has("insurance_expiry_date") || has("insuranceExpiryDate")) payload.insurance_expiry_date = normalizeDateOnly(body.insurance_expiry_date || body.insuranceExpiryDate);
  if (has("license_expiry_date") || has("licenseExpiryDate")) payload.license_expiry_date = normalizeDateOnly(body.license_expiry_date || body.licenseExpiryDate);
  if (has("weight")) payload.weight = toNumber(body.weight);
  if (has("is_neutered")) payload.is_neutered = body.is_neutered === null ? null : Boolean(body.is_neutered);
  if (has("has_insurance")) payload.has_insurance = body.has_insurance === null ? null : Boolean(body.has_insurance);
  if (has("is_dangerous_breed")) payload.is_dangerous_breed = Boolean(body.is_dangerous_breed);
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

const deleteUserPet = async (userId, petId) => {
  if (!uuidPattern.test(petId)) return false;
  const result = await pool.query(
    "delete from public.pets where id = $1 and user_id = $2",
    [petId, userId],
  );
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
  file_url: row.file_url,
  file_name: row.file_name,
  file_size: row.file_size,
  content_type: row.content_type || null,
  uploaded_at: row.uploaded_at || null,
  updated_at: row.updated_at || null,
});

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

  const upload = body.data_url
    ? await uploadDocumentFile(body)
    : {
      url: String(body.file_url || ""),
      file_name: String(body.file_name || body.title || "document"),
      size: Number(body.file_size || 0) || null,
      content_type: body.content_type || null,
    };

  if (!upload.url) {
    const error = new Error("Document file is required");
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(
    `
      insert into public.pet_documents (
        user_id,
        pet_id,
        document_type,
        title,
        description,
        file_url,
        file_name,
        file_size,
        content_type
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      returning *
    `,
    [
      userId,
      body.pet_id,
      String(body.document_type || "other").trim() || "other",
      title,
      body.description ? String(body.description).trim() : null,
      upload.url,
      upload.file_name,
      upload.size,
      upload.content_type,
    ],
  );

  return serializeDocument(result.rows[0]);
};

const deleteUploadedFileFromUrl = async (fileUrl) => {
  const value = String(fileUrl || "");
  if (!value.startsWith("/uploads/")) return;
  const fileName = path.basename(value);
  if (!fileName || fileName === "." || fileName === "..") return;
  try {
    await unlink(path.join(uploadDir, fileName));
  } catch {
    // Missing files should not block metadata deletion.
  }
};

const deleteUserDocument = async (userId, documentId) => {
  if (!uuidPattern.test(documentId)) return false;
  const result = await pool.query(
    "delete from public.pet_documents where id = $1 and user_id = $2 returning file_url",
    [documentId, userId],
  );
  if (result.rows[0]?.file_url) {
    await deleteUploadedFileFromUrl(result.rows[0].file_url);
  }
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

const toNumber = (value) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const serializeInsuranceClaim = (row) => ({
  id: row.id,
  user_id: row.user_id,
  pet_id: row.pet_id || null,
  pet_name: row.pet_name || null,
  pet_microchip: row.pet_microchip || null,
  owner_name: row.owner_name || null,
  owner_id_number: row.owner_id_number || null,
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

const insuranceClaimStatuses = new Set(["pending", "approved", "paid", "denied"]);

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

  const status = insuranceClaimStatuses.has(String(body.status || "pending"))
    ? String(body.status || "pending")
    : "pending";

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
      body.owner_id_number ? String(body.owner_id_number).trim() : null,
      body.clinic_name ? String(body.clinic_name).trim() : null,
      normalizeDateOnly(body.visit_date),
      body.diagnosis ? String(body.diagnosis).trim() : null,
      body.treatment ? String(body.treatment).trim() : null,
      toNumber(body.total_amount),
      toNumber(body.paid_amount),
      status,
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

const createProduct = async (body) => {
  const payload = normalizeProductPayload(body);
  const businessId = body.business_id || await ensureDefaultBusinessProfile();

  const result = await pool.query(
    `
      insert into public.business_products (
        business_id, name, description, price, original_price, sale_price,
        image_url, images, category, in_stock, is_featured, sku, pet_type,
        flavors, brand, weight_unit, price_per_weight, source_url, ingredients,
        benefits, feeding_guide, product_attributes, life_stage, dog_size, special_diet,
        breed_tags, medical_tags, auto_restock, restock_interval_days, api_sync_enabled,
        cost_price, supplier_id, safety_score, kcal_per_kg
      )
      values (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25,
        $26, $27, $28, $29, $30,
        $31, $32, $33, $34
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
const paymentStatuses = new Set(["pending", "paid", "failed", "awaiting_cod", "dev_approved", "refunded", "libra_credit"]);
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

const normalizeOrderItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error("Order items are required");
    error.statusCode = 400;
    throw error;
  }

  return items.map((item) => {
    const quantity = toPositiveInteger(item.quantity);
    const price = toMoney(item.price);
    const name = String(item.name || item.product_name || "").trim();

    if (!name) {
      const error = new Error("Each order item requires a product name");
      error.statusCode = 400;
      throw error;
    }

    if (price <= 0) {
      const error = new Error("Each order item requires a positive price");
      error.statusCode = 400;
      throw error;
    }

    const productId = String(item.product_id || item.id || "").trim();
    return {
      product_id: uuidPattern.test(productId) ? productId : null,
      product_source: item.product_source || item.source || null,
      product_name: name,
      product_image: item.image || item.product_image || "/placeholder.svg",
      quantity,
      price,
      variant: item.variant || null,
      size: item.size || null,
    };
  });
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

  if (!normalized.fullName || !normalized.email || !normalized.phone || !normalized.address || !normalized.city) {
    const error = new Error("Shipping name, email, phone, address, and city are required");
    error.statusCode = 400;
    throw error;
  }

  return normalized;
};

const calculateOrderAmounts = async (client, body, orderItems, shippingAddress) => {
  const subtotal = toMoney(orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const coupon = body.coupon_code || body.coupon?.code
    ? await findValidCoupon(client, body.coupon_code || body.coupon?.code, subtotal)
    : null;

  const couponType = coupon ? normalizeCouponDiscountType(coupon.discount_type) : null;
  const couponValue = coupon ? toMoney(coupon.discount_value) : 0;
  const discountAmount = coupon && couponType !== "free_shipping"
    ? couponType === "percentage"
      ? toMoney((subtotal * couponValue) / 100)
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
    customerEmail: normalizeEmail(body.customer_email || shippingAddress.email),
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

const createOrder = async (body) => {
  const orderItems = normalizeOrderItems(body.items);
  const shippingAddress = normalizeShippingAddress(body.shipping_address || body.shippingData);
  const paymentMethod = String(body.payment_method || "credit-card");
  const paymentStatus = paymentMethod === "cash-on-delivery" ? "awaiting_cod" : "pending";
  const paymentInstallments = toPositiveInteger(body.installments || body.payment_installments);
  const client = await pool.connect();

  try {
    await client.query("begin");

    const amounts = await calculateOrderAmounts(client, body, orderItems, shippingAddress);
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
          medical_urgency
        )
        values (
          $1, $2, $3, $4, $5,
          'pending', $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20
        )
        returning *
      `,
      [
        orderNumber,
        customerResult.rows[0].id,
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
        body.order_type || (body.want_recurring_order ? "auto-restock" : "regular"),
        body.pet_name || null,
        body.special_instructions || null,
        body.medical_urgency || "none",
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
    return mapOrder(order, itemsResult.rows.map(mapOrderItem));
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

const getOrder = async (id) => {
  const result = uuidPattern.test(id)
    ? await pool.query("select * from public.orders where id = $1 limit 1", [id])
    : await pool.query("select * from public.orders where order_number = $1 limit 1", [id]);
  if (result.rowCount === 0) return null;
  const [order] = await attachOrderItems(result.rows);
  return order;
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

const getStringValue = (source, keys) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value === null || value === undefined) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return null;
};

const getNumberValue = (source, keys) => {
  const raw = getStringValue(source, keys);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseCardcomReturnValue = (rawReturnValue) => {
  if (!rawReturnValue) return { orderId: null, orderNumber: null };

  const tryParse = (value) => {
    try {
      const parsed = JSON.parse(value);
      return {
        orderId: parsed?.order_id ? String(parsed.order_id) : null,
        orderNumber: parsed?.order_number ? String(parsed.order_number) : null,
      };
    } catch {
      return null;
    }
  };

  const direct = tryParse(rawReturnValue);
  if (direct) return direct;

  try {
    const decoded = decodeURIComponent(rawReturnValue);
    return tryParse(decoded) || { orderId: null, orderNumber: null };
  } catch {
    return { orderId: null, orderNumber: null };
  }
};

const verifyCardcomSignature = (rawBody, signature) => {
  if (!cardcomWebhookSecret) return true;
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

  const indicatorResponse = await fetch(`${cardcomIndicatorUrl}?${params.toString()}`, { method: "GET" });
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

  if (toMoney(order.total) <= 0) {
    const error = new Error("Invalid payment amount");
    error.statusCode = 400;
    throw error;
  }

  const successUrl = absoluteAppUrl(request, body.success_url || "/payment-success");
  const cancelUrl = absoluteAppUrl(request, body.cancel_url || "/payment-failed");
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

  if (!cardcomTerminal || !cardcomUsername || !cardcomApiPassword) {
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

  const { lines, lineCount, sum } = buildCardcomInvoiceLines(order);
  if (sum <= 0) {
    const error = new Error("Invalid CardCom invoice amount");
    error.statusCode = 400;
    throw error;
  }

  const webhookUrl = absoluteAppUrl(request, "/api/payments/cardcom/webhook");
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
  formData.append("WebHookUrl", webhookUrl);
  formData.append("IndicatorUrl", webhookUrl);
  formData.append("ReturnValue", JSON.stringify({ order_id: order.id, order_number: order.order_number }));
  formData.append("MaxNumOfPayments", String(order.payment_installments || 1));
  formData.append("ProductName", itemsDescription);
  formData.append("HideSumField", "true");
  formData.append("SumInStar498", "false");

  for (const [key, value] of Object.entries(lines)) {
    formData.append(key, value);
  }

  const cardcomResponse = await fetch(cardcomLowProfileUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });
  const responseText = await cardcomResponse.text();
  const cardcomParams = new URLSearchParams(responseText);
  const responseCode = Number(cardcomParams.get("ResponseCode") || cardcomParams.get("OperationResponse") || "-1");
  const lowProfileId = cardcomParams.get("LowProfileCode") || cardcomParams.get("LowProfileId") || "";
  const paymentUrl = cardcomParams.get("Url") || cardcomParams.get("url") || cardcomParams.get("LowProfileUrl") || "";
  const description = cardcomParams.get("Description") || cardcomParams.get("ErrorDescription") || "";
  const isSuccess = responseCode === 0 || (paymentUrl.length > 0 && responseCode === -1);

  if (!isSuccess) {
    await pool.query(
      "update public.orders set payment_status = 'failed', updated_at = now() where id = $1",
      [order.id],
    );
    const error = new Error(description || "CardCom failed to create a payment page");
    error.statusCode = 400;
    throw error;
  }

  await pool.query(
    `
      update public.orders
      set payment_status = 'pending',
          payment_transaction_id = coalesce(nullif($2, ''), payment_transaction_id),
          updated_at = now()
      where id = $1
    `,
    [order.id, lowProfileId],
  );

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
        raw_response: responseText.slice(0, 1000),
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
  const rawBody = request.method === "GET" ? "" : await readRawBody(request);
  const signature = request.headers["x-cardcom-signature"];
  if (rawBody && !verifyCardcomSignature(rawBody, signature)) {
    const error = new Error("Invalid CardCom signature");
    error.statusCode = 401;
    throw error;
  }

  const payload = parseCardcomWebhookPayload(rawBody, Object.fromEntries(url.searchParams.entries()));
  const lowProfileCode = getStringValue(payload, [
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
  const operationResponse = getNumberValue(indicatorPayload, ["OperationResponse", "operationresponse"]);
  if (operationResponse === null) {
    const error = new Error("Invalid CardCom indicator response");
    error.statusCode = 502;
    throw error;
  }

  const dealResponse = getNumberValue(indicatorPayload, ["DealResponse", "dealresponse"]);
  const returnValue = getStringValue(indicatorPayload, ["ReturnValue", "returnvalue"]) ||
    getStringValue(payload, ["ReturnValue", "returnvalue"]);
  const { orderId: parsedOrderId } = parseCardcomReturnValue(returnValue);
  const transactionId = getStringValue(indicatorPayload, [
    "TranzactionId",
    "TransactionId",
    "InternalDealNumber",
    "DealNumber",
    "LowProfileDealId",
  ]) || getStringValue(payload, [
    "TranzactionId",
    "TransactionId",
    "InternalDealNumber",
    "LowProfileDealId",
  ]) || lowProfileCode;

  let orderResult = parsedOrderId && uuidPattern.test(parsedOrderId)
    ? await pool.query("select id, order_number, payment_status from public.orders where id = $1 limit 1", [parsedOrderId])
    : { rowCount: 0, rows: [] };

  if (orderResult.rowCount === 0) {
    orderResult = await pool.query(
      "select id, order_number, payment_status from public.orders where payment_transaction_id = $1 limit 1",
      [lowProfileCode],
    );
  }

  const order = orderResult.rows[0] || null;
  const isSuccess = operationResponse === 0 && (dealResponse === null || dealResponse === 0);

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
        method: request.method,
        incoming: payload,
        indicator: indicatorPayload,
      }),
    ],
  );

  if (!order) {
    const error = new Error("Order not found");
    error.statusCode = 404;
    throw error;
  }

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
        `,
        [order.id, transactionId],
      );
    }
  } else if (order.payment_status !== "paid") {
    await pool.query(
      "update public.orders set payment_status = 'failed', updated_at = now() where id = $1",
      [order.id],
    );
  }

  return {
    received: true,
    order_id: order.id,
    payment_status: isSuccess ? "paid" : "failed",
  };
};

const createReport = async (body) => {
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
      body.reporter_id || null,
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

const fileExtensionForContentType = (contentType) => {
  if (contentType === "image/jpeg") return ".jpg";
  if (contentType === "image/png") return ".png";
  if (contentType === "image/webp") return ".webp";
  if (contentType === "image/gif") return ".gif";
  if (contentType === "application/pdf") return ".pdf";
  if (contentType === "text/plain") return ".txt";
  if (contentType === "application/msword") return ".doc";
  if (contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return ".docx";
  return "";
};

const uploadDataUrlFile = async (body, {
  maxBytes = maxUploadBytes,
  requireImage = false,
  allowedContentTypes = null,
  defaultExtension = ".bin",
} = {}) => {
  const dataUrl = typeof body.data_url === "string" ? body.data_url : "";
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    const error = new Error("A base64 data URL is required");
    error.statusCode = 400;
    throw error;
  }

  const contentType = match[1];
  if (requireImage && !contentType.startsWith("image/")) {
    const error = new Error("Only image uploads are supported");
    error.statusCode = 415;
    throw error;
  }
  if (allowedContentTypes && !allowedContentTypes.has(contentType)) {
    const error = new Error("Unsupported file type");
    error.statusCode = 415;
    throw error;
  }

  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > maxBytes) {
    const error = new Error("File is too large");
    error.statusCode = 413;
    throw error;
  }

  const originalExtension = path.extname(String(body.file_name || "")).toLowerCase();
  const extension = originalExtension || fileExtensionForContentType(contentType) || defaultExtension;
  const fileName = `${Date.now()}-${randomUUID()}${extension}`;

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), buffer);

  return {
    url: `/uploads/${fileName}`,
    file_name: fileName,
    content_type: contentType,
    size: buffer.length,
  };
};

const uploadImage = async (body) => uploadDataUrlFile(body, {
  maxBytes: maxUploadBytes,
  requireImage: true,
  defaultExtension: ".img",
});

const documentContentTypes = new Set([
  "application/pdf",
  "application/octet-stream",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const uploadDocumentFile = async (body) => uploadDataUrlFile(body, {
  maxBytes: maxDocumentUploadBytes,
  allowedContentTypes: documentContentTypes,
  defaultExtension: ".bin",
});

const handleRequest = async (request, response) => {
  const url = new URL(request.url || "/", "http://localhost");

  try {
    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, { ok: true, service: "mipo-api" });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/db/health") {
      const result = await pool.query("select current_database() as database, current_user as user");
      sendJson(response, 200, { ok: true, ...result.rows[0] });
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
      const result = await loginAdmin(request, await readBody(request));
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

    if (request.method === "POST" && url.pathname === "/api/auth/signup") {
      const result = await signupUser(request, await readBody(request));
      sendJson(response, 201, { user: result.user, profile: result.profile }, { "set-cookie": buildUserCookie(request, result.token) });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/login") {
      const result = await loginUser(request, await readBody(request));
      sendJson(response, 200, { user: result.user, profile: result.profile }, { "set-cookie": buildUserCookie(request, result.token) });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/password-reset/request") {
      sendJson(response, 200, await requestPasswordReset(request, await readBody(request)));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/password-reset/confirm") {
      sendJson(response, 200, await confirmPasswordReset(await readBody(request)));
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

    if (request.method === "PATCH" && url.pathname === "/api/me/profile") {
      const auth = await requireUser(request, response);
      if (!auth) return;
      sendJson(response, 200, await updateMyProfile(auth.user.id, await readBody(request)));
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
      sendJson(response, 201, { document: await createUserDocument(auth.user.id, await readBody(request, Math.ceil(maxDocumentUploadBytes * 1.5) + 1024 * 1024)) });
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
      sendJson(response, 201, { upload: await uploadImage(await readBody(request, maxUploadBytes + 1024 * 1024)) });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/admin/orders") {
      if (!(await requireAdmin(request, response))) return;
      const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") || 200)));
      sendJson(response, 200, { orders: await listOrders({ limit }) });
      return;
    }

    if (request.method === "PATCH" && url.pathname === "/api/admin/orders/bulk") {
      if (!(await requireAdmin(request, response))) return;
      const body = await readBody(request);
      sendJson(response, 200, await bulkUpdateOrders(body.ids, body.updates || {}));
      return;
    }

    const adminOrderMatch = url.pathname.match(/^\/api\/admin\/orders\/([0-9a-fA-F-]{36})$/);
    if (adminOrderMatch && request.method === "PATCH") {
      if (!(await requireAdmin(request, response))) return;
      const order = await updateOrder(adminOrderMatch[1], await readBody(request));
      if (!order) {
        sendError(response, 404, "Order not found");
        return;
      }
      sendJson(response, 200, { order });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/admin/coupons") {
      if (!(await requireAdmin(request, response))) return;
      sendJson(response, 200, { coupons: await listAdminCoupons() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/admin/coupons") {
      if (!(await requireAdmin(request, response))) return;
      sendJson(response, 201, { coupon: await createAdminCoupon(await readBody(request)) });
      return;
    }

    const adminCouponMatch = url.pathname.match(/^\/api\/admin\/coupons\/([0-9a-fA-F-]{36})$/);
    if (adminCouponMatch && request.method === "PATCH") {
      if (!(await requireAdmin(request, response))) return;
      const coupon = await updateAdminCoupon(adminCouponMatch[1], await readBody(request));
      if (!coupon) {
        sendError(response, 404, "Coupon not found");
        return;
      }
      sendJson(response, 200, { coupon });
      return;
    }

    if (adminCouponMatch && request.method === "DELETE") {
      if (!(await requireAdmin(request, response))) return;
      sendJson(response, 200, { deleted: await deleteAdminCoupon(adminCouponMatch[1]) });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/payments/shop") {
      sendJson(response, 200, await createShopPayment(request, await readBody(request)));
      return;
    }

    if ((request.method === "POST" || request.method === "GET") && url.pathname === "/api/payments/cardcom/webhook") {
      sendJson(response, 200, await handleCardcomWebhook(request, url));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/coupons/validate") {
      sendJson(response, 200, { coupon: await validateCoupon(await readBody(request)) });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/orders") {
      sendJson(response, 201, { order: await createOrder(await readBody(request)) });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/orders") {
      const ids = (url.searchParams.get("ids") || "")
        .split(",")
        .map((id) => id.trim())
        .filter((id) => uuidPattern.test(id));
      const email = url.searchParams.get("email");
      if (ids.length === 0 && !email) {
        sendJson(response, 200, { orders: [] });
        return;
      }
      sendJson(response, 200, { orders: await listOrders({ ids, email, limit: 200 }) });
      return;
    }

    const orderMatch = url.pathname.match(/^\/api\/orders\/([^/]+)$/);
    if (orderMatch && request.method === "GET") {
      const order = await getOrder(decodeURIComponent(orderMatch[1]));
      if (!order) {
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
      sendJson(response, 200, { products: await listProducts() });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/products") {
      if (!(await requireAdmin(request, response))) return;
      sendJson(response, 201, { product: await createProduct(await readBody(request)) });
      return;
    }

    if (request.method === "PATCH" && url.pathname === "/api/products/bulk") {
      if (!(await requireAdmin(request, response))) return;
      const body = await readBody(request);
      sendJson(response, 200, await bulkUpdateProducts(body.ids, body.updates || {}));
      return;
    }

    if (request.method === "DELETE" && url.pathname === "/api/products/bulk") {
      if (!(await requireAdmin(request, response))) return;
      const body = await readBody(request);
      sendJson(response, 200, await bulkDeleteProducts(body.ids));
      return;
    }

    const productMatch = url.pathname.match(/^\/api\/products\/([0-9a-fA-F-]{36})$/);
    if (productMatch && request.method === "PATCH") {
      if (!(await requireAdmin(request, response))) return;
      const product = await updateProduct(productMatch[1], await readBody(request));
      if (!product) {
        sendError(response, 404, "Product not found");
        return;
      }
      sendJson(response, 200, { product });
      return;
    }

    if (productMatch && request.method === "DELETE") {
      if (!(await requireAdmin(request, response))) return;
      const deleted = await deleteProduct(productMatch[1], url.searchParams.get("source"));
      sendJson(response, deleted ? 200 : 404, { deleted });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/uploads") {
      if (!(await requireAdmin(request, response))) return;
      sendJson(response, 201, { upload: await uploadImage(await readBody(request, maxUploadBytes + 1024 * 1024)) });
      return;
    }

    const productIntelMatch = url.pathname.match(/^\/api\/product-intel\/([a-z0-9-]+)$/);
    if (productIntelMatch && request.method === "POST") {
      if (!(await requireAdmin(request, response))) return;
      sendJson(response, 200, await runProductIntelFunction(productIntelMatch[1], await readBody(request, 2 * 1024 * 1024)));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/reports") {
      sendJson(response, 201, { report: await createReport(await readBody(request)) });
      return;
    }

    sendError(response, 404, "Not found");
  } catch (error) {
    console.error(error);
    sendError(response, error.statusCode || 500, error.statusCode ? error.message : "Internal server error", error.statusCode ? undefined : error.message);
  }
};

const server = http.createServer(handleRequest);

server.listen(port, () => {
  console.log(`mipo-api listening on ${port}`);
});
