// Provisioning an admin account, including Seller-scoped ones.
//
// Since M1b a role carries a scope, and the two can only be set together. That
// is not a stylistic choice: setting them separately is the escalation path.
// Re-provisioning a seller_admin as 'admin' while leaving its business_id in
// place would produce a platform role that still points at a Seller - and if
// admin_users_scope_check were ever dropped, that row would read as full
// platform access. So every write here names both columns, always.
//
// What this script will NOT do, each for a reason that has already cost this
// system something:
//
//   * fall back to DEFAULT_BUSINESS_ID. That fallback is why legacy product
//     ownership is unreconstructible: it assigned an owner and recorded
//     nothing. An unscoped Seller role fails here instead.
//   * create a business. Provisioning an admin must not bring a Seller into
//     existence as a side effect; somebody has to have decided it exists.
//   * read supplier_id. A supplier is not a Seller and is not an identity.
//   * take a business_id from anywhere but this command line. There is no
//     environment fallback, because an environment variable is not a decision.

import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import { Pool } from "pg";
import {
  ADMIN_ROLES,
  ADMIN_SCOPES,
  getAdminScope,
  isSupportedAdminRole,
} from "./adminPermissions.js";
import { assertSellerEligible } from "./sellerEligibility.js";
import { hashPassword } from "./passwords.js";

const parseArgs = (args) => {
  const values = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!key.startsWith("--")) continue;
    values.set(key.slice(2), args[index + 1]);
    index += 1;
  }
  return values;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates the role and scope pair before anything touches the database.
 *
 * Pure and exported, so the rules can be tested without a connection and reused
 * by an HTTP provisioning route later without being restated - a restated rule
 * is a rule that drifts.
 */
export const resolveProvisioningScope = (role, businessIdArg) => {
  if (!isSupportedAdminRole(role)) {
    return { ok: false, error: `Unsupported admin role: ${role}` };
  }

  const businessId = String(businessIdArg ?? "").trim();
  const scope = getAdminScope(role);

  if (scope === ADMIN_SCOPES.SELLER) {
    if (!businessId) {
      return {
        ok: false,
        error: `--business-id is required for ${role}: a Seller-scoped admin with no Seller would read as platform-wide`,
      };
    }
    if (!UUID_PATTERN.test(businessId)) {
      return { ok: false, error: "--business-id must be a uuid" };
    }
    return { ok: true, businessId, scope };
  }

  // Platform roles. A supplied Seller is refused rather than ignored: silently
  // dropping it would let somebody believe they had scoped the account.
  if (businessId) {
    return {
      ok: false,
      error: `${role} is platform-scoped and must not be given a --business-id`,
    };
  }
  return { ok: true, businessId: null, scope };
};

/**
 * Whether a business may have Seller-scoped admins attached to it.
 *
 * A CHECK constraint cannot reach into business_profiles, so this is
 * application-level by necessity rather than by choice - but the rule itself
 * lives in sellerEligibility.js, not here. Four places need this answer, and
 * four spellings of one rule is how the rule becomes four rules.
 */
export const assertBusinessMayHaveSellerAdmins = async (client, businessId) => {
  const { rows } = await client.query(
    "select id, is_verified, commercial_status from public.business_profiles where id = $1",
    [businessId],
  );

  assertSellerEligible(rows[0] ?? null, businessId);
  return rows[0].id;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const email = String(args.get("email") || "").trim().toLowerCase();
  const role = String(args.get("role") || ADMIN_ROLES.PRODUCT_MANAGER).trim();
  const displayName = String(args.get("display-name") || "Product manager").trim();
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  if (!email || !email.includes("@")) throw new Error("--email must be a valid email address");

  // Reads only the command line.
  const scopeResult = resolveProvisioningScope(role, args.get("business-id"));
  if (!scopeResult.ok) throw new Error(scopeResult.error);
  const { businessId } = scopeResult;

  const temporaryPassword = randomBytes(18).toString("base64url");
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.DB_SSL === "false"
      ? false
      : { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" },
  });

  const client = await pool.connect();
  try {
    await client.query("begin");

    // Inside the transaction, so the business cannot change between the check
    // and the write.
    if (businessId) await assertBusinessMayHaveSellerAdmins(client, businessId);

    const existing = await client.query(
      "select id, role, business_id from public.admin_users where lower(email) = $1 for update",
      [email],
    );
    if (existing.rowCount > 1) throw new Error(`Multiple admin users use the normalized email ${email}`);

    const passwordHash = hashPassword(temporaryPassword);
    const previous = existing.rows[0] ?? null;

    // role and business_id are written together in both branches. Never one
    // without the other.
    const result = existing.rowCount === 1
      ? await client.query(
        `
          update public.admin_users
          set
            email = $2,
            password_hash = $3,
            display_name = $4,
            role = $5,
            business_id = $6,
            is_active = true,
            must_change_password = true,
            updated_at = now()
          where id = $1
          returning id, email, display_name, role, business_id
        `,
        [previous.id, email, passwordHash, displayName, role, businessId],
      )
      : await client.query(
        `
          insert into public.admin_users (
            email,
            password_hash,
            display_name,
            role,
            business_id,
            is_active,
            must_change_password
          )
          values ($1, $2, $3, $4, $5, true, true)
          returning id, email, display_name, role, business_id
        `,
        [email, passwordHash, displayName, role, businessId],
      );

    await client.query(
      "delete from public.admin_sessions where admin_user_id = $1",
      [result.rows[0].id],
    );

    await client.query(
      `
        insert into public.admin_audit_log (
          action_type,
          entity_type,
          entity_id,
          old_values,
          new_values,
          metadata,
          actor_email,
          actor_role
        )
        values ($1, 'admin_user', $2, $3::jsonb, $4::jsonb, $5::jsonb, 'provisioning-script', 'system')
      `,
      [
        existing.rowCount === 1 ? "admin.reprovisioned" : "admin.provisioned",
        result.rows[0].id,
        // The scope change is the part worth being able to reconstruct later.
        JSON.stringify(previous ? { role: previous.role, business_id: previous.business_id } : null),
        JSON.stringify({
          email,
          display_name: displayName,
          role,
          business_id: businessId,
          is_active: true,
        }),
        JSON.stringify({
          must_change_password: true,
          sessions_revoked: true,
          scope: scopeResult.scope,
          scope_changed: Boolean(previous) && previous.business_id !== businessId,
          role_changed: Boolean(previous) && previous.role !== role,
        }),
      ],
    );

    await client.query("commit");

    console.log(JSON.stringify({
      ...result.rows[0],
      scope: scopeResult.scope,
      temporary_password: temporaryPassword,
      must_change_password: true,
    }, null, 2));
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

// Runs as a CLI, imports cleanly for tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
